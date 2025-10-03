/**
 * Módulo de Aluguéis - Refactorizado com GridComponent
 * 
 * Melhorias:
 * - Uso de GridComponent para renderização
 * - Cache inteligente de proprietários e imóveis
 * - Código mais limpo e manutenível
 * - Performance melhorada
 * 
 * @version 2.0.0
 */

class AlugueisModule {
    constructor() {
        this.apiService = window.apiService;
        this.uiManager = window.uiManager;
        this.cacheService = window.cacheService;
        
        // Dados
        this.matriz = [];
        this.proprietarios = [];
        this.imoveis = [];
        
        // Estado
        this.initialized = false;
        this.anosDisponiveis = [];
        this.anoSelecionado = null;
        this.mesSelecionado = null;
        
        // UI
        this.container = null;
        this.grid = null;
        this.isMobile = window.deviceManager && window.deviceManager.deviceType === 'mobile';
    }

    async load() {
        if (!this.initialized) {
            this.init();
        }
        await this.loadAnosDisponiveis();
    }

    init() {
        if (this.initialized) return;

        // Identificar container
        this.container = this.isMobile
            ? document.getElementById('alugueis-list-mobile')
            : document.getElementById('alugueis-matrix-container');

        if (!this.container) {
            return;
        }

        // Setup dropdowns
        const suffix = this.isMobile ? '-mobile' : '';
        this.anoSelect = document.getElementById(`alugueis-ano-select${suffix}`);
        this.mesSelect = document.getElementById(`alugueis-mes-select${suffix}`);

        this.setupPeriodDropdowns();
        this.initialized = true;
    }

    async loadAnosDisponiveis() {
        try {
            // Usar cache para anos disponíveis
            const resp = await this.apiService.getAnosDisponiveisAlugueis(true);
            
            if (resp && resp.anos && resp.anos.length > 0) {
                this.anosDisponiveis = resp.anos.sort((a, b) => b - a);
                this.anoSelecionado = this.anosDisponiveis[0];
            } else {
                this.anosDisponiveis = [new Date().getFullYear()];
                this.anoSelecionado = this.anosDisponiveis[0];
            }
            
            this.populateAnoDropdown();
            await this.loadMesReciente();
        } catch (error) {
            console.error('Erro ao carregar anos:', error);
            this.anosDisponiveis = [new Date().getFullYear()];
            this.anoSelecionado = this.anosDisponiveis[0];
            this.populateAnoDropdown();
        }
    }

    async loadMesReciente() {
        try {
            const ultimoPeriodo = await this.apiService.get('/api/alugueis/ultimo-periodo/');
            
            if (ultimoPeriodo?.success && ultimoPeriodo?.data?.mes) {
                this.mesSelecionado = ultimoPeriodo.data.mes;
            } else {
                this.mesSelecionado = 'todos';
            }
            
            this.populateMesDropdown();
            this.loadMatrizAlugueis(this.anoSelecionado, this.mesSelecionado);
        } catch (error) {
            this.mesSelecionado = 'todos';
            this.populateMesDropdown();
            this.loadMatrizAlugueis(this.anoSelecionado, 'todos');
        }
    }

    populateAnoDropdown() {
        if (!this.anoSelect) return;
        
        this.anoSelect.innerHTML = '';
        this.anosDisponiveis.forEach(ano => {
            const option = new Option(ano, ano);
            this.anoSelect.add(option);
        });
        this.anoSelect.value = this.anoSelecionado;
    }

    populateMesDropdown() {
        if (!this.mesSelect) return;
        
        this.mesSelect.innerHTML = '';
        this.mesSelect.add(new Option('Todos os meses', 'todos'));
        
        const meses = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", 
                       "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
        
        meses.forEach((nome, index) => {
            this.mesSelect.add(new Option(nome, index + 1));
        });
        
        this.mesSelect.value = this.mesSelecionado;
        this.mesSelect.disabled = false;
    }

    setupPeriodDropdowns() {
        if (this.anoSelect) {
            this.anoSelect.addEventListener('change', (e) => {
                this.anoSelecionado = parseInt(e.target.value);
                this.loadMatrizAlugueis(this.anoSelecionado, this.mesSelecionado);
            });
        }
        
        if (this.mesSelect) {
            this.mesSelect.addEventListener('change', (e) => {
                this.mesSelecionado = e.target.value === 'todos' ? 'todos' : parseInt(e.target.value);
                this.loadMatrizAlugueis(this.anoSelecionado, this.mesSelecionado);
            });
        }
    }

    async loadMatrizAlugueis(ano, mes) {
        if (!ano) return;
        
        try {
            this.uiManager.showLoading('Carregando aluguéis...');
            
            // Endpoint
            const endpoint = (mes === 'todos' || !mes)
                ? `/api/alugueis/distribuicao-todos-meses/?ano=${ano}`
                : `/api/alugueis/distribuicao-matriz/?ano=${ano}&mes=${mes}`;
            
            // Carregar dados em paralelo com cache
            const [matrizResp, proprietarios, imoveis] = await Promise.all([
                this.apiService.get(endpoint),
                this.cacheService ? this.apiService.getProprietarios(true) : this.apiService.getProprietarios(false),
                this.cacheService ? this.apiService.getImoveis(true) : this.apiService.getImoveis(false)
            ]);
            
            // Processar matriz
            if (matrizResp.success && matrizResp.data) {
                this.matriz = matrizResp.data.matriz || [];
                // Se a resposta incluir proprietarios/imoveis, usar esses (mais frescos)
                this.proprietarios = matrizResp.data.proprietarios || proprietarios || [];
                this.imoveis = matrizResp.data.imoveis || imoveis || [];
            } else {
                this.matriz = [];
                this.proprietarios = proprietarios || [];
                this.imoveis = imoveis || [];
            }
            
            this.render();
        } catch (error) {
            this.uiManager.showError('Erro ao carregar aluguéis: ' + error.message);
            console.error('Erro ao carregar matriz:', error);
        } finally {
            this.uiManager.hideLoading();
        }
    }

    render() {
        if (!this.container) return;

        // Verificar se temos dados
        if (this.imoveis.length === 0) {
            this.container.innerHTML = '<div class="alert alert-info">Nenhum aluguel encontrado para o período selecionado.</div>';
            return;
        }

        if (this.isMobile) {
            this.renderMobile();
        } else {
            this.renderDesktop();
        }
    }

    renderMobile() {
        // Preparar dados para cards mobile
        const cardData = this.imoveis.map(imovel => {
            const alugueisDoImovel = this.matriz
                .map(linha => {
                    const proprietario = this.proprietarios.find(p => p.proprietario_id === linha.proprietario_id);
                    const valor = linha.valores[imovel.nome] || 0;
                    return { proprietario, valor };
                })
                .filter(item => item.valor > 0);

            const totalImovel = alugueisDoImovel.reduce((sum, item) => sum + item.valor, 0);

            return {
                imovel: imovel.nome,
                alugueis: alugueisDoImovel,
                total: totalImovel
            };
        }).filter(item => item.total > 0);

        // Renderizar cards manualmente (mobile cards são customizados)
        const cardsHtml = cardData.map(item => {
            const alugueisHtml = item.alugueis.map(a => `
                <li class="list-group-item d-flex justify-content-between align-items-center">
                    ${a.proprietario ? SecurityUtils.escapeHtml(a.proprietario.nome) : 'Desconhecido'}
                    <span class="badge bg-success rounded-pill">R$ ${a.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                </li>
            `).join('');

            return `
                <div class="card mobile-card mb-3 shadow-sm">
                    <div class="card-header bg-light d-flex justify-content-between align-items-center">
                        <h5 class="card-title mb-0">${SecurityUtils.escapeHtml(item.imovel)}</h5>
                        <strong class="text-primary">R$ ${item.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong>
                    </div>
                    <ul class="list-group list-group-flush">
                        ${alugueisHtml}
                    </ul>
                </div>
            `;
        }).join('');

        this.container.innerHTML = cardsHtml || '<div class="alert alert-info">Nenhum aluguel encontrado.</div>';
    }

    renderDesktop() {
        // Preparar dados no formato tabular para GridComponent
        const tableData = this.buildTableData();
        
        // Preparar colunas dinâmicas
        const columns = this.buildColumns();

        // Configuração do GridComponent
        const gridConfig = {
            columns: columns,
            data: tableData,
            responsive: {
                mobile: 'cards',
                desktop: 'table'
            },
            search: {
                enabled: false  // Desabilitado para matriz de aluguéis
            },
            sort: {
                enabled: false  // Desabilitado para matriz
            },
            pagination: {
                enabled: false  // Não precisamos para matriz
            },
            emptyMessage: 'Nenhum aluguel encontrado para o período.'
        };

        // Destruir grid anterior se existir
        if (this.grid) {
            this.grid.destroy();
        }

        // Criar novo grid
        this.grid = new GridComponent('alugueis-matrix-container', gridConfig);
    }

    buildTableData() {
        // Construir linhas da tabela (uma por imóvel + linha de totais)
        const rows = [];

        // Linhas de imóveis
        this.imoveis.forEach(imovel => {
            const row = {
                imovel: imovel.nome,
                isTotal: false
            };

            let totalImovel = 0;

            this.proprietarios.forEach(prop => {
                const linha = this.matriz.find(l => l.proprietario_id === prop.proprietario_id);
                const valor = (linha && linha.valores[imovel.nome]) || 0;
                row[`prop_${prop.proprietario_id}`] = valor;
                totalImovel += valor;
            });

            row.total = totalImovel;
            rows.push(row);
        });

        // Linha de totais
        const totalRow = {
            imovel: 'Total por Proprietário',
            isTotal: true
        };

        let granTotal = 0;

        this.proprietarios.forEach(prop => {
            const totalProp = this.matriz
                .filter(l => l.proprietario_id === prop.proprietario_id)
                .reduce((sum, l) => sum + Object.values(l.valores).reduce((s, v) => s + (v || 0), 0), 0);
            
            totalRow[`prop_${prop.proprietario_id}`] = totalProp;
            granTotal += totalProp;
        });

        totalRow.total = granTotal;
        rows.push(totalRow);

        return rows;
    }

    buildColumns() {
        const meses = ["", "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", 
                       "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
        
        const tituloPeriodo = this.mesSelecionado && this.mesSelecionado !== 'todos'
            ? `${meses[this.mesSelecionado]} ${this.anoSelecionado}`
            : `Ano ${this.anoSelecionado}`;

        const columns = [
            {
                key: 'imovel',
                label: `Imóvel (${tituloPeriodo})`,
                width: '200px',
                formatter: (value, row) => {
                    return row.isTotal 
                        ? `<strong>${SecurityUtils.escapeHtml(value)}</strong>` 
                        : SecurityUtils.escapeHtml(value);
                }
            }
        ];

        // Colunas de proprietários
        this.proprietarios.forEach(prop => {
            columns.push({
                key: `prop_${prop.proprietario_id}`,
                label: prop.nome,
                align: 'right',
                type: 'currency',
                formatter: (value, row) => {
                    if (value === 0 || value === null) return '-';
                    const formatted = `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
                    return row.isTotal ? `<strong>${formatted}</strong>` : formatted;
                }
            });
        });

        // Coluna de total
        columns.push({
            key: 'total',
            label: 'Total',
            align: 'right',
            type: 'currency',
            formatter: (value, row) => {
                const formatted = `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
                return row.isTotal 
                    ? `<strong class="text-primary">${formatted}</strong>` 
                    : `<strong>${formatted}</strong>`;
            }
        });

        return columns;
    }

    applyPermissions(isAdmin) {
        // Implementar lógica de permissões se necessário
        // Por enquanto, aluguéis são read-only
    }
}

// Exportar instância global
window.alugueisModule = new AlugueisModule();
