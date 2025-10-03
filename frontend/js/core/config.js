/**
 * Configuração principal do Sistema de Aluguéis V2
 * Frontend otimizado e modular
 */

const AppConfig = {
    // API Configuration - Detección automática de entorno
    api: {
        baseUrl: '', // Se configurará automaticamente
        port: '8000',
        endpoints: {
            auth: '/api/auth/',
            proprietarios: '/api/proprietarios/',
            imoveis: '/api/imoveis/',
            alugueis: '/api/alugueis/',
            participacoes: '/api/participacoes/',
            relatorios: '/api/reportes/',
            distribuicoes: '/api/distribuicoes/',
            extras: '/api/extras/',
            transferencias: '/api/transferencias/',
            health: '/api/health'
        }
    },

    // Método para detectar entorno y configurar URL base
    async initNetwork() {
        // Para el entorno Docker con proxy NGINX, siempre usamos una URL base relativa.
        // NGINX se encarga de redirigir las llamadas /api/ al backend.
        this.api.baseUrl = '';

        // Probar conectividad con el backend a través del proxy.
        try {
            // Usamos la URL relativa que el proxy NGINX interceptará.
            const response = await fetch('/api/health');
            if (response.ok) {
            } else {
            }
        } catch (error) {
            console.error('❌ Error conectando con backend vía proxy:', error.message);
        }
    },

    // UI Configuration
    ui: {
        defaultTab: 'dashboard',
        animations: {
            fadeIn: 300,
            slideIn: 200,
            fadeOut: 150
        },
        modals: {
            backdrop: 'static',
            keyboard: false,
            focus: true
        },
        tables: {
            pageSize: 10,
            maxPages: 5
        }
    },

    // Método para obtener la URL base actual
    getBaseURL() {
        return this.api.baseUrl; // Retorna cadena vacía para uso con proxy nginx
    },

    // Método para actualizar la URL base (para compatibilidade)
    updateBaseURL(newBaseURL) {
        this.api.baseUrl = newBaseURL;
    }
};

// Export para uso global
window.AppConfig = AppConfig;

// Auto-inicialización al cargar la página
document.addEventListener('DOMContentLoaded', async () => {
    await AppConfig.initNetwork();
});
