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

        // Formulário de transferências será configurado dinamicamente no showTransferenciasModal

        document.addEventListener('DOMContentLoaded', () => {
        });

        // Evento para carregar proprietários do alias selecionado
        document.getElementById('transferencia-alias')?.addEventListener('change', (e) => {
            this.carregarProprietariosTransferencia(e.target.value);
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
            // Verificar se o usuário é administrador antes de fazer a chamada
            const isAdmin = window.authService && window.authService.isAdmin();
            if (!isAdmin) {
                return;
            }

            
            const response = await this.apiService.get('/api/extras/proprietarios/disponiveis');
            
            if (response && response.success && Array.isArray(response.data)) {
                this.allProprietarios = response.data;
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
                        const valor = prop.valor ? parseFloat(prop.valor).toLocaleString('pt-BR', { minimumFractionDigits: 2 }) : '0,00';
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
                parseFloat(transferencia.valor_total).toLocaleString('pt-BR', { minimumFractionDigits: 2 }) : '0,00';

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
            const modal = document.getElementById('modal-alias');
            const form = document.getElementById('form-alias');
            const modalTitle = document.getElementById('modalAliasLabel');

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
                form.reset();
                modalTitle.innerHTML = '<i class="fas fa-plus me-2"></i>Novo Alias';
                this.currentExtra = null;
            } else {
                // Modo edição
                modalTitle.innerHTML = '<i class="fas fa-edit me-2"></i>Editar Alias';
                this.currentExtra = alias;

                // Preencher campos
                const nomeInput = document.getElementById('alias-nome');
                if (nomeInput) nomeInput.value = alias.alias || '';

                // Carregar proprietários do alias
                await this.carregarProprietariosAlias(alias.id);
            }

            // Carregar proprietários disponíveis
            await this.preencherSelectProprietarios();

            // Mostrar modal
            const bootstrapModal = new bootstrap.Modal(modal);
            bootstrapModal.show();

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

            // Configurar event listener do formulário (feito aqui pois o modal pode ser recriado)
            form.addEventListener('submit', (e) => {
                e.preventDefault();
                this.salvarTransferencias();
            });

            // Mostrar modal
            const bootstrapModal = new bootstrap.Modal(modal);
            bootstrapModal.show();

        } catch (error) {
            console.error('Erro ao mostrar modal de transferências:', error);
            this.uiManager.showAlert('Erro ao abrir modal de transferências', 'danger');
        }
    }

    /**
     * Preencher select de proprietários
     */
    async preencherSelectProprietarios() {
        try {
            const proprietariosSelect = document.getElementById('alias-proprietarios');
            if (!proprietariosSelect) return;

            // Carregar proprietários se não estiverem carregados
            if (!this.allProprietarios || this.allProprietarios.length === 0) {
                await this.loadProprietarios();
            }

            // Limpar opções existentes
            proprietariosSelect.innerHTML = '';

            // Adicionar opção padrão
            const defaultOption = document.createElement('option');
            defaultOption.value = '';
            defaultOption.textContent = 'Selecione os proprietários...';
            defaultOption.disabled = true;
            defaultOption.selected = true;
            proprietariosSelect.appendChild(defaultOption);

            // Adicionar proprietários
            this.allProprietarios.forEach(proprietario => {
                const option = document.createElement('option');
                option.value = proprietario.id;
                option.textContent = proprietario.nome;
                proprietariosSelect.appendChild(option);
            });

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
     * Carregar aliases disponíveis para transferências
     */
    async carregarAliasParaTransferencia() {
        try {
            const response = await this.apiService.get('/api/extras/?ativo=true');

            if (response && response.success && Array.isArray(response.data)) {
                const aliasSelect = document.getElementById('transferencia-alias');
                if (!aliasSelect) return;

                // Limpar opções existentes, mantendo apenas a primeira se for placeholder
                const firstOption = aliasSelect.querySelector('option[value=""]');
                aliasSelect.innerHTML = '';

                // Adicionar opção padrão se existir
                if (firstOption) {
                    aliasSelect.appendChild(firstOption);
                } else {
                    const defaultOption = document.createElement('option');
                    defaultOption.value = '';
                    defaultOption.textContent = 'Selecione um alias...';
                    defaultOption.disabled = true;
                    defaultOption.selected = true;
                    aliasSelect.appendChild(defaultOption);
                }

                // Adicionar aliases disponíveis
                response.data.forEach(alias => {
                    const option = document.createElement('option');
                    option.value = alias.id;
                    option.textContent = alias.alias;
                    aliasSelect.appendChild(option);
                });

                console.log(`Carregados ${response.data.length} aliases para transferências`);
            } else {
                console.error('Erro ao carregar aliases para transferências:', response);
            }
        } catch (error) {
            console.error('Erro ao carregar aliases para transferências:', error);
        }
    }

    /**
     * Salvar transferências (criar ou atualizar)
     */
    async salvarTransferencias() {
        try {
            const form = document.getElementById('form-transferencias');
            if (!form) {
                console.error('Formulário de transferências não encontrado');
                return;
            }

            const formData = new FormData(form);
            const nomeTransferencia = formData.get('nome_transferencia')?.trim();
            const aliasId = formData.get('alias_id');
            const dataCriacao = formData.get('data_criacao');
            const dataFim = formData.get('data_fim');

            if (!nomeTransferencia) {
                this.uiManager.showAlert('Nome da transferência é obrigatório', 'warning');
                return;
            }

            if (!aliasId) {
                this.uiManager.showAlert('Alias é obrigatório', 'warning');
                return;
            }

            const proprietariosData = this.obterProprietariosDaTabela();
            console.log('Dados dos proprietários:', proprietariosData);

            // Validar lógica da transferência
            const valores = proprietariosData.map(p => parseFloat(p.valor) || 0);
            console.log('Valores extraídos:', valores);
            const soma = valores.reduce((acc, val) => acc + val, 0);
            console.log('Soma calculada:', soma);
            const valoresPositivos = valores.filter(v => v > 0);
            const valoresNegativos = valores.filter(v => v < 0);

            // Verificar se há pelo menos um valor positivo e um negativo (lógica de transferência)
            if (valoresPositivos.length === 0 || valoresNegativos.length === 0) {
                this.uiManager.showAlert('Uma transferência deve ter pelo menos um valor positivo (recebimento) e um negativo (pagamento)', 'warning');
                return;
            }

            // Verificar se a soma é próxima de zero (tolerância de 0.01 para erros de arredondamento)
            if (Math.abs(soma) > 0.01) {
                this.uiManager.showAlert(`A soma dos valores deve ser zero ou próxima de zero. Soma atual: ${soma.toFixed(2)}`, 'warning');
                return;
            }

            const transferenciaData = {
                nome_transferencia: nomeTransferencia,
                alias_id: aliasId,
                data_criacao: dataCriacao ? new Date(dataCriacao).toISOString() : null,
                data_fim: dataFim ? new Date(dataFim).toISOString() : null,
                id_proprietarios: JSON.stringify(proprietariosData)
            };

            let response;
            if (this.currentTransferencia && this.currentTransferencia.id) {
                // Atualizar transferência existente
                response = await this.apiService.put(`/api/transferencias/${this.currentTransferencia.id}`, transferenciaData);
            } else {
                // Criar nova transferência
                response = await this.apiService.post('/api/transferencias/', transferenciaData);
            }

            if (response && response.success) {
                const action = this.currentTransferencia ? 'atualizada' : 'criada';
                this.uiManager.showAlert(`Transferência ${action} com sucesso!`, 'success');

                // Fechar modal
                const modal = document.getElementById('modal-transferencias');
                if (modal) {
                    const bootstrapModal = bootstrap.Modal.getInstance(modal);
                    if (bootstrapModal) {
                        bootstrapModal.hide();
                    }
                }

                // Recarregar lista de transferências
                await this.carregarTransferencias();
            } else {
                // Mostrar erro específico do backend
                const errorMessage = response?.error || 'Erro ao salvar transferência';
                console.error('Erro ao salvar transferência:', response);
                this.uiManager.showAlert(errorMessage, 'danger');
            }
        } catch (error) {
            console.error('Erro ao salvar transferência:', error);
            
            // Verificar se é um erro de validação do backend
            if (error.response && error.response.data && error.response.data.detail) {
                this.uiManager.showAlert(`Erro de validação: ${error.response.data.detail}`, 'danger');
            } else {
                this.uiManager.showAlert('Erro ao salvar transferência. Verifique os dados e tente novamente.', 'danger');
            }
        }
    }

    /**
     * Obter proprietários da tabela de transferência (para salvar)
     */
    obterProprietariosDaTabela() {
        const tbody = document.getElementById('transferencia-proprietarios-table');
        const proprietarios = [];

        if (!tbody) return proprietarios;

        tbody.querySelectorAll('tr').forEach(row => {
            const nome = row.querySelector('td:nth-child(1)')?.textContent.trim();
            const valorInput = row.querySelector('input[type="number"]');
            const valor = valorInput ? valorInput.value.trim().replace(',', '.') : '0';

            if (nome) {
                // Encontrar o ID do proprietário pelo nome
                const proprietario = this.allProprietarios.find(p => p.nome === nome);
                if (proprietario) {
                    proprietarios.push({
                        id: proprietario.id,
                        valor: parseFloat(valor) || 0
                    });
                }
            }
        });

        return proprietarios;
    }

    /**
     * Formatar data para input HTML (YYYY-MM-DD)
     */
    formatarDataParaInput(dataString) {
        if (!dataString) return '';

        try {
            const data = new Date(dataString);
            return data.toISOString().split('T')[0];
        } catch (error) {
            console.error('Erro ao formatar data:', error);
            return '';
        }
    }

    /**
     * Carregar proprietários de um alias para a tabela de transferências
     */
    async carregarProprietariosTransferencia(aliasId, transferenciaProprietariosJson = null) {
        if (!aliasId) {
            // Se nenhum alias selecionado, ocultar container
            const container = document.getElementById('transferencia-proprietarios-container');
            if (container) container.style.display = 'none';
            return;
        }

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

                // Carregar proprietários se não estiverem carregados
                if (!this.allProprietarios || this.allProprietarios.length === 0) {
                    await this.loadProprietarios();
                }

                // Filtrar proprietários do alias
                const proprietariosDoAlias = this.allProprietarios.filter(prop => 
                    proprietariosIds.includes(prop.id)
                );

                // Parse dados da transferência se fornecidos (para edição)
                let valoresTransferencia = {};
                if (transferenciaProprietariosJson) {
                    try {
                        const dadosTransferencia = JSON.parse(transferenciaProprietariosJson);
                        valoresTransferencia = dadosTransferencia.reduce((acc, item) => {
                            acc[item.id] = item.valor || 0;
                            return acc;
                        }, {});
                    } catch (e) {
                        console.warn('Erro ao parsear dados da transferência:', e);
                    }
                }

                // Popular tabela de transferências
                const tbody = document.getElementById('transferencia-proprietarios-table');
                const container = document.getElementById('transferencia-proprietarios-container');

                if (!tbody || !container) return;

                // Limpar tabela
                tbody.innerHTML = '';

                // Adicionar proprietários à tabela
                proprietariosDoAlias.forEach(proprietario => {
                    const valorExistente = valoresTransferencia[proprietario.id] || 0;
                    const row = document.createElement('tr');
                    row.innerHTML = `
                        <td>${proprietario.nome}</td>
                        <td><input type="number" class="form-control form-control-sm" step="0.01" placeholder="0.00" value="${valorExistente}"></td>
                    `;
                    tbody.appendChild(row);
                });

                // Mostrar container
                container.style.display = 'block';

                console.log(`Carregados ${proprietariosDoAlias.length} proprietários para transferência`);
            } else {
                console.error('Erro ao carregar proprietários do alias:', response);
                const container = document.getElementById('transferencia-proprietarios-container');
                if (container) container.style.display = 'none';
            }
        } catch (error) {
            console.error('Erro ao carregar proprietários para transferência:', error);
            const container = document.getElementById('transferencia-proprietarios-container');
            if (container) container.style.display = 'none';
        }
    }
}