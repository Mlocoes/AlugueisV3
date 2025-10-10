/**
 * Aplicação principal do Sistema de Aluguéis V2 Otimizado
 * Ponto de entrada e coordenador de todos os módulos
 */

class SistemaAlugueisApp {
    constructor() {
        this.initialized = false;
        this.modules = {};
        this.version = '2.1.0';
    }

    /**
     * Inicializar a aplicação
     */
    async init() {
        try {

            // Esconder loading screen imediatamente
            const loadingScreen = document.getElementById('loading-screen');
            if (loadingScreen) {
                loadingScreen.style.display = 'none';
            }

            // Aguardar Bootstrap estar disponível
            await this.waitForBootstrap();

            // Configurar acessibilidade
            this.setupGlobalAccessibilityInterceptor();

            // Verificar dependências
            this.checkDependencies();

            // Verificar Chart.js
            if (typeof Chart !== 'undefined') {
            }

            // Verificar conexão com o backend
                // Inicializar view manager antes de cualquier navegación
                if (window.viewManager && typeof window.viewManager.init === 'function') {
                    window.viewManager.init();
                } else {
                }
            await this.checkBackendConnection();

            // Inicializar módulos
            await this.initializeModules();

            // Configurar eventos globais
            this.setupGlobalEvents();

            // Login/logout gerenciado por UnifiedApp em index.html (não por loginManager)

        } catch (error) {
            console.error('❌ Erro inicializando a aplicação:', error);
            this.showError('Erro ao inicializar a aplicação: ' + error.message);
        }
    }

    /**
     * Aguardar Bootstrap estar disponível
     */
    async waitForBootstrap() {
        return new Promise((resolve) => {
            const checkBootstrap = () => {
                if (typeof bootstrap !== 'undefined' && typeof bootstrap.Modal !== 'undefined') {
                    resolve();
                } else {
                    setTimeout(checkBootstrap, 50);
                }
            };
            checkBootstrap();
        });
    }

    /**
     * Configurar interceptor global para prevenir problemas de accesibilidade
     */
    setupGlobalAccessibilityInterceptor() {
        // Solución simple: solo loggear para debug
    }

    /**
     * Verificar dependências requeridas
     */
    checkDependencies() {
        const dependencies = [
            { name: 'Bootstrap', check: () => typeof bootstrap !== 'undefined' },
            { name: 'Chart.js', check: () => typeof Chart !== 'undefined' && Chart.version },
            { name: 'AppConfig', check: () => typeof window.AppConfig !== 'undefined' },
            { name: 'UIManager', check: () => typeof window.uiManager !== 'undefined' },
            { name: 'ApiService', check: () => typeof window.apiService !== 'undefined' }
        ];

        const missing = dependencies.filter(dep => !dep.check());

        if (missing.length > 0) {
            console.error('❌ Dependências faltantes:', missing.map(d => d.name));
            return false;
        }

        return true;
    }

    /**
     * Inicializar configuração de rede e detectar IP do servidor
     */
    async initializeNetwork() {
        try {

            // Esperar que AppConfig esteja disponível (máximo 2 segundos)
            let attempts = 0;
            const maxAttempts = 20;
            while (!window.AppConfig && attempts < maxAttempts) {
                await new Promise(resolve => setTimeout(resolve, 100));
                attempts++;
            }

            if (!window.AppConfig) {
                console.error('❌ window.AppConfig não pôde ser carregado após esperar');
                return;
            }

            // DESABILITADO: Usar detecção automática - sempre usar proxy nginx
            
            // Não modificar baseUrl - manter a configuração de proxy nginx
        } catch (error) {
            // Não fazer fallback para IPs diretos - manter proxy nginx
        }
    }    /**
     * Verificar conexão com o backend
     */
    async checkBackendConnection() {
        try {
            const health = await window.apiService.getHealth();

            // Atualizar indicador de conexão
            const indicator = document.querySelector('.navbar-text');
            if (indicator) {
                indicator.innerHTML = '<i class="fas fa-circle text-success me-1"></i>Conectado';
            }

            return true;
        } catch (error) {
            console.error('❌ Backend não disponível:', error);

            // Atualizar indicador de conexão
            const indicator = document.querySelector('.navbar-text');
            if (indicator) {
                indicator.innerHTML = '<i class="fas fa-circle text-danger me-1"></i>Desconectado';
            }

            throw new Error('Backend não disponível');
        }
    }

    /**
     * Inicializar módulos da aplicação
     */
    async initializeModules() {

        // Obtener CSRF token para proteção
        if (window.apiService && typeof window.apiService.getCsrfToken === 'function') {
            await window.apiService.getCsrfToken();
        }

        // Instanciar DashboardModule ANTES del login
        if (typeof window.DashboardModule !== 'undefined') {
            this.modules.dashboard = new window.DashboardModule();
            window.dashboardModule = this.modules.dashboard;
            // Garantir que init() seja chamado para configurar os event listeners
            if (typeof this.modules.dashboard.init === 'function') {
                this.modules.dashboard.init();
            }
        }

        if (typeof ProprietariosModule !== 'undefined') {
            this.modules.proprietarios = new ProprietariosModule();
            window.proprietariosModule = this.modules.proprietarios;
            // window.proprietariosModule.load(); // Call load() method
        }

        if (typeof ImoveisModule !== 'undefined') {
            this.modules.imoveis = new ImoveisModule();
            window.imoveisModule = this.modules.imoveis;
        }

        if (typeof ParticipacoesModule !== 'undefined') {
            this.modules.participacoes = new ParticipacoesModule();
            window.participacoesModule = this.modules.participacoes;
        }

        if (typeof ImportacaoModule !== 'undefined') {
            // Inicializar ImportacaoModule apenas ao acessar a tela importar
            // Instanciação movida para UI Manager
        }

        if (typeof AlugueisModule !== 'undefined') {
            this.modules.alugueis = new AlugueisModule();
            window.alugueisModule = this.modules.alugueis;
        }

        if (typeof window.usuarioManager !== 'undefined') {
            window.usuarioManager.init();
        }

        

        if (typeof ExtrasManager !== 'undefined') {
            // Inicializar ExtrasManager apenas ao acessar a tela extras
            // Instanciação movida para UI Manager
        }

    }

    /**
     * Configurar eventos globais
     */
    setupGlobalEvents() {
        // Event listener para o documento
        document.addEventListener('DOMContentLoaded', () => {
        });

        // Event listener para erros globais
        window.addEventListener('error', (event) => {
            if (typeof logToLocalStorage === 'function') {
                logToLocalStorage('[GLOBAL ERROR]', {
                    message: event.message,
                    filename: event.filename,
                    lineno: event.lineno,
                    colno: event.colno,
                    error: event.error ? event.error.stack : null
                });
            }
            let errorMsg = 'Erro desconhecido';
            if (event.error && event.error.message) {
                errorMsg = event.error.message;
            } else if (typeof event.error === 'string') {
                errorMsg = event.error;
            } else if (event.message) {
                errorMsg = event.message;
            }
            console.error('❌ Erro global capturado:', errorMsg);
            this.showError('Erro inesperado', errorMsg);
        });

        // Event listener para promessas rejeitadas
        window.addEventListener('unhandledrejection', (event) => {
            if (typeof logToLocalStorage === 'function') {
                logToLocalStorage('[GLOBAL UNHANDLEDREJECTION]', {
                    reason: event.reason,
                    promise: event.promise
                });
            }
            console.error('❌ Promessa rejeitada:', event.reason);
            this.showError('Erro de promessa não tratada', event.reason);
        });

        // Event listener para visibilidade da página
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden && this.initialized) {
                this.refreshCurrentTab();
            }
        });

        // Configurar gestão de aria-hidden para modales (acessibilidade)
        this.setupModalAccessibility();
    }

    /**
     * Configurar acessibilidade para modales
     */
    setupModalAccessibility() {
        // Solución simple: dejar que Bootstrap maneje todo normalmente
    }

    /**
     * Carregar aba inicial
     */
    loadInitialTab() {
    // No cargar ninguna pestaña automáticamente, esperar login exitoso
    }

    /**
     * Atualizar dados da aba atual
     */
    async refreshCurrentTab() {
        const currentTab = window.uiManager?.currentTab;
        if (currentTab && this.modules[currentTab]?.refresh) {
            try {
                await this.modules[currentTab].refresh();
            } catch (error) {
                console.error(`❌ Erro atualizando ${currentTab}:`, error);
            }
        }
    }

    /**
     * Mostrar erro crítico
     */
    showError(message, error) {
        // Criar modal de erro se não existir
        let errorModal = document.getElementById('errorModal');
        if (!errorModal) {
            errorModal = this.createErrorModal();
        }

        // Atualizar conteúdo do erro
        const errorMessage = errorModal.querySelector('#error-message');
        const errorDetails = errorModal.querySelector('#error-details');

        // Se o erro for nulo, indefinido ou vazio, mostrar mensagem genérica
        if (errorMessage) errorMessage.textContent = message || 'Ocorreu um erro inesperado.';
        if (errorDetails) {
            if (error === null || error === undefined || error === '' || error === 'null') {
                errorDetails.textContent = 'Não há detalhes técnicos disponíveis.';
            } else {
                errorDetails.textContent = error?.message || error?.toString() || String(error);
            }
        }

        // Mostrar modal apenas se existir corretamente
        if (errorModal) {
            const bsModal = new bootstrap.Modal(errorModal);
            bsModal.show();
        }
    }

    /**
     * Criar modal de erro dinamicamente
     */
    createErrorModal() {
        const modal = document.createElement('div');
        modal.id = 'errorModal';
        modal.className = 'modal fade';
        modal.innerHTML = `
            <div class="modal-dialog">
                <div class="modal-content">
                    <div class="modal-header bg-danger text-white">
                        <h5 class="modal-title">
                            <i class="fas fa-exclamation-triangle me-2"></i>
                            Erro do Sistema
                        </h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        <p><strong>Mensagem:</strong></p>
                        <p id="error-message" class="text-danger"></p>
                        <p><strong>Detalhes técnicos:</strong></p>
                        <pre id="error-details" class="bg-light p-2 rounded"></pre>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Fechar</button>
                        <button type="button" class="btn btn-primary" onclick="location.reload()">Recarregar Página</button>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
        return modal;
    }

    /**
     * Obter informações do sistema
     */
    getSystemInfo() {
        return {
            version: this.version,
            initialized: this.initialized,
            modules: Object.keys(this.modules),
            config: window.AppConfig,
            timestamp: new Date().toISOString()
        };
    }
}

// Função de inicialização global
async function initApp() {
    try {
        // Criar instância da aplicação
        window.app = new SistemaAlugueisApp();

        // Inicializar
        await window.app.init();

    } catch (error) {
        console.error('❌ Erro fatal inicializando a aplicação:', error);

        // Mostrar erro básico se não houver UI Manager
        if (typeof window.uiManager === 'undefined') {
            alert('Erro crítico: Não foi possível inicializar o sistema. Por favor, recarregue a página.');
        }
    }
}

// Expor funções globais para compatibilidade
window.initApp = initApp;

// Função de utilidade global para debug
window.debugApp = () => {
    if (window.app) {
        console.table(window.app.getSystemInfo());
    } else {
    }
};
