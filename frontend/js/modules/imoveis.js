/**
 * Módulo Imóveis - Versión Refactorizada
 * Utiliza GridComponent para renderización de tabla desktop
 * Utiliza CacheService para optimizar llamadas API
 * @version 2.0.0
 */
class ImoveisModule {
    constructor() {
        this.apiService = window.apiService;
        this.uiManager = window.uiManager;
        this.cacheService = window.cacheService;
        this.modalManager = null;
        this.imoveis = [];
        this.currentEditId = null;
        this.isMobile = window.deviceManager && window.deviceManager.deviceType === 'mobile';
        
        // GridComponent instance
        this.gridComponent = null;
    }

    load() {
        this.container = this.isMobile
            ? document.getElementById('imoveis-list-mobile')
            : document.getElementById('imoveis-table-body');

        // If container not found, wait a bit and try again (timing issue)
        if (!this.container) {
            console.log('[ImoveisModule] Container not found, waiting 100ms and trying again...');
            setTimeout(() => {
                this.container = this.isMobile
                    ? document.getElementById('imoveis-list-mobile')
                    : document.getElementById('imoveis-table-body');
                console.log('[ImoveisModule] Container found after delay:', !!this.container);
                
                if (this.container) {
                    this.modalManager = new ModalManager('novo-imovel-modal', 'edit-imovel-modal');
                    this.bindPageEvents();
                    this.bindContainerEvents();
                    this.loadImoveis();
                }
            }, 100);
            return;
        }

        this.modalManager = new ModalManager('novo-imovel-modal', 'edit-imovel-modal');
        this.bindPageEvents();
        this.bindContainerEvents();
        this.loadImoveis();
        
        const isAdmin = window.authService && window.authService.isAdmin();
        this.applyPermissions(isAdmin);
    }

    async handleApiCall(apiCall, loadingMessage, errorMessagePrefix) {
        this.uiManager.showLoading(loadingMessage);
        try {
            return await apiCall();
        } catch (error) {
            this.uiManager.showError(`${errorMessagePrefix}. Please try again.`);
            return null;
        } finally {
            this.uiManager.hideLoading();
        }
    }

    bindPageEvents() {
        const btnNovo = document.getElementById('btn-novo-imovel');
        if (btnNovo) {
            btnNovo.addEventListener('click', () => this.showNewModal());
        }

        const formNovo = document.getElementById('form-novo-imovel');
        if (formNovo) {
            formNovo.addEventListener('submit', (e) => {
                e.preventDefault();
                const data = Object.fromEntries(new FormData(formNovo).entries());
                this.handleCreate(data, formNovo);
            });
        }

        const formEdit = document.getElementById('form-edit-imovel');
        if (formEdit) {
            formEdit.addEventListener('submit', (e) => {
                e.preventDefault();
                const data = Object.fromEntries(new FormData(formEdit).entries());
                this.handleUpdate(data);
            });
        }
    }

    bindContainerEvents() {
        if (!this.container) return;
        
        // Event delegation for mobile cards
        if (this.isMobile) {
            this.container.addEventListener('click', e => {
                const editButton = e.target.closest('.edit-btn');
                const deleteButton = e.target.closest('.delete-btn');

                const itemElement = e.target.closest('[data-id]');
                if (!itemElement) return;

                const id = parseInt(itemElement.dataset.id, 10);

                if (editButton) this.editImovel(id);
                if (deleteButton) this.deleteImovel(id);
            });
        }
        // Desktop: GridComponent handles click events via row actions
    }

    /**
     * Carga imóveis desde API con cache
     */
    async loadImoveis() {
        const result = await this.handleApiCall(
            // Usa cache por defecto (TTL: 5 minutos)
            () => this.apiService.getImoveis(true),
            'Carregando imóveis...',
            'Erro ao carregar imóveis'
        );
        
        if (result && Array.isArray(result)) {
            this.imoveis = result;
            this.render();
        } else {
            this.imoveis = [];
            this.render();
            this.uiManager.showError('Dados de imóveis inválidos recebidos do servidor.');
        }
    }

    /**
     * Renderiza tabla o cards según dispositivo
     */
    render() {
        if (!this.container) return;
        
        if (this.imoveis.length === 0) {
            this.container.innerHTML = this.isMobile
                ? `<div class="text-center p-4">Nenhum imóvel encontrado.</div>`
                : `<tr><td colspan="6" class="text-center">Nenhum imóvel encontrado.</td></tr>`;
            return;
        }

        if (this.isMobile) {
            this.renderMobile();
        } else {
            this.renderDesktop();
        }
    }

    /**
     * Renderización DESKTOP con GridComponent
     */
    renderDesktop() {
        const isAdmin = window.authService && window.authService.isAdmin();
        
        // Preparar datos para GridComponent
        const tableData = this.buildTableData();
        const columns = this.buildColumns();
        
        // Configurar acciones de fila
        const rowActions = isAdmin ? [
            {
                icon: 'fas fa-edit',
                label: 'Editar',
                class: 'btn-outline-primary',
                callback: (row) => this.editImovel(row.id)
            },
            {
                icon: 'fas fa-trash',
                label: 'Excluir',
                class: 'btn-outline-danger',
                callback: (row) => this.deleteImovel(row.id)
            }
        ] : [];

        // Configuración del GridComponent
        const gridConfig = {
            columns: columns,
            data: tableData,
            sortable: true,
            searchable: true,
            searchPlaceholder: 'Buscar por nome, endereço, tipo...',
            pagination: true,
            itemsPerPage: 20,
            itemsPerPageOptions: [10, 20, 50, 100],
            emptyMessage: 'Nenhum imóvel encontrado',
            rowActions: rowActions,
            responsive: {
                enabled: true,
                breakpoint: 768
            },
            classes: {
                table: 'table table-hover',
                headerCell: 'table-header-cell',
                bodyCell: 'table-body-cell'
            }
        };

        // Crear o actualizar GridComponent con el ID del container (string)
        const containerId = 'imoveis-table-body';
        if (!this.gridComponent) {
            this.gridComponent = new GridComponent(containerId, gridConfig);
        } else {
            this.gridComponent.updateConfig(gridConfig);
        }

        this.gridComponent.render();
    }

    /**
     * Transforma datos de API a formato de tabla
     */
    buildTableData() {
        return this.imoveis.map(imovel => ({
            id: imovel.id,
            nome: imovel.nome || '',
            tipo_imovel: imovel.tipo_imovel || 'Sem tipo',
            endereco: imovel.endereco || '—',
            area_total: imovel.area_total || '—',
            valor_mercado: imovel.valor_mercado || 0,
            valor_mercado_formatted: imovel.valor_mercado 
                ? `R$ ${imovel.valor_mercado.toLocaleString('pt-BR')}` 
                : '—',
            alugado: imovel.alugado || false,
            status_badge: imovel.alugado 
                ? '<span class="badge bg-danger">Alugado</span>' 
                : '<span class="badge bg-success">Disponível</span>'
        }));
    }

    /**
     * Define columnas para GridComponent
     */
    buildColumns() {
        return [
            {
                key: 'nome',
                label: 'Nome / Tipo',
                sortable: true,
                searchable: true,
                render: (value, row) => `
                    <strong>${this.sanitize(row.nome)}</strong>
                    <br>
                    <small class="text-muted">${this.sanitize(row.tipo_imovel)}</small>
                `
            },
            {
                key: 'endereco',
                label: 'Endereço',
                sortable: true,
                searchable: true,
                render: (value, row) => this.sanitize(value)
            },
            {
                key: 'area_total',
                label: 'Área (m²)',
                sortable: true,
                align: 'center',
                render: (value, row) => {
                    return value === '—' ? '—' : `${value} m²`;
                }
            },
            {
                key: 'valor_mercado',
                label: 'Valor',
                sortable: true,
                align: 'right',
                render: (value, row) => row.valor_mercado_formatted
            },
            {
                key: 'alugado',
                label: 'Status',
                sortable: true,
                align: 'center',
                render: (value, row) => row.status_badge
            }
        ];
    }

    /**
     * Renderización MOBILE con cards personalizados
     */
    renderMobile() {
        this.container.innerHTML = this.imoveis.map(imovel => this.renderMobileCard(imovel)).join('');
    }

    renderMobileCard(imovel) {
        const dataIdAttribute = `data-id="${imovel.id}"`;
        const statusAlugado = imovel.alugado 
            ? '<span class="badge bg-danger">Alugado</span>' 
            : '<span class="badge bg-success">Disponível</span>';
        const isAdmin = window.authService && window.authService.isAdmin();
        const disabledAttr = isAdmin ? '' : 'disabled';

        return `
            <div class="card mobile-card mb-2" ${dataIdAttribute}>
                <div class="card-body p-3">
                    <div class="d-flex justify-content-between align-items-start">
                        <div>
                            <h5 class="card-title mb-1">${this.sanitize(imovel.nome)}</h5>
                            <h6 class="card-subtitle mb-2 text-muted small">${this.sanitize(imovel.tipo_imovel) || 'Sem tipo'}</h6>
                        </div>
                        <div class="mobile-card-actions">
                            <button class="btn btn-sm btn-outline-primary edit-btn" ${disabledAttr}>
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="btn btn-sm btn-outline-danger delete-btn" ${disabledAttr}>
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </div>
                    <div class="card-text small">
                        <p class="mb-1"><strong>Endereço:</strong> ${this.sanitize(imovel.endereco) || 'N/A'}</p>
                        <p class="mb-1"><strong>Valor:</strong> R$ ${imovel.valor_mercado ? imovel.valor_mercado.toLocaleString('pt-BR') : 'N/A'}</p>
                        <p class="mb-0"><strong>Status:</strong> ${statusAlugado}</p>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Sanitiza strings para prevenir XSS
     */
    sanitize(str) {
        if (!str) return '';
        return String(str).replace(/[<>&"']/g, c => ({
            '<': '&lt;',
            '>': '&gt;',
            '&': '&amp;',
            '"': '&quot;',
            "'": '&#39;',
            '/': '&#x2F;'
        })[c]);
    }

    showNewModal() {
        this.currentEditId = null;
        const form = document.getElementById('form-novo-imovel');
        if (form) form.reset();
        this.modalManager.show('novo-imovel-modal');
    }

    async handleCreate(data, formElement) {
        const result = await this.handleApiCall(
            () => this.apiService.createImovel(data),
            'Criando imóvel...',
            'Erro ao criar imóvel'
        );
        
        if (result) {
            this.modalManager.hide('novo-imovel-modal');
            formElement.reset();
            
            // Invalidar cache de imoveis para forzar refresh
            if (this.cacheService) {
                this.cacheService.invalidate('imoveis');
            }
            
            this.loadImoveis();
            this.uiManager.showSuccessToast('Sucesso', 'Imóvel criado com sucesso.');
        }
    }

    async editImovel(id) {
        const imovel = this.imoveis.find(p => p.id === id);
        if (!imovel) {
            this.uiManager.showError('Imóvel não encontrado.');
            return;
        }

        this.currentEditId = id;
        const form = document.getElementById('form-edit-imovel');
        if (!form) return;

        Object.keys(imovel).forEach(key => {
            const input = form.querySelector(`[name="${key}"]`);
            if (input) {
                input.value = imovel[key] || '';
            }
        });

        this.modalManager.show('edit-imovel-modal');
    }

    async handleUpdate(data) {
        if (!this.currentEditId) return;

        const result = await this.handleApiCall(
            () => this.apiService.updateImovel(this.currentEditId, data),
            'Atualizando imóvel...',
            'Erro ao atualizar imóvel'
        );

        if (result) {
            this.modalManager.hide('edit-imovel-modal');
            
            // Invalidar cache de imoveis para forzar refresh
            if (this.cacheService) {
                this.cacheService.invalidate('imoveis');
            }
            
            this.loadImoveis();
            this.uiManager.showSuccessToast('Sucesso', 'Imóvel atualizado com sucesso.');
        }
    }

    async deleteImovel(id) {
        const imovel = this.imoveis.find(p => p.id === id);
        if (!imovel) return;

        const confirmed = await this.uiManager.showConfirm(
            'Excluir Imóvel', 
            `Tem certeza que deseja excluir ${imovel.nome}?`, 
            'danger'
        );
        if (!confirmed) return;

        const response = await this.handleApiCall(
            () => this.apiService.deleteImovel(id),
            'Excluindo imóvel...',
            'Erro ao excluir imóvel'
        );

        if (response) {
            // Invalidar cache de imoveis para forzar refresh
            if (this.cacheService) {
                this.cacheService.invalidate('imoveis');
            }
            
            this.loadImoveis();
            this.uiManager.showSuccessToast('Sucesso', 'Imóvel excluído com sucesso.');
        }
    }

    applyPermissions(isAdmin) {
        const btnNovo = document.getElementById('btn-novo-imovel');
        if (btnNovo) {
            btnNovo.style.display = isAdmin ? 'block' : 'none';
        }
        this.render();
    }
}

window.imoveisModule = new ImoveisModule();
