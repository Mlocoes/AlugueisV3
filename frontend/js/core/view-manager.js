/**
 * Manejador de Vistas Unificado
 * Gestiona la carga y visualización de las diferentes secciones de la aplicación
 */

class ViewManager {
    constructor() {
        this.views = new Map();
        this.currentView = null;
        this.isInitialized = false;
        this.contentContainer = null;
    }

    /**
     * Inicializar manejador de vistas
     */
    init() {
        if (this.isInitialized) return;
        
        this.contentContainer = document.getElementById('main-content');
        if (!this.contentContainer) {
            console.error('❌ Container de contenido principal no encontrado');
            return;
        }

        this.setupEventListeners();
        this.registerViews();
        this.isInitialized = true;
        
    }

    /**
     * Registrar todas las vistas disponibles
     */
    registerViews() {
        // Registrar vistas principales
        this.registerView('dashboard', {
            title: 'Dashboard',
            component: 'DashboardView',
            template: this.getDashboardTemplate(),
            requiredModules: ['dashboard']
        });

        this.registerView('proprietarios', {
            title: 'Gestão de Proprietários',
            component: 'ProprietariosView',
            template: this.getProprietariosTemplate(),
            requiredModules: ['proprietarios']
        });

        this.registerView('imoveis', {
            title: 'Gestão de Imóveis',
            component: 'ImoveisView',
            template: this.getImoveisTemplate(),
            requiredModules: ['imoveis']
        });

        this.registerView('participacoes', {
            title: 'Gestão de Participações',
            component: 'ParticipacoesView',
            template: this.getParticipacoesTemplate(),
            requiredModules: ['participacoes']
        });

        this.registerView('alugueis', {
            title: 'Matriz de Aluguéis',
            component: 'AlugueisView',
            template: this.getAlugueisTemplate(),
            requiredModules: ['alugueis']
        });

        this.registerView('relatorios', {
            title: 'Relatórios Financeiros',
            component: 'RelatoriosView',
            template: this.getRelatoriosTemplate(),
            requiredModules: ['relatorios']
        });

        this.registerView('extras', {
            title: 'Sistema de Extras',
            component: 'ExtrasView',
            template: this.getExtrasTemplate(),
            requiredModules: ['extras'],
            permission: 'admin'
        });

        this.registerView('importar', {
            title: 'Importar Dados',
            component: 'ImportarView',
            template: this.getImportarTemplate(),
            requiredModules: ['importacao', 'usuarioManager', 'proprietarios', 'imoveis'],
            permission: 'admin'
        });
    }

    /**
     * Registrar una vista
     */
    registerView(id, config) {
        this.views.set(id, {
            id,
            ...config,
            isLoaded: false,
            instance: null
        });
    }

    /**
     * Configurar event listeners
     */
    setupEventListeners() {
        // Escuchar eventos de navegación
        window.addEventListener('navigate', (e) => {
            this.showView(e.detail.view);
        });

        // Escuchar cambios de dispositivo
        window.addEventListener('deviceChange', (e) => {
            // Reactualizar vista actual si es necesario
            if (this.currentView) {
                this.refreshCurrentView();
            }
        });
    }

    /**
     * Mostrar una vista
     */
    async showView(viewId) {
        
        const view = this.views.get(viewId);
        if (!view) {
            console.error(`❌ Vista no encontrada: ${viewId}`);
            return;
        }

        // Eliminado bloqueo a dashboard: permitir acceso siempre que se solicite

        // Verificar permisos
        if (!this.checkViewPermission(view)) {
            // No navegar automáticamente a dashboard, solo mostrar advertencia
            return;
        }

        try {
            // Ocultar vista actual
            if (this.currentView) {
                this.hideCurrentView();
            }

            // Mostrar loading
            this.showLoading();

            // Cargar vista si no está cargada
            if (!view.isLoaded) {
                await this.loadView(view);
            }

            // Actualizar contenido
            this.updateContent(view);

            // Se for o dashboard em um dispositivo móvel, carregar os dados do dashboard móvel
            if (view.id === 'dashboard' && window.mobileUIManager && window.mobileUIManager.isMobile) {
                window.mobileUIManager.loadDashboardData();
            }
            
            // Actualizar título
            this.updateTitle(view.title);
            
            // Activar vista
            this.currentView = viewId;
            
            // Delay aumentado para garantir que o DOM seja completamente renderizado
            await new Promise(resolve => setTimeout(resolve, 200));
            
            // Inicializar módulos requeridos
            await this.initializeRequiredModules(view);
            
            // Ocultar loading
            this.hideLoading();
            

            // Disparar evento de que a vista foi completamente mostrada
            window.dispatchEvent(new CustomEvent('view-shown', {
                detail: { viewId: view.id }
            }));
            
        } catch (error) {
            console.error(`❌ Error cargando vista ${viewId}:`, error);
            this.showError('Error al cargar la vista');
        }
    }

    /**
     * Cargar una vista
     */
    async loadView(view) {
        // Marcar como cargada
        view.isLoaded = true;
        
        // Aquí podrían cargarse componentes dinámicamente si fuera necesario
    }

    /**
     * Actualizar contenido de la vista
     */
    updateContent(view) {
        if (!this.contentContainer) return;
        
        // Obtener template responsivo
        const template = this.getResponsiveTemplate(view);
        
        // Actualizar contenido de forma segura
        window.SecurityUtils.setSafeHTML(this.contentContainer, template);
        
        // Aplicar configuraciones específicas del dispositivo
        this.applyDeviceSpecificConfig(view);

        // Inicializar modales de usuario si estamos en la vista importar
        if (view.id === 'importar' && window.usuarioManagerModule && typeof window.usuarioManagerModule.setupEvents === 'function') {
            window.usuarioManagerModule.setupEvents();
        }

        // Registrar evento para el botón Novo Alias si estamos en la vista importar
        if (view.id === 'importar') {
            const btnNovoAlias = document.getElementById('btn-novo-alias');
            if (btnNovoAlias) {
                btnNovoAlias.addEventListener('click', async function() {
                    if (window.extrasModule && typeof window.extrasModule.loadProprietarios === 'function') {
                        await window.extrasModule.loadProprietarios();
                        window.extrasModule.showAliasModal(null);
                    } else if (window.extrasModule && typeof window.extrasModule.showAliasModal === 'function') {
                        window.extrasModule.showAliasModal(null);
                    } else {
                        const form = document.getElementById('form-alias');
                        if (form) form.reset();
                        const modalTitle = document.getElementById('modalAliasLabel');
                        if (modalTitle) modalTitle.innerHTML = '<i class="fas fa-plus me-2"></i>Novo Alias';
                        const modal = document.getElementById('modal-alias');
                        if (modal) {
                            bootstrap.Modal.getOrCreateInstance(modal).show();
                        }
                    }
                });
            }
            // Registrar evento para Novas Transferências
            const btnNovasTransferencias = document.getElementById('btn-novas-transferencias');
            if (btnNovasTransferencias) {
                btnNovasTransferencias.addEventListener('click', function() {
                    // Forzar modo de nova transferência
                    if (window.extrasModule && typeof window.extrasModule.showTransferenciasModal === 'function') {
                        window.extrasModule.currentTransferencia = null;
                        window.extrasModule.showTransferenciasModal();
                    } else {
                        // Fallback: limpiar y mostrar modal diretamente
                        const form = document.getElementById('form-transferencias');
                        if (form) form.reset();
                        const modal = document.getElementById('modal-transferencias');
                        if (modal) {
                            bootstrap.Modal.getOrCreateInstance(modal).show();
                        }
                    }
                });
            }
            
            // Registrar evento para el botón de múltiplas transferências
            const btnMultiplasTransferencias = document.getElementById('btn-multiplas-transferencias');
            if (btnMultiplasTransferencias) {
                btnMultiplasTransferencias.addEventListener('click', function() {
                    if (window.extrasModule && typeof window.extrasModule.showMultiplasTransferenciasModal === 'function') {
                        window.extrasModule.showMultiplasTransferenciasModal();
                    }
                });
            }
            
            // Registrar eventos para versões mobile dos botões
            const btnNovoAliasMobile = document.getElementById('btn-novo-alias-mobile');
            if (btnNovoAliasMobile) {
                btnNovoAliasMobile.addEventListener('click', async function() {
                    if (window.extrasModule && typeof window.extrasModule.loadProprietarios === 'function') {
                        await window.extrasModule.loadProprietarios();
                        window.extrasModule.showAliasModal(null);
                    } else if (window.extrasModule && typeof window.extrasModule.showAliasModal === 'function') {
                        window.extrasModule.showAliasModal(null);
                    } else {
                        const form = document.getElementById('form-alias');
                        if (form) form.reset();
                        const modalTitle = document.getElementById('modalAliasLabel');
                        if (modalTitle) modalTitle.innerHTML = '<i class="fas fa-plus me-2"></i>Novo Alias';
                        const modal = document.getElementById('modal-alias');
                        if (modal) {
                            bootstrap.Modal.getOrCreateInstance(modal).show();
                        }
                    }
                });
            }
            
            const btnNovasTransferenciasMobile = document.getElementById('btn-novas-transferencias-mobile');
            if (btnNovasTransferenciasMobile) {
                btnNovasTransferenciasMobile.addEventListener('click', function() {
                    // Forzar modo de nova transferência
                    if (window.extrasModule && typeof window.extrasModule.showTransferenciasModal === 'function') {
                        window.extrasModule.currentTransferencia = null;
                        window.extrasModule.showTransferenciasModal();
                    } else {
                        // Fallback: limpiar y mostrar modal diretamente
                        const form = document.getElementById('form-transferencias');
                        if (form) form.reset();
                        const modal = document.getElementById('modal-transferencias');
                        if (modal) {
                            bootstrap.Modal.getOrCreateInstance(modal).show();
                        }
                    }
                });
            }
            // Registrar evento para el botón de múltiplas transferências mobile
            const btnMultiplasTransferenciasMobile = document.getElementById('btn-multiplas-transferencias-mobile');
            if (btnMultiplasTransferenciasMobile) {
                btnMultiplasTransferenciasMobile.addEventListener('click', function() {
                    if (window.extrasModule && typeof window.extrasModule.showMultiplasTransferenciasModal === 'function') {
                        window.extrasModule.showMultiplasTransferenciasModal();
                    }
                });
            }
            
            // Registrar evento para el select de alias en transferencias
            setTimeout(() => {
                const aliasSelect = document.getElementById('transferencia-alias');
                if (aliasSelect) {
                    aliasSelect.addEventListener('change', function(e) {
                        if (window.extrasModule && typeof window.extrasModule.carregarProprietariosAlias === 'function') {
                            window.extrasModule.carregarProprietariosAlias(e.target.value);
                        }
                    });
                }
            }, 400);

            // Inicializar UsuarioManager para los modales de usuario
            if (window.usuarioManager && typeof window.usuarioManager.init === 'function') {
                window.usuarioManager.init();
            }
        }

        // Forzar la recarga de alias al cargar la vista extras para asegurar que allExtras siempre esté actualizado
        if (view.id === 'extras') {
            if (window.extrasModule && typeof window.extrasModule.loadExtras === 'function') {
                window.extrasModule.loadExtras();
            }
            if (window.extrasModule && typeof window.extrasModule.loadTransferencias === 'function') {
                window.extrasModule.loadTransferencias();
            }
        }
    }

    /**
     * Obtener template responsivo
     */
    getResponsiveTemplate(view) {
        const deviceType = window.deviceManager.deviceType;

        if (deviceType === 'mobile') {
            if (view.id === 'dashboard' && window.mobileUIManager) {
                return window.mobileUIManager.getMobileDashboardHTML();
            }
            if (view.id === 'proprietarios') {
                return this.getProprietariosMobileTemplate();
            }
            if (view.id === 'imoveis') {
                return this.getImoveisMobileTemplate();
            }
            if (view.id === 'participacoes') {
                return this.getParticipacoesMobileTemplate();
            }
            if (view.id === 'alugueis') {
                return this.getAlugueisMobileTemplate();
            }
            if (view.id === 'relatorios') {
                return this.getRelatoriosMobileTemplate();
            }
            if (view.id === 'importar') {
                return this.getImportarMobileTemplate();
            }
        }

        const template = view.template;
        
        // Aplicar clases responsivas
        return template.replace(/class="([^"]*)"/g, (match, classes) => {
            return `class="${classes} device-${deviceType}"`;
        });
    }

    /**
     * Aplicar configuración específica del dispositivo
     */
    applyDeviceSpecificConfig(view) {
        const deviceType = window.deviceManager.deviceType;
        const tableConfig = window.deviceManager.getTableConfig();
        
        // Configurar tablas según dispositivo
        if (tableConfig.responsive) {
            this.setupResponsiveTables();
        }
        
        if (tableConfig.compactMode && deviceType === 'mobile') {
            this.enableCompactMode();
        }
    }

    /**
     * Configurar tablas responsivas
     */
    setupResponsiveTables() {
        const tables = this.contentContainer.querySelectorAll('.table');
        tables.forEach(table => {
            if (!table.closest('.table-responsive-custom')) {
                const wrapper = document.createElement('div');
                wrapper.className = 'table-responsive-custom';
                table.parentNode.insertBefore(wrapper, table);
                wrapper.appendChild(table);
            }
            
            // Añadir clases responsivas
            table.classList.add('table-custom');
        });
    }

    /**
     * Habilitar modo compacto
     */
    enableCompactMode() {
        document.body.classList.add('compact-mode');
        
        // Añadir data-labels para tablas en móvil
        const tables = this.contentContainer.querySelectorAll('.table-custom');
        tables.forEach(table => {
            const headers = table.querySelectorAll('thead th');
            const rows = table.querySelectorAll('tbody tr');
            
            rows.forEach(row => {
                const cells = row.querySelectorAll('td');
                cells.forEach((cell, index) => {
                    if (headers[index]) {
                        cell.setAttribute('data-label', headers[index].textContent.trim());
                    }
                });
            });
        });
    }

    /**
     * Verificar permisos de vista
     */
    checkViewPermission(view) {
     if (!view.permission) return true;
     // Usar solo memoria: authService
     let userType = 'usuario';
     if (window.authService && typeof window.authService.getUserData === 'function') {
         const userData = window.authService.getUserData();
         if (userData && userData.tipo) userType = userData.tipo;
     }
     return view.permission === 'all' || 
         (view.permission === 'admin' && userType === 'administrador');
    }

    /**
     * Inicializar módulos requeridos
     */
    async initializeRequiredModules(view) {
        
        if (!view.requiredModules) {
            return;
        }
        
        for (const moduleName of view.requiredModules) {
            let moduleInstance = window[`${moduleName}Module`];
            
            // Create module instance if it doesn't exist
            if (!moduleInstance) {
                // Try to find and instantiate the module class
                let moduleClass = null;
                
                // Check for specific known class names first
                if (moduleName === 'importacao') {
                    moduleClass = window.ImportacaoModule;
                } else if (moduleName === 'usuarioManager') {
                    moduleClass = window.UsuarioManager;
                } else {
                    // Try standard naming convention: capitalize first letter + 'Module'
                    const className = moduleName.charAt(0).toUpperCase() + moduleName.slice(1) + 'Module';
                    moduleClass = window[className];
                }
                
                if (moduleClass) {
                    moduleInstance = new moduleClass();
                    window[`${moduleName}Module`] = moduleInstance;
                }
            }
            
            // If still not found, wait and retry
            if (!moduleInstance) {
                let retries = 0;
                while (!moduleInstance && retries < 5) {
                    // Esperar 100ms y reintentar
                    await new Promise(res => setTimeout(res, 100));
                    moduleInstance = window[`${moduleName}Module`];
                    retries++;
                }
            }
            
            try {
                if (moduleInstance) {
                    if (typeof moduleInstance.load === 'function') {
                        await moduleInstance.load();
                    } else {
                    }
                } else {
                    console.error(`❌ Módulo ${moduleName} não encontrado em window.${moduleName}Module após tentativas.`);
                }
            } catch (error) {
                console.error(`❌ Erro inicializando módulo ${moduleName}:`, error);
            }
        }
    }

    /**
     * Ocultar vista actual
     */
    hideCurrentView() {
        // Limpiar cualquier estado específico de la vista actual
        document.body.classList.remove('compact-mode');
    }

    /**
     * Actualizar título
     */
    updateTitle(title) {
        document.title = `${title} - Sistema de Aluguéis`;
        
        const headerTitle = document.getElementById('page-title');
        if (headerTitle) {
            window.SecurityUtils.setSafeHTML(headerTitle, title);
        }
    }

    /**
     * Mostrar loading
     */
    showLoading() {
        const loadingHTML = `
            <div class="d-flex justify-content-center align-items-center" style="min-height: 400px;">
                <div class="text-center">
                    <div class="spinner-border text-primary" role="status">
                        <span class="visually-hidden">Carregando...</span>
                    </div>
                    <div class="mt-3">Carregando...</div>
                </div>
            </div>
        `;
        
        if (this.contentContainer) {
            window.SecurityUtils.setSafeHTML(this.contentContainer, loadingHTML);
        }
    }

    /**
     * Ocultar loading
     */
    hideLoading() {
        // El loading se oculta automáticamente al actualizar el contenido
    }

    /**
     * Mostrar error
     */
    showError(message) {
        const errorHTML = `
            <div class="alert alert-danger text-center" role="alert">
                <i class="fas fa-exclamation-triangle me-2"></i>
                ${window.SecurityUtils.escapeHtml(message)}
            </div>
        `;
        
        if (this.contentContainer) {
            window.SecurityUtils.setSafeHTML(this.contentContainer, errorHTML);
        }
    }

    /**
     * Refrescar vista actual
     */
    refreshCurrentView() {
        if (this.currentView) {
            this.showView(this.currentView);
        }
    }

    /**
     * Obtener vista actual
     */
    getCurrentView() {
        return this.currentView;
    }

    // TEMPLATES DE VISTAS (métodos que retornan HTML)
    
    getProprietariosMobileTemplate() {
        return `
            <div class="proprietarios-container-mobile">
                <div id="proprietarios-list-mobile">
                    <!-- Mobile cards will be inserted here -->
                </div>
                <!-- Floating Action Button for adding new owner -->
                <button class="btn btn-primary btn-fab admin-only" id="btn-novo-proprietario" title="Adicionar Novo Proprietário">
                    <i class="fas fa-plus"></i>
                </button>
            </div>

            <!-- Modal Genérico para Proprietário (adicionado para mobile) -->
            <div class="modal fade" id="proprietario-modal" tabindex="-1" aria-labelledby="proprietarioModalLabel" aria-hidden="true">
                <div class="modal-dialog modal-lg">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title" id="proprietario-modal-title"></h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                        </div>
                        <div class="modal-body" style="font-size: 0.8rem; padding: 1rem;">
                            <form id="form-proprietario">
                                <div class="row" style="margin-bottom: 0.25rem;">
                                    <div class="col-md-6 mb-1">
                                        <label for="proprietario-nome" class="form-label" style="font-size: 0.85rem; margin-bottom: 0.1rem;">Nome *</label>
                                        <input type="text" class="form-control form-control-sm" id="proprietario-nome" name="nome" required style="font-size: 0.8rem; padding: 0.25rem 0.5rem;">
                                    </div>
                                    <div class="col-md-6 mb-1">
                                        <label for="proprietario-sobrenome" class="form-label" style="font-size: 0.85rem; margin-bottom: 0.1rem;">Sobrenome</label>
                                        <input type="text" class="form-control form-control-sm" id="proprietario-sobrenome" name="sobrenome" style="font-size: 0.8rem; padding: 0.25rem 0.5rem;">
                                    </div>
                                </div>
                                <div class="row" style="margin-bottom: 0.25rem;">
                                    <div class="col-md-6 mb-1">
                                        <label for="proprietario-tipo_documento" class="form-label" style="font-size: 0.85rem; margin-bottom: 0.1rem;">Tipo de Documento</label>
                                        <input type="text" class="form-control form-control-sm" id="proprietario-tipo_documento" name="tipo_documento" style="font-size: 0.8rem; padding: 0.25rem 0.5rem;">
                                    </div>
                                    <div class="col-md-6 mb-1">
                                        <label for="proprietario-documento" class="form-label" style="font-size: 0.85rem; margin-bottom: 0.1rem;">Documento</label>
                                        <input type="text" class="form-control form-control-sm" id="proprietario-documento" name="documento" style="font-size: 0.8rem; padding: 0.25rem 0.5rem;">
                                    </div>
                                </div>
                                <div class="mb-1">
                                    <label for="proprietario-endereco" class="form-label" style="font-size: 0.85rem; margin-bottom: 0.1rem;">Endereço</label>
                                    <input type="text" class="form-control form-control-sm" id="proprietario-endereco" name="endereco" style="font-size: 0.8rem; padding: 0.25rem 0.5rem;">
                                </div>
                                <div class="row" style="margin-bottom: 0.25rem;">
                                    <div class="col-md-6 mb-1">
                                        <label for="proprietario-telefone" class="form-label" style="font-size: 0.85rem; margin-bottom: 0.1rem;">Telefone</label>
                                        <input type="text" class="form-control form-control-sm" id="proprietario-telefone" name="telefone" style="font-size: 0.8rem; padding: 0.25rem 0.5rem;">
                                    </div>
                                    <div class="col-md-6 mb-1">
                                        <label for="proprietario-email" class="form-label" style="font-size: 0.85rem; margin-bottom: 0.1rem;">Email</label>
                                        <input type="email" class="form-control form-control-sm" id="proprietario-email" name="email" style="font-size: 0.8rem; padding: 0.25rem 0.5rem;">
                                </div>
                                <hr style="margin: 0.5rem 0;">
                                <h6 style="font-size: 0.9rem; margin-bottom: 0.25rem;">Dados Bancários</h6>
                                <div class="row" style="margin-bottom: 0.25rem;">
                                    <div class="col-md-6 mb-1">
                                        <label for="proprietario-banco" class="form-label" style="font-size: 0.85rem; margin-bottom: 0.1rem;">Banco</label>
                                        <input type="text" class="form-control form-control-sm" id="proprietario-banco" name="banco" style="font-size: 0.8rem; padding: 0.25rem 0.5rem;">
                                    </div>
                                    <div class="col-md-6 mb-1">
                                        <label for="proprietario-agencia" class="form-label" style="font-size: 0.85rem; margin-bottom: 0.1rem;">Agência</label>
                                        <input type="text" class="form-control form-control-sm" id="proprietario-agencia" name="agencia" style="font-size: 0.8rem; padding: 0.25rem 0.5rem;">
                                    </div>
                                </div>
                                <div class="row" style="margin-bottom: 0.25rem;">
                                    <div class="col-md-6 mb-1">
                                        <label for="proprietario-conta" class="form-label" style="font-size: 0.85rem; margin-bottom: 0.1rem;">Conta</label>
                                        <input type="text" class="form-control form-control-sm" id="proprietario-conta" name="conta" style="font-size: 0.8rem; padding: 0.25rem 0.5rem;">
                                    </div>
                                    <div class="col-md-6 mb-1">
                                        <label for="proprietario-tipo_conta" class="form-label" style="font-size: 0.85rem; margin-bottom: 0.1rem;">Tipo de Conta</label>
                                        <input type="text" class="form-control form-control-sm" id="proprietario-tipo_conta" name="tipo_conta" style="font-size: 0.8rem; padding: 0.25rem 0.5rem;">
                                    </div>
                                </div>
                                <div class="mb-1">
                                    <label for="proprietario-observacoes" class="form-label" style="font-size: 0.85rem; margin-bottom: 0.1rem;">Observações</label>
                                    <textarea class="form-control form-control-sm" id="proprietario-observacoes" name="observacoes" rows="2" style="font-size: 0.8rem; padding: 0.25rem 0.5rem;"></textarea>
                                </div>
                                <div class="modal-footer" style="padding: 0.25rem;">
                                    <button type="button" class="btn btn-secondary btn-sm" data-bs-dismiss="modal">Cancelar</button>
                                    <button type="submit" class="btn btn-primary btn-sm" id="btn-salvar-proprietario">Salvar</button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    _createImportarAccordionItem(type, title, icon, accordionId) {
        const suffix = this.isMobile ? '-mobile' : '';
        return `
            <div class="accordion-item">
                <h2 class="accordion-header" id="heading-${type}${suffix}">
                    <button class="accordion-button collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#collapse-${type}${suffix}" aria-expanded="false" aria-controls="collapse-${type}${suffix}">
                        <i class="fas ${icon} me-2"></i>${title}
                    </button>
                </h2>
                <div id="collapse-${type}${suffix}" class="accordion-collapse collapse" aria-labelledby="heading-${type}${suffix}" data-bs-parent="#${accordionId}">
                    <div class="accordion-body">
                        <form id="importar-form-${type}${suffix}" enctype="multipart/form-data">
                            <div class="input-group">
                                <input type="file" class="form-control" id="arquivo-${type}${suffix}" accept=".xlsx,.xls" required>
                                <button class="btn btn-primary" type="submit">Importar</button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        `;
    }

    getImportarMobileTemplate() {
        const accordionId = "importar-accordion-mobile";
        this.isMobile = true; // Forçar sufixo
        const items = [
            this._createImportarAccordionItem('proprietarios', 'Proprietários', 'fa-users', accordionId),
            this._createImportarAccordionItem('imoveis', 'Imóveis', 'fa-building', accordionId),
            this._createImportarAccordionItem('participacoes', 'Participações', 'fa-chart-pie', accordionId),
            this._createImportarAccordionItem('alugueis', 'Aluguéis', 'fa-calendar-alt', accordionId)
        ].join('');

        return `
            <div class="importar-container-mobile p-3">
                <div class="mb-3">
                    <div class="d-grid gap-2">
                        <button class="btn btn-primary" id="btn-cadastrar-usuario-mobile" data-bs-toggle="modal" data-bs-target="#modal-cadastrar-usuario">
                            <i class="fas fa-user-plus me-2"></i> Cadastrar Novo Usuário
                        </button>
                        <button class="btn btn-primary" id="btn-alterar-usuario-mobile" data-bs-toggle="modal" data-bs-target="#modal-alterar-usuario">
                            <i class="fas fa-user-edit me-2"></i> Alterar Usuário
                        </button>
                        <button class="btn btn-primary" id="btn-novo-alias-mobile" type="button">
                            <i class="fas fa-user-tag me-2"></i> Novo Alias
                        </button>
                        <button class="btn btn-primary" id="btn-novas-transferencias-mobile" type="button">
                            <i class="fas fa-exchange-alt me-2"></i> Nova Transferência
                        </button>
                        <button class="btn btn-primary" id="btn-multiplas-transferencias-mobile" type="button">
                            <i class="fas fa-table me-2"></i> Cadastrar Múltiplas Transferências
                        </button>
                    </div>
                </div>
                <div class="accordion" id="${accordionId}">
                    ${items}
                </div>
                <div id="validation-results-container-mobile" class="mt-3"></div>
            </div>

            <!-- Modales de Usuário -->
            <!-- Modal Cadastrar Usuário -->
            <div class="modal fade" id="modal-cadastrar-usuario" tabindex="-1" aria-labelledby="modalCadastrarUsuarioLabel">
                <div class="modal-dialog">
                    <div class="modal-content">
                        <div class="modal-header bg-primary text-white">
                            <h5 class="modal-title" id="modalCadastrarUsuarioLabel"><i class="fas fa-user-plus me-2"></i>Cadastrar Novo Usuário</h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                        </div>
                        <form id="form-cadastrar-usuario">
                            <div class="modal-body p-1" style="font-size: 0.80rem; max-height: 50vh; overflow-y: auto;">
                                <div class="mb-3">
                                    <label for="novo-usuario" class="form-label">Nome de Usuário *</label>
                                    <div class="input-group">
                                        <span class="input-group-text"><i class="fas fa-user"></i></span>
                                        <input type="text" class="form-control" id="novo-usuario" name="usuario" required placeholder="Digite o nome de usuário" autocomplete="off">
                                    </div>
                                    <div class="form-text">Mínimo 3 caracteres, apenas letras, números e underscore</div>
                                </div>
                                <div class="mb-3">
                                    <label for="nova-senha" class="form-label">Senha *</label>
                                    <div class="input-group">
                                        <span class="input-group-text"><i class="fas fa-lock"></i></span>
                                        <input type="password" class="form-control" id="nova-senha" name="senha" required placeholder="Digite a senha" autocomplete="off">
                                        <button class="btn btn-outline-secondary" type="button" id="toggle-senha"><i class="fas fa-eye"></i></button>
                                    </div>
                                    <div class="form-text">Mínimo 6 caracteres</div>
                                </div>
                                <div class="mb-3">
                                    <label for="confirmar-senha" class="form-label">Confirmar Senha *</label>
                                    <div class="input-group">
                                        <span class="input-group-text"><i class="fas fa-lock"></i></span>
                                        <input type="password" class="form-control" id="confirmar-senha" name="confirmar_senha" required placeholder="Confirme a senha" autocomplete="off">
                                    </div>
                                </div>
                                <div class="mb-3">
                                    <label for="tipo-usuario" class="form-label">Tipo de Usuário *</label>
                                    <div class="input-group">
                                        <span class="input-group-text"><i class="fas fa-user-tag"></i></span>
                                        <select class="form-select" id="tipo-usuario" name="tipo_de_usuario" required>
                                            <option value="">Selecione o tipo</option>
                                            <option value="administrador">Administrador</option>
                                            <option value="usuario">Usuário</option>
                                        </select>
                                    </div>
                                </div>
                                <div id="erro-cadastro-usuario" class="alert alert-danger d-none"></div>
                                <div id="sucesso-cadastro-usuario" class="alert alert-success d-none"></div>
                            </div>
                            <div class="modal-footer">
                                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancelar</button>
                                <button type="submit" class="btn btn-primary" id="btn-confirmar-cadastro">
                                    <span class="spinner-border spinner-border-sm d-none me-2" id="spinner-cadastro"></span>
                                    Cadastrar
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>

            <!-- Modal Alterar Usuário -->
            <div class="modal fade" id="modal-alterar-usuario" tabindex="-1" aria-labelledby="modalAlterarUsuarioLabel">
                <div class="modal-dialog">
                    <div class="modal-content">
                        <div class="modal-header bg-primary text-white">
                            <h5 class="modal-title" id="modalAlterarUsuarioLabel"><i class="fas fa-user-edit me-2"></i>Alterar Usuário</h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                        </div>
                        <div class="modal-body">
                            <div class="mb-3">
                                <label for="selecionar-usuario" class="form-label">Selecionar Usuário *</label>
                                <div class="input-group">
                                    <span class="input-group-text"><i class="fas fa-users"></i></span>
                                    <select class="form-select" id="selecionar-usuario" required>
                                        <option value="">Carregando usuários...</option>
                                    </select>
                                </div>
                            </div>
                            <form id="form-alterar-usuario" style="display: none;">
                                <div class="mb-3">
                                    <label for="alterar-nova-senha" class="form-label">Nova Senha (deixe vazio para não alterar)</label>
                                    <div class="input-group">
                                        <span class="input-group-text"><i class="fas fa-lock"></i></span>
                                        <input type="password" class="form-control" id="alterar-nova-senha" name="nova_senha" placeholder="Digite a nova senha" autocomplete="off">
                                        <button class="btn btn-outline-secondary" type="button" id="toggle-alterar-senha"><i class="fas fa-eye"></i></button>
                                    </div>
                                    <div class="form-text">Mínimo 6 caracteres (opcional)</div>
                                </div>
                                <div class="mb-3">
                                    <label for="alterar-confirmar-senha" class="form-label">Confirmar Nova Senha</label>
                                    <div class="input-group">
                                    <div class="input-group">
                                        <span class="input-group-text"><i class="fas fa-lock"></i></span>
                                        <input type="password" class="form-control" id="alterar-confirmar-senha" name="confirmar_nova_senha" placeholder="Confirme a nova senha" autocomplete="off">
                                    </div>
                                </div>
                                <div class="mb-3">
                                    <label for="alterar-tipo-usuario" class="form-label">Tipo de Usuário</label>
                                    <div class="input-group">
                                        <span class="input-group-text"><i class="fas fa-user-tag"></i></span>
                                        <select class="form-select" id="alterar-tipo-usuario" name="novo_tipo_usuario">
                                            <option value="">Não alterar</option>
                                            <option value="administrador">Administrador</option>
                                            <option value="usuario">Usuário</option>
                                        </select>
                                    </div>
                                </div>
                                <div class="d-flex gap-2">
                                    <button type="submit" class="btn btn-warning flex-fill"><i class="fas fa-save me-1"></i> Alterar Usuário</button>
                                    <button type="button" class="btn btn-danger" id="btn-excluir-usuario-selecionado"><i class="fas fa-trash me-1"></i> Excluir</button>
                                </div>
                            </form>
                            <div id="erro-alterar-usuario" class="alert alert-danger d-none mt-3"></div>
                            <div id="sucesso-alterar-usuario" class="alert alert-success d-none mt-3"></div>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal"><i class="fas fa-times me-1"></i> Fechar</button>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Modal Alias -->
            <div class="modal fade" id="modal-alias" tabindex="-1" aria-labelledby="modalAliasLabel" aria-hidden="true">
                <div class="modal-dialog">
                    <div class="modal-content">
                        <div class="modal-header bg-primary text-white">
                            <h5 class="modal-title" id="modalAliasLabel"><i class="fas fa-edit me-2"></i>Editar Alias</h5>
                            <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Close"></button>
                        </div>
                        <div class="modal-body p-2" style="font-size: 0.85rem; max-height: 60vh; overflow-y: auto;">
                            <div id="alias-alerts"></div>
                            <form id="form-alias">
                                <div class="mb-3">
                                    <label for="alias-nome" class="form-label">Nome do Alias</label>
                                    <input type="text" class="form-control" id="alias-nome" name="alias-nome" required>
                                </div>
                                <div class="mb-3">
                                    <label for="alias-proprietarios" class="form-label">Proprietários</label>
                                    <select multiple class="form-select" id="alias-proprietarios" name="proprietarios[]"></select>
                                </div>
                                <div class="modal-footer">
                                    <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancelar</button>
                                    <button type="submit" class="btn btn-primary" id="btn-salvar-alias">Salvar</button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    getRelatoriosTemplate() {
        return `
            <div class="relatorios-container">
                <!-- Encabezado eliminado -->
                <div id="relatorios-alerts"></div>
                <!-- Filtros sin rectángulo, estilo Participação -->
                        <div class="d-flex align-items-center mb-4" style="gap: 24px;
 flex-wrap: wrap;">                                                                  
                            <div class="d-flex align-items-center me-3">                                             <label for="relatorios-ano-select" class="form-label 
mb-0 me-2" style="min-width: 50px;">Ano</label>                                      
                                <select id="relatorios-ano-select" class="form-select" style="width: 160px; min-width: 140px;">                                           
                                    <option value="">Carregando...</option>                                          </select>
                            </div>
                            <div class="d-flex align-items-center me-3">
                                <label for="relatorios-mes-select" class="form-label 
mb-0 me-2" style="min-width: 50px;">Mês</label>                                      
                                <select id="relatorios-mes-select" class="form-select" style="width: 160px; min-width: 140px;">                                           
                                    <option value="">Todos os meses</option>                                             <option value="1">Janeiro</option>
                                    <option value="2">Fevereiro</option>
                                    <option value="3">Março</option>
                                    <option value="4">Abril</option>
                                    <option value="5">Maio</option>
                                    <option value="6">Junho</option>
                                    <option value="7">Julho</option>
                                    <option value="8">Agosto</option>
                                    <option value="9">Setembro</option>
                                    <option value="10">Outubro</option>
                                    <option value="11">Novembro</option>
                                    <option value="12">Dezembro</option>
                                </select>
                            </div>
                            <div class="d-flex align-items-center me-3">
                                <label for="relatorios-proprietario-select" class="fo
rm-label mb-0 me-2" style="min-width: 80px;">Proprietário</label>                    
                                <select id="relatorios-proprietario-select" class="form-select" style="width: 200px; min-width: 160px;">                                  
                                    <option value="">Carregando...</option>                                          </select>
                            </div>
                            <div class="d-flex align-items-center">
                                <input class="form-check-input me-2" type="checkbox" 
id="relatorios-transferencias-check">                                                
                                <label class="form-check-label" for="relatorios-transferencias-check">                                                                    
                                    <i class="fas fa-exchange-alt me-1"></i>Transferências                                                                                
                                </label>                                                                         </div>
                        </div>
                
                <div class="card-responsive">
                    <!-- Título eliminado por solicitud del usuario -->
                    <div class="card-body-responsive">
                            <div class="table-responsive-custom" style="max-height: 70vh; min-height: 50vh; overflow-y: auto;">                                                                       <table class="table table-striped table-hover table-custom" style="font-size: 0.76rem;">                                                      
                                <thead class="table-dark">                                                               <tr>
                                        <th width="50">Nº</th>
                                        <th>Nome do Proprietário</th>
                                        <th width="120" class="text-center">Período</
th>                                                                                  
                                        <th width="150" class="text-end">Soma dos Aluguéis</th>                                                                           
                                        <th width="150" class="text-end">Soma das Taxas de Administração</th>                                                             
                                        <th width="150" class="text-center">Imóveis</th>                                                                                  
                                    </tr>                                                                            </thead>
                                <tbody id="relatorios-table-body">
                                    <tr>
                                        <td colspan="6" class="text-center text-muted
 py-4">                                                                              
                                            <div class="spinner-border" role="status">                                                                                    
                                                <span class="visually-hidden">Carregando...</span>                                                                        
                                            </div>                                                                               <br>Carregando relatórios...
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    getExtrasTemplate() {
        return `
            <div class="extras-container">
                <!-- Seção de Aliases -->
                <div class="card-responsive mb-4">
                    <div class="card-body-responsive">
                        <div class="table-responsive-custom" style="max-height: 10.2r
em; min-height: 2.6rem; overflow-y: auto;">                                                                      
                            <table class="table table-striped table-hover table-custo
m" style="font-size: 0.80rem;">                                                                                      
                                <thead class="table-dark">
                                    <tr>
                                        <th>Alias</th>
                                        <th>Proprietários Pertenecentes</th>
                                        <th width="100" class="text-center">Ações</th
>                                                                                                                        
                                    </tr>
                                </thead>
                                <tbody id="extras-table-body">
                                    <tr>
                                        <td colspan="3" class="text-center text-muted
 py-4">                                                                                                                      
                                            <div class="spinner-border" role="status"
>                                                                                                                                    
                                                <span class="visually-hidden">Carrega
ndo...</span>                                                                                                                    
                                            </div>
                                            <br>Carregando aliases...
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                <!-- Seção de Transferências -->
                <div class="card-responsive">
                    <div class="card-header-responsive">
                        <h5 class="card-title mb-0"><i class="fas fa-exchange-alt me-
2"></i>Transferências</h5>                                                                               
                    </div>
                    <div class="card-body-responsive">
                        <div class="table-responsive-custom" style="max-height: 20rem
; min-height: 2.6rem; overflow-y: auto;">                                                                        
                            <table class="table table-striped table-hover table-custo
m" style="font-size: 0.80rem;">                                                                                      
                                <thead class="table-dark">
                                    <tr>
                                        <th>Alias</th>
                                        <th>Nome da Transferência</th>
                                        <th class="text-center">Data Início</th>
                                        <th class="text-center">Data Fim</th>
                                        <th width="120" class="text-center">Ações</th
>                                                                                                                        
                                    </tr>
                                </thead>
                                <tbody id="transferencias-table-body">
                                    <tr>
                                        <td colspan="5" class="text-center text-muted
 py-4">                                                                                                                      
                                            <div class="spinner-border" role="status"
>                                                                                                                                    
                                                <span class="visually-hidden">Carrega
ndo...</span>                                                                                                                    
                                            </div>
                                            <br>Carregando transferências...
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }
}

// Inicializar ViewManager globalmente
window.viewManager = new ViewManager();
