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
            setTimeout(() => {
                this.container = this.isMobile
                    ? document.getElementById('imoveis-list-mobile')
                    : document.getElementById('imoveis-table-body');
                
                if (this.container) {
                    this.modalManager = new ModalManager('novo-imovel-modal');
                    this.bindPageEvents();
                    this.bindContainerEvents();
                    this.loadImoveis();
                }
            }, 100);
            return;
        }

        this.modalManager = new ModalManager('novo-imovel-modal');
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
        console.log('[ImoveisModule] bindPageEvents - btnNovo encontrado:', !!btnNovo);
        if (btnNovo) {
            btnNovo.addEventListener('click', () => {
                console.log('[ImoveisModule] Botão Novo Imóvel clicado');
                this.showNewModal();
            });
        }

        const formNovo = document.getElementById('form-novo-imovel');
        if (formNovo) {
            formNovo.addEventListener('submit', (e) => {
                e.preventDefault();
                const formData = new FormData(formNovo);
                const data = Object.fromEntries(formData.entries());
                // Converter checkbox alugado para booleano
                data.alugado = formData.has('alugado');
                if (this.currentEditId) {
                    this.handleUpdate(data);
                } else {
                    this.handleCreate(data, formNovo);
                }
            });
        }
    }

    bindContainerEvents() {
        if (!this.container) return;
        
        // Event delegation for both mobile and desktop
        this.container.addEventListener('click', e => {
            const editButton = e.target.closest('.edit-btn');
            const deleteButton = e.target.closest('.delete-btn');

            if (!editButton && !deleteButton) return;

            // Get ID from button's data-id attribute (desktop) or parent element (mobile)
            let id;
            if (editButton) {
                id = editButton.dataset.id || e.target.closest('[data-id]')?.dataset.id;
            } else if (deleteButton) {
                id = deleteButton.dataset.id || e.target.closest('[data-id]')?.dataset.id;
            }

            if (!id) return;
            id = parseInt(id, 10);

            if (editButton) this.editImovel(id);
            if (deleteButton) this.deleteImovel(id);
        });
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
     * Renderización DESKTOP - Simples e direto no tbody
     */
    renderDesktop() {
        const isAdmin = window.authService && window.authService.isAdmin();
        const disabledAttr = isAdmin ? '' : 'disabled';

        const rowsHtml = this.imoveis.map(imovel => {
            const statusAlugado = imovel.alugado 
                ? '<span class="badge bg-success">Alugado</span>' 
                : '<span class="badge bg-danger">Disponível</span>';
            
            const dataCadastro = imovel.data_cadastro 
                ? new Date(imovel.data_cadastro).toLocaleDateString('pt-BR') 
                : 'N/A';

            return `
                <tr data-id="${imovel.id}">
                    <td>
                        <strong>${SecurityUtils.escapeHtml(imovel.nome) || 'N/A'}</strong><br>
                        <small class="text-muted">${SecurityUtils.escapeHtml(imovel.tipo_imovel) || 'Sem tipo'}</small>
                    </td>
                    <td>${SecurityUtils.escapeHtml(imovel.endereco) || 'N/A'}</td>
                    <td>
                        ${imovel.area_total ? imovel.area_total + ' m²' : 'N/A'}<br>
                        <small class="text-muted">${imovel.area_construida ? imovel.area_construida + ' m²' : 'N/A'}</small>
                    </td>
                    <td>
                        ${imovel.valor_cadastral ? 'R$ ' + parseFloat(imovel.valor_cadastral).toLocaleString('pt-BR', {minimumFractionDigits: 2}) : 'N/A'}<br>
                        <small class="text-muted">${imovel.valor_mercado ? 'R$ ' + parseFloat(imovel.valor_mercado).toLocaleString('pt-BR', {minimumFractionDigits: 2}) : 'N/A'}</small>
                    </td>
                    <td>
                        ${imovel.valor_iptu ? 'R$ ' + parseFloat(imovel.valor_iptu).toLocaleString('pt-BR', {minimumFractionDigits: 2}) : 'N/A'}<br>
                        <small class="text-muted">${imovel.valor_condominio ? 'R$ ' + parseFloat(imovel.valor_condominio).toLocaleString('pt-BR', {minimumFractionDigits: 2}) : 'N/A'}</small>
                    </td>
                    <td class="text-center">${statusAlugado}</td>
                    <td>${dataCadastro}</td>
                    <td class="text-center">
                        <button class="btn btn-sm btn-outline-primary edit-btn me-1" data-id="${imovel.id}" ${disabledAttr} title="Editar">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn btn-sm btn-outline-danger delete-btn" data-id="${imovel.id}" ${disabledAttr} title="Excluir">
                            <i class="fas fa-trash"></i>
                        </button>
                    </td>
                </tr>
            `;
        }).join('');

        this.container.innerHTML = rowsHtml;
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
            ? '<span class="badge bg-success">Alugado</span>' 
            : '<span class="badge bg-danger">Disponível</span>';
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
        console.log('[ImoveisModule] showNewModal chamado');
        console.log('[ImoveisModule] modalManager existe:', !!this.modalManager);
        this.currentEditId = null;
        const form = document.getElementById('form-novo-imovel');
        if (form) form.reset();
        this.modalManager.setTitle('Novo Imóvel');
        console.log('[ImoveisModule] Chamando modalManager.show()');
        this.modalManager.show();
    }

    async handleCreate(data, formElement) {
        const result = await this.handleApiCall(
            () => this.apiService.createImovel(data),
            'Criando imóvel...',
            'Erro ao criar imóvel'
        );
        
        if (result) {
            this.modalManager.hide();
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
        const form = document.getElementById('form-novo-imovel');
        if (!form) {
            console.error('[ImoveisModule] Form form-novo-imovel not found!');
            return;
        }

        Object.keys(imovel).forEach(key => {
            const input = form.querySelector(`[name="${key}"]`);
            if (input) {
                if (input.type === 'checkbox') {
                    input.checked = imovel[key] === true || imovel[key] === 'true';
                } else if (input.type === 'date' && imovel[key]) {
                    // Converter data para formato YYYY-MM-DD
                    const date = new Date(imovel[key]);
                    input.value = date.toISOString().split('T')[0];
                } else {
                    input.value = imovel[key] || '';
                }
            }
        });

        this.modalManager.setTitle('Editar Imóvel');
        this.modalManager.show();
    }

    async handleUpdate(data) {
        if (!this.currentEditId) return;

        const result = await this.handleApiCall(
            () => this.apiService.updateImovel(this.currentEditId, data),
            'Atualizando imóvel...',
            'Erro ao atualizar imóvel'
        );

        if (result) {
            this.modalManager.hide();
            
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
