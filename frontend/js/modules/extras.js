/**
 * Módulo de Extras - Sistema de Alias
 * Acesso exclusivo para administradores
 */

class ExtrasManager {
    /**
     * Cierra el modal por id y devuelve el foco al botón indicado
     */
    safeCloseModal(modalId, buttonId) {
        const modalEl = document.getElementById(modalId);
        if (modalEl) {
            const modalInstance = bootstrap.Modal.getInstance(modalEl) || new bootstrap.Modal(modalEl);
            modalInstance.hide();
        }
        if (buttonId) {
            const btn = document.getElementById(buttonId);
            if (btn) {
                setTimeout(() => btn.focus(), 300);
            }
        }
    }

    constructor() {
        this.apiService = window.apiService;
        this.uiManager = window.uiManager;
        this.currentExtra = null;
        this.currentTransferencia = null;
        this.allExtras = [];
        this.allTransferencias = [];
        this.allProprietarios = [];
        this.initialized = false;
        this.pendingOperations = new Set();
        this.isMobile = document.body.classList.contains('device-mobile');
        // Binding de métodos
        this.load = this.load.bind(this);
        this.loadExtras = this.loadExtras.bind(this);
        this.loadProprietarios = this.loadProprietarios.bind(this);
    }

    

    /**
     * Inicializar eventos
     */
    setupEvents() {
        // Botões principais
        document.getElementById('btn-novo-alias')?.addEventListener('click', () => {
            this.showAliasModal();
        });

        document.getElementById('btn-novas-transferencias')?.addEventListener('click', () => {
            this.showTransferenciasModal();
        });

        // Formulários
        document.getElementById('form-alias')?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.salvarAlias();
        });

        // Event delegation para formulário de transferências (pode não existir no DOM ainda)
        document.addEventListener('submit', (e) => {
            if (e.target && e.target.id === 'form-transferencias') {
                e.preventDefault();
                this.salvarTransferencias();
            }
        });

        document.addEventListener('DOMContentLoaded', () => {
        });

        // Evento para carregar proprietários do alias selecionado na transferência
        document.getElementById('transferencia-alias')?.addEventListener('change', (e) => {
            const aliasId = e.target.value;
            if (aliasId) {
                this.carregarProprietariosTransferencia(aliasId);
            } else {
                const container = document.getElementById('transferencia-proprietarios-container');
                if (container) container.style.display = 'none';
            }
        });

        // Limpar currentTransferencia quando o modal fechar
        document.getElementById('modal-transferencias')?.addEventListener('hidden.bs.modal', () => {
            this.currentTransferencia = null;
        });

        // Event listeners para botões de cancelar para gerenciamento de foco
        const setupCancelButtonHandlers = () => {
            // Botões de cancelar nos modais
            const cancelButtons = document.querySelectorAll('button[data-bs-dismiss="modal"], .btn-secondary');
            cancelButtons.forEach(button => {
                button.addEventListener('click', () => {
                    // Remover foco imediatamente do botão
                    setTimeout(() => button.blur(), 10);
                });
            });
        };

        // Configurar handlers iniciais
        setupCancelButtonHandlers();

        // Reconfigurar handlers quando os modais forem exibidos (caso o DOM tenha mudado)
        document.addEventListener('shown.bs.modal', setupCancelButtonHandlers);

    }

    /**
     * Carregar módulo quando ativado
     */
    async load() {
        
        if (!this.initialized) {
            this.setupEvents();
            this.initialized = true;
        }

        // Verificar se o usuário é administrador antes de carregar dados
        const isAdmin = window.authService && window.authService.isAdmin();
        if (!isAdmin) {
            return;
        }

        try {
            await this.loadProprietarios();
            await this.loadExtras();
            await this.loadTransferencias();
        } catch (error) {
            console.error('Erro ao carregar dados dos extras:', error);
            this.showError('Erro ao carregar dados: ' + error.message);
        }
    }

    /**
     * Carregar lista de extras
     */
    async loadExtras() {
        try {
            // Verificar se o usuário é administrador antes de fazer a chamada
            const isAdmin = window.authService && window.authService.isAdmin();
            if (!isAdmin) {
                this.renderExtrasTable([]);
                return;
            }

            
            const response = await this.apiService.get('/api/extras/?ativo=true');
            
            if (response && response.success && Array.isArray(response.data)) {
                this.allExtras = response.data;
                // Refuerzo: recargar propietarios antes de renderizar la tabla
                await this.loadProprietarios();
                this.renderExtrasTable(this.allExtras);
            } else {
                throw new Error('Resposta inválida do servidor');
            }
        } catch (error) {
            console.error('Erro ao carregar extras:', error);
            this.showError('Erro ao carregar extras: ' + error.message);
            this.renderExtrasTable([]);
        }
    }

    /**
     * Carregar proprietários para seleção
     */
    async loadProprietarios() {
        try {
            console.log('loadProprietarios: Iniciando...');
            
            // Verificar se o usuário é administrador antes de fazer a chamada
            const isAdmin = window.authService && window.authService.isAdmin();
            console.log('loadProprietarios: É admin?', isAdmin);
            
            if (!isAdmin) {
                console.warn('loadProprietarios: Usuário não é admin, abortando');
                return;
            }

            console.log('loadProprietarios: Fazendo requisição à API...');
            const response = await this.apiService.get('/api/extras/proprietarios/disponiveis');
            console.log('loadProprietarios: Resposta recebida:', response);
            
            if (response && response.success && Array.isArray(response.data)) {
                this.allProprietarios = response.data;
                console.log(`loadProprietarios: ${this.allProprietarios.length} proprietários carregados`);
                this.populateProprietariosSelects();
            } else {
                throw new Error('Resposta inválida do servidor');
            }
        } catch (error) {
            console.error('Erro ao carregar proprietários:', error);
            this.showError('Erro ao carregar proprietários: ' + error.message);
        }
    }

    /**
     * Mostrar mensagem de erro
     */
    showError(message) {
        if (this.uiManager && this.uiManager.showAlert) {
            this.uiManager.showAlert(message, 'danger');
        } else {
            console.error('UIManager não disponível:', message);
        }
    }

    /**
     * Popular selects de proprietários
     */
    populateProprietariosSelects() {
        // Este método configura selects múltiplos de proprietários quando necessário
        // Por enquanto, apenas garante que os proprietários estão disponíveis
        if (this.allProprietarios && this.allProprietarios.length > 0) {
            console.log(`Proprietários carregados: ${this.allProprietarios.length}`);
        }
    }

    /**
     * Renderizar tabela de extras
     */
    renderExtrasTable(extras) {
        if (this.isMobile) {
            this.renderExtrasMobile(extras);
            return;
        }

        const tbody = document.getElementById('extras-table-body');
        if (!tbody) return;

        // Limpiar completamente el tbody antes de repintar
        while (tbody.firstChild) {
            tbody.removeChild(tbody.firstChild);
        }

        if (!extras || extras.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="3" class="text-center text-muted py-4">
                        <i class="fas fa-inbox fa-2x mb-2"></i><br>
                        Nenhum alias encontrado
                    </td>
                </tr>
            `;
            return;
        }

        extras.forEach((extra, index) => {
            const row = document.createElement('tr');
            // Processar proprietários
            let proprietariosText = 'Nenhum';
            if (extra.id_proprietarios) {
                try {
                    const proprietarioIds = JSON.parse(extra.id_proprietarios);
                    const nomes = proprietarioIds.map(id => {
                        const prop = this.allProprietarios.find(p => p.id === id);
                        return prop ? prop.nome : `ID:${id}`;
                    });
                    proprietariosText = nomes.length > 0 ? nomes.join(', ') : 'Nenhum';
                } catch (e) {
                    proprietariosText = 'Erro no formato';
                }
            }

            const isAdmin = window.authService && window.authService.isAdmin();
            const disabledAttr = isAdmin ? '' : 'disabled';
            const disabledClass = isAdmin ? '' : 'opacity-50';
            const titleAttr = isAdmin ? 'title="Editar"' : 'title="Apenas administradores podem editar"';
            const deleteTitleAttr = isAdmin ? 'title="Excluir"' : 'title="Apenas administradores podem excluir"';

            row.innerHTML = `
                <td><strong>${extra.alias}</strong></td>
                <td title="${proprietariosText}">
                    ${proprietariosText.length > 50 ? proprietariosText.substring(0, 50) + '...' : proprietariosText}
                </td>
                <td class="text-center">
                    <div class="btn-group btn-group-sm">
                        <button class="btn btn-outline-primary edit-alias-btn ${disabledClass}" data-id="${extra.id}" ${disabledAttr} ${titleAttr}>
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn btn-outline-danger delete-alias-btn ${disabledClass}" data-id="${extra.id}" ${disabledAttr} ${deleteTitleAttr}>
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            `;
            tbody.appendChild(row);
        });

        // Adicionar event listeners para botões de editar e excluir alias
        this.setupAliasEventListeners();
    }

    /**
     * Renderizar cards móveis para extras/alias
     */
    renderExtrasMobile(extras) {
        const tbody = document.getElementById('extras-table-body');
        if (!tbody) return;

        // Limpar tbody completamente
        while (tbody.firstChild) {
            tbody.removeChild(tbody.firstChild);
        }

        if (!extras || extras.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="3" class="text-center text-muted py-4">
                        <i class="fas fa-inbox fa-2x mb-2"></i><br>
                        Nenhum alias encontrado
                    </td>
                </tr>
            `;
            return;
        }

        const isAdmin = window.authService && window.authService.isAdmin();

        extras.forEach((extra) => {
            // Processar proprietários
            let proprietariosText = 'Nenhum';
            let proprietariosList = [];
            if (extra.id_proprietarios) {
                try {
                    const proprietarioIds = JSON.parse(extra.id_proprietarios);
                    proprietariosList = proprietarioIds.map(id => {
                        const prop = this.allProprietarios.find(p => p.id === id);
                        return prop ? prop.nome : `ID:${id}`;
                    });
                    proprietariosText = proprietariosList.length > 0 ? proprietariosList.join(', ') : 'Nenhum';
                } catch (e) {
                    proprietariosText = 'Erro no formato';
                }
            }

            // Criar lista de proprietários como badges
            const proprietariosBadges = proprietariosList.length > 0 
                ? proprietariosList.map(nome => `<span class="badge bg-info text-dark me-1 mb-1">${nome}</span>`).join('')
                : '<span class="text-muted">Nenhum proprietário</span>';

            const row = document.createElement('tr');
            row.style.display = 'block';
            row.style.marginBottom = '1rem';
            row.innerHTML = `
                <td colspan="3" style="display: block; padding: 0;">
                    <div class="card mobile-card shadow-sm">
                        <div class="card-header bg-gradient-primary text-white d-flex justify-content-between align-items-center">
                            <h6 class="mb-0"><i class="fas fa-tag me-2"></i>${extra.alias}</h6>
                            <span class="badge bg-light text-primary">${proprietariosList.length} ${proprietariosList.length === 1 ? 'Proprietário' : 'Proprietários'}</span>
                        </div>
                        <div class="card-body">
                            <div class="mb-2">
                                <small class="text-muted d-block mb-1"><i class="fas fa-users me-1"></i>Proprietários:</small>
                                <div class="proprietarios-badges">
                                    ${proprietariosBadges}
                                </div>
                            </div>
                        </div>
                        <div class="card-footer bg-light d-flex justify-content-end gap-2">
                            <button class="btn btn-sm btn-primary edit-alias-btn ${!isAdmin ? 'disabled' : ''}" 
                                    data-id="${extra.id}" 
                                    ${!isAdmin ? 'disabled' : ''} 
                                    title="${isAdmin ? 'Editar alias' : 'Apenas administradores podem editar'}">
                                <i class="fas fa-edit"></i> Editar
                            </button>
                            <button class="btn btn-sm btn-danger delete-alias-btn ${!isAdmin ? 'disabled' : ''}" 
                                    data-id="${extra.id}" 
                                    ${!isAdmin ? 'disabled' : ''} 
                                    title="${isAdmin ? 'Excluir alias' : 'Apenas administradores podem excluir'}">
                                <i class="fas fa-trash"></i> Excluir
                            </button>
                        </div>
                    </div>
                </td>
            `;
            tbody.appendChild(row);
        });

        // Adicionar event listeners para botões de editar e excluir alias
        this.setupAliasEventListeners();
    }

    /**
     * Configurar event listeners para botões de alias
     */
    setupAliasEventListeners() {
        const tbody = document.getElementById('extras-table-body');
        if (!tbody) return;

        // Event delegation para botões de editar
        tbody.querySelectorAll('.edit-alias-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                const id = btn.getAttribute('data-id');
                if (id) this.editarAlias(parseInt(id));
            });
        });

        // Event delegation para botões de excluir
        tbody.querySelectorAll('.delete-alias-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                const id = btn.getAttribute('data-id');
                if (id) this.excluirAlias(parseInt(id));
            });
        });
    }

    /**
     * Editar alias
     */
    async editarAlias(aliasId) {
        try {
            console.log(`Editando alias ID: ${aliasId}`);

            // Carregar dados do alias
            const response = await this.apiService.get(`/api/extras/${aliasId}`);
            if (!response || !response.success) {
                this.uiManager.showAlert('Erro ao carregar dados do alias', 'danger');
                return;
            }

            const alias = response.data;
            console.log('Dados do alias:', alias);

            // Mostrar modal de edição
            await this.showAliasModal(alias);
        } catch (error) {
            console.error('Erro ao editar alias:', error);
            this.uiManager.showAlert('Erro ao carregar alias para edição', 'danger');
        }
    }

    /**
     * Excluir alias
     */
    async excluirAlias(aliasId) {
        if (!confirm('Tem certeza que deseja excluir este alias? Esta ação não pode ser desfeita.')) {
            return;
        }

        try {
            console.log(`Excluindo alias ID: ${aliasId}`);

            const response = await this.apiService.delete(`/api/extras/${aliasId}`);
            if (response && response.success) {
                this.uiManager.showAlert('Alias excluído com sucesso!', 'success');
                // Recarregar lista de extras
                await this.loadExtras();
            } else {
                this.uiManager.showAlert('Erro ao excluir alias', 'danger');
            }
        } catch (error) {
            console.error('Erro ao excluir alias:', error);
            this.uiManager.showAlert('Erro ao excluir alias', 'danger');
        }
    }

    /**
     * Carregar transferências cadastradas
     */
    async loadTransferencias() {
        try {
            // Verificar se o usuário é administrador antes de fazer a chamada
            const isAdmin = window.authService && window.authService.isAdmin();
            if (!isAdmin) {
                this.renderTransferenciasTable([]);
                return;
            }

            
            const response = await this.apiService.get('/api/transferencias/');
            
            if (response && Array.isArray(response)) {
                this.allTransferencias = response;
                
                this.renderTransferenciasTable(this.allTransferencias);
            } else if (response && response.success && Array.isArray(response.data)) {
                this.allTransferencias = response.data;
                
                this.renderTransferenciasTable(this.allTransferencias);
            } else {
                console.warn('⚠️ Resposta inválida da API de transferências:', response);
                this.renderTransferenciasTable([]);
            }

        } catch (error) {
            console.error('Erro ao carregar transferências:', error);
            this.showError('Erro ao carregar transferências: ' + error.message);
            this.renderTransferenciasTable([]);
        }
    }

    /**
     * Renderizar tabela de transferências
     */
    renderTransferenciasTable(transferencias) {
        if (this.isMobile) {
            this.renderTransferenciasMobile(transferencias);
            return;
        }

        const tbody = document.getElementById('transferencias-table-body');
        if (!tbody) return;

        if (!transferencias || transferencias.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="5" class="text-center text-muted py-4">
                        <i class="fas fa-inbox fa-2x mb-2"></i><br>
                        Nenhuma transferência encontrada
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = '';
        
        transferencias.forEach((transferencia, index) => {
            const row = document.createElement('tr');
            
            const dataCriacaoFormatada = transferencia.data_criacao ? 
                new Date(transferencia.data_criacao).toLocaleDateString('pt-BR') : '-';
            
            const dataFimFormatada = transferencia.data_fim ? 
                new Date(transferencia.data_fim).toLocaleDateString('pt-BR') : '-';
            
            const isAdmin = window.authService && window.authService.isAdmin();
            const disabledAttr = isAdmin ? '' : 'disabled';
            const disabledClass = isAdmin ? '' : 'opacity-50';
            const titleAttr = isAdmin ? 'title="Editar"' : 'title="Apenas administradores podem editar"';
            const deleteTitleAttr = isAdmin ? 'title="Excluir"' : 'title="Apenas administradores podem excluir"';

            row.innerHTML = `
                <td><strong>${transferencia.alias}</strong></td>
                <td>${transferencia.nome_transferencia}</td>
                <td class="text-center">${dataCriacaoFormatada}</td>
                <td class="text-center">${dataFimFormatada}</td>
                <td class="text-center">
                    <div class="btn-group btn-group-sm">
                        <button class="btn btn-outline-primary edit-transferencia-btn ${disabledClass}" data-id="${transferencia.id}" ${disabledAttr} ${titleAttr}>
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn btn-outline-danger delete-transferencia-btn ${disabledClass}" data-id="${transferencia.id}" ${disabledAttr} ${deleteTitleAttr}>
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            `;
            
            tbody.appendChild(row);
        });

        // Adicionar event listeners para botões de editar e excluir transferências
        this.setupTransferenciaEventListeners();
    }

    /**
     * Renderizar cards móveis para transferências
     */
    renderTransferenciasMobile(transferencias) {
                             const tbody = document.getElementById('transferencias-table-body');
        if (!tbody) return;

        if (!transferencias || transferencias.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="5" class="text-center text-muted py-4">
                        <i class="fas fa-inbox fa-2x mb-2"></i><br>
                        Nenhuma transferência encontrada
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = '';

        const isAdmin = window.authService && window.authService.isAdmin();

        transferencias.forEach((transferencia) => {
            const dataCriacaoFormatada = transferencia.data_criacao ? 
                new Date(transferencia.data_criacao).toLocaleDateString('pt-BR') : 'Não informada';
            
            const dataFimFormatada = transferencia.data_fim ? 
                new Date(transferencia.data_fim).toLocaleDateString('pt-BR') : 'Sem data fim';
            
            // Calcular status baseado nas datas
            let statusBadge = '';
            let statusClass = '';
            if (transferencia.data_fim) {
                const dataFim = new Date(transferencia.data_fim);
                const hoje = new Date();
                if (dataFim < hoje) {
                    statusBadge = '<span class="badge bg-secondary">Encerrada</span>';
                    statusClass = 'border-secondary';
                } else {
                    statusBadge = '<span class="badge bg-success">Ativa</span>';
                    statusClass = 'border-success';
                }
            } else {
                statusBadge = '<span class="badge bg-primary">Ativa</span>';
                statusClass = 'border-primary';
            }

            // Processar proprietários e valores
            let proprietariosHtml = '';
            if (transferencia.id_proprietarios) {
                try {
                    const proprietarios = JSON.parse(transferencia.id_proprietarios);
                    proprietariosHtml = proprietarios.map(prop => {
                        const proprietario = this.allProprietarios.find(p => p.id === prop.id);
                        const nome = proprietario ? proprietario.nome : `ID:${prop.id}`;
                        const valor = prop.valor ? window.localeManager.formatCurrency(prop.valor) : '0,00';
                        return `
                            <li class="list-group-item d-flex justify-content-between align-items-center py-2">
                                <span><i class="fas fa-user-circle me-1 text-primary"></i>${nome}</span>
                                <span class="badge bg-success rounded-pill">R$ ${valor}</span>
                            </li>
                        `;
                    }).join('');
                } catch (e) {
                    proprietariosHtml = '<li class="list-group-item text-muted">Erro ao carregar proprietários</li>';
                }
            } else {
                proprietariosHtml = '<li class="list-group-item text-muted">Nenhum proprietário vinculado</li>';
            }

            const valorTotal = transferencia.valor_total ? 
                window.localeManager.formatCurrency(transferencia.valor_total) : '0,00';

            const row = document.createElement('tr');
            row.style.display = 'block';
            row.style.marginBottom = '1rem';
            row.innerHTML = `
                <td colspan="5" style="display: block; padding: 0;">
                    <div class="card mobile-card shadow-sm ${statusClass}">
                        <div class="card-header bg-gradient-info text-white">
                            <div class="d-flex justify-content-between align-items-start">
                                <div>
                                    <h6 class="mb-1"><i class="fas fa-exchange-alt me-2"></i>${transferencia.nome_transferencia}</h6>
                                    <small><i class="fas fa-tag me-1"></i>Alias: <strong>${transferencia.alias}</strong></small>
                                </div>
                                ${statusBadge}
                            </div>
                        </div>
                        <div class="card-body p-0">
                            <ul class="list-group list-group-flush">
                                ${proprietariosHtml}
                            </ul>
                            <div class="p-3 bg-light border-top">
                                <div class="row g-2">
                                    <div class="col-6">
                                        <small class="text-muted d-block"><i class="fas fa-calendar-plus me-1"></i>Data Criação</small>
                                        <strong class="d-block">${dataCriacaoFormatada}</strong>
                                    </div>
                                    <div class="col-6">
                                        <small class="text-muted d-block"><i class="fas fa-calendar-times me-1"></i>Data Fim</small>
                                        <strong class="d-block">${dataFimFormatada}</strong>
                                    </div>
                                </div>
                                <div class="mt-2 pt-2 border-top">
                                    <div class="d-flex justify-content-between align-items-center">
                                        <span class="text-muted"><i class="fas fa-coins me-1"></i>Valor Total:</span>
                                        <strong class="text-success fs-5">R$ ${valorTotal}</strong>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div class="card-footer bg-white d-flex justify-content-end gap-2">
                            <button class="btn btn-sm btn-primary edit-transferencia-btn ${!isAdmin ? 'disabled' : ''}" 
                                    data-id="${transferencia.id}" 
                                    ${!isAdmin ? 'disabled' : ''} 
                                    title="${isAdmin ? 'Editar transferência' : 'Apenas administradores podem editar'}">
                                <i class="fas fa-edit"></i> Editar
                            </button>
                            <button class="btn btn-sm btn-danger delete-transferencia-btn ${!isAdmin ? 'disabled' : ''}" 
                                    data-id="${transferencia.id}" 
                                    ${!isAdmin ? 'disabled' : ''} 
                                    title="${isAdmin ? 'Excluir transferência' : 'Apenas administradores podem excluir'}">
                                <i class="fas fa-trash"></i> Excluir
                            </button>
                        </div>
                    </div>
                </td>
            `;
            tbody.appendChild(row);
        });

        // Adicionar event listeners para botões de editar e excluir transferências
        this.setupTransferenciaEventListeners();
    }

    /**
     * Configurar event listeners para botões de transferência
     */
    setupTransferenciaEventListeners() {
        const tbody = document.getElementById('transferencias-table-body');
        if (!tbody) return;

        // Event delegation para botões de editar
        tbody.querySelectorAll('.edit-transferencia-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                const id = btn.getAttribute('data-id');
                if (id) this.editarTransferencia(parseInt(id));
            });
        });

        // Event delegation para botões de excluir
        tbody.querySelectorAll('.delete-transferencia-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                const id = btn.getAttribute('data-id');
                if (id) this.excluirTransferencia(parseInt(id));
            });
        });
    }

    /**
     * Editar transferência
     */
    async editarTransferencia(id) {
        try {
            console.log(`Editando transferência ID: ${id}`);

            // Carregar dados da transferência
            const response = await this.apiService.get(`/api/transferencias/${id}`);
            if (!response || !response.success) {
                console.error('Resposta da API falhou:', response);
                this.uiManager.showAlert('Erro ao carregar dados da transferência', 'danger');
                return;
            }

            const transferencia = response.data;
            console.log('Dados da transferência carregados:', transferencia);

            // Definir transferência atual para modo edição
            this.currentTransferencia = transferencia;
            console.log('currentTransferencia definido:', this.currentTransferencia);

            // Mostrar modal (que irá carregar aliases e configurar formulário)
            console.log('Chamando showTransferenciasModal...');
            await this.showTransferenciasModal();
            console.log('showTransferenciasModal concluído');

        } catch (error) {
            console.error('Erro ao editar transferência:', error);
            this.uiManager.showAlert('Erro ao carregar transferência para edição', 'danger');
        }
    }

    /**
     * Excluir transferência
     */
    async excluirTransferencia(id) {
        try {
            console.log(`Excluindo transferência ID: ${id}`);

            // Configurar modal de confirmação
            const modal = document.getElementById('modal-confirmar-exclusao');
            const msgElement = document.getElementById('modal-confirmar-exclusao-msg');
            const confirmBtn = document.getElementById('btn-confirmar-exclusao');

            if (!modal || !msgElement || !confirmBtn) {
                console.error('Modal de confirmação não encontrado');
                return;
            }

            // Atualizar mensagem
            msgElement.textContent = 'Tem certeza que deseja excluir esta transferência? Esta ação não pode ser desfeita.';

            // Configurar evento do botão confirmar
            const handleConfirm = async () => {
                try {
                    // Desabilitar botão
                    confirmBtn.disabled = true;
                    confirmBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-1"></i>Excluindo...';

                    // Fazer requisição de exclusão
                    const response = await this.apiService.delete(`/api/transferencias/${id}`);

                    if (response && response.success) {
                        this.uiManager.showAlert('Transferência excluída com sucesso!', 'success');
                        
                        // Fechar modal
                        const bootstrapModal = bootstrap.Modal.getInstance(modal);
                        if (bootstrapModal) {
                            bootstrapModal.hide();
                        }

                        // Recarregar lista de transferências
                        await this.carregarTransferencias();
                    } else {
                        throw new Error(response?.error || 'Erro ao excluir transferência');
                    }
                } catch (error) {
                    console.error('Erro ao excluir transferência:', error);
                    this.uiManager.showAlert('Erro ao excluir transferência', 'danger');
                } finally {
                    // Reabilitar botão
                    confirmBtn.disabled = false;
                    confirmBtn.innerHTML = '<i class="fas fa-trash me-1"></i> Excluir';
                    
                    // Remover event listener
                    confirmBtn.removeEventListener('click', handleConfirm);
                }
            };

            // Adicionar event listener
            confirmBtn.addEventListener('click', handleConfirm);

            // Mostrar modal
            const bootstrapModal = new bootstrap.Modal(modal);
            bootstrapModal.show();

        } catch (error) {
            console.error('Erro ao configurar exclusão:', error);
            this.uiManager.showAlert('Erro ao configurar exclusão', 'danger');
        }
    }

    /**
     * Carregar transferências
     */
    async carregarTransferencias() {
        try {
            const response = await this.apiService.get('/api/transferencias/');
            if (response && response.success && Array.isArray(response.data)) {
                this.allTransferencias = response.data;
                this.renderTransferenciasTable(this.allTransferencias);
            } else {
                throw new Error('Erro ao carregar transferências');
            }
        } catch (error) {
            console.error('Erro ao carregar transferências:', error);
            this.showError('Erro ao carregar transferências: ' + error.message);
        }
    }

    /**
     * Salvar alias (criar ou atualizar)
     */
    async salvarAlias() {
        try {
            const form = document.getElementById('form-alias');
            if (!form) {
                console.error('Formulário de alias não encontrado');
                return;
            }

            const formData = new FormData(form);
            const aliasNome = formData.get('alias-nome')?.trim();
            const proprietariosSelecionados = formData.getAll('proprietarios[]');

            if (!aliasNome) {
                this.uiManager.showAlert('Nome do alias é obrigatório', 'warning');
                return;
            }

            if (proprietariosSelecionados.length === 0) {
                this.uiManager.showAlert('Selecione pelo menos um proprietário', 'warning');
                return;
            }

            const aliasData = {
                alias: aliasNome,
                id_proprietarios: JSON.stringify(proprietariosSelecionados.map(id => parseInt(id)))
            };

            let response;
            if (this.currentExtra && this.currentExtra.id) {
                // Atualizar alias existente
                response = await this.apiService.put(`/api/extras/${this.currentExtra.id}`, aliasData);
            } else {
                // Criar novo alias
                response = await this.apiService.post('/api/extras/', aliasData);
            }

            if (response && response.success) {
                const action = this.currentExtra ? 'atualizado' : 'criado';
                this.uiManager.showAlert(`Alias ${action} com sucesso!`, 'success');

                // Fechar modal
                const modal = document.getElementById('modal-alias');
                if (modal) {
                    const bootstrapModal = bootstrap.Modal.getInstance(modal);
                    if (bootstrapModal) {
                        bootstrapModal.hide();
                    }
                }

                // Recarregar lista de extras
                await this.loadExtras();
            } else {
                this.uiManager.showAlert('Erro ao salvar alias', 'danger');
            }
        } catch (error) {
            console.error('Erro ao salvar alias:', error);
            this.uiManager.showAlert('Erro ao salvar alias', 'danger');
        }
    }

    /**
     * Mostrar modal de alias (criar/editar)
     */
    async showAliasModal(alias = null) {
        try {
            console.log('showAliasModal: Iniciando...', alias ? 'Edição' : 'Novo');
            
            const modal = document.getElementById('modal-alias');
            const form = document.getElementById('form-alias');
            const modalTitle = document.getElementById('modalAliasLabel');

            console.log('showAliasModal: Elementos encontrados:', { modal: !!modal, form: !!form, modalTitle: !!modalTitle });

            if (!modal || !form || !modalTitle) {
                console.error('Elementos do modal de alias não encontrados');
                return;
            }

            // Limpar alertas
            const alerts = document.getElementById('alias-alerts');
            if (alerts) alerts.innerHTML = '';

            // Configurar modal para criação ou edição
            if (!alias) {
                // Modo criação
                console.log('showAliasModal: Modo criação - resetando formulário');
                form.reset();
                modalTitle.innerHTML = '<i class="fas fa-plus me-2"></i>Novo Alias';
                this.currentExtra = null;
            } else {
                // Modo edição
                console.log('showAliasModal: Modo edição - carregando dados do alias');
                modalTitle.innerHTML = '<i class="fas fa-edit me-2"></i>Editar Alias';
                this.currentExtra = alias;

                // Preencher campos
                const nomeInput = document.getElementById('alias-nome');
                if (nomeInput) nomeInput.value = alias.alias || '';

                // Carregar proprietários do alias
                await this.carregarProprietariosAlias(alias.id);
            }

            // Carregar proprietários disponíveis
            console.log('showAliasModal: Chamando preencherSelectProprietarios...');
            await this.preencherSelectProprietarios();

            // Mostrar modal
            console.log('showAliasModal: Mostrando modal...');
            const bootstrapModal = new bootstrap.Modal(modal);
            bootstrapModal.show();
            console.log('showAliasModal: Modal exibido com sucesso');

        } catch (error) {
            console.error('Erro ao mostrar modal de alias:', error);
            this.uiManager.showAlert('Erro ao abrir modal de alias', 'danger');
        }
    }

    /**
     * Mostrar modal de transferências (criar/editar)
     */
    async showTransferenciasModal() {
        try {
            const modal = document.getElementById('modal-transferencias');
            const form = document.getElementById('form-transferencias');
            const modalTitle = document.getElementById('modalTransferenciasLabel');

            console.log('showTransferenciasModal: Elementos encontrados:', {
                modal: !!modal,
                form: !!form,
                modalTitle: !!modalTitle
            });

            if (!modal || !form || !modalTitle) {
                console.error('Elementos do modal de transferências não encontrados');
                return;
            }

            // Limpar alertas
            const alerts = document.getElementById('transferencia-alerts');
            if (alerts) alerts.innerHTML = '';

            // Configurar modal para criação ou edição
            if (!this.currentTransferencia) {
                // Modo criação
                form.reset();
                modalTitle.innerHTML = '<i class="fas fa-exchange-alt me-2"></i>Nova Transferência';
                
                // Inicializar data de criação com a data atual
                const dataCriacaoInput = document.getElementById('transferencia-data-criacao');
                if (dataCriacaoInput) {
                    const hoje = new Date();
                    const dataFormatada = hoje.toISOString().split('T')[0];
                    dataCriacaoInput.value = dataFormatada;
                }
                
                // Limpar data fim
                const dataFimInput = document.getElementById('transferencia-data-fim');
                if (dataFimInput) dataFimInput.value = '';
                
                // Ocultar contêiner de proprietários até selecionar alias
                const container = document.getElementById('transferencia-proprietarios-container');
                if (container) container.style.display = 'none';
            } else {
                // Modo edição
                modalTitle.innerHTML = '<i class="fas fa-edit me-2"></i>Editar Transferência';
                
                // Preencher campos com dados da transferência atual
                const nomeInput = document.getElementById('transferencia-nome');
                if (nomeInput && this.currentTransferencia.nome_transferencia) {
                    nomeInput.value = this.currentTransferencia.nome_transferencia;
                }
                
                const dataCriacaoInput = document.getElementById('transferencia-data-criacao');
                if (dataCriacaoInput && this.currentTransferencia.data_criacao) {
                    // Usar apenas a parte da data (YYYY-MM-DD) para evitar problemas de fuso horário
                    const dataString = this.currentTransferencia.data_criacao;
                    const dataFormatada = dataString.includes('T') ? dataString.split('T')[0] : dataString;
                    dataCriacaoInput.value = dataFormatada;
                }
                
                const dataFimInput = document.getElementById('transferencia-data-fim');
                if (dataFimInput && this.currentTransferencia.data_fim) {
                    // Usar apenas a parte da data (YYYY-MM-DD) para evitar problemas de fuso horário
                    const dataString = this.currentTransferencia.data_fim;
                    const dataFormatada = dataString.includes('T') ? dataString.split('T')[0] : dataString;
                    dataFimInput.value = dataFormatada;
                } else if (dataFimInput) {
                    // Limpar data fim se não existir
                    dataFimInput.value = '';
                }
            }

            // Carregar aliases disponíveis primeiro
            await this.carregarAliasParaTransferencia();

            // Agora que os aliases estão carregados, definir o valor selecionado se estiver editando
            if (this.currentTransferencia && this.currentTransferencia.alias_id) {
                const aliasSelect = document.getElementById('transferencia-alias');
                if (aliasSelect) {
                    aliasSelect.value = this.currentTransferencia.alias_id;
                    // Carregar proprietários do alias selecionado com valores da transferência
                    this.carregarProprietariosTransferencia(this.currentTransferencia.alias_id, this.currentTransferencia.id_proprietarios);
                }
            }

            // Mostrar modal
            const bootstrapModal = new bootstrap.Modal(modal);
            bootstrapModal.show();

        } catch (error) {
            console.error('Erro ao mostrar modal de transferências:', error);
            this.uiManager.showAlert('Erro ao abrir modal de transferências', 'danger');
        }
    }

    /**
     * Mostrar modal de múltiplas transferências
     */
    showMultiplasTransferenciasModal() {
        console.log('showMultiplasTransferenciasModal chamado');
        
        const modal = document.getElementById('modal-multiplas-transferencias');
        if (!modal) {
            console.error('Modal de múltiplas transferências não encontrado');
            return;
        }

        console.log('Modal encontrado, carregando aliases...');
        // Carregar aliases se ainda não foram carregados
        this.carregarAliasParaMultiplasTransferencias();

        // Configurar event listener do formulário
        const form = document.getElementById('form-multiplas-transferencias');
        if (form) {
            // Remover listener anterior (se existir) clonando o formulário
            if (!form.dataset.submitListenerAttached) {
                form.addEventListener('submit', (e) => {
                    e.preventDefault();
                    console.log('Submit do formulário de múltiplas transferências (via extras.js)');
                    this.salvarMultiplasTransferencias();
                });
                form.dataset.submitListenerAttached = 'true';
                console.log('Event listener de submit configurado para múltiplas transferências');
            } else {
                console.log('Event listener de submit já estava configurado');
            }
        }

        // Configurar event listeners dos botões
        this.configurarBotoesPlanilha();

        console.log('Mostrando modal...');
        // Criar instância do modal
        const bootstrapModal = new bootstrap.Modal(modal);
        
        // Inicializar Handsontable quando o modal for mostrado
        modal.addEventListener('shown.bs.modal', () => {
            console.log('Modal mostrado, inicializando Handsontable...');
            try {
                this.inicializarHandsontable();
                console.log('Handsontable inicializado com sucesso');
            } catch (error) {
                console.error('Erro ao inicializar Handsontable:', error);
            }
        }, { once: true });
        
        bootstrapModal.show();
    }

    /**
     * Configurar event listeners dos botões da planilha
     */
    configurarBotoesPlanilha() {
        // Botão limpar planilha
        const btnLimpar = document.getElementById('btn-limpar-planilha');
        if (btnLimpar && !btnLimpar.dataset.listenerAttached) {
            btnLimpar.addEventListener('click', () => this.limparPlanilhaTransferencias());
            btnLimpar.dataset.listenerAttached = 'true';
        }

        // Botão carregar proprietários
        const btnCarregar = document.getElementById('btn-carregar-proprietarios');
        if (btnCarregar && !btnCarregar.dataset.listenerAttached) {
            btnCarregar.addEventListener('click', () => this.carregarProprietariosNaPlanilha());
            btnCarregar.dataset.listenerAttached = 'true';
        }
    }

    /**
     * Carregar aliases para o modal de múltiplas transferências
     */
    async carregarAliasParaMultiplasTransferencias() {
        try {
            console.log('Carregando aliases para múltiplas transferências...');
            const response = await this.apiService.get('/api/extras/?ativo=true');
            console.log('Resposta da API:', response);

            const aliasSelect = document.getElementById('multiplas-transferencias-alias');
            if (!aliasSelect) {
                console.error('Elemento multiplas-transferencias-alias não encontrado');
                return;
            }

            if (response && response.success && Array.isArray(response.data)) {
                console.log(`Carregados ${response.data.length} aliases`);
                aliasSelect.innerHTML = '<option value="">Selecione um alias...</option>';
                response.data.forEach(alias => {
                    const option = document.createElement('option');
                    option.value = alias.id;
                    option.textContent = alias.alias;
                    option.dataset.proprietarios = alias.id_proprietarios;
                    aliasSelect.appendChild(option);
                });

                // Configurar evento de mudança do alias
                aliasSelect.onchange = () => this.carregarProprietariosNaPlanilha();
            } else {
                console.error('Resposta inválida da API:', response);
            }
        } catch (error) {
            console.error('Erro ao carregar aliases:', error);
            this.uiManager.showAlert('Erro ao carregar aliases', 'danger');
        }
    }

    /**
     * Carregar proprietários na planilha
     */
    async carregarProprietariosNaPlanilha() {
        console.log('carregarProprietariosNaPlanilha: Iniciando...');
        
        const aliasSelect = document.getElementById('multiplas-transferencias-alias');
        if (!aliasSelect || !aliasSelect.value) {
            console.warn('carregarProprietariosNaPlanilha: Nenhum alias selecionado');
            this.uiManager.showAlert('Selecione um alias primeiro', 'warning');
            return;
        }

        const aliasId = aliasSelect.value;
        console.log(`carregarProprietariosNaPlanilha: Alias selecionado: ${aliasId}`);

        // Verificar se Handsontable foi inicializado
        if (!this.handsontableInstance) {
            console.error('carregarProprietariosNaPlanilha: Handsontable não foi inicializado!');
            this.uiManager.showAlert('Erro: Planilha não foi inicializada', 'danger');
            return;
        }

        try {
            console.log('carregarProprietariosNaPlanilha: Buscando detalhes do alias...');
            const aliasResponse = await this.apiService.get(`/api/extras/${aliasId}`);
            
            if (!aliasResponse || !aliasResponse.success) {
                throw new Error('Erro ao buscar alias');
            }

            const alias = aliasResponse.data;
            console.log('carregarProprietariosNaPlanilha: Alias carregado:', alias);

            // Parse dos IDs de proprietários
            let proprietariosIds = [];
            if (Array.isArray(alias.id_proprietarios)) {
                proprietariosIds = alias.id_proprietarios.map(id => parseInt(id));
            } else if (typeof alias.id_proprietarios === 'string') {
                try {
                    const parsed = JSON.parse(alias.id_proprietarios);
                    proprietariosIds = Array.isArray(parsed) ? parsed.map(id => parseInt(id)) : [];
                } catch (e) {
                    proprietariosIds = alias.id_proprietarios.split(',').map(id => parseInt(id.trim()));
                }
            }

            console.log(`carregarProprietariosNaPlanilha: ${proprietariosIds.length} proprietários no alias`);

            // Buscar todos os proprietários
            const response = await this.apiService.get('/api/proprietarios/');
            if (response && response.success && Array.isArray(response.data)) {
                // Filtrar apenas os proprietários do alias
                const proprietariosDoAlias = response.data.filter(p => proprietariosIds.includes(p.id));
                console.log(`carregarProprietariosNaPlanilha: ${proprietariosDoAlias.length} proprietários filtrados`);
                
                this.allProprietarios = proprietariosDoAlias;
                this.preencherPlanilhaComProprietarios();
                this.uiManager.showAlert(`${proprietariosDoAlias.length} proprietários carregados na planilha!`, 'success');
            }
        } catch (error) {
            console.error('Erro ao carregar proprietários:', error);
            this.uiManager.showAlert('Erro ao carregar proprietários: ' + error.message, 'danger');
        }
    }

    /**
     * Inicializar Handsontable
     */
    inicializarHandsontable() {
        const container = document.getElementById('multiplas-transferencias-handsontable');
        if (!container) {
            console.error('Container Handsontable não encontrado');
            return;
        }

        console.log('Container encontrado:', container);

        // Destruir instância anterior se existir
        if (this.handsontableInstance) {
            console.log('Destruindo instância anterior');
            this.handsontableInstance.destroy();
        }

        // Dados iniciais simples
        const initialData = [
            ['Nome da Transferência', 'Transferência 1', 'Transferência 2'],
            ['Data Início', '', ''],
            ['Data Fim', '', ''],
            ['Proprietários', '', '']
        ];

        console.log('Criando Handsontable com dados:', initialData);

        // Configuração simples da tabela
        const settings = {
            data: initialData,
            colHeaders: false,
            rowHeaders: false,
            minCols: 5,
            minRows: 10,
            contextMenu: true,
            manualColumnResize: true,
            manualRowResize: true,
            stretchH: 'all',
            height: 400,
            licenseKey: 'non-commercial-and-evaluation'
        };

        try {
            this.handsontableInstance = new Handsontable(container, settings);
            console.log('Handsontable criado com sucesso:', this.handsontableInstance);
        } catch (error) {
            console.error('Erro ao criar Handsontable:', error);
            throw error;
        }
    }

    /**
     * Preencher planilha com proprietários
     */
    preencherPlanilhaComProprietarios() {
        if (!this.handsontableInstance || !this.allProprietarios) {
            return;
        }

        const data = [
            ['Nome da Transferência'], // Linha 0
            ['Data Início'], // Linha 1
            ['Data Fim'], // Linha 2
            ['Proprietários'] // Linha 3 (cabeçalho)
        ];

        // Adicionar proprietários
        this.allProprietarios.forEach(proprietario => {
            data.push([proprietario.nome]);
        });

        // Adicionar linhas vazias extras
        for (let i = 0; i < 5; i++) {
            data.push(['']);
        }

        this.handsontableInstance.loadData(data);
    }

    /**
     * Salvar múltiplas transferências da planilha matricial
     */
    async salvarMultiplasTransferencias() {
        const aliasSelect = document.getElementById('multiplas-transferencias-alias');
        if (!aliasSelect || !aliasSelect.value) {
            this.uiManager.showAlert('Selecione um alias primeiro', 'warning');
            return;
        }

        const aliasId = aliasSelect.value;

        if (!this.handsontableInstance) {
            this.uiManager.showAlert('Planilha não inicializada', 'danger');
            return;
        }

        // Obter dados da planilha
        const planilhaData = this.handsontableInstance.getData();
        console.log('Dados da planilha:', planilhaData);

        // Processar cada coluna a partir da coluna B (índice 1)
        const transferencias = [];
        let hasErrors = false;

        for (let colIndex = 1; colIndex < planilhaData[0].length; colIndex++) {
            // Verificar se a coluna tem dados (nome da transferência não vazio)
            const nomeTransferencia = (planilhaData[0][colIndex] || '').toString().trim();
            if (!nomeTransferencia) {
                continue; // Pular colunas vazias
            }

            console.log(`\nProcessando coluna ${colIndex}: ${nomeTransferencia}`);

            // Obter datas de início e fim desta coluna
            const dataInicio = (planilhaData[1][colIndex] || '').toString().trim();
            const dataFim = (planilhaData[2][colIndex] || '').toString().trim();

            if (!dataInicio) {
                hasErrors = true;
                console.error(`Coluna ${colIndex + 1}: Data de início não informada para transferência "${nomeTransferencia}"`);
                this.uiManager.showAlert(`Data de início não informada para "${nomeTransferencia}"`, 'warning');
                continue;
            }

            // Coletar todos os proprietários e valores desta coluna
            const proprietariosComValores = [];
            let valorTotal = 0;

            // Processar cada proprietário a partir da linha 3
            for (let rowIndex = 3; rowIndex < planilhaData.length; rowIndex++) {
                const proprietarioNome = (planilhaData[rowIndex][0] || '').toString().trim();
                const valorStr = (planilhaData[rowIndex][colIndex] || '').toString().trim();

                // Pular linhas sem proprietário ou sem valor
                if (!proprietarioNome || !valorStr) {
                    continue;
                }

                // Validar proprietário
                const proprietario = this.allProprietarios.find(p => p.nome.toLowerCase() === proprietarioNome.toLowerCase());
                if (!proprietario) {
                    hasErrors = true;
                    console.error(`Linha ${rowIndex + 1}: Proprietário não encontrado: ${proprietarioNome}`);
                    this.uiManager.showAlert(`Proprietário não encontrado: ${proprietarioNome}`, 'warning');
                    continue;
                }

                // Converter valor
                const valor = parseFloat(valorStr.replace(',', '.'));
                if (isNaN(valor)) {
                    hasErrors = true;
                    console.error(`Linha ${rowIndex + 1}, Coluna ${colIndex + 1}: Valor inválido: ${valorStr}`);
                    this.uiManager.showAlert(`Valor inválido para ${proprietarioNome}: ${valorStr}`, 'warning');
                    continue;
                }

                // Adicionar à lista de proprietários
                proprietariosComValores.push({
                    id: proprietario.id,
                    valor: valor
                });

                valorTotal += valor;
                console.log(`  - ${proprietario.nome}: ${valor}`);
            }

            // Se não há proprietários válidos nesta coluna, pular
            if (proprietariosComValores.length === 0) {
                console.warn(`Coluna ${colIndex}: Nenhum proprietário válido encontrado`);
                continue;
            }

            // Criar UMA transferência para esta coluna com TODOS os proprietários
            const transferencia = {
                alias_id: parseInt(aliasId),
                nome_transferencia: nomeTransferencia,
                valor_total: parseFloat(valorTotal.toFixed(2)),
                id_proprietarios: JSON.stringify(proprietariosComValores), // Array de {id, valor}
                data_criacao: this.formatarDataParaAPI(dataInicio),
                data_fim: dataFim ? this.formatarDataParaAPI(dataFim) : null
            };

            console.log(`Transferência criada:`, transferencia);
            transferencias.push(transferencia);
        }

        if (hasErrors) {
            this.uiManager.showAlert('Alguns dados são inválidos. Verifique os alertas.', 'warning');
            // Não retornar, continuar com as transferências válidas
        }

        if (transferencias.length === 0) {
            this.uiManager.showAlert('Nenhuma transferência válida encontrada na planilha', 'warning');
            return;
        }

        console.log(`\nTotal de transferências a salvar: ${transferencias.length}`);

        try {
            const submitButton = document.getElementById('btn-salvar-multiplas-transferencias');
            submitButton.disabled = true;
            submitButton.innerHTML = '<i class="fas fa-spinner fa-spin me-1"></i>Salvando...';

            console.log(`Salvando ${transferencias.length} transferências...`);
            console.log('Transferências a enviar:', transferencias);

            // Enviar cada transferência individualmente
            const promises = transferencias.map((transferencia, index) => {
                console.log(`Enviando transferência ${index + 1}:`, transferencia);
                return this.apiService.post('/api/transferencias/', transferencia);
            });

            const results = await Promise.allSettled(promises);
            
            // Analisar resultados
            const successes = results.filter(r => r.status === 'fulfilled' && r.value.success);
            const failures = results.filter(r => r.status === 'rejected' || !r.value.success);

            console.log(`Resultados: ${successes.length} sucesso(s), ${failures.length} falha(s)`);
            
            // Exibir erros se houver
            failures.forEach((result, index) => {
                console.error(`Falha na transferência ${index + 1}:`, result.reason || result.value);
            });

            if (successes.length > 0) {
                this.uiManager.showAlert(
                    `${successes.length} transferência(s) cadastrada(s) com sucesso!`, 
                    'success'
                );
                
                if (failures.length > 0) {
                    this.uiManager.showAlert(
                        `${failures.length} transferência(s) falharam. Verifique o console.`, 
                        'warning'
                    );
                }

                // Fechar modal e limpar planilha
                const modal = document.getElementById('modal-multiplas-transferencias');
                if (modal) {
                    const bootstrapModal = bootstrap.Modal.getInstance(modal);
                    if (bootstrapModal) {
                        bootstrapModal.hide();
                    }
                }
                
                this.limparPlanilhaTransferencias();

                // Recarregar transferências se estiver na página de extras
                if (typeof this.loadTransferencias === 'function') {
                    this.loadTransferencias();
                }
            } else {
                this.uiManager.showAlert('Erro ao salvar todas as transferências. Verifique o console.', 'danger');
            }

        } catch (error) {
            console.error('Erro ao salvar múltiplas transferências:', error);
            this.uiManager.showAlert('Erro ao salvar transferências', 'danger');
        } finally {
            const submitButton = document.getElementById('btn-salvar-multiplas-transferencias');
            submitButton.disabled = false;
            submitButton.innerHTML = '<i class="fas fa-save me-1"></i>Salvar Todas as Transferências';
        }
    }

    /**
     * Limpar planilha de transferências
     */
    limparPlanilhaTransferencias() {
        if (this.handsontableInstance) {
            const initialData = [
                ['Nome da Transferência'],
                ['Data Início'],
                ['Data Fim'],
                ['Proprietários']
            ];
            this.handsontableInstance.loadData(initialData);
        }
    }

    /**
     * Formatar data para API (DD/MM/YYYY para YYYY-MM-DD)
     */
    formatarDataParaAPI(dataStr) {
        if (!dataStr) return null;
        
        // Se já estiver no formato YYYY-MM-DD, retornar como está
        if (dataStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
            return dataStr;
        }
        
        // Converter de DD/MM/YYYY para YYYY-MM-DD
        const partes = dataStr.split('/');
        if (partes.length === 3) {
            return `${partes[2]}-${partes[1].padStart(2, '0')}-${partes[0].padStart(2, '0')}`;
        }
        
        return dataStr;
    }

    /**
     * Preencher select de proprietários no modal de alias
     */
    async preencherSelectProprietarios() {
        try {
            const proprietariosSelect = document.getElementById('alias-proprietarios');
            if (!proprietariosSelect) {
                console.error('Select alias-proprietarios não encontrado');
                return;
            }

            console.log('Preenchendo select de proprietários...');

            // Carregar proprietários se não estiverem carregados
            if (!this.allProprietarios || this.allProprietarios.length === 0) {
                console.log('Carregando proprietários...');
                await this.loadProprietarios();
            }

            console.log(`Total de proprietários disponíveis: ${this.allProprietarios?.length || 0}`);

            // Limpar opções existentes
            proprietariosSelect.innerHTML = '';

            // Adicionar proprietários (sem opção padrão em select múltiplo)
            if (this.allProprietarios && this.allProprietarios.length > 0) {
                this.allProprietarios.forEach(proprietario => {
                    const option = document.createElement('option');
                    option.value = proprietario.id;
                    option.textContent = proprietario.nome;
                    proprietariosSelect.appendChild(option);
                });
                console.log(`${this.allProprietarios.length} proprietários adicionados ao select`);
            } else {
                console.warn('Nenhum proprietário disponível para adicionar');
                // Adicionar mensagem informativa se não houver proprietários
                const emptyOption = document.createElement('option');
                emptyOption.value = '';
                emptyOption.textContent = 'Nenhum proprietário disponível';
                emptyOption.disabled = true;
                proprietariosSelect.appendChild(emptyOption);
            }

        } catch (error) {
            console.error('Erro ao preencher select de proprietários:', error);
        }
    }

    /**
     * Carregar proprietários de um alias específico
     */
    async carregarProprietariosAlias(aliasId) {
        if (!aliasId) return;

        try {
            const response = await this.apiService.get(`/api/extras/${aliasId}`);
            if (response && response.success) {
                const alias = response.data;
                let proprietariosIds = [];

                // Parse IDs dos proprietários
                if (Array.isArray(alias.id_proprietarios)) {
                    proprietariosIds = alias.id_proprietarios.map(id => parseInt(id));
                } else if (typeof alias.id_proprietarios === 'string') {
                    try {
                        const parsed = JSON.parse(alias.id_proprietarios);
                        proprietariosIds = Array.isArray(parsed) ? parsed.map(id => parseInt(id)) : [];
                    } catch (e) {
                        proprietariosIds = alias.id_proprietarios.split(',').map(id => parseInt(id.trim()));
                    }
                }

                // Selecionar proprietários no select múltiplo
                const proprietariosSelect = document.getElementById('alias-proprietarios');
                if (proprietariosSelect) {
                    // Primeiro desmarcar todos
                    Array.from(proprietariosSelect.options).forEach(option => {
                        option.selected = false;
                    });

                    // Depois marcar os que pertencem ao alias
                    proprietariosIds.forEach(id => {
                        const option = proprietariosSelect.querySelector(`option[value="${id}"]`);
                        if (option) {
                            option.selected = true;
                        }
                    });
                }
            }
        } catch (error) {
            console.error('Erro ao carregar proprietários do alias:', error);
        }
    }
    /**
     * Carregar aliases para o modal de transferência individual
     */
    async carregarAliasParaTransferencia() {
        try {
            console.log('Carregando aliases para transferência...');
            const response = await this.apiService.get('/api/extras/?ativo=true');
            const aliasSelect = document.getElementById('transferencia-alias');
            
            if (!aliasSelect) {
                console.error('Select transferencia-alias não encontrado');
                return;
            }
            
            if (response && response.success && Array.isArray(response.data)) {
                aliasSelect.innerHTML = '<option value="">Selecione um alias...</option>';
                response.data.forEach(alias => {
                    const option = document.createElement('option');
                    option.value = alias.id;
                    option.textContent = alias.alias;
                    option.dataset.proprietarios = alias.id_proprietarios;
                    aliasSelect.appendChild(option);
                });
                console.log(`${response.data.length} aliases carregados`);
            }
        } catch (error) {
            console.error('Erro ao carregar aliases:', error);
            this.uiManager.showAlert('Erro ao carregar aliases', 'danger');
        }
    }

    /**
     * Carregar proprietários da transferência com valores
     */
    async carregarProprietariosTransferencia(aliasId, proprietariosData = null) {
        try {
            console.log('carregarProprietariosTransferencia:', { aliasId, proprietariosData });
            
            const container = document.getElementById('transferencia-proprietarios-container');
            if (!container) {
                console.error('Container transferencia-proprietarios-container não encontrado');
                return;
            }

            if (!aliasId) {
                container.style.display = 'none';
                return;
            }

            // Buscar proprietários do alias
            const aliasResponse = await this.apiService.get(`/api/extras/${aliasId}`);
            if (!aliasResponse || !aliasResponse.success) {
                throw new Error('Erro ao buscar alias');
            }
            
            const alias = aliasResponse.data;
            console.log('Alias carregado:', alias);
            
            // Parse proprietários do alias
            let proprietariosIds = [];
            if (Array.isArray(alias.id_proprietarios)) {
                proprietariosIds = alias.id_proprietarios.map(id => parseInt(id));
            } else if (typeof alias.id_proprietarios === 'string') {
                try {
                    const parsed = JSON.parse(alias.id_proprietarios);
                    proprietariosIds = Array.isArray(parsed) ? parsed.map(id => parseInt(id)) : [];
                } catch (e) {
                    proprietariosIds = alias.id_proprietarios.split(',').map(id => parseInt(id.trim()));
                }
            }
            
            console.log(`${proprietariosIds.length} proprietários no alias`);
            
            // Parse valores da transferência (se edição)
            let valoresMap = new Map();
            if (proprietariosData) {
                try {
                    const proprietarios = typeof proprietariosData === 'string' 
                        ? JSON.parse(proprietariosData) 
                        : proprietariosData;
                    
                    proprietarios.forEach(p => {
                        valoresMap.set(parseInt(p.id), parseFloat(p.valor) || 0);
                    });
                    console.log('Valores carregados:', Array.from(valoresMap.entries()));
                } catch (e) {
                    console.error('Erro ao fazer parse dos valores:', e);
                }
            }
            
            // Renderizar inputs
            container.innerHTML = '';
            proprietariosIds.forEach(id => {
                const proprietario = this.allProprietarios.find(p => p.id === id);
                if (!proprietario) {
                    console.warn(`Proprietário ID ${id} não encontrado`);
                    return;
                }
                
                const valor = valoresMap.get(id) || 0;
                
                const div = document.createElement('div');
                div.className = 'input-group mb-2';
                div.innerHTML = `
                    <span class="input-group-text" style="width: 200px;">
                        <i class="fas fa-user me-2"></i>${proprietario.nome}
                    </span>
                    <span class="input-group-text">R$</span>
                    <input type="number" 
                           class="form-control transferencia-valor-input" 
                           data-proprietario-id="${id}"
                           value="${valor}" 
                           step="0.01" 
                           required
                           placeholder="Valor positivo ou negativo">
                `;
                container.appendChild(div);
            });
            
            // Event listener para calcular total
            container.querySelectorAll('.transferencia-valor-input').forEach(input => {
                input.addEventListener('input', () => this.calcularValorTotalTransferencia());
            });
            
            container.style.display = 'block';
            this.calcularValorTotalTransferencia();
            
            console.log('Proprietários carregados no formulário');
        } catch (error) {
            console.error('Erro ao carregar proprietários da transferência:', error);
            this.uiManager.showAlert('Erro ao carregar proprietários', 'danger');
        }
    }

    /**
     * Calcular valor total da transferência
     */
    calcularValorTotalTransferencia() {
        const inputs = document.querySelectorAll('.transferencia-valor-input');
        let total = 0;
        
        inputs.forEach(input => {
            const valor = parseFloat(input.value) || 0;
            total += valor;
        });
        
        const totalInput = document.getElementById('transferencia-valor-total');
        if (totalInput) {
            // Usar LocaleManager global para formatação
            totalInput.value = window.localeManager.formatCurrency(total);
        }
        
        console.log('Valor total calculado:', total, 'Locale:', window.localeManager.userLocale);
    }

    /**
     * Salvar transferência individual
     */
    async salvarTransferencias() {
        try {
            console.log('Salvando transferência...');
            
            const form = document.getElementById('form-transferencias');
            if (!form) {
                console.error('Formulário não encontrado');
                return;
            }
            
            if (!form.checkValidity()) {
                form.reportValidity();
                return;
            }
            
            // Coletar dados
            const aliasId = document.getElementById('transferencia-alias').value;
            const nome = document.getElementById('transferencia-nome').value;
            const dataCriacao = document.getElementById('transferencia-data-criacao').value;
            const dataFim = document.getElementById('transferencia-data-fim').value;
            
            console.log('Dados do formulário:', { aliasId, nome, dataCriacao, dataFim });
            
            // Coletar proprietários e valores
            const inputs = document.querySelectorAll('.transferencia-valor-input');
            const proprietariosComValores = [];
            let valorTotal = 0;
            
            inputs.forEach(input => {
                const id = parseInt(input.dataset.proprietarioId);
                const valor = parseFloat(input.value) || 0;
                // Aceitar valores positivos e negativos
                proprietariosComValores.push({ id, valor });
                valorTotal += valor;
            });
            
            console.log('Proprietários com valores:', proprietariosComValores);
            console.log('Valor total:', valorTotal);
            
            // Validar
            if (proprietariosComValores.length === 0) {
                this.uiManager.showAlert('Adicione pelo menos um proprietário', 'warning');
                return;
            }
            
            // Preparar dados
            const transferencia = {
                alias_id: parseInt(aliasId),
                nome_transferencia: nome,
                valor_total: parseFloat(valorTotal.toFixed(2)),
                id_proprietarios: JSON.stringify(proprietariosComValores),
                data_criacao: dataCriacao,
                data_fim: dataFim || null
            };
            
            console.log('Objeto transferência a enviar:', transferencia);
            
            // Desabilitar botão de salvar (se existir)
            const submitBtn = document.getElementById('btn-salvar-transferencia');
            if (submitBtn) {
                submitBtn.disabled = true;
                submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-1"></i>Salvando...';
            } else {
                console.warn('Botão de salvar não encontrado - continuando sem desabilitar');
            }
            
            let response;
            if (this.currentTransferencia && this.currentTransferencia.id) {
                // Atualizar
                console.log(`Atualizando transferência ID ${this.currentTransferencia.id}`);
                response = await this.apiService.put(
                    `/api/transferencias/${this.currentTransferencia.id}`, 
                    transferencia
                );
            } else {
                // Criar
                console.log('Criando nova transferência');
                response = await this.apiService.post('/api/transferencias/', transferencia);
            }
            
            console.log('Resposta da API:', response);
            
            if (response && response.success) {
                const action = this.currentTransferencia ? 'atualizada' : 'criada';
                this.uiManager.showAlert(`Transferência ${action} com sucesso!`, 'success');
                
                // Fechar modal
                const modal = document.getElementById('modal-transferencias');
                const bootstrapModal = bootstrap.Modal.getInstance(modal);
                if (bootstrapModal) bootstrapModal.hide();
                
                // Limpar currentTransferencia
                this.currentTransferencia = null;
                
                // Recarregar lista
                await this.loadTransferencias();
            } else {
                throw new Error(response?.error || 'Erro ao salvar transferência');
            }
            
        } catch (error) {
            console.error('Erro ao salvar transferência:', error);
            this.uiManager.showAlert('Erro ao salvar transferência: ' + error.message, 'danger');
        } finally {
            const submitBtn = document.getElementById('btn-salvar-transferencia');
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.innerHTML = '<i class="fas fa-save me-1"></i> Salvar';
            }
        }
    }
}
