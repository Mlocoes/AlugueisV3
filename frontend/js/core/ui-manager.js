/**
 * Gestor de UI - Maneja la interfaz de usuario
 * Navegación, pestañas, alertas, modales
 */

class UIManager {
    showErrorToast(message, error = '') {
        this.showError(error ? `${message}: ${error}` : message);
    }

    showSuccessToast(message, info = '') {
        this.showSuccess(info ? `${message}: ${info}` : message);
    }
    constructor() {
    this.currentTab = null; // No cargar dashboard automáticamente
        this.alertContainer = null;
        this.lastFocusedElement = null; // Para manejar el foco del modal
        this.init();
    }

    /**
     * Inicializar UI Manager
     */
    init() {
        this.createAlertContainer();
        this.setupEventListeners();
    }

    /**
     * Crear contenedor para alertas
     */
    createAlertContainer() {
        if (!this.alertContainer) {
            this.alertContainer = document.createElement('div');
            this.alertContainer.id = 'alert-container';
            this.alertContainer.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                z-index: 9999;
                max-width: 400px;
            `;
            document.body.appendChild(this.alertContainer);
        }
    }

    /**
     * Configurar event listeners
     */
    setupEventListeners() {
        // Event listener para teclas (escape para cerrar modales)
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.closeActiveModal();
            }
        });

        // Manejo de foco para todos los modales de Bootstrap
        document.addEventListener('show.bs.modal', (event) => {
            if (event.relatedTarget) {
                this.lastFocusedElement = event.relatedTarget;
            }
        });

        document.addEventListener('hide.bs.modal', () => {
            if (this.lastFocusedElement) {
                this.lastFocusedElement.focus();
                this.lastFocusedElement = null;
            }
        });
    }

    /**
     * Mostrar pestaña específica
     */
    async showTab(tabName) {

        // Lista de pestañas válidas
        const validTabs = ['dashboard', 'proprietarios', 'imoveis', 'participacoes', 'alugueis', 'relatorios', 'importar', 'extras'];

        if (!validTabs.includes(tabName)) {
            return false;
        }

        // Verificar permissões para a aba de importação
        if (tabName === 'importar') {
            if (!this.checkImportPermission()) {
                this.showAccessDeniedAlert();
                return false;
            }
        }

        // Verificar permissões para a aba extras (apenas admins)
        if (tabName === 'extras') {
            if (!this.checkAdminPermission()) {
                this.showAccessDeniedAlert('Acesso negado. Apenas administradores podem acessar a funcionalidade de Extras.');
                return false;
            }
        }

        // Ocultar todas las pestañas
        validTabs.forEach(tab => {
            const element = document.getElementById(tab);
            if (element) {
                element.classList.remove('active');
                element.style.display = 'none';
            }
        });

        // Mostrar pestaña seleccionada
        const selectedTab = document.getElementById(tabName);
        if (selectedTab) {
            selectedTab.classList.add('active');
            selectedTab.style.display = 'block';
            this.currentTab = tabName;
        }

        // Actualizar navegación
        this.updateNavigation(tabName);

        // Cargar datos de la pestaña
        await this.loadTabData(tabName);

        // Inicializar módulo específico si existe
        this.initializeTabModule(tabName);

        // Actualizar visibilidad de botones de acción
        this.updateActionButtonsVisibility();

        return true;
    }

    /**
     * Inicializar módulo específico de la pestaña
     */
    initializeTabModule(tabName) {
        try {
            switch (tabName) {
                case 'importar':
                    if (window.importacaoModule) {
                        if (typeof window.importacaoModule.init === 'function' && !window.importacaoModule.initialized) {
                            window.importacaoModule.init();
                        }
                    }
                    break;
                case 'dashboard':
                    // El dashboard no necesita inicialización especial, solo carga de datos
                    break;
                case 'proprietarios':
                    if (window.proprietariosModule && typeof window.proprietariosModule.init === 'function') {
                        window.proprietariosModule.init();
                    }
                    break;
                case 'imoveis':
                    if (window.imoveisModule && typeof window.imoveisModule.init === 'function') {
                        window.imoveisModule.init();
                    }
                    break;
                case 'participacoes':
                    if (window.participacoesModule && typeof window.participacoesModule.init === 'function') {
                        window.participacoesModule.init();
                    }
                    break;
                case 'extras':
                    // Inicializar extrasModule solo cuando se cambie a la pestaña 'extras'
                    if (tabName === 'extras' && window.extrasModule && typeof window.extrasModule.init === 'function') {
                        window.extrasModule.init();
                    }
                    break;
            }
        } catch (error) {
            console.error(`❌ Error inicializando módulo ${tabName}:`, error);
        }
    }

    /**
     * Actualizar navegación visual
     */
    updateNavigation(activeTab) {
        // Remover clase active de todos los nav-links
        document.querySelectorAll('.nav-link').forEach(link => {
            link.classList.remove('active');
        });

        // Agregar clase active al link correspondiente
        const activeNavLink = document.querySelector(`[onclick="showTab('${activeTab}')"]`);
        if (activeNavLink) {
            activeNavLink.classList.add('active');
        }

        // Verificar e atualizar visibilidade da aba de importação
        this.updateImportTabVisibility();
    }

    /**
     * Atualizar visibilidade da aba de importação baseada nos permisos do usuário
     */
    updateImportTabVisibility() {
        const importNavItem = document.querySelector(`[onclick="showTab('importar')"]`);
        if (!importNavItem) return;

        const hasPermission = this.checkImportPermission();
        const parentLi = importNavItem.closest('li');

        if (parentLi) {
            if (hasPermission) {
                parentLi.style.display = 'block';
                parentLi.setAttribute('title', '');
            } else {
                parentLi.style.display = 'none';
                parentLi.setAttribute('title', 'Somente administradores podem acessar esta área');
            }
        }

        // Atualizar visibilidade da aba de extras
        this.updateExtrasTabVisibility();
    }

    /**
     * Atualizar visibilidade da aba de extras baseada nos permisos do usuário (apenas admins)
     */
    updateExtrasTabVisibility() {
        const extrasNavItem = document.querySelector(`[onclick="showTab('extras')"]`);
        if (!extrasNavItem) return;

        const hasPermission = this.checkAdminPermission();
        const parentLi = extrasNavItem.closest('li');

        if (parentLi) {
            if (hasPermission) {
                parentLi.style.display = 'block';
                parentLi.setAttribute('title', '');
            } else {
                parentLi.style.display = 'none';
                parentLi.setAttribute('title', 'Somente administradores podem acessar esta área');
            }
        }
    }

    /**
     * Controlar visibilidad de botões de ação baseada nos permisos do usuário
     */
    updateActionButtonsVisibility() {
        const isAdmin = this.checkAdminPermission();

        // Controlar todos os botões com classe "admin-only"
        const adminOnlyButtons = document.querySelectorAll('.admin-only');

        adminOnlyButtons.forEach(button => {
            if (isAdmin) {
                button.style.display = '';
                button.disabled = false;
                button.setAttribute('title', '');
            } else {
                button.style.display = 'none';
                button.disabled = true;
                button.setAttribute('title', 'Somente administradores podem realizar esta ação');
            }
        });

    }

    /**
     * Verificar se o usuário é administrador
     */
    checkAdminPermission() {
        if (!window.authService || !window.authService.isAuthenticated()) {
            return false;
        }

        const userData = window.authService.getUserData();
        return userData && userData.tipo === 'administrador';
    }    /**
     * Cargar datos específicos de cada pestaña
     */
    async loadTabData(tabName) {
        try {

            switch (tabName) {
                case 'dashboard':
                    if (window.dashboardModule && typeof window.dashboardModule.load === 'function') {
                        await window.dashboardModule.load();
                    } else {
                    }
                    break;
                case 'proprietarios':
                    if (window.proprietariosModule && typeof window.proprietariosModule.load === 'function') {
                        await window.proprietariosModule.load();
                    }
                    break;
                case 'imoveis':
                    if (window.imoveisModule && typeof window.imoveisModule.load === 'function') {
                        await window.imoveisModule.load();
                    }
                    break;
                case 'participacoes':
                    if (window.participacoesModule && typeof window.participacoesModule.load === 'function') {
                        await window.participacoesModule.load();
                    }
                    break;
                case 'alugueis':
                    if (window.alugueisModule && typeof window.alugueisModule.load === 'function') {
                        await window.alugueisModule.load();
                    }
                    break;
                case 'relatorios':
                    // Instanciar relatoriosManager y relatoriosModule solo al cambiar a la pestaña 'relatorios'
                    if (!window.relatoriosManager) {
                        window.relatoriosManager = new window.RelatoriosManager();
                        window.relatoriosModule = window.relatoriosManager;
                    }
                    if (window.relatoriosModule && typeof window.relatoriosModule.load === 'function') {
                        await window.relatoriosModule.load();
                    }
                    break;
                case 'importar':
                    // Instanciar importacaoModule solo al cambiar a la pestaña 'importar'
                    if (!window.importacaoModule) {
                        window.importacaoModule = new window.ImportacaoModule();
                    }
                    if (window.importacaoModule && typeof window.importacaoModule.load === 'function') {
                        await window.importacaoModule.load();
                    }
                    break;
                case 'extras':
                    // Instanciar extrasModule solo al cambiar a la pestaña 'extras'
                    if (!window.extrasModule && window.ExtrasManager) {
                        window.extrasModule = new window.ExtrasManager();
                    }
                    if (window.extrasModule && typeof window.extrasModule.load === 'function') {
                        await window.extrasModule.load();
                    }
                    break;
                default:
            }
        } catch (error) {
            console.error(`❌ Error cargando datos de ${tabName}:`, error);
            this.showAlert(`Error cargando datos de ${tabName}: ${error.message}`, 'error');
        }
    }

    /**
     * Mostrar alerta
     */
    showAlert(message, type = 'info', duration = null) {
        const alertId = 'alert-' + Date.now();
        const alertElement = document.createElement('div');

        alertElement.id = alertId;
        alertElement.className = `alert alert-${type === 'error' ? 'danger' : type} alert-dismissible fade show mb-2`;
        alertElement.style.cssText = 'animation: slideInRight 0.3s ease-out;';

        // Usar SecurityUtils para prevenir XSS
        const safeMessage = window.SecurityUtils ? window.SecurityUtils.escapeHtml(message) : message;

        alertElement.innerHTML = `
            <div class="d-flex align-items-center">
                <i class="fas fa-${this.getAlertIcon(type)} me-2"></i>
                <span>${safeMessage}</span>
                <button type="button" class="btn-close ms-auto" onclick="uiManager.hideAlert('${alertId}')"></button>
            </div>
        `;

        this.alertContainer.appendChild(alertElement);

        // Auto-ocultar después del tiempo especificado
        const hideDelay = duration || window.AppConfig?.ui?.alerts?.autoHideDelay || 5000;
        setTimeout(() => {
            this.hideAlert(alertId);
        }, hideDelay);

    }

    /**
     * Ocultar alerta específica
     */
    hideAlert(alertId) {
        const alertElement = document.getElementById(alertId);
        if (alertElement) {
            alertElement.style.animation = 'slideOutRight 0.3s ease-in';
            setTimeout(() => {
                if (alertElement.parentNode) {
                    alertElement.remove();
                }
            }, 300);
        }
    }

    /**
     * Obtener icono para el tipo de alerta
     */
    getAlertIcon(type) {
        const icons = {
            success: 'check-circle',
            error: 'exclamation-circle',
            warning: 'exclamation-triangle',
            info: 'info-circle'
        };
        return icons[type] || 'info-circle';
    }

    /**
     * Mostrar modal
     */
    showModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            const bsModal = new bootstrap.Modal(modal);
            bsModal.show();
            return bsModal;
        }
        return null;
    }

    /**
     * Cerrar modal activo
     */
    closeActiveModal() {
        const activeModal = document.querySelector('.modal.show');
        if (activeModal) {
            const bsModal = bootstrap.Modal.getInstance(activeModal);
            if (bsModal) {
                bsModal.hide();
            }
        }
    }

    /**
     * Limpiar formulario
     */
    clearForm(formId) {
        const form = document.getElementById(formId);
        if (form) {
            form.reset();
            // Limpiar también campos que no se limpian con reset()
            form.querySelectorAll('input, select, textarea').forEach(field => {
                if (field.type === 'checkbox') {
                    field.checked = false;
                } else {
                    field.value = '';
                }
            });
        }
    }

    /**
     * Actualizar contador de elementos
     */
    updateCounter(elementId, count) {
        const element = document.getElementById(elementId);
        if (element) {
            element.textContent = count;
        }
    }

    /**
     * Mostrar/ocultar loader
     */
    showLoader(show = true) {
        let loader = document.getElementById('global-loader');

        if (show && !loader) {
            loader = document.createElement('div');
            loader.id = 'global-loader';
            loader.innerHTML = `
                <div class="d-flex justify-content-center align-items-center" style="
                    position: fixed; top: 0; left: 0; width: 100%; height: 100%; 
                    background: rgba(0,0,0,0.5); z-index: 10000;
                ">
                    <div class="spinner-border text-primary" role="status">
                        <span class="visually-hidden">Cargando...</span>
                    </div>
                </div>
            `;
            document.body.appendChild(loader);
        } else if (!show && loader) {
            loader.remove();
        }
    }

    /**
     * Métodos adicionales para compatibilidad con módulos
     */
    showLoading(message = 'Cargando...') {
        this.showLoader(true);
        if (message !== 'Cargando...') {
        }
    }

    hideLoading() {
        this.showLoader(false);
    }

    showSuccess(message) {
        this.showAlert(message, 'success');
    }

    showError(message) {
        this.showAlert(message, 'error');
    }

    showWarning(message) {
        this.showAlert(message, 'warning');
    }

    showInfo(message) {
        this.showAlert(message, 'info');
    }

    /**
     * Mostrar diálogo de confirmación
     */
    async showConfirm(title, message, type = 'warning') {
        return new Promise((resolve) => {
            // Crear modal de confirmación dinámicamente
            const modalId = 'confirm-modal-' + Date.now();
            const modalHtml = `
                <div class="modal fade" id="${modalId}" tabindex="-1" data-bs-backdrop="static">
                    <div class="modal-dialog">
                        <div class="modal-content">
                            <div class="modal-header">
                                <h5 class="modal-title">
                                    <i class="fas fa-${this.getAlertIcon(type)} me-2"></i>
                                    ${title}
                                </h5>
                                <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                            </div>
                            <div class="modal-body">
                                ${message}
                            </div>
                            <div class="modal-footer">
                                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">
                                    Cancelar
                                </button>
                                <button type="button" class="btn btn-${type === 'danger' ? 'danger' : 'primary'}" data-confirm="true">
                                    ${type === 'danger' ? 'Eliminar' : 'Confirmar'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            `;

            // Agregar modal al DOM
            document.body.insertAdjacentHTML('beforeend', modalHtml);
            const modalElement = document.getElementById(modalId);
            const modal = new bootstrap.Modal(modalElement);

            // Añadir focus management en hide.bs.modal
            modalElement.addEventListener('hide.bs.modal', () => {
                if (document.activeElement) document.activeElement.blur();
                document.body.focus();
            });

            // Event listeners
            modalElement.addEventListener('click', (e) => {
                if (e.target.hasAttribute('data-confirm')) {
                    // Focus management antes de cerrar modal de confirmación
                    if (document.activeElement) document.activeElement.blur();
                    document.body.focus();
                    modal.hide();
                    resolve(true);
                } else if (e.target.hasAttribute('data-bs-dismiss') || e.target.classList.contains('btn-secondary') || e.target.classList.contains('btn-close')) {
                    // Focus management antes de cerrar modal de cancelación
                    if (document.activeElement) document.activeElement.blur();
                    document.body.focus();
                    modal.hide();
                    resolve(false);
                }
            });

            // Limpiar cuando se cierre
            modalElement.addEventListener('hidden.bs.modal', () => {
                modalElement.remove();
            });

            modal.show();
        });
    }

    /**
     * Verificar se o usuário tem permissão para acessar a importação
     */
    checkImportPermission() {
        if (!window.authService || !window.authService.isAuthenticated()) {
            return false;
        }

        const userData = window.authService.getUserData();
        const isAdmin = userData && userData.tipo === 'administrador';

        if (!isAdmin) {
            return false;
        }

        return true;
    }    /**
     * Mostrar alerta de acesso negado
     */
    showAccessDeniedAlert(customMessage = null) {
        const userData = window.authService?.getUserData();
        const userName = userData?.usuario || 'Usuário';
        const userType = userData?.tipo || 'desconhecido';

        const message = customMessage || 
            `Acesso Negado: ${userName}, somente usuários administradores podem acessar a área de importação. Seu tipo de usuário: ${userType}`;

        this.showAlert(message, 'warning', 5000);
    }
}

// Crear instancia global del UIManager
window.uiManager = new UIManager();

// Función global para compatibilidad
window.showTab = function (tabName) {
    return window.uiManager.showTab(tabName);
};

// CSS adicional para animaciones
const style = document.createElement('style');
style.textContent = `
    @keyframes slideInRight {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    
    @keyframes slideOutRight {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(100%); opacity: 0; }
    }
`;
document.head.appendChild(style);