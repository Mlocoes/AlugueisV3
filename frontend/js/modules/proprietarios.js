/**
 * Módulo de Proprietários - Refactorizado com GridComponent
 * 
 * Melhorias:
 * - Uso de GridComponent para renderização
 * - Cache inteligente
 * - Código mais limpo e manutenível
 * 
 * @version 2.0.0
 */

class ProprietariosModule {
    constructor() {
        this.apiService = window.apiService;
        this.uiManager = window.uiManager;
        this.cacheService = window.cacheService;
        this.modalManager = null;
        
        // Dados
        this.proprietarios = [];
        this.currentEditId = null;
        
        // UI
        this.container = null;
        this.grid = null;
        this.isMobile = window.deviceManager && window.deviceManager.deviceType === 'mobile';
    }

    load() {
        // Identificar container
        this.container = this.isMobile
            ? document.getElementById('proprietarios-list-mobile')
            : document.getElementById('proprietarios-container');

        // Retry se não encontrar (timing issue)
        if (!this.container) {
            setTimeout(() => {
                this.container = this.isMobile
                    ? document.getElementById('proprietarios-list-mobile')
                    : document.getElementById('proprietarios-container');
                
                if (this.container) {
                    this.init();
                }
            }, 100);
            return;
        }
        
        this.init();
    }

    init() {
        this.modalManager = new ModalManager('proprietario-modal');
        this.bindPageEvents();
        this.bindContainerEvents();
        this.loadProprietarios();

        const isAdmin = window.authService && window.authService.isAdmin();
        this.applyPermissions(isAdmin);
    }

    bindPageEvents() {
        const btnNovo = document.getElementById('btn-novo-proprietario');
        if (btnNovo) {
            btnNovo.addEventListener('click', () => this.showNewModal());
        }

        const form = document.getElementById('form-proprietario');
        form?.addEventListener('submit', e => {
            e.preventDefault();
            const data = Object.fromEntries(new FormData(form).entries());
            if (this.currentEditId) {
                this.handleUpdate(data);
            } else {
                this.handleCreate(data, form);
            }
        });
    }

    bindContainerEvents() {
        if (!this.container) return;
        
        // Delegação de eventos para botões
        this.container.addEventListener('click', e => {
            const editButton = e.target.closest('.edit-btn');
            const deleteButton = e.target.closest('.delete-btn');

            if (editButton) {
                const id = parseInt(editButton.dataset.id || editButton.closest('[data-id]')?.dataset.id, 10);
                if (id) this.editProprietario(id);
            }
            
            if (deleteButton) {
                const id = parseInt(deleteButton.dataset.id || deleteButton.closest('[data-id]')?.dataset.id, 10);
                if (id) this.deleteProprietario(id);
            }
        });
    }

    async loadProprietarios() {
        try {
            this.uiManager.showLoading('Carregando proprietários...');
            
            // Usar cache para proprietários
            const result = this.cacheService 
                ? await this.apiService.getProprietarios(true)
                : await this.apiService.getProprietarios(false);
            
            if (result && Array.isArray(result)) {
                this.proprietarios = result;
                this.render();
            } else {
                this.proprietarios = [];
                this.render();
                this.uiManager.showError('Dados de proprietários inválidos recebidos do servidor.');
            }
        } catch (error) {
            this.uiManager.showError('Erro ao carregar proprietários: ' + error.message);
            this.proprietarios = [];
            this.render();
        } finally {
            this.uiManager.hideLoading();
        }
    }

    render() {
        if (!this.container) return;

        if (this.proprietarios.length === 0) {
            this.container.innerHTML = '<div class="alert alert-info">Nenhum proprietário encontrado.</div>';
            return;
        }

        if (this.isMobile) {
            this.renderMobile();
        } else {
            this.renderDesktop();
        }
    }

    renderMobile() {
        const isAdmin = window.authService && window.authService.isAdmin();
        const disabledAttr = isAdmin ? '' : 'disabled';

        const cardsHtml = this.proprietarios.map(prop => {
            const fullName = `${prop.nome || ''} ${prop.sobrenome || ''}`.trim();
            
            return `
                <div class="card mobile-card mb-2" data-id="${prop.id}">
                    <div class="card-body p-3">
                        <div class="d-flex justify-content-between align-items-start">
                            <h5 class="card-title mb-1">${SecurityUtils.escapeHtml(fullName)}</h5>
                            <div class="mobile-card-actions">
                                <button class="btn btn-sm btn-outline-primary edit-btn" data-id="${prop.id}" ${disabledAttr}>
                                    <i class="fas fa-edit"></i>
                                </button>
                                <button class="btn btn-sm btn-outline-danger delete-btn" data-id="${prop.id}" ${disabledAttr}>
                                    <i class="fas fa-trash"></i>
                                </button>
                            </div>
                        </div>
                        <div class="card-text small">
                            <p class="mb-1"><strong>Doc:</strong> ${SecurityUtils.escapeHtml(prop.documento) || 'N/A'}</p>
                            <p class="mb-1"><strong>Tel:</strong> ${SecurityUtils.escapeHtml(prop.telefone) || 'N/A'}</p>
                            <p class="mb-0"><strong>Email:</strong> ${SecurityUtils.escapeHtml(prop.email) || 'N/A'}</p>
                        </div>
                    </div>
                </div>
            `;
        }).join('');

        this.container.innerHTML = cardsHtml;
    }

    renderDesktop() {
        const columns = this.buildColumns();

        // Configuração do GridComponent
        const gridConfig = {
            columns: columns,
            data: this.proprietarios,
            responsive: {
                mobile: 'cards',
                desktop: 'table'
            },
            search: {
                enabled: true,
                placeholder: 'Buscar proprietário...',
                fields: ['nome', 'sobrenome', 'documento', 'email', 'telefone']
            },
            sort: {
                enabled: true,
                column: 'nome',
                direction: 'asc'
            },
            pagination: {
                enabled: true,
                pageSize: 20
            },
            actions: [
                {
                    name: 'edit',
                    icon: 'pencil',
                    label: 'Editar',
                    variant: 'outline-primary',
                    adminOnly: true,
                    onClick: (row) => this.editProprietario(row.id)
                },
                {
                    name: 'delete',
                    icon: 'trash',
                    label: 'Excluir',
                    variant: 'outline-danger',
                    adminOnly: true,
                    onClick: (row) => this.deleteProprietario(row.id)
                }
            ],
            emptyMessage: 'Nenhum proprietário encontrado.'
        };

        // Destruir grid anterior
        if (this.grid) {
            this.grid.destroy();
        }

        // Criar novo grid com o ID correto do tbody
        this.grid = new GridComponent('proprietarios-table-body', gridConfig);
    }

    buildColumns() {
        return [
            {
                key: 'id',
                label: 'ID',
                width: '80px',
                sortable: true,
                type: 'number'
            },
            {
                key: 'nome_completo',
                label: 'Nome Completo',
                sortable: true,
                filterable: true,
                formatter: (value, row) => {
                    const fullName = `${row.nome || ''} ${row.sobrenome || ''}`.trim();
                    return SecurityUtils.escapeHtml(fullName);
                }
            },
            {
                key: 'documento',
                label: 'Documento',
                sortable: true,
                filterable: true,
                formatter: (value) => SecurityUtils.escapeHtml(value) || 'N/A'
            },
            {
                key: 'telefone',
                label: 'Telefone',
                sortable: true,
                filterable: true,
                formatter: (value) => SecurityUtils.escapeHtml(value) || 'N/A'
            },
            {
                key: 'email',
                label: 'Email',
                sortable: true,
                filterable: true,
                formatter: (value) => SecurityUtils.escapeHtml(value) || 'N/A'
            }
        ];
    }

    showNewModal() {
        this.currentEditId = null;
        const form = document.getElementById('form-proprietario');
        if (form) form.reset();
        this.modalManager.setTitle('Novo Proprietário');
        this.modalManager.show();
    }

    async handleCreate(data, formElement) {
        try {
            this.uiManager.showLoading('Criando proprietário...');
            
            const result = await this.apiService.createProprietario(data);
            
            if (result && result.success) {
                this.modalManager.hide();
                formElement.reset();
                
                // Invalidar cache e recarregar
                if (this.cacheService) {
                    this.cacheService.invalidate('proprietarios');
                }
                
                await this.loadProprietarios();
                this.uiManager.showSuccessToast('Sucesso', 'Proprietário criado com sucesso.');
            } else {
                this.uiManager.showError('Erro ao criar proprietário.');
            }
        } catch (error) {
            this.uiManager.showError('Erro ao criar proprietário: ' + error.message);
        } finally {
            this.uiManager.hideLoading();
        }
    }

    async editProprietario(id) {
        const proprietario = this.proprietarios.find(p => p.id === id);
        if (!proprietario) {
            this.uiManager.showError('Proprietário não encontrado.');
            return;
        }

        this.currentEditId = id;
        const form = document.getElementById('form-proprietario');
        if (!form) return;

        // Preencher formulário
        Object.keys(proprietario).forEach(key => {
            const input = form.querySelector(`[name="${key}"]`);
            if (input) {
                input.value = proprietario[key] || '';
            }
        });

        this.modalManager.setTitle('Editar Proprietário');
        this.modalManager.show();
    }

    async handleUpdate(data) {
        if (!this.currentEditId) return;

        try {
            this.uiManager.showLoading('Atualizando proprietário...');
            
            const result = await this.apiService.updateProprietario(this.currentEditId, data);
            
            if (result && result.success) {
                this.modalManager.hide();
                
                // Invalidar cache e recarregar
                if (this.cacheService) {
                    this.cacheService.invalidate('proprietarios');
                }
                
                await this.loadProprietarios();
                this.uiManager.showSuccessToast('Sucesso', 'Proprietário atualizado com sucesso.');
            } else {
                this.uiManager.showError('Erro ao atualizar proprietário.');
            }
        } catch (error) {
            this.uiManager.showError('Erro ao atualizar proprietário: ' + error.message);
        } finally {
            this.uiManager.hideLoading();
        }
    }

    async deleteProprietario(id) {
        const proprietario = this.proprietarios.find(p => p.id === id);
        if (!proprietario) return;

        const confirmed = await this.uiManager.showConfirm(
            'Excluir Proprietário', 
            `Tem certeza que deseja excluir ${proprietario.nome}?`, 
            'danger'
        );
        
        if (!confirmed) return;

        try {
            this.uiManager.showLoading('Excluindo proprietário...');
            
            const response = await this.apiService.deleteProprietario(id);
            
            if (response) {
                // Invalidar cache e recarregar
                if (this.cacheService) {
                    this.cacheService.invalidate('proprietarios');
                }
                
                await this.loadProprietarios();
                this.uiManager.showSuccessToast('Sucesso', 'Proprietário excluído com sucesso.');
            }
        } catch (error) {
            this.uiManager.showError('Erro ao excluir proprietário: ' + error.message);
        } finally {
            this.uiManager.hideLoading();
        }
    }

    applyPermissions(isAdmin) {
        const btnNovo = document.getElementById('btn-novo-proprietario');
        if (btnNovo) {
            btnNovo.style.display = isAdmin ? 'block' : 'none';
        }
        
        // GridComponent já aplica permissões adminOnly automaticamente
        this.render();
    }
}

// Exportar instância global
window.proprietariosModule = new ProprietariosModule();
