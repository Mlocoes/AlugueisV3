/**
 * Configuración de Red - Auto-detección de IP del servidor
 * Sistema de Aluguéis V2
 */

class NetworkConfig {
    constructor() {
        this.serverIP = null;
        this.serverPort = '8000';
        this.detectionMethods = [
            () => this.getIPFromURL(),
            () => this.getLocalIP(),
            () => this.getDefaultIP()
        ];
    }

    /**
     * Detectar automáticamente la IP del servidor
     */
    async detectServerIP() {
        for (const method of this.detectionMethods) {
            try {
                const ip = await method();
                if (ip && await this.testConnection(ip)) {
                    this.serverIP = ip;
                    return ip;
                }
            } catch (error) {
            }
        }

        // Fallback para IP local
        this.serverIP = '192.168.0.7';
        return this.serverIP;
    }

    /**
     * Obtener IP desde la URL actual (si no es localhost)
     */
    getIPFromURL() {
        const hostname = window.location.hostname;
        if (hostname !== 'localhost' && hostname !== '127.0.0.1' && hostname !== '') {
            return hostname;
        }
        return null;
    }

    /**
     * Obtener IP local de la red (configuración estática)
     */
    getLocalIP() {
        // IP detectada del servidor
        return '192.168.0.7';
    }

    /**
     * IP por defecto
     */
    getDefaultIP() {
        return '192.168.0.7';
    }

    /**
     * Probar conexión con el servidor
     */
    async testConnection(ip, timeout = 3000) {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), timeout);

            const response = await fetch(`http://${ip}:${this.serverPort}/health`, {
                method: 'GET',
                signal: controller.signal,
                headers: { 'Accept': 'application/json' }
            });

            clearTimeout(timeoutId);
            return response.ok;
        } catch (error) {
            return false;
        }
    }

    /**
     * Obtener URL base da API
     */
    getBaseURL() {
        // URL será definida durante a instalação
        // Detectar automaticamente o domínio atual
        const currentHost = window.location.hostname;
        const protocol = window.location.protocol;
        
        // Se executando localmente, usar configuração específica
        if (currentHost === 'localhost' || currentHost === '127.0.0.1') {
            return `http://${currentHost}:8000`;
        }
        
        // Para produção, usar o mesmo domínio com HTTPS
        return `${protocol}//${currentHost}`;
    }

    /**
     * Verificar se está rodando em localhost
     */
    isLocalhost() {
        return this.serverIP === 'localhost' || this.serverIP === '127.0.0.1';
    }

    /**
     * Obtener informações da rede
     */
    getNetworkInfo() {
        return {
            serverIP: this.serverIP,
            serverPort: this.serverPort,
            baseURL: this.getBaseURL(),
            isLocalhost: this.isLocalhost(),
            canAccessFromNetwork: !this.isLocalhost()
        };
    }
}

// Instância global
window.networkConfig = new NetworkConfig();

// Exportar
if (typeof module !== 'undefined' && module.exports) {
    module.exports = NetworkConfig;
}
