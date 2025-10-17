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

        // Configurar event listener do formulário (apenas se não foi configurado ainda)
        const form = document.getElementById('form-multiplas-transferencias');
        if (form && !form.dataset.submitListenerAttached) {
            form.addEventListener('submit', (e) => {
                e.preventDefault();
                this.salvarMultiplasTransferencias();
            });
            form.dataset.submitListenerAttached = 'true';
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
        const aliasSelect = document.getElementById('multiplas-transferencias-alias');
        if (!aliasSelect || !aliasSelect.value) {
            this.uiManager.showAlert('Selecione um alias primeiro', 'warning');
            return;
        }

        try {
            const response = await this.apiService.get('/api/proprietarios/');
            if (response && response.success && Array.isArray(response.data)) {
                this.allProprietarios = response.data;
                this.preencherPlanilhaComProprietarios();
                this.uiManager.showAlert('Proprietários carregados na planilha!', 'success');
            }
        } catch (error) {
            console.error('Erro ao carregar proprietários:', error);
            this.uiManager.showAlert('Erro ao carregar proprietários', 'danger');
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

        // Processar cada coluna a partir da coluna B (índice 1)
        const transferencias = [];
        let hasErrors = false;

        for (let colIndex = 1; colIndex < planilhaData[0].length; colIndex++) {
            // Verificar se a coluna tem dados (nome da transferência não vazio)
            const nomeTransferencia = (planilhaData[0][colIndex] || '').toString().trim();
            if (!nomeTransferencia) {
                continue; // Pular colunas vazias
            }

            // Obter datas de início e fim desta coluna
            const dataInicio = (planilhaData[1][colIndex] || '').toString().trim();
            const dataFim = (planilhaData[2][colIndex] || '').toString().trim();

            if (!dataInicio) {
                hasErrors = true;
                console.error(`Coluna ${colIndex + 1}: Data de início não informada para transferência "${nomeTransferencia}"`);
                continue;
            }

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
                    continue;
                }

                // Converter valor
                const valor = parseFloat(valorStr.replace(',', '.'));
                if (isNaN(valor)) {
                    hasErrors = true;
                    console.error(`Linha ${rowIndex + 1}, Coluna ${colIndex + 1}: Valor inválido: ${valorStr}`);
                    continue;
                }

                // Criar transferência
                transferencias.push({
                    alias_id: parseInt(aliasId),
                    proprietario_id: proprietario.id,
                    nome_transferencia: `${nomeTransferencia} - ${proprietario.nome}`,
                    tipo_transferencia: nomeTransferencia,
                    data_criacao: this.formatarDataParaAPI(dataInicio),
                    data_fim: dataFim ? this.formatarDataParaAPI(dataFim) : null,
                    valor: valor
                });
            }
        }

        if (hasErrors) {
            this.uiManager.showAlert('Verifique os dados na planilha. Alguns campos são inválidos.', 'warning');
            return;
        }

        if (transferencias.length === 0) {
            this.uiManager.showAlert('Nenhuma transferência válida encontrada na planilha', 'warning');
            return;
        }

        try {
            const submitButton = document.getElementById('btn-salvar-multiplas-transferencias');
            submitButton.disabled = true;
            submitButton.innerHTML = '<i class="fas fa-spinner fa-spin me-1"></i>Salvando...';

            console.log(`Salvando ${transferencias.length} transferências...`);

            // Enviar cada transferência individualmente
            const promises = transferencias.map(transferencia =>
                this.apiService.post('/api/transferencias/', transferencia)
            );

            const results = await Promise.allSettled(promises);
            const successes = results.filter(r => r.status === 'fulfilled' && r.value.success).length;
            const failures = results.length - successes;

            if (successes > 0) {
                this.uiManager.showAlert(`${successes} transferência(ões) cadastrada(s) com sucesso!`, 'success');
                if (failures > 0) {
                    this.uiManager.showAlert(`${failures} transferência(ões) falharam.`, 'warning');
                }

                // Fechar modal e limpar planilha
                const modal = document.getElementById('modal-multiplas_transferencias');
                bootstrap.Modal.getInstance(modal).hide();
                this.limparPlanilhaTransferencias();

                // Recarregar transferências se estiver na página de extras
                if (typeof this.loadTransferencias === 'function') {
                    this.loadTransferencias();
                }
            } else {
                this.uiManager.showAlert('Erro ao salvar transferências', 'danger');
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
}