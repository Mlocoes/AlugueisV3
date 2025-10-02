/**
 * Gerenciador de Login
 * Controla o modal de login e a autenticação da aplicação
 */

class LoginManager {
    constructor() {
        this.loginModal = null;
        this.loginForm = null;
        this.initialized = false;
    }

    /**
     * Inicializar o gerenciador de login
     */
    async init() {
        // Aguardar Bootstrap
        await this.waitForBootstrap();

        // Aguardar DOM estar pronto
        if (document.readyState !== 'complete') {
            await new Promise(resolve => {
                window.addEventListener('load', resolve);
            });
        }

        // Obter elementos
        this.loginModal = document.getElementById('loginModal');
        this.loginForm = document.getElementById('loginForm');

        if (!this.loginModal) {
            console.error('Modal de login não encontrado');
            return;
        }

        if (!this.loginForm) {
            console.error('Formulário de login não encontrado');
            return;
        }

        // Configurar event listeners
        this.setupEvents();

        // Verificar se foi logout e limpar formulário
        if (sessionStorage.getItem('logout_realizado') === 'true') {
            console.log('🧹 Logout detectado, limpando formulário...');
            sessionStorage.removeItem('logout_realizado');
            
            // Usar setTimeout para garantir que DOM está pronto
            setTimeout(() => {
                this.forceClearLoginForm();
                // Forçar reset do formulário HTML
                if (this.loginForm) {
                    this.loginForm.reset();
                }
            }, 100);
        }

        // Verificar se foi login bem-sucedido e limpar formulário
        if (sessionStorage.getItem('login_bem_sucedido') === 'true') {
            console.log('🧹 Login bem-sucedido detectado, limpando formulário...');
            sessionStorage.removeItem('login_bem_sucedido');
            
            // Usar setTimeout para garantir que DOM está pronto
            setTimeout(() => {
                this.forceClearLoginForm();
                // Forçar reset do formulário HTML
                if (this.loginForm) {
                    this.loginForm.reset();
                }
            }, 100);
        }

        // Limpar formulário imediatamente após inicialização
        // Isso previne que o navegador auto-complete com credenciais anteriores
        this.clearLoginForm();

        // Não verificar autenticação aqui - deixar para o UnifiedApp
        console.log('LoginManager inicializado - aguardando chamadas externas');
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
     * Configurar eventos do formulário
     */
    setupEvents() {
        if (this.loginForm) {
            this.loginForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleLogin();
            });
        }

        // Evento para Enter no campo de senha
        const senhaField = document.getElementById('senha');
        if (senhaField) {
            senhaField.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    this.handleLogin();
                }
            });
        }

        // Evento de abertura do modal
        if (this.loginModal) {
            // Usar o elemento HTML diretamente em vez de _element
            const modalElement = document.getElementById('loginModal');
            if (modalElement) {
                modalElement.addEventListener('shown.bs.modal', () => {
                    this.clearLoginForm();
                    const usuarioField = document.getElementById('usuario');
                    if (usuarioField) {
                        usuarioField.focus();
                    }
                });
                
                // Agregar listener que limpia cuando el modal se muestra
                modalElement.addEventListener('show.bs.modal', () => {
                    // Limpiar inmediatamente al abrir
                    this.forceClearLoginForm();
                });
            }
        }

        // Agregar observador para detectar cuando el navegador llena los campos
        this.setupAutocompleteWatcher();
    }

    /**
     * Configurar observador que detecta y limpia autocompletado del navegador
     */
    setupAutocompleteWatcher() {
        const usuarioField = document.getElementById('usuario');
        const senhaField = document.getElementById('senha');
        
        if (usuarioField && senhaField) {
            // Usar MutationObserver para detectar cambios en value
            const observer = new MutationObserver(() => {
                // Si el modal no está visible y los campos tienen valor, limpiarlos
                const modal = document.getElementById('loginModal');
                if (modal && !modal.classList.contains('show')) {
                    if (usuarioField.value || senhaField.value) {
                        console.log('🧹 Detectado autocomplete del navegador, limpiando...');
                        usuarioField.value = '';
                        senhaField.value = '';
                    }
                }
            });
            
            // Observar cambios en atributos de los campos
            observer.observe(usuarioField, { attributes: true, attributeFilter: ['value'] });
            observer.observe(senhaField, { attributes: true, attributeFilter: ['value'] });
            
            // También usar setInterval para revisar periódicamente
            setInterval(() => {
                const modal = document.getElementById('loginModal');
                const isAuthenticated = window.authService && window.authService.isAuthenticated();
                
                // Si está autenticado y modal no visible, asegurar campos vacíos
                if (isAuthenticated && modal && !modal.classList.contains('show')) {
                    if (usuarioField.value || senhaField.value) {
                        console.log('🧹 Limpieza periódica de campos...');
                        usuarioField.value = '';
                        senhaField.value = '';
                    }
                }
            }, 1000); // Revisar cada segundo
        }
    }

    /**
     * Verificar se o usuário está autenticado
     */
    async checkAuthentication() {
        try {
            // Verificar se authService está disponível
            if (!window.authService) {
                console.warn('AuthService não disponível, mostrando modal de login');
                this.showLoginModal();
                return;
            }

            // Verificar se há uma sessão válida
            const isValid = await window.authService.validateSession();
            if (isValid) {
                console.log('Sessão válida encontrada');
                return; // Não mostrar modal se já estiver autenticado
            }
        } catch (error) {
            console.warn('Erro ao verificar sessão:', error);
        }

        // Se chegou aqui, não há sessão válida - mostrar modal de login
        console.log('Nenhuma sessão válida - mostrando modal de login');
        this.showLoginModal();
    }    /**
     * Limpar todos os dados de autenticação
     */
    clearAllData() {
        if (window.authService) {
            window.authService.clearStorage();
        }
        this.clearLoginForm();
    }    /**
     * Mostrar modal de login
     */
    showLoginModal() {
        // Limpar os campos antes de mostrar o modal
        this.clearLoginForm();

        if (this.loginModal) {
            this.loginModal.show();
        }
    }

    /**
     * Limpar formulário de login
     */
    clearLoginForm() {
        const usuarioField = document.getElementById('usuario');
        const senhaField = document.getElementById('senha');
        const errorDiv = document.getElementById('loginError');

        if (usuarioField) {
            usuarioField.value = '';
            usuarioField.defaultValue = '';
        }
        if (senhaField) {
            senhaField.value = '';
            senhaField.defaultValue = '';
        }
        if (errorDiv) {
            errorDiv.classList.add('d-none');
        }
    }

    /**
     * Forzar limpieza agresiva del formulario (recrear campos)
     */
    forceClearLoginForm() {
        const usuarioField = document.getElementById('usuario');
        const senhaField = document.getElementById('senha');
        const loginForm = document.getElementById('loginForm');
        
        // Resetear el formulario completo
        if (loginForm) {
            loginForm.reset();
        }
        
        // Limpiar valores directamente
        if (usuarioField) {
            usuarioField.value = '';
            usuarioField.defaultValue = '';
            // Remover atributo value del HTML
            usuarioField.removeAttribute('value');
        }
        
        if (senhaField) {
            senhaField.value = '';
            senhaField.defaultValue = '';
            senhaField.removeAttribute('value');
        }
        
        // Llamar también a clearLoginForm normal
        this.clearLoginForm();
    }

    /**
     * Esconder modal de login
     */
    hideLoginModal() {
        const modal = document.getElementById('loginModal');
        if (modal) {
            const bsModal = bootstrap.Modal.getInstance(modal);
            if (bsModal) {
                bsModal.hide();
            }
        }
    }

    /**
     * Manipular login
     */
    async handleLogin() {
        const usuario = document.getElementById('usuario').value.trim();
        const senha = document.getElementById('senha').value.trim();

        if (!usuario || !senha) {
            this.showError('Por favor, preencha todos os campos.');
            return;
        }

        this.setLoading(true);

        try {
            // Usar authService em vez de fetch direto
            const result = await window.authService.login(usuario, senha);

            if (result.success) {
                // Limpar formulário ANTES de esconder modal e recarregar
                this.clearLoginForm();
                
                // Marcar no sessionStorage que é um login bem-sucedido
                sessionStorage.setItem('login_bem_sucedido', 'true');
                
                this.hideLoginModal();
                
                // Recarregar página para atualizar estado de autenticação
                window.location.reload();
            } else {
                this.showError('Erro no login');
            }
        } catch (error) {
            console.error('Erro no login:', error);
            this.showError('Erro de conexão. Tente novamente.');
        } finally {
            this.setLoading(false);
        }
    }

    /**
     * Ações após login bem-sucedido
     */
    onLoginSuccess() {
        // Esconder modal
        this.hideLoginModal();

        // Atualizar interface com dados do usuário
        this.updateUserInterface();

        // Permitir inicialização da aplicação
        this.enableApplication();

        // Atualizar visibilidade da navegação baseada nos permissos
        if (window.uiManager) {
            window.uiManager.updateImportTabVisibility();
            window.uiManager.updateActionButtonsVisibility();
        }

        // Mostrar mensagem de bienvenida
        const userData = window.authService.getUserData();
        // ...existing code...
    }

    /**
     * Atualizar interface com dados do usuário
     */
    updateUserInterface() {
        const userData = window.authService.getUserData();

        // Atualizar header com info do usuário (se existir)
        const userInfo = document.querySelector('.user-info');
        if (userInfo) {
            SecurityUtils.setSafeHTML(userInfo, `
                <i class="fas fa-user me-2"></i>
                ${SecurityUtils.escapeHtml(userData.usuario)} (${SecurityUtils.escapeHtml(userData.tipo)})
                <button class="btn btn-sm btn-outline-light ms-2" onclick="loginManager.logout()">
                    <i class="fas fa-sign-out-alt"></i>
                </button>
            `);
        }
    }

    /**
     * Habilitar funcionalidade da aplicação
     */
    enableApplication() {
        console.log('🚀 Habilitando aplicação após login válido...');

        // Remover classe de desabilitado se existir
        document.body.classList.remove('app-disabled');

        // Inicializar aplicação principal se ainda não foi
        if (window.app) {
            if (!window.app.initialized) {
                console.log('✅ Iniciando aplicação principal...');
                window.app.init().then(() => {
                    console.log('✅ APLICAÇÃO INICIADA EXITOSAMENTE');
                }).catch(error => {
                    console.error('❌ ERRO AO INICIAR APLICAÇÃO:', error);
                });
            } else {
                console.log('ℹ️ Aplicação já foi inicializada');
            }
        } else {
            console.error('❌ window.app não está disponível');
        }
    }

    /**
     * Realizar logout
     */
    logout() {
        if (confirm('Tem certeza que deseja sair?')) {
            console.log('🚪 Realizando logout...');

            // Limpar dados de autenticação
            if (window.authService) {
                window.authService.clearStorage();
            }

            // Limpar formulário ANTES do reload
            this.clearLoginForm();

            // Marcar no sessionStorage que é um logout
            sessionStorage.setItem('logout_realizado', 'true');

            // Recarregar página para forçar novo login
            window.location.reload();
        }
    }

    /**
     * Mostrar erro no formulário
     */
    showError(message) {
        const errorDiv = document.getElementById('loginError');
        if (errorDiv) {
            errorDiv.textContent = message;
            errorDiv.classList.remove('d-none');
        }
    }

    /**
     * Esconder erro do formulário
     */
    hideError() {
        const errorDiv = document.getElementById('loginError');
        if (errorDiv) {
            errorDiv.classList.add('d-none');
        }
    }

    /**
     * Definir estado de carregamento
     * @param {boolean} loading - Se está carregando
     */
    setLoading(loading) {
        const loginBtn = document.getElementById('loginBtn');
        const loadingSpinner = document.getElementById('loadingSpinner');

        if (loginBtn) {
            loginBtn.disabled = loading;
        }
        if (loadingSpinner) {
            if (loading) {
                loadingSpinner.classList.remove('d-none');
            } else {
                loadingSpinner.classList.add('d-none');
            }
        }
    }
}

// Criar instância global
window.loginManager = new LoginManager();
