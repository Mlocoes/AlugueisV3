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
        console.log('🔄 AlugueisModule.load() - Iniciando carga...');
        
        // Re-avaliar tipo de dispositivo
        this.isMobile = window.deviceManager && window.deviceManager.deviceType === 'mobile';
        console.log(`📱 Tipo de dispositivo: ${this.isMobile ? 'MOBILE' : 'DESKTOP'}`);
        
        // Sempre re-buscar elementos DOM (podem ter sido recriados ao mudar de tela)
        const getContainer = () => this.isMobile
            ? document.getElementById('alugueis-list-mobile')
            : document.getElementById('alugueis-matrix-body');

        this.container = getContainer();

        // Retry múltiplas vezes se não encontrar (timing issue)
        if (!this.container) {
            console.log('⏳ AlugueisModule: Container não encontrado, tentando novamente...');
            for (let i = 0; i < 10; i++) {
                await new Promise(resolve => setTimeout(resolve, 300));
                this.container = getContainer();
                if (this.container) {
                    console.log(`✅ Container encontrado após ${i + 1} tentativa(s)`);
                    break;
                }
            }
        }

        if (!this.container) {
            console.warn('⚠️ AlugueisModule: Container não encontrado após tentativas. View pode não estar ativa ainda.');
            return;
        }

        // Re-buscar todos os elementos DOM
        const suffix = this.isMobile ? '-mobile' : '';
        this.anoSelect = document.getElementById(`alugueis-ano-select${suffix}`);
        this.mesSelect = document.getElementById(`alugueis-mes-select${suffix}`);

        console.log('🎯 Elementos encontrados:', {
            container: !!this.container,
            anoSelect: !!this.anoSelect,
            mesSelect: !!this.mesSelect
        });

        // Setup event listeners (sempre reconfigurar)
        if (!this.initialized) {
            this.setupPeriodDropdowns();
            this.initialized = true;
        }
        
        await this.loadAnosDisponiveis();
        
        console.log('✅ AlugueisModule.load() - Carga completa!');
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
                this.matriz = matrizResp.data.matriz || matrizResp.data || [];
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
        if (this.proprietarios.length === 0 || this.imoveis.length === 0) {
            this.container.innerHTML = '<tr><td colspan="100" class="text-center">Nenhum aluguel encontrado para o período.</td></tr>';
            // Atualizar o thead também
            const thead = document.getElementById('alugueis-matrix-head');
            if (thead) {
                thead.innerHTML = '<tr><th>Imóvel</th><th>Info</th></tr>';
            }
            // Mostrar tabela
            const tableContainer = document.getElementById('alugueis-table-container');
            if (tableContainer) {
                tableContainer.style.display = 'block';
            }
            return;
        }

        // Preparar título do período
        const meses = ["", "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", 
                       "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
        const tituloPeriodo = this.mesSelecionado && this.mesSelecionado !== 'todos'
            ? `${meses[this.mesSelecionado]} ${this.anoSelecionado}`
            : `Ano ${this.anoSelecionado}`;

        // Renderizar THEAD com colunas dinâmicas
        const thead = document.getElementById('alugueis-matrix-head');
        if (thead) {
            let theadHtml = `<tr><th width="200">Imóvel (${SecurityUtils.escapeHtml(tituloPeriodo)})</th>`;
            this.proprietarios.forEach(prop => {
                const nomeCompleto = `${prop.nome || ''} ${prop.sobrenome || ''}`.trim();
                theadHtml += `<th class="text-end">${SecurityUtils.escapeHtml(nomeCompleto)}</th>`;
            });
            theadHtml += '<th class="text-end"><strong>Total</strong></th></tr>';
            thead.innerHTML = theadHtml;
        }

        // Renderizar TBODY com linhas por imóvel
        const rowsHtml = [];
        const totaisPorProprietario = {};
        let granTotal = 0;

        // Inicializar totais
        this.proprietarios.forEach(prop => {
            totaisPorProprietario[prop.proprietario_id] = 0;
        });

        // Linhas de imóveis
        this.imoveis.forEach(imovel => {
            let totalImovel = 0;
            let cellsHtml = `<td><strong>${SecurityUtils.escapeHtml(imovel.nome || 'Sem nome')}</strong></td>`;

            // Célula para cada proprietário
            this.proprietarios.forEach(prop => {
                // Procurar o aluguel na matriz usando a nova estrutura
                const linha = this.matriz.find(m => m.proprietario_id === prop.proprietario_id);
                const valor = linha && linha.valores ? parseFloat(linha.valores[imovel.nome] || 0) : 0;
                
                totalImovel += valor;
                totaisPorProprietario[prop.proprietario_id] += valor;

                const displayVal = valor > 0 
                    ? `R$ ${valor.toLocaleString('pt-BR', {minimumFractionDigits: 2, maximumFractionDigits: 2})}` 
                    : '-';
                cellsHtml += `<td class="text-end">${displayVal}</td>`;
            });

            granTotal += totalImovel;

            // Célula de total
            const totalFormatado = totalImovel > 0
                ? `R$ ${totalImovel.toLocaleString('pt-BR', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`
                : '-';
            cellsHtml += `<td class="text-end"><strong>${totalFormatado}</strong></td>`;

            rowsHtml.push(`<tr>${cellsHtml}</tr>`);
        });

        // Linha de totais
        let totalRowHtml = '<td><strong>Total por Proprietário</strong></td>';
        this.proprietarios.forEach(prop => {
            const total = totaisPorProprietario[prop.proprietario_id];
            const totalFormatado = total > 0
                ? `R$ ${total.toLocaleString('pt-BR', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`
                : '-';
            totalRowHtml += `<td class="text-end"><strong>${totalFormatado}</strong></td>`;
        });
        const granTotalFormatado = `R$ ${granTotal.toLocaleString('pt-BR', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
        totalRowHtml += `<td class="text-end"><strong class="text-primary">${granTotalFormatado}</strong></td>`;
        rowsHtml.push(`<tr class="table-primary">${totalRowHtml}</tr>`);

        this.container.innerHTML = rowsHtml.join('');
        
        // Mostrar a tabela
        const tableContainer = document.getElementById('alugueis-table-container');
        if (tableContainer) {
            tableContainer.style.display = 'block';
        }
    }

    applyPermissions(isAdmin) {
        // Implementar lógica de permissões se necessário
        // Por enquanto, aluguéis são read-only
    }
}

// Exportar instância global
window.alugueisModule = new AlugueisModule();
