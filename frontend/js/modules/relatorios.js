class RelatoriosModule {
    constructor() {
        this.apiService = window.apiService;
        this.uiManager = window.uiManager;
        this.localeManager = window.localeManager || new LocaleManager();
        this.currentData = [];
        this.transferenciasCache = new Map();
        this.isMobile = window.deviceManager && window.deviceManager.deviceType === 'mobile';
        this.initialLoadDone = false;
        this.hotInstance = null; // Handsontable instance
    }

    async load() {
        
        // Re-avaliar tipo de dispositivo
        this.isMobile = window.deviceManager && window.deviceManager.deviceType === 'mobile';
        
        // Após unificação dos templates, sempre usar o mesmo ID (sem sufixo -mobile)
        this.container = document.getElementById('relatorios-table-body');

        // Retry múltiplas vezes se não encontrar (timing issue)
        if (!this.container) {
            for (let i = 0; i < 10; i++) {
                await new Promise(resolve => setTimeout(resolve, 300));
                this.container = document.getElementById('relatorios-table-body');
                if (this.container) {
                    break;
                }
            }
        }

        if (!this.container) {
            // Não retornar erro, apenas avisar - o container pode ser encontrado depois
            return;
        }

        // Após unificação: sempre usar mesmos IDs (sem sufixo)
        this.anoSelect = document.getElementById('relatorios-ano-select');
        this.mesSelect = document.getElementById('relatorios-mes-select');
        this.proprietarioSelect = document.getElementById('relatorios-proprietario-select');
        this.transferenciasCheck = document.getElementById('relatorios-transferencias-check');

        // Setup event listeners (sempre reconfigurar)
        this.setupEventListeners();

        // Carregar dados
        await this.loadInitialData();
        
    }

    setupEventListeners() {
        
        // Remover listeners antigos para evitar duplicados
        // Usando named function para poder remover depois
        if (!this._changeHandler) {
            this._changeHandler = () => this.loadRelatoriosData();
        }
        
        [this.anoSelect, this.mesSelect, this.proprietarioSelect, this.transferenciasCheck].forEach(el => {
            if (el) {
                // Remover listener antigo (se existir)
                el.removeEventListener('change', this._changeHandler);
                // Adicionar novo listener
                el.addEventListener('change', this._changeHandler);
            }
        });
        
    }

    async loadInitialData() {
        try {
            this.loadMeses();
            await this.loadYears();
            await this.loadProprietariosAndAliases();
            // Set default year and month before loading data
            await this.setDefaultPeriod();
            await this.loadRelatoriosData();
        } catch (error) {
            console.error('Erro ao carregar dados iniciais de relatórios:', error);
        }
    }

    async setDefaultPeriod() {
        try {
            const response = await this.apiService.get('/api/reportes/ultimo-periodo');
            const data = response.success ? response.data : response;
            
            if (data && data.ano && data.mes) {
                // Set year dropdown to last available year
                if (this.anoSelect) {
                    this.anoSelect.value = data.ano.toString();
                }
                
                // Set month dropdown to last available month
                if (this.mesSelect) {
                    this.mesSelect.value = data.mes.toString();
                }
            }
        } catch (error) {
            console.error('Erro ao carregar último período:', error);
        }
    }

    async loadYears() {
        if (!this.anoSelect) return;
        try {
            const response = await this.apiService.get('/api/reportes/anos-disponiveis');
            const anos = response.success ? response.data : response;
            this.anoSelect.innerHTML = '<option value="">Todos</option>';
            anos.forEach(ano => this.anoSelect.add(new Option(ano, ano)));
        } catch (error) {
            console.error('Erro ao carregar anos para relatórios:', error);
        }
    }

    async loadProprietariosAndAliases() {
        if (!this.proprietarioSelect) return;
        try {
            const [propResponse, aliasResponse] = await Promise.all([
                this.apiService.get('/api/proprietarios/'),
                this.apiService.get('/api/extras/reportes')
            ]);

            const proprietarios = propResponse.success ? propResponse.data : [];
            const aliases = aliasResponse.success ? aliasResponse.data : [];

            this.proprietarioSelect.innerHTML = '<option value="">Todos</option>';
            proprietarios.forEach(prop => {
                this.proprietarioSelect.add(new Option(`${prop.nome} ${prop.sobrenome || ''}`.trim(), prop.id));
            });

            if (aliases.length > 0) {
                const optgroup = document.createElement('optgroup');
                optgroup.label = 'Aliases';
                aliases.forEach(alias => {
                    optgroup.appendChild(new Option(alias.alias, `alias:${alias.id}`));
                });
                this.proprietarioSelect.appendChild(optgroup);
            }
        } catch (error) {
            console.error('Erro ao carregar proprietários e aliases:', error);
        }
    }

    loadMeses() {
        if (!this.mesSelect) return;

        // Se já tem opções (desktop), não sobrescrever
        if (this.mesSelect.options.length > 1) return;

        const meses = [
            { value: '', text: 'Todos os meses' },
            { value: '1', text: 'Janeiro' },
            { value: '2', text: 'Fevereiro' },
            { value: '3', text: 'Março' },
            { value: '4', text: 'Abril' },
            { value: '5', text: 'Maio' },
            { value: '6', text: 'Junho' },
            { value: '7', text: 'Julho' },
            { value: '8', text: 'Agosto' },
            { value: '9', text: 'Setembro' },
            { value: '10', text: 'Outubro' },
            { value: '11', text: 'Novembro' },
            { value: '12', text: 'Dezembro' }
        ];

        this.mesSelect.innerHTML = '';
        meses.forEach(mes => {
            this.mesSelect.add(new Option(mes.text, mes.value));
        });
    }

    async loadRelatoriosData() {
        if (!this.anoSelect || !this.mesSelect || !this.proprietarioSelect) return;

        // Clear cache to ensure fresh transfer data is fetched
        this.transferenciasCache.clear();

        const params = new URLSearchParams();
        if (this.anoSelect.value) params.append('ano', this.anoSelect.value);
        if (this.mesSelect.value) params.append('mes', this.mesSelect.value);

        const proprietarioSelection = this.proprietarioSelect.value;
        if (proprietarioSelection && !proprietarioSelection.startsWith('alias:')) {
            params.append('proprietario_id', proprietarioSelection);
        }

        try {
            this.uiManager.showLoading('Carregando relatórios...');
            
            // Buscar dados de aluguéis
            const responseAlugueis = await this.apiService.get(`/api/reportes/resumen-mensual?${params.toString()}`);
            let dataAlugueis = (responseAlugueis.success ? responseAlugueis.data : responseAlugueis) || [];

            // Buscar dados de DARFs
            const responseDarfs = await this.apiService.get(`/api/darf/relatorios?${params.toString()}`);
            let dataDarfs = (responseDarfs.success ? responseDarfs.data : responseDarfs) || [];

            if (proprietarioSelection && proprietarioSelection.startsWith('alias:')) {
                const aliasId = proprietarioSelection.replace('alias:', '');
                const propIdsResponse = await this.apiService.get(`/api/extras/${aliasId}/proprietarios/relatorios`);
                const propIds = (propIdsResponse.success ? propIdsResponse.data : []).map(p => p.id);
                dataAlugueis = dataAlugueis.filter(item => propIds.includes(item.proprietario_id));
                dataDarfs = dataDarfs.filter(item => propIds.includes(item.proprietario_id));
            }

            // Consolidar dados de aluguéis e DARFs
            this.currentData = this.consolidarDados(dataAlugueis, dataDarfs);
            await this.render();
        } catch (error) {
            console.error('Erro ao carregar dados de relatórios:', error);
            this.uiManager.showError('Erro ao carregar dados de relatórios.');
        } finally {
            this.uiManager.hideLoading();
        }
    }

    /**
     * Consolidar dados de aluguéis e DARFs por proprietário e período
     */
    consolidarDados(dataAlugueis, dataDarfs) {
        const consolidated = new Map();

        // Processar aluguéis
        dataAlugueis.forEach(item => {
            const key = `${item.proprietario_id}_${item.ano}_${item.mes}`;
            consolidated.set(key, {
                proprietario_id: item.proprietario_id,
                nome_proprietario: item.nome_proprietario,
                ano: item.ano,
                mes: item.mes,
                periodo: `${String(item.mes).padStart(2, '0')}/${item.ano}`,
                soma_alugueis: parseFloat(item.soma_alugueis || 0),
                soma_taxas: parseFloat(item.soma_taxas || 0),
                valor_darf: 0
            });
        });

        // Adicionar DARFs
        dataDarfs.forEach(item => {
            const key = `${item.proprietario_id}_${item.ano}_${item.mes}`;
            if (consolidated.has(key)) {
                consolidated.get(key).valor_darf = parseFloat(item.valor_darf || 0);
            } else {
                // DARF sem aluguel correspondente
                consolidated.set(key, {
                    proprietario_id: item.proprietario_id,
                    nome_proprietario: item.nome_proprietario,
                    ano: item.ano,
                    mes: item.mes,
                    periodo: item.periodo,
                    soma_alugueis: 0,
                    soma_taxas: 0,
                    valor_darf: parseFloat(item.valor_darf || 0)
                });
            }
        });

        return Array.from(consolidated.values()).sort((a, b) => {
            // Ordenar por nome, depois por ano/mês decrescente
            const nomeCompare = a.nome_proprietario.localeCompare(b.nome_proprietario);
            if (nomeCompare !== 0) return nomeCompare;
            if (a.ano !== b.ano) return b.ano - a.ano;
            return b.mes - a.mes;
        });
    }

    async getTransferenciasValue(proprietarioId, ano, mes) {
        const cacheKey = `transferencias_${ano}_${mes}`;
        if (this.transferenciasCache.has(cacheKey)) {
            const cached = this.transferenciasCache.get(cacheKey)[proprietarioId] || 0;
            return cached;
        }

        try {
            const response = await this.apiService.get('/api/transferencias/relatorios');
            const transferencias = response.success ? response.data : response;
            
            const periodTransfers = {};
            
            // Data de consulta (primeiro dia do mês/ano consultado)
            const dataConsulta = new Date(ano, mes - 1, 1);
            
            transferencias.forEach(t => {
                // Verificar se a transferência está ATIVA no período consultado
                const dataInicio = new Date(t.data_criacao);
                const dataFim = new Date(t.data_fim);
                
                
                // A transferência é aplicada se a data consultada está dentro do período de validade
                if (dataConsulta >= dataInicio && dataConsulta <= dataFim) {
                    try {
                        const participantes = JSON.parse(t.id_proprietarios);
                        participantes.forEach(p => {
                            periodTransfers[p.id] = (periodTransfers[p.id] || 0) + parseFloat(p.valor);
                        });
                    } catch (e) {
                        console.error(`      ❌ Erro ao parsear participantes:`, e);
                    }
                } else {
                }
            });

            this.transferenciasCache.set(cacheKey, periodTransfers);
            const valor = periodTransfers[proprietarioId] || 0;
            return valor;
        } catch (error) {
            console.error("❌ Error fetching transferencias", error);
            return 0;
        }
    }

    async render() {
        const container = document.getElementById('handsontable-relatorios');
        if (!container) {
            console.warn('Container handsontable-relatorios não encontrado');
            return;
        }

        // Destruir instância anterior se existir
        if (this.hotInstance) {
            this.hotInstance.destroy();
            this.hotInstance = null;
        }

        if (this.currentData.length === 0) {
            container.innerHTML = '<div class="text-center text-muted p-4">Nenhum relatório encontrado.</div>';
            return;
        }

        // Preparar dados para Handsontable
        const tableData = await this.prepararDadosTabela();

        // Inicializar Handsontable
        this.hotInstance = new Handsontable(container, {
            data: tableData,
            colHeaders: ['Proprietário', 'Período', 'Aluguel', 'DARF', 'Aluguel - DARF'],
            columns: [
                { 
                    data: 'proprietario', 
                    type: 'text', 
                    readOnly: true,
                    width: 200
                },
                { 
                    data: 'periodo', 
                    type: 'text', 
                    readOnly: true, 
                    className: 'htCenter',
                    width: 100
                },
                { 
                    data: 'aluguel', 
                    type: 'numeric',
                    readOnly: true, 
                    className: 'htRight',
                    width: 150
                },
                { 
                    data: 'darf', 
                    type: 'numeric',
                    readOnly: true, 
                    className: 'htRight',
                    width: 150
                },
                { 
                    data: 'diferenca', 
                    type: 'numeric',
                    readOnly: true, 
                    className: 'htRight',
                    width: 150
                }
            ],
            rowHeaders: false,
            colWidths: [200, 100, 150, 150, 150],
            width: '100%',
            height: '60vh',
            licenseKey: 'non-commercial-and-evaluation',
            readOnly: true,
            contextMenu: false,
            manualColumnResize: true,
            manualRowResize: false,
            className: 'htMiddle'
        });

        this.applyPermissions();
    }

    /**
     * Preparar dados para exibição no Handsontable
     */
    async prepararDadosTabela() {
        const incluirTransferencias = this.transferenciasCheck && this.transferenciasCheck.checked;
        const tableData = [];

        for (const item of this.currentData) {
            let somaAlugueis = item.soma_alugueis;
            
            // Adicionar transferências se marcado
            if (incluirTransferencias) {
                const transferencia = await this.getTransferenciasValue(
                    item.proprietario_id,
                    item.ano,
                    item.mes
                );
                somaAlugueis += transferencia;
            }

            const valorDarf = item.valor_darf;
            const diferenca = somaAlugueis - valorDarf;

            tableData.push({
                proprietario: item.nome_proprietario,
                periodo: item.periodo,
                aluguel: this.formatarValor(somaAlugueis),
                darf: this.formatarValor(valorDarf),
                diferenca: this.formatarValor(diferenca)
            });
        }

        return tableData;
    }

    /**
     * Formatar valor em moeda brasileira
     */
    formatarValor(valor) {
        return valor.toLocaleString('pt-BR', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });
    }

    async renderMobileCards() {
        // Manter compatibilidade mobile por enquanto
        if (!this.container) return;

        if (this.currentData.length === 0) {
            this.container.innerHTML = `<div class="text-center p-4">Nenhum relatório encontrado.</div>`;
            return;
        }

        const incluirTransferencias = this.transferenciasCheck && this.transferenciasCheck.checked;
        let cardsHtml = '';
        
        for (const item of this.currentData) {
            let somaAlugueis = item.soma_alugueis;
            if (incluirTransferencias) {
                const transferencia = await this.getTransferenciasValue(item.proprietario_id, item.ano, item.mes);
                somaAlugueis += transferencia;
            }
            const valorDarf = item.valor_darf;
            const diferenca = somaAlugueis - valorDarf;

            cardsHtml += `
                <div class="card mobile-card mb-3 shadow-sm">
                    <div class="card-header bg-light d-flex justify-content-between align-items-center">
                        <h5 class="card-title mb-0">${SecurityUtils.escapeHtml(item.nome_proprietario)}</h5>
                        <small class="text-muted">${item.periodo}</small>
                    </div>
                    <ul class="list-group list-group-flush">
                        <li class="list-group-item d-flex justify-content-between align-items-center">
                            Aluguel
                            <span class="badge bg-primary rounded-pill">R$ ${this.formatarValor(somaAlugueis)}</span>
                        </li>
                        <li class="list-group-item d-flex justify-content-between align-items-center">
                            DARF
                            <span class="badge bg-warning rounded-pill">R$ ${this.formatarValor(valorDarf)}</span>
                        </li>
                        <li class="list-group-item d-flex justify-content-between align-items-center">
                            Diferença
                            <span class="badge bg-success rounded-pill">R$ ${this.formatarValor(diferenca)}</span>
                        </li>
                    </ul>
                </div>
            `;
        }
        this.container.innerHTML = cardsHtml;
    }

    async renderDesktopTable() {
        // Método legado - agora usa Handsontable via render()
        await this.render();
    }

    applyPermissions() {
        const isAdmin = window.authService && window.authService.isAdmin();
        
        if (this.transferenciasCheck) {
            // IMPORTANTE: Marcar checkbox por padrão APENAS na primeira carga
            if (!this.initialLoadDone) {
                this.transferenciasCheck.checked = true;
                this.initialLoadDone = true;
            }
            
            // Desabilitar checkbox para não-admin (mas manter estado atual)
            this.transferenciasCheck.disabled = !isAdmin;
            
            // Adicionar tooltip explicativo
            const formCheckElement = this.transferenciasCheck.closest('.form-check');
            if (formCheckElement) {
                formCheckElement.title = isAdmin 
                    ? 'Clique para incluir/excluir transferências' 
                    : 'Transferências sempre incluídas. Apenas administradores podem alterar.';
            }
            
        }
    }
}

window.relatoriosModule = new RelatoriosModule();