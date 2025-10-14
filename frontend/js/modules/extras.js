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
            this.carregarProprietariosAlias(e.target.value);
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
     * Popular selects de proprietários para ambos os modais
     */
    populateProprietariosSelects() {
        // Para o modal de Alias (apenas proprietários pertencentes)
        const proprietariosSelect = document.getElementById('alias-proprietarios');
        if (proprietariosSelect) {
            proprietariosSelect.innerHTML = '';
            this.allProprietarios.forEach(prop => {
                const option = document.createElement('option');
                option.value = prop.id;
                option.textContent = `${prop.nome} ${prop.sobrenome || ''}`.trim();
                proprietariosSelect.appendChild(option);
            });
        }

        // Para o modal de Transferências (combo de aliases e outros selects)
        const aliasCombo = document.getElementById('transferencia-alias');
        if (aliasCombo) {
            aliasCombo.innerHTML = '<option value="">Selecione um alias...</option>';
            // Será preenchido quando os aliases forem carregados
        }

        const origemSelect = document.getElementById('transferencia-origem');
        if (origemSelect) {
            origemSelect.innerHTML = '<option value="">Selecione proprietário origem...</option>';
            this.allProprietarios.forEach(prop => {
                const option = document.createElement('option');
                option.value = prop.id;
                option.textContent = `${prop.nome} ${prop.sobrenome || ''}`.trim();
                origemSelect.appendChild(option);
            });
        }

        const destinoSelect = document.getElementById('transferencia-destino');
        if (destinoSelect) {
            destinoSelect.innerHTML = '<option value="">Selecione proprietário destino...</option>';
            this.allProprietarios.forEach(prop => {
                const option = document.createElement('option');
                option.value = prop.id;
                option.textContent = `${prop.nome} ${prop.sobrenome || ''}`.trim();
                destinoSelect.appendChild(option);
            });
        }
    }

    /**
     * Mostrar modal de alias
     */
    async showAliasModal(extra = null) { // Added async here
        this.currentExtra = extra;
        const modal = document.getElementById('modal-alias');
        const modalTitle = document.getElementById('modalAliasLabel');
        const form = document.getElementById('form-alias');
        
        if (extra) {
            modalTitle.innerHTML = '<i class="fas fa-edit me-2"></i>Editar Alias';
            this.populateAliasForm(extra);
        } else {
            modalTitle.innerHTML = '<i class="fas fa-plus me-2"></i>Novo Alias';
            form.reset();
            // Cargar lista de proprietários disponibles
            await this.loadProprietarios();
        }

        // Limpar alertas
        const alerts = document.getElementById('alias-alerts');
        if (alerts) alerts.innerHTML = '';

        // Criar instância do modal
        const bootstrapModal = new bootstrap.Modal(modal);

        const saveBtn = document.getElementById('btn-salvar-alias');
        if(saveBtn) {
            const newSaveBtn = saveBtn.cloneNode(true);
            saveBtn.parentNode.replaceChild(newSaveBtn, saveBtn);
    
            newSaveBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.salvarAlias();
            });
        }

        // Configurar eventos mais robustos - usando 'once' para evitar acúmulo
        modal.addEventListener('shown.bs.modal', () => {
            // Permitir que o Bootstrap termine de configurar o modal primeiro
            setTimeout(() => {
                // Focar no primeiro input disponível após o modal ser exibido
                const firstInput = modal.querySelector('input[type="text"]:not([disabled]), select:not([disabled])');
                if (firstInput && !firstInput.matches(':focus')) {
                    firstInput.focus();
                }
            }, 200);
        }, { once: true });

        modal.addEventListener('hide.bs.modal', () => {
            // Remover foco antes que o modal seja oculto
            const focusedElement = modal.querySelector(':focus');
            if (focusedElement) {
                focusedElement.blur();
            }
        }, { once: true });

        modal.addEventListener('hidden.bs.modal', () => {
            // O Bootstrap lida com aria-hidden automaticamente, não precisamos interferir
            modal.removeAttribute('aria-modal');
        }, { once: true });

        // Mostrar modal
        bootstrapModal.show();
    }

    /**
     * Popular formulário de alias com dados
     */
    populateAliasForm(extra) {
    document.getElementById('alias-nome').value = extra.alias || '';

        // Selecionar múltiplos proprietários
        const proprietariosSelect = document.getElementById('alias-proprietarios');
        if (proprietariosSelect && extra.id_proprietarios) {
            try {
                const proprietarioIds = JSON.parse(extra.id_proprietarios);
                Array.from(proprietariosSelect.options).forEach(option => {
                    option.selected = proprietarioIds.includes(parseInt(option.value));
                });
            } catch (e) {
                console.warn('Erro ao processar proprietários:', e);
            }
        }
    }

    /**
     * Mostrar modal de transferências
     */
    showTransferenciasModal() {
        // Si los propietarios no están cargados, cargarlos primero y continuar
        if (!this.allProprietarios || this.allProprietarios.length === 0) {
            this.loadProprietarios().then(() => {
                this.showTransferenciasModal();
            });
            return;
        }
        // Mostrar integrantes si hay alias seleccionado y cargar proprietários
        setTimeout(() => {
            const aliasSelect = document.getElementById('transferencia-alias');
            const container = document.getElementById('transferencia-proprietarios-container');
            if (aliasSelect && container && aliasSelect.value) {
                container.style.display = '';
                // Copia lógica de edição: carregar proprietários do alias selecionado
                if (typeof this.carregarProprietariosAlias === 'function') {
                    this.carregarProprietariosAlias(aliasSelect.value);
                }
            }
        }, 300);
        // Si estamos em modo criação e já hay um alias seleccionado, cargar proprietários igual que em edição
        if (!this.currentTransferencia) {
            const aliasSelect = document.getElementById('transferencia-alias');
            if (aliasSelect && aliasSelect.value) {
                if (typeof this.carregarProprietariosAlias === 'function') {
                    this.carregarProprietariosAlias(aliasSelect.value);
                }
            }
        }
        const modal = document.getElementById('modal-transferencias');
        const form = document.getElementById('form-transferencias');
        const modalTitle = document.getElementById('modalTransferenciasLabel');

        // REMOVIDO: Configuração de event listener duplicada - agora é feita no setupEvents()

        // Se NÃO estivermos editando, limpiar todo e forçar título
        if (!this.currentTransferencia) {
            form.reset();
            if (modalTitle) {
                modalTitle.innerHTML = '<i class="fas fa-exchange-alt me-2"></i>Nova Transferência';
            }
            // Limpar campo de nome da transferência
            const nomeInput = document.getElementById('transferencia-nome');
            if (nomeInput) nomeInput.value = '';
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
        }
        
        // Carregar aliases disponíveis (sempre)
        this.carregarAliasParaTransferencia();

        // Limpar alertas
        const alerts = document.getElementById('transferencia-alerts');
        if (alerts) alerts.innerHTML = '';

        // Criar instância do modal
        const bootstrapModal = new bootstrap.Modal(modal);
        
        // Configurar eventos mais robustos - usando 'once' para evitar acúmulo
        modal.addEventListener('shown.bs.modal', () => {
            // Permitir que o Bootstrap termine de configurar o modal primeiro
            setTimeout(() => {
                // Focar no primeiro select disponível após o modal ser exibido
                const firstSelect = modal.querySelector('select:not([disabled])');
                if (firstSelect && !firstSelect.matches(':focus')) {
                    firstSelect.focus();
                }
            }, 200);
        }, { once: true });

        modal.addEventListener('hide.bs.modal', () => {
            // Remover foco antes que o modal seja oculto
            const focusedElement = modal.querySelector(':focus');
            if (focusedElement) {
                focusedElement.blur();
            }
        }, { once: true });

        modal.addEventListener('hidden.bs.modal', () => {
            // O Bootstrap lida com aria-hidden automaticamente
            modal.removeAttribute('aria-modal');
        }, { once: true });

        // Configurar event listener do formulário (apenas se não foi configurado ainda)
        if (form && !form.dataset.submitListenerAttached) {
            form.dataset.submitListenerAttached = 'true';
            form.addEventListener('submit', (e) => {
                e.preventDefault();
                
                // Pega o botão de submit a partir do evento ou do form
                const submitButton = e.submitter || form.querySelector('button[type="submit"]');
                
                // Proteção contra cliques múltiplos
                if (submitButton && submitButton.disabled) {
                    return;
                }
                
                this.salvarTransferencias();
            });
        }

        // Mostrar modal
        bootstrapModal.show();
    }

    /**
     * Carregar aliases para o combo de transferências
     */
    async carregarAliasParaTransferencia() {
        try {
            const response = await this.apiService.get('/api/extras/?ativo=true');
            const aliasSelect = document.getElementById('transferencia-alias');

            if (response && response.success && Array.isArray(response.data) && aliasSelect) {
                aliasSelect.innerHTML = '<option value="">Selecione um alias...</option>';
                response.data.forEach(alias => {
                    const option = document.createElement('option');
                    option.value = alias.id;
                    option.textContent = alias.alias;
                    aliasSelect.appendChild(option);
                });

                // Configurar evento de mudança
                aliasSelect.onchange = () => this.atualizarProprietariosTransferencia(aliasSelect.value);
            }
        } catch (error) {
            console.error('Erro ao carregar aliases:', error);
        }
    }

    /**
     * Atualizar proprietários da transferência baseado no alias selecionado
     */
    async atualizarProprietariosTransferencia(aliasId) {
        const container = document.getElementById('transferencia-proprietarios-container');
        const tbody = document.getElementById('transferencia-proprietarios-table');

        if (!aliasId || !container || !tbody) {
            if (container) container.style.display = 'none';
            return;
        }

        try {
            // Carregar dados do alias
            const aliasResponse = await this.apiService.get(`/api/extras/${aliasId}`);
            if (!aliasResponse || !aliasResponse.success) {
                container.style.display = 'none';
                return;
            }

            const alias = aliasResponse.data;
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

            if (proprietariosIds.length === 0) {
                container.style.display = 'none';
                return;
            }

            // Carregar proprietários
            const propResponse = await this.apiService.get('/api/proprietarios/');
            if (propResponse && propResponse.success && Array.isArray(propResponse.data)) {
                const proprietarios = propResponse.data.filter(p => proprietariosIds.includes(p.id));

                // Preencher tabela
                tbody.innerHTML = '';
                proprietarios.forEach(proprietario => {
                    const row = document.createElement('tr');
                    row.innerHTML = `
                        <td>${proprietario.nome}</td>
                        <td><input type="number" class="form-control form-control-sm" step="0.01" min="0" placeholder="0.00"></td>
                    `;
                    tbody.appendChild(row);
                });

                container.style.display = 'block';
            } else {
                container.style.display = 'none';
            }
        } catch (error) {
            console.error('Erro ao atualizar proprietários:', error);
            container.style.display = 'none';
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
     * Editar transferência
     */
    async editarTransferencia(id) {
        try {
            console.log(`Editando transferência ID: ${id}`);

            // Carregar dados da transferência
            const response = await this.apiService.get(`/api/transferencias/${id}`);
            if (!response || !response.success) {
                this.uiManager.showAlert('Erro ao carregar dados da transferência', 'danger');
                return;
            }

            const transferencia = response.data;
            console.log('Dados da transferência:', transferencia);

            // Preencher formulário
            const form = document.getElementById('form-transferencias');
            if (form) {
                form.reset();

                // Preencher campos
                const nomeInput = document.getElementById('transferencia-nome');
                const dataCriacaoInput = document.getElementById('transferencia-data-criacao');
                const dataFimInput = document.getElementById('transferencia-data-fim');

                if (nomeInput) nomeInput.value = transferencia.nome_transferencia || '';
                if (dataCriacaoInput) dataCriacaoInput.value = this.formatarDataParaInput(transferencia.data_criacao);
                if (dataFimInput) dataFimInput.value = transferencia.data_fim ? this.formatarDataParaInput(transferencia.data_fim) : '';
            }

            // Configurar modal para modo edição
            const modalLabel = document.getElementById('modalTransferenciasLabel');
            if (modalLabel) {
                modalLabel.innerHTML = '<i class="fas fa-edit me-2"></i>Editar Transferência';
            }

            const submitBtn = document.getElementById('btn-salvar-transferencias');
            if (submitBtn) {
                submitBtn.innerHTML = 'Salvar Alterações';
                submitBtn.setAttribute('data-transferencia-id', id);
            }

            // Mostrar modal
            const modal = document.getElementById('modal-transferencias');
            if (modal) {
                const bootstrapModal = new bootstrap.Modal(modal);
                bootstrapModal.show();
            }

        } catch (error) {
            console.error('Erro ao editar transferência:', error);
            this.uiManager.showAlert('Erro ao carregar transferência para edição', 'danger');
        }
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
     * Mostrar modal de múltiplas transferências
     */
    showMultiplasTransferenciasModal() {
        const modal = document.getElementById('modal-multiplas-transferencias');
        if (!modal) {
            console.error('Modal de múltiplas transferências não encontrado');
            return;
        }

        // Carregar aliases se ainda não foram carregados
        this.carregarAliasParaMultiplasTransferencias();

        // Inicializar Handsontable
        this.inicializarHandsontable();

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

        // Criar instância do modal
        const bootstrapModal = new bootstrap.Modal(modal);
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

        const aliasId = aliasSelect.value;

        try {
            const response = await this.apiService.get(`/api/extras/${aliasId}/proprietarios`);
            if (response && response.success && response.data && Array.isArray(response.data.proprietarios)) {
                this.allProprietarios = response.data.proprietarios;
                this.preencherPlanilhaComProprietarios();
                this.uiManager.showAlert('Proprietários do alias carregados na planilha!', 'success');
            } else {
                console.error('Resposta inválida da API:', response);
                this.uiManager.showAlert('Erro ao carregar proprietários do alias', 'danger');
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

        // Destruir instância anterior se existir
        if (this.handsontableInstance) {
            this.handsontableInstance.destroy();
        }

        // Dados iniciais
        const initialData = [
            ['Nome da Transferência'], // Linha 0
            ['Data Início'], // Linha 1
            ['Data Fim'], // Linha 2
            ['Proprietários'] // Linha 3 (cabeçalho)
        ];

        // Configuração da tabela
        const settings = {
            data: initialData,
            colHeaders: false,
            rowHeaders: false,
            minCols: 5,
            minRows: 10,
            maxCols: 20,
            contextMenu: true,
            manualColumnResize: true,
            manualRowResize: true,
            stretchH: 'all',
            height: 400,
            licenseKey: 'non-commercial-and-evaluation',
            cells: (row, col) => {
                const cellProperties = {};

                // Linha 0 (nomes das transferências) - editável
                if (row === 0 && col > 0) {
                    cellProperties.type = 'text';
                }
                // Linha 1 e 2 (datas) - tipo date
                else if ((row === 1 || row === 2) && col > 0) {
                    cellProperties.type = 'date';
                    cellProperties.dateFormat = 'DD/MM/YYYY';
                }
                // Linha 3 (cabeçalho proprietários) - readonly
                else if (row === 3) {
                    cellProperties.readOnly = true;
                }
                // Linhas de proprietários (valores) - tipo numeric
                else if (row > 3 && col > 0) {
                    cellProperties.type = 'numeric';
                    cellProperties.numericFormat = { pattern: '0,00' };
                }
                // Coluna A (proprietários) - readonly
                else if (col === 0 && row > 2) {
                    cellProperties.readOnly = true;
                }

                return cellProperties;
            }
        };

        this.handsontableInstance = new Handsontable(container, settings);
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

            // Coletar todos os proprietários desta transferência
            const proprietariosTransferencia = [];
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
                    continue;
                }

                // Converter valor
                const valor = parseFloat(valorStr.replace(',', '.'));
                if (isNaN(valor)) {
                    hasErrors = true;
                    console.error(`Linha ${rowIndex + 1}, Coluna ${colIndex + 1}: Valor inválido: ${valorStr}`);
                    continue;
                }

                // Adicionar proprietário à lista desta transferência
                proprietariosTransferencia.push({
                    id: proprietario.id,
                    valor: valor
                });

                // Somar ao valor total (valor absoluto)
                valorTotal += Math.abs(valor);
            }

            // Criar uma única transferência para esta coluna/tipo
            if (proprietariosTransferencia.length > 0) {
                transferencias.push({
                    alias_id: parseInt(aliasId),
                    nome_transferencia: nomeTransferencia,
                    valor_total: valorTotal,
                    id_proprietarios: JSON.stringify(proprietariosTransferencia),
                    data_criacao: this.formatarDataParaAPI(dataInicio),
                    data_fim: dataFim ? this.formatarDataParaAPI(dataFim) : null
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
            const successes = results.filter(r => r.status === 'fulfilled' && r.value && !r.value.detail).length;
            const failures = results.length - successes;

            if (successes > 0) {
                this.uiManager.showAlert(`${successes} transferência(ões) cadastrada(s) com sucesso!`, 'success');
                if (failures > 0) {
                    this.uiManager.showAlert(`${failures} transferência(ões) falharam.`, 'warning');
                }

                // Fechar modal e limpar planilha
                const modal = document.getElementById('modal-multiplas-transferencias');
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
     * Limpar a planilha de transferências
     */
    limparPlanilhaTransferencias() {
        if (this.handsontableInstance) {
            // Limpar dados da planilha
            const emptyData = [
                ['Nome da Transferência'], // Linha 0
                ['Data Início'], // Linha 1
                ['Data Fim'], // Linha 2
                ['Proprietários'] // Linha 3 (cabeçalho)
            ];

            // Adicionar linhas vazias para proprietários
            if (this.allProprietarios && this.allProprietarios.length > 0) {
                for (let i = 0; i < this.allProprietarios.length; i++) {
                    emptyData.push([this.allProprietarios[i].nome]);
                }
            }

            this.handsontableInstance.loadData(emptyData);
        }

        // Limpar seleção de alias
        const aliasSelect = document.getElementById('multiplas-transferencias-alias');
        if (aliasSelect) {
            aliasSelect.value = '';
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
            const [dia, mes, ano] = partes;
            return `${ano}-${mes.padStart(2, '0')}-${dia.padStart(2, '0')}`;
        }

        return dataStr; // Retornar como está se não conseguir converter
    }
}
