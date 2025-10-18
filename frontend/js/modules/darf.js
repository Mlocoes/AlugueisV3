/**
 * Módulo de DARF - Documento de Arrecadação de Receitas Federais
 * Gerenciamento e importação múltipla de DARFs
 */

class DarfManager {
    constructor() {
        // Garantir que os serviços estão disponíveis
        if (!window.apiService) {
            console.error('❌ apiService não está disponível');
            throw new Error('apiService não inicializado');
        }
        if (!window.uiManager) {
            console.error('❌ uiManager não está disponível');
            throw new Error('uiManager não inicializado');
        }
        
        this.apiService = window.apiService;
        this.uiManager = window.uiManager;
        this.localeManager = window.localeManager || new LocaleManager();
        this.currentDarf = null;
        this.allDarfs = [];
        this.allProprietarios = [];
        this.hotInstance = null; // Handsontable instance
        this.isMobile = document.body.classList.contains('device-mobile');
        
        // Binding de métodos
        this.load = this.load.bind(this);
        this.loadDarfs = this.loadDarfs.bind(this);
        this.loadProprietarios = this.loadProprietarios.bind(this);
        
        console.log('✅ DarfManager inicializado com sucesso');
    }

    /**
     * Wrapper seguro para uiManager
     */
    safeUICall(method, ...args) {
        if (this.uiManager && typeof this.uiManager[method] === 'function') {
            return this.uiManager[method](...args);
        }
        return null;
    }

    /**
     * Carregar módulo
     */
    async load() {
        console.log('🔵 [DARF] Iniciando load()...');
        try {
            // Verificar disponibilidade do uiManager
            if (!this.uiManager || typeof this.uiManager.showLoading !== 'function') {
                console.warn('⚠️ [DARF] uiManager não disponível em load()');
            } else {
                console.log('🔵 [DARF] Mostrando loader...');
                this.uiManager.showLoading('Carregando DARFs...');
            }
            
            // Carregar dados
            console.log('🔵 [DARF] Carregando proprietários...');
            await this.loadProprietarios();
            console.log('✅ [DARF] Proprietários carregados');
            
            console.log('🔵 [DARF] Carregando DARFs...');
            await this.loadDarfs();
            console.log('✅ [DARF] DARFs carregados');
            
            // Setup eventos
            console.log('🔵 [DARF] Setup de eventos...');
            this.setupEvents();
            console.log('✅ [DARF] Eventos configurados');
            
        } catch (error) {
            console.error('❌ [DARF] Erro ao carregar módulo DARF:', error);
            if (this.uiManager && typeof this.uiManager.showNotification === 'function') {
                this.uiManager.showNotification('Erro ao carregar DARFs', 'error');
            }
        } finally {
            console.log('🔵 [DARF] Executando finally - escondendo loader...');
            // SEMPRE esconder loader, mesmo com erro
            if (this.uiManager && typeof this.uiManager.hideLoading === 'function') {
                this.uiManager.hideLoading();
                console.log('✅ [DARF] Loader escondido');
            } else {
                console.warn('⚠️ [DARF] uiManager.hideLoading não disponível');
            }
        }
    }

    /**
     * Carregar lista de DARFs
     */
    async loadDarfs(ano = null, mes = null) {
        console.log('🔵 [DARF] loadDarfs() iniciado', {ano, mes});
        try {
            let url = '/api/darf/?limit=1000';
            if (ano && mes) {
                url += `&ano=${ano}&mes=${mes}`;
            } else if (ano) {
                url += `&ano=${ano}`;
            }
            
            console.log('🔵 [DARF] Fazendo requisição para:', url);
            const response = await this.apiService.get(url);
            console.log('🔵 [DARF] Resposta recebida:', response);
            
            // A resposta pode ser um array direto ou um objeto com data
            this.allDarfs = Array.isArray(response) ? response : (response.data || []);
            console.log('✅ [DARF] allDarfs definido:', this.allDarfs.length, 'registros');
            
            this.renderDarfsTable();
            console.log('✅ [DARF] Tabela renderizada');
            return this.allDarfs;
        } catch (error) {
            console.error('❌ [DARF] Erro ao carregar DARFs:', error);
            this.safeUICall('showNotification', 'Erro ao carregar DARFs', 'error');
            throw error;
        }
    }

    /**
     * Carregar proprietários
     */
    async loadProprietarios() {
        console.log('🔵 [DARF] loadProprietarios() iniciado');
        try {
            const response = await this.apiService.get('/api/proprietarios/');
            console.log('🔵 [DARF] Proprietários recebidos:', response);
            
            // A resposta pode ser um array direto ou um objeto com data
            const proprietariosData = Array.isArray(response) ? response : (response.data || []);
            console.log('🔵 [DARF] Proprietários processados:', proprietariosData.length, 'registros');
            
            this.proprietarios = proprietariosData.sort((a, b) => 
                (a.nome || '').localeCompare(b.nome || '')
            );
            console.log('✅ [DARF] Proprietários ordenados');
            
            return this.proprietarios;
        } catch (error) {
            console.error('❌ [DARF] Erro ao carregar proprietários:', error);
            this.safeUICall('showNotification', 'Erro ao carregar proprietários', 'error');
            throw error;
        }
    }

    /**
     * Renderizar tabela de DARFs
     */
    renderDarfsTable() {
        const tbody = document.getElementById('darfs-table-body');
        if (!tbody) return;

        // Garantir que allDarfs é um array
        if (!Array.isArray(this.allDarfs)) {
            console.warn('allDarfs não é um array:', this.allDarfs);
            this.allDarfs = [];
        }

        if (this.allDarfs.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="5" class="text-center text-muted py-4">
                        <i class="fas fa-inbox fa-2x mb-2"></i>
                        <p>Nenhum DARF encontrado</p>
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = this.allDarfs.map(darf => `
            <tr>
                <td>${this.formatDate(darf.data)}</td>
                <td>${darf.nome_proprietario || 'N/A'}</td>
                <td class="text-end">${this.localeManager.formatCurrency(darf.valor_darf)}</td>
                <td class="text-center">
                    <span class="badge bg-success">
                        <i class="fas fa-check-circle"></i> Cadastrado
                    </span>
                </td>
                <td class="text-end">
                    <button class="btn btn-sm btn-outline-primary" onclick="window.darfModule.editarDarf(${darf.id})">
                        <i class="fas fa-edit"></i> ${this.isMobile ? '' : 'Editar'}
                    </button>
                    <button class="btn btn-sm btn-outline-danger" onclick="window.darfModule.excluirDarf(${darf.id})">
                        <i class="fas fa-trash"></i> ${this.isMobile ? '' : 'Excluir'}
                    </button>
                </td>
            </tr>
        `).join('');
    }

    /**
     * Configurar eventos
     */
    setupEvents() {
        // Botão de importar múltiplos DARFs
        const btnImportar = document.getElementById('btn-importar-darfs');
        if (btnImportar) {
            btnImportar.addEventListener('click', () => this.showImportarModal());
        }

        // Formulário de importação
        const formImportar = document.getElementById('form-importar-darfs');
        if (formImportar) {
            formImportar.addEventListener('submit', (e) => {
                e.preventDefault();
                this.salvarMultiplosDarfs();
            });
        }

        // Filtros
        const filtroAno = document.getElementById('darf-filtro-ano');
        const filtroMes = document.getElementById('darf-filtro-mes');
        
        if (filtroAno) {
            filtroAno.addEventListener('change', () => this.aplicarFiltros());
        }
        
        if (filtroMes) {
            filtroMes.addEventListener('change', () => this.aplicarFiltros());
        }

        // Limpar filtros
        const btnLimpar = document.getElementById('btn-limpar-filtros');
        if (btnLimpar) {
            btnLimpar.addEventListener('click', () => this.limparFiltros());
        }
    }

    /**
     * Aplicar filtros
     */
    async aplicarFiltros() {
        const ano = document.getElementById('darf-filtro-ano')?.value;
        const mes = document.getElementById('darf-filtro-mes')?.value;
        
        this.uiManager.showLoading();
        await this.loadDarfs(ano || null, mes || null);
        this.uiManager.hideLoading();
    }

    /**
     * Limpar filtros
     */
    async limparFiltros() {
        document.getElementById('darf-filtro-ano').value = '';
        document.getElementById('darf-filtro-mes').value = '';
        await this.loadDarfs();
    }

    /**
     * Mostrar modal de importação
     */
    showImportarModal() {
        const modal = new bootstrap.Modal(document.getElementById('modal-importar-darfs'));
        modal.show();

        // Inicializar Handsontable após modal estar visível
        setTimeout(() => {
            this.inicializarHandsontable();
        }, 300);
    }

    /**
     * Inicializar Handsontable para importação múltipla
     */
    inicializarHandsontable() {
        const container = document.getElementById('handsontable-darfs');
        if (!container) return;

        // Destruir instância anterior se existir
        if (this.hotInstance) {
            this.hotInstance.destroy();
        }

        // Iniciar com dados vazios (usuário pode copiar/colar do Excel)
        const dataVazia = [
            ['', '', ''],
            ['', '', ''],
            ['', '', '']
        ];

        this.hotInstance = new Handsontable(container, {
            data: dataVazia,
            colHeaders: ['Proprietário', 'Data (DD/MM/YYYY)', 'Valor DARF'],
            columns: [
                {
                    data: 0,
                    type: 'text',
                    placeholder: 'Nome do proprietário'
                },
                {
                    data: 1,
                    type: 'text',
                    placeholder: 'DD/MM/YYYY'
                },
                {
                    data: 2,
                    type: 'text',
                    placeholder: '0,00',
                    className: 'htRight'
                }
            ],
            rowHeaders: true,
            contextMenu: true,
            minSpareRows: 5,
            stretchH: 'all',
            width: '100%',
            height: 300,
            licenseKey: 'non-commercial-and-evaluation',
            afterChange: (changes, source) => {
                if (source === 'loadData') return;
                this.validarDadosHandsontable();
            }
        });
    }

    /**
     * Validar dados do Handsontable
     */
    validarDadosHandsontable() {
        if (!this.hotInstance) return;

        const data = this.hotInstance.getData();
        let erros = [];

        data.forEach((row, idx) => {
            // Pular linhas vazias
            if (!row[0] && !row[1] && !row[2]) return;

            const proprietario = row[0];
            const data = row[1];
            const valor = row[2];

            // Validar proprietário
            if (!proprietario) {
                erros.push(`Linha ${idx + 1}: Proprietário obrigatório`);
            }

            // Validar data
            if (!data || !data.match(/^\d{2}\/\d{2}\/\d{4}$/)) {
                erros.push(`Linha ${idx + 1}: Data inválida (use DD/MM/YYYY)`);
            }

            // Validar valor
            if (!valor) {
                erros.push(`Linha ${idx + 1}: Valor obrigatório`);
            }
        });

        // Mostrar erros
        const alertContainer = document.getElementById('importacao-alerts');
        if (alertContainer) {
            if (erros.length > 0) {
                alertContainer.innerHTML = `
                    <div class="alert alert-warning">
                        <strong><i class="fas fa-exclamation-triangle"></i> Atenção:</strong>
                        <ul class="mb-0 mt-2">
                            ${erros.map(e => `<li>${e}</li>`).join('')}
                        </ul>
                    </div>
                `;
            } else {
                alertContainer.innerHTML = '';
            }
        }

        return erros.length === 0;
    }

    /**
     * Salvar múltiplos DARFs
     */
    async salvarMultiplosDarfs() {
        if (!this.hotInstance) {
            this.uiManager.showNotification('Erro: Handsontable não inicializado', 'error');
            return;
        }

        // Validar dados
        if (!this.validarDadosHandsontable()) {
            this.uiManager.showNotification('Corrija os erros antes de importar', 'warning');
            return;
        }

        const data = this.hotInstance.getData();
        const darfsParaImportar = [];

        // Processar dados
        data.forEach(row => {
            // Pular linhas vazias
            if (!row[0] && !row[1] && !row[2]) return;

            const proprietario = row[0]?.trim();
            const dataStr = row[1]?.trim();
            const valorStr = row[2]?.trim();

            if (proprietario && dataStr && valorStr) {
                // Normalizar valor
                const valor = this.localeManager.parseNumber(valorStr);

                darfsParaImportar.push({
                    proprietario: proprietario,
                    data: dataStr,
                    valor_darf: valor
                });
            }
        });

        if (darfsParaImportar.length === 0) {
            this.uiManager.showNotification('Nenhum DARF para importar', 'warning');
            return;
        }

        try {
            this.uiManager.showLoading('Importando DARFs...');

            const response = await this.apiService.post(
                '/api/darf/importar-multiplos',
                darfsParaImportar
            );

            // Fechar modal
            const modal = bootstrap.Modal.getInstance(document.getElementById('modal-importar-darfs'));
            if (modal) modal.hide();

            // Mostrar resultados
            this.mostrarResultadosImportacao(response);

            // Recarregar lista
            await this.loadDarfs();

            this.uiManager.hideLoading();
        } catch (error) {
            console.error('Erro ao importar DARFs:', error);
            this.uiManager.showNotification(`Erro ao importar DARFs: ${error.message}`, 'error');
            this.uiManager.hideLoading();
        }
    }

    /**
     * Mostrar resultados da importação
     */
    mostrarResultadosImportacao(resultado) {
        const html = `
            <div class="card">
                <div class="card-header bg-primary text-white">
                    <h5 class="mb-0">
                        <i class="fas fa-check-circle"></i> Resultado da Importação
                    </h5>
                </div>
                <div class="card-body">
                    <div class="row mb-3">
                        <div class="col-md-4">
                            <div class="text-center">
                                <h3 class="text-primary">${resultado.total}</h3>
                                <small class="text-muted">Total</small>
                            </div>
                        </div>
                        <div class="col-md-4">
                            <div class="text-center">
                                <h3 class="text-success">${resultado.sucesso}</h3>
                                <small class="text-muted">Sucesso</small>
                            </div>
                        </div>
                        <div class="col-md-4">
                            <div class="text-center">
                                <h3 class="text-danger">${resultado.erros}</h3>
                                <small class="text-muted">Erros</small>
                            </div>
                        </div>
                    </div>
                    
                    ${resultado.detalhes && resultado.detalhes.length > 0 ? `
                        <div class="table-responsive">
                            <table class="table table-sm table-hover">
                                <thead>
                                    <tr>
                                        <th>#</th>
                                        <th>Proprietário</th>
                                        <th>Data</th>
                                        <th>Valor</th>
                                        <th>Status</th>
                                        <th>Mensagem</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${resultado.detalhes.map(d => `
                                        <tr class="${d.status === 'erro' ? 'table-danger' : d.status === 'atualizado' ? 'table-warning' : 'table-success'}">
                                            <td>${d.linha}</td>
                                            <td>${d.proprietario}</td>
                                            <td>${d.data}</td>
                                            <td class="text-end">${this.localeManager.formatCurrency(d.valor)}</td>
                                            <td>
                                                ${d.status === 'criado' ? '<span class="badge bg-success">Criado</span>' : ''}
                                                ${d.status === 'atualizado' ? '<span class="badge bg-warning">Atualizado</span>' : ''}
                                                ${d.status === 'erro' ? '<span class="badge bg-danger">Erro</span>' : ''}
                                            </td>
                                            <td>${d.mensagem}</td>
                                        </tr>
                                    `).join('')}
                                </tbody>
                            </table>
                        </div>
                    ` : ''}
                </div>
            </div>
        `;

        // Mostrar em modal
        const modalResultados = new bootstrap.Modal(document.getElementById('modal-resultados-importacao'));
        document.getElementById('resultados-importacao-content').innerHTML = html;
        modalResultados.show();
    }

    /**
     * Editar DARF
     */
    async editarDarf(id) {
        // TODO: Implementar edição de DARF individual
        this.uiManager.showNotification('Funcionalidade em desenvolvimento', 'info');
    }

    /**
     * Excluir DARF
     */
    async excluirDarf(id) {
        if (!confirm('Tem certeza que deseja excluir este DARF?')) return;

        try {
            this.uiManager.showLoading();

            await this.apiService.delete(`/api/darf/${id}`);

            this.uiManager.showNotification('DARF excluído com sucesso', 'success');
            await this.loadDarfs();

            this.uiManager.hideLoading();
        } catch (error) {
            console.error('Erro ao excluir DARF:', error);
            this.uiManager.showNotification(`Erro ao excluir DARF: ${error.message}`, 'error');
            this.uiManager.hideLoading();
        }
    }

    /**
     * Formatar data
     */
    formatDate(dateStr) {
        if (!dateStr) return 'N/A';
        const parts = dateStr.split('-');
        if (parts.length !== 3) return dateStr;
        return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
}
