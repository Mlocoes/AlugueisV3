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
        // Mostrar integrantes si hay alias seleccionado y cargar propietarios
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
        // Si estamos em modo criação e já hay um alias seleccionado, cargar propietarios igual que en edição
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
            if (response && response.success && Array.isArray(response.data)) {
                aliasSelect.innerHTML = '<option value="">Selecione um alias...</option>';
                response.data.forEach(alias => {
                    const option = document.createElement('option');
                    option.value = alias.id;
                    option.textContent = alias.alias;
                    option.dataset.proprietarios = alias.id_proprietarios;
                    aliasSelect.appendChild(option);
                });
                // Seleccionar automáticamente si solo hay un alias
                if (response.data.length === 1) {
                    aliasSelect.value = response.data[0].id;
                    if (typeof this.carregarProprietariosAlias === 'function') {
                        this.carregarProprietariosAlias(aliasSelect.value);
                    }
                }
            } else {
                console.warn('[DEBUG] No se recibieron alias válidos de la API');
            }
        } catch (error) {
            console.error('[DEBUG] Erro ao carregar aliases:', error);
            this.showError('Erro ao carregar aliases: ' + error.message);
        }
    }

    /**
     * Carregar proprietários do alias selecionado
     */
    async carregarProprietariosAlias(aliasId) {
        const container = document.getElementById('transferencia-proprietarios-container');
        const tableBody = document.getElementById('transferencia-proprietarios-table');
    // ...
    // ...existing code...
        if (!aliasId) {
            container.style.display = 'none';
            return;
        }
        try {
            const aliasSelect = document.getElementById('transferencia-alias');
            const selectedOption = aliasSelect.querySelector(`option[value="${aliasId}"]`);
            if (selectedOption && selectedOption.dataset.proprietarios) {
                const proprietarioIds = JSON.parse(selectedOption.dataset.proprietarios);
                tableBody.innerHTML = '';
                for (const id of proprietarioIds) {
                    const proprietario = this.allProprietarios.find(p => p.id === parseInt(id));
                    if (proprietario) {
                        let valorSalvo = '';
                        if (this.currentTransferencia && this.currentTransferencia.id_proprietarios) {
                            try {
                                const proprietariosSalvos = JSON.parse(this.currentTransferencia.id_proprietarios);
                                const proprietarioSalvo = proprietariosSalvos.find(p => p.id === proprietario.id);
                                if (proprietarioSalvo) {
                                    valorSalvo = proprietarioSalvo.valor || '';
                                }
                            } catch (error) {
                                // ...existing code...
                            }
                        }
                        const row = document.createElement('tr');
                        row.innerHTML = `
                            <td>
                                <strong>${proprietario.nome} ${proprietario.sobrenome || ''}</strong>
                            </td>
                            <td>
                                <div class="input-group">
                                    <span class="input-group-text" style="font-size:0.80rem;">R$</span>
                                    <input type="number" class="form-control" style="font-size:0.80rem;" 
                                           name="transferencia_${proprietario.id}" 
                                           step="0.01" placeholder="0,00"
                                           value="${valorSalvo}">
                                </div>
                            </td>
                        `;
                        tableBody.appendChild(row);
                    }
                }
                container.style.display = proprietarioIds.length > 0 ? 'block' : 'none';
            } else {
                container.style.display = 'none';
            }
        } catch (error) {
            // debugDiv.innerHTML += `<br>Erro ao carregar proprietarios: ${error}`;
        }
    }

    /**
     * Salvar alias
     */
    async salvarAlias() {
        try {
            const formData = new FormData(document.getElementById('form-alias'));
            
            // Obter proprietários selecionados
            const proprietariosSelect = document.getElementById('alias-proprietarios');
            const proprietariosSelecionados = Array.from(proprietariosSelect.selectedOptions)
                .map(option => parseInt(option.value))
                .filter(id => !isNaN(id));

            const aliasData = {
                alias: formData.get('alias-nome').trim(),
                id_proprietarios: proprietariosSelecionados.length > 0 ? JSON.stringify(proprietariosSelecionados) : null
            };

            // Validações básicas
            if (!aliasData.alias) {
                this.showAlert('Nome do alias é obrigatório', 'danger', 'alias-alerts');
                return;
            }

            if (proprietariosSelecionados.length === 0) {
                this.showAlert('Selecione pelo menos um proprietário', 'danger', 'alias-alerts');
                return;
            }

            let response;
            if (this.currentExtra) {
                // Editar
                response = await this.apiService.put(`/api/extras/${this.currentExtra.id}`, aliasData);
            } else {
                // Criar
                response = await this.apiService.post('/api/extras/', aliasData);
            }

            if (response && response.success) {
                this.showSuccess(this.currentExtra ? 'Alias atualizado com sucesso!' : 'Alias criado com sucesso!');
                // Fechar modal de forma segura para acessibilidade
                this.safeCloseModal('modal-alias', 'btn-salvar-alias');
                // Recargar la lista de aliases para mostrar el nuevo alias
                await this.loadExtras();
            }

        } catch (error) {
            console.error('Erro ao salvar alias:', error);
            
            // Tratamento específico para erro de duplicação
            let errorMessage = error.message;
            if (errorMessage.includes('Já existe um alias com este nome')) {
                errorMessage = 'Este nome de alias já existe. Por favor, escolha outro nome.';
            } else if (errorMessage.includes('HTTP 400')) {
                errorMessage = 'Dados inválidos. Verifique as informações e tente novamente.';
            }
            
            this.showAlert('Erro ao salvar alias: ' + errorMessage, 'danger', 'alias-alerts');
        }
    }

    /**
     * Salvar transferências
     */
    /**
     * Salvar transferências
     */
    async salvarTransferencias() {
        // Obter e desabilitar o botão de submit
        const submitButton = document.getElementById('btn-salvar-transferencias');
        if (submitButton) {
            submitButton.disabled = true;
        }
        
        try {
            const aliasId = document.getElementById('transferencia-alias').value;
            const nomeTransferencia = document.getElementById('transferencia-nome').value.trim();
            const dataCriacao = document.getElementById('transferencia-data-criacao').value;
            const dataFim = document.getElementById('transferencia-data-fim').value;
            
            if (!aliasId) {
                this.showAlert('Selecione um alias', 'danger', 'transferencia-alerts');
                if (submitButton) submitButton.disabled = false;
                return;
            }

            if (!nomeTransferencia) {
                this.showAlert('Digite o nome da transferência', 'danger', 'transferencia-alerts');
                if (submitButton) submitButton.disabled = false;
                return;
            }

            if (!dataCriacao) {
                this.showAlert('Selecione a data de criação', 'danger', 'transferencia-alerts');
                if (submitButton) submitButton.disabled = false;
                return;
            }

            // Validar que data_fim seja posterior à data_criacao (se informada)
            if (dataFim && dataCriacao && new Date(dataFim) < new Date(dataCriacao)) {
                this.showAlert('Data de fim deve ser posterior à data de criação', 'danger', 'transferencia-alerts');
                if (submitButton) submitButton.disabled = false;
                return;
            }

            // Coletar valores das transferências
            const proprietarios = [];
            const inputs = document.querySelectorAll('#transferencia-proprietarios-table input[type="number"]');
            let hasValue = false;

            inputs.forEach(input => {
                const proprietarioId = parseInt(input.name.replace('transferencia_', ''));
                const valor = parseFloat(input.value);
                if (!isNaN(valor) && valor !== 0) {
                    proprietarios.push({
                        id: proprietarioId,
                        valor: valor
                    });
                    hasValue = true;
                }
            });

            if (!hasValue) {
                this.showAlert('Informe pelo menos um valor de transferência diferente de zero', 'danger', 'transferencia-alerts');
                if (submitButton) submitButton.disabled = false;
                return;
            }

            // Calcular valor total
            const valorTotal = proprietarios.reduce((sum, prop) => sum + prop.valor, 0);

            // Preparar dados para envio
            const transferenciaData = {
                alias_id: parseInt(aliasId),
                nome_transferencia: nomeTransferencia,
                valor_total: valorTotal,
                id_proprietarios: JSON.stringify(proprietarios),
                data_criacao: dataCriacao,
                data_fim: dataFim || null
            };

            let response;
            if (this.currentTransferencia) {
                // Atualizar transferência existente
                response = await this.apiService.put(`/api/transferencias/${this.currentTransferencia.id}`, transferenciaData);
            } else {
                // Criar nova transferência
                response = await this.apiService.post('/api/transferencias/', transferenciaData);
            }

            if (response && (response.id || response.success !== false)) {
                this.showSuccess(this.currentTransferencia ? 
                    'Transferência atualizada com sucesso!' : 
                    'Transferência criada com sucesso!');
                // Resetar currentTransferencia
                this.currentTransferencia = null;
                // Fechar modal de forma segura para acessibilidade
                this.safeCloseModal('modal-transferencias', 'btn-salvar-transferencia');
                // Recargar la lista de transferencias para mostrar la nova transferência
                await this.loadTransferencias();
            }

        } catch (error) {
            console.error('Erro ao salvar transferência:', error);
            this.showAlert('Erro ao salvar transferência: ' + error.message, 'danger', 'transferencia-alerts');
        } finally {
            // Re-habilitar o botão de submit
            if (submitButton) {
                submitButton.disabled = false;
            }
        }
    }

    /**
     * Editar alias
     */
    async editarAlias(id) {
        try {
            const extra = this.allExtras.find(e => e.id === id);
            if (!extra) {
                this.showError('Alias não encontrado');
                return;
            }

            this.showAliasModal(extra);
        } catch (error) {
            console.error('Erro ao carregar alias para edição:', error);
            this.showError('Erro ao carregar alias: ' + error.message);
        }
    }

    /**
     * Excluir alias
     */
    async excluirAlias(id) {
        try {
            // Buscar o extra sem operações pesadas (comparando como número)
            const extra = this.allExtras.find(e => parseInt(e.id) === parseInt(id));
            if (!extra) {
                console.error('[DEBUG] Alias não encontrado para exclusão. id:', id, 'allExtras:', this.allExtras);
                this.showError('Alias não encontrado');
                return;
            }

            // Usar uiManager.showConfirm para confirmar exclusão
            const confirmed = await this.uiManager.showConfirm(
                'Excluir Alias',
                `Tem certeza que deseja excluir o alias "${extra.nome || extra.extra_nome}"?`,
                'danger'
            );

            if (!confirmed) return;

            // Executar a exclusão
            await this.executeDeleteAlias(parseInt(id));
        } catch (error) {
            console.error('Erro ao excluir alias:', error);
            this.showError('Erro ao excluir alias: ' + error.message);
        }
    }

    /**
     * Executar exclusão de alias sem bloquear a UI
     */
    async executeDeleteAlias(id) {
        // Evitar operações múltiplas
        if (this.pendingOperations.has(`delete-alias-${id}`)) {
            return;
        }

        const operationId = `delete-alias-${id}`;
        this.pendingOperations.add(operationId);
        
        try {

            // Chamada de API sem bloquear a UI
            const response = await this.apiService.delete(`/api/extras/${id}`);
            
            if (response && response.success) {
                this.showSuccess('Alias excluído com sucesso!');
                // Refuerzo: recargar lista completa desde backend e renderizar
                await this.loadExtras();
            } else {
                throw new Error('Resposta inválida do servidor');
            }

        } catch (error) {
            console.error('Erro ao excluir alias:', error);
            this.showError('Erro ao excluir alias: ' + error.message);
        } finally {
            this.pendingOperations.delete(operationId);
        }
    }

    /**
     * Mostrar estatísticas
     */
    async showEstatisticas() {
        try {
            
            const response = await this.apiService.get('/api/extras/estatisticas');
            
            if (response && response.success && response.data) {
                const stats = response.data;
                document.getElementById('stat-total-extras').textContent = stats.total_extras || 0;
                document.getElementById('stat-extras-ativos').textContent = stats.extras_ativos || 0;
                document.getElementById('stat-extras-inativos').textContent = stats.extras_inativos || 0;
                document.getElementById('stat-valor-total').textContent = 'R$ ' + this.formatMoney(stats.valor_total_transferencias || 0);

                const modal = new bootstrap.Modal(document.getElementById('modal-estatisticas-extras'));
                modal.show();
            }
        } catch (error) {
            console.error('Erro ao carregar estatísticas:', error);
            this.showError('Erro ao carregar estatísticas: ' + error.message);
        }
    }

    /**
     * Formatar valor monetário
     */
    formatMoney(value) {
        if (!value && value !== 0) return '0,00';
        return parseFloat(value).toLocaleString('pt-BR', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });
    }

    /**
     * Mostrar alerta de sucesso
     */
    showSuccess(message) {
        this.showAlert(message, 'success');
    }

    /**
     * Mostrar alerta de erro
     */
    showError(message) {
        this.showAlert(message, 'danger');
    }

    /**
     * Editar transferência
     */
    async editarTransferencia(id) {
        try {
            const transferencia = this.allTransferencias.find(t => t.id === id);
            if (!transferencia) {
                this.showError('Transferência não encontrada');
                return;
            }
            this.currentTransferencia = transferencia;
            this.showTransferenciasModal();
            requestAnimationFrame(async () => {
                try {
                    await this.carregarAliasParaTransferencia();
                    requestAnimationFrame(() => {
                        const aliasSelect = document.getElementById('transferencia-alias');
                        if (aliasSelect) {
                            aliasSelect.value = transferencia.alias_id;
                        }
                        const nomeInput = document.getElementById('transferencia-nome');
                        if (nomeInput) {
                            nomeInput.value = transferencia.nome_transferencia || '';
                        }
                        if (transferencia.data_criacao) {
                            const dataCriacaoInput = document.getElementById('transferencia-data-criacao');
                            if (dataCriacaoInput) {
                                // Extract date portion directly to avoid timezone conversion
                                dataCriacaoInput.value = transferencia.data_criacao.split('T')[0];
                            }
                        }
                        if (transferencia.data_fim) {
                            const dataFimInput = document.getElementById('transferencia-data-fim');
                            if (dataFimInput) {
                                // Extract date portion directly to avoid timezone conversion
                                dataFimInput.value = transferencia.data_fim.split('T')[0];
                            }
                        }
                        this.carregarProprietariosAlias(transferencia.alias_id);
                    });
                } catch (error) {
                    console.error('Erro ao carregar dados para edição:', error);
                }
            });
        } catch (error) {
            console.error('Erro ao carregar transferência para edição:', error);
            this.showError('Erro ao carregar transferência: ' + error.message);
        }
    }

    /**
     * Excluir transferência
     */
    async excluirTransferencia(id) {
        try {
            // Buscar a transferência sem operações pesadas
            const transferencia = this.allTransferencias.find(t => t.id == id);
            if (!transferencia) {
                this.showError('Transferência não encontrada');
                return;
            }

            // Usar uiManager.showConfirm para confirmar exclusão
            const confirmed = await this.uiManager.showConfirm(
                'Excluir Transferência',
                `Tem certeza que deseja excluir a transferência "${transferencia.alias_nome || 'sem nome'}"?`,
                'danger'
            );

            if (!confirmed) return;

            // Executar a exclusão
            await this.executeDeleteTransferencia(id);
        } catch (error) {
            console.error('Erro ao excluir transferência:', error);
            this.showError('Erro ao excluir transferência: ' + error.message);
        }
    }

    /**
     * Executar exclusão de transferência sem bloquear a UI
     */
    async executeDeleteTransferencia(id) {
        // Evitar operações múltiplas
        if (this.pendingOperations.has(`delete-transferencia-${id}`)) {
            return;
        }

        const operationId = `delete-transferencia-${id}`;
        this.pendingOperations.add(operationId);
        
        try {

            // Chamada de API sem bloquear a UI
            const response = await this.apiService.delete(`/api/transferencias/${id}`);
            
            if (response && (response.message || response.success !== false)) {
                // Actualizar dados localmente sem renderizar imediatamente
                this.allTransferencias = this.allTransferencias.filter(t => t.id !== id);
                
                // Mostrar sucesso e renderizar no próximo frame
                this.showSuccess('Transferência excluída com sucesso!');
                requestAnimationFrame(() => {
                    this.renderTransferenciasTable(this.allTransferencias);
                });
                
            } else {
                throw new Error('Resposta inválida do servidor');
            }

        } catch (error) {
            console.error('Erro ao excluir transferência:', error);
            this.showError('Erro ao excluir transferência: ' + error.message);
        } finally {
            this.pendingOperations.delete(operationId);
        }
    }

    /**
     * Mostrar alerta
     */
    showAlert(message, type, containerId = 'extras-alerts') {
        const alertsContainer = document.getElementById(containerId);
        if (!alertsContainer) return;
        
        const alert = document.createElement('div');
        alert.className = `alert alert-${type} alert-dismissible fade show`;
        alert.innerHTML = `
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
        `;
        
        alertsContainer.appendChild(alert);
        
        // Auto-remover após 5 segundos
        setTimeout(() => {
            if (alert && alert.parentNode) {
                alert.remove();
            }
        }, 5000);
    }
}

// Inicializar quando o DOM estiver pronto
document.addEventListener('DOMContentLoaded', function() {
    window.extrasManager = new ExtrasManager();
    window.extrasManager.apiService = window.apiService;
    // Disponibilizar também como extrasModule para o gerenciador de UI
    window.extrasModule = window.extrasManager;
});

// Adicionar método applyPermissions à classe ExtrasManager
ExtrasManager.prototype.applyPermissions = function(isAdmin) {

    const btnNovoAlias = document.getElementById('btn-novo-alias');
    if (btnNovoAlias) {
        btnNovoAlias.disabled = !isAdmin;
        btnNovoAlias.title = isAdmin ? 'Criar novo alias' : 'Apenas administradores podem criar alias';
    }

    const btnNovasTransferencias = document.getElementById('btn-novas-transferencias');
    if (btnNovasTransferencias) {
        btnNovasTransferencias.disabled = !isAdmin;
        btnNovasTransferencias.title = isAdmin ? 'Criar nova transferência' : 'Apenas administradores podem criar transferências';
    }

    // Re-renderizar tabelas para atualizar os botões de ação
    if (this.allExtras) {
        this.renderExtrasTable(this.allExtras);
    }
    if (this.allTransferencias) {
        this.renderTransferenciasTable(this.allTransferencias);
    }
};
