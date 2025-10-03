// API Service - Sistema de Aluguéis V2 - Unificado
window.apiService = {
    // CSRF token storage
    csrfToken: null,

    // Función auxiliar para obtener la URL base
    getBaseUrl() {
        const hostname = window.location.hostname;
        const port = window.location.port;
        
        // Detectar ambiente de desenvolvimento
        const isLocalDevelopment = 
            hostname === 'localhost' || 
            hostname === '127.0.0.1' ||
            hostname === '' ||
            hostname.startsWith('192.168.') ||
            hostname.startsWith('10.') ||
            hostname.startsWith('172.');
        
        
        if (isLocalDevelopment) {
            const url = 'http://localhost:8000';
            return url;
        }
        
        // Para produção, usar URL relativa (proxy)
        const url = '';
        return url;
    },

    // Función auxiliar para obtener headers
    getHeaders() {
        const headers = {
            'Content-Type': 'application/json'
        };

        // Agregar Authorization header si existe
        if (window.authService && window.authService.getAuthHeader()) {
            headers['Authorization'] = window.authService.getAuthHeader();
        }

        // Agregar CSRF token si existe
        if (this.csrfToken) {
            headers['X-CSRF-Token'] = this.csrfToken;
        }

        return headers;
    },

    // Función para obtener CSRF token
    async getCsrfToken() {
        try {
            const response = await this.get('/api/csrf-token');
            if (response && response.csrf_token) {
                this.csrfToken = response.csrf_token;
                return this.csrfToken;
            }
        } catch (error) {
        }
        return null;
    },

    // Método para subir archivos (usado en importação de proprietários, alugueis, etc)
    async upload(endpoint, file, options = {}) {
        // Versión backup: acepta formData directamente
        const url = `${this.getBaseUrl()}${endpoint}`;
        // Si el primer parámetro es un FormData, úsalo directamente
        let formData = file;
        // Si no es FormData, crea uno (compatibilidad)
        if (!(formData instanceof FormData)) {
            formData = new FormData();
            formData.append('file', file);
        }
        const headers = this.getHeaders();
        if (headers['Content-Type']) {
            delete headers['Content-Type'];
        }
        const requestOptions = {
            method: 'POST',
            headers,
            body: formData,
            ...options
        };
        try {
            const response = await fetch(url, requestOptions);
            let responseData;
            const contentType = response.headers.get('content-type');
            if (contentType && contentType.includes('application/json')) {
                responseData = await response.json();
            } else {
                responseData = await response.text();
            }
            if (!response.ok) {
                let errorMsg = '';
                if (typeof responseData === 'object') {
                    errorMsg = JSON.stringify(responseData);
                } else {
                    errorMsg = responseData;
                }
                throw new Error(errorMsg || 'Error al subir archivo');
            }
            return {
                success: true,
                data: responseData.data || responseData,
                status: response.status,
                statusText: response.statusText
            };
        } catch (error) {
            console.error('❌ Error en upload:', error);
            return {
                success: false,
                error: error.message || error
            };
        }
    },

    // Método genérico GET
    async get(endpoint, options = {}) {
        const url = `${this.getBaseUrl()}${endpoint}`;
        const requestOptions = {
            method: 'GET',
            headers: this.getHeaders(),
            ...options
        };
        return await this.makeRequest(url, requestOptions);
    },

    // Método genérico POST
    async post(endpoint, data = null, options = {}) {
        const url = `${this.getBaseUrl()}${endpoint}`;
        const requestOptions = {
            method: 'POST',
            headers: this.getHeaders(),
            body: data ? JSON.stringify(data) : null,
            ...options
        };
        return await this.makeRequest(url, requestOptions);
    },

    // Método genérico PUT
    async put(endpoint, data = null, options = {}) {
        const url = `${this.getBaseUrl()}${endpoint}`;
        const requestOptions = {
            method: 'PUT',
            headers: this.getHeaders(),
            body: data ? JSON.stringify(data) : null,
            ...options
        };
        return await this.makeRequest(url, requestOptions);
    },

    // Método genérico DELETE
    async delete(endpoint, options = {}) {
        const url = `${this.getBaseUrl()}${endpoint}`;
        const requestOptions = {
            method: 'DELETE',
            headers: this.getHeaders(),
            ...options
        };
        return await this.makeRequest(url, requestOptions);
    },

    // Método principal para hacer peticiones
    async makeRequest(url, options) {
        try {

            // Usar Authorization header em vez de cookies
            const finalOptions = { ...options };

            const response = await fetch(url, finalOptions);
            
            if (!response.ok) {
                const errorData = await response.text();
                let errorMessage;
                try {
                    const parsedError = JSON.parse(errorData);
                    errorMessage = parsedError.detail || parsedError.message || `HTTP error! status: ${response.status}`;
                } catch {
                    errorMessage = `HTTP error! status: ${response.status}`;
                }
                
                // Para 401 em endpoints de auth durante inicialização, usar log em vez de error
                if (response.status === 401 && url.includes('/api/auth/')) {
                } else if (response.status === 401) {
                    // Token expirado ou inválido, forçar recarga para pedir novas credenciais
                    if (window.authService) {
                        window.authService.clearSession(); // Limpa a sessão local
                    }
                    // Pequeno delay para garantir que a limpeza seja processada
                    setTimeout(() => {
                        window.location.reload(); // Força a recarga da página
                    }, 100);
                } else {
                    console.error('❌ Error en la requisición:', `Error: HTTP error! status: ${response.status}, message: ${errorData}`);
                }
                throw new Error(errorMessage);
            }

            const responseData = await response.json();

            // Manejo de respuestas exitosas
            if (response.status >= 200 && response.status < 300) {
                return {
                    success: true,
                    data: responseData.data || responseData,
                    status: response.status,
                    statusText: response.statusText
                };
            }

            return {
                success: false,
                data: responseData,
                status: response.status,
                statusText: response.statusText
            };

        } catch (error) {
            // Evitar logs duplicados para erros ja manejados especificamente
            if (!error.message.includes('HTTP error! status: 401') || !url.includes('/api/auth/')) {
                console.error('❌ Error en la requisición:', error);
            }
            throw error;
        }
    },

    // === MÉTODOS ESPECÍFICOS PARA PARTICIPAÇÕES ===
    async getParticipacoes(data_registro = null) {
        let endpoint = '/api/participacoes/';
        if (data_registro) {
            // PADRÃO ÚNICO: sempre usar data_registro como parâmetro
            endpoint += `?data_registro=${encodeURIComponent(data_registro)}`;
        }
        const response = await this.get(endpoint);
        return response.success ? response.data : null;
    },

    async getDatasParticipacoes(useCache = true) {
        if (useCache && window.cacheService) {
            return await window.cacheService.get('participacoes_datas', async () => {
                const response = await this.get('/api/participacoes/datas');
                return response.success ? response.data?.datas : null;
            });
        }
        const response = await this.get('/api/participacoes/datas');
        return response.success ? response.data?.datas : null;
    },

    async createNovaVersaoParticipacoes(payload) {
        const response = await this.post('/api/participacoes/nova-versao', payload);
        return response;
    },

    // === MÉTODOS ESPECÍFICOS PARA PROPRIETÁRIOS ===
    async getProprietarios(useCache = true) {
        if (useCache && window.cacheService) {
            return await window.cacheService.get('proprietarios', async () => {
                const response = await this.get('/api/proprietarios/');
                return response.success ? response.data : null;
            });
        }
        const response = await this.get('/api/proprietarios/');
        return response.success ? response.data : null;
    },

    async getProprietario(id) {
        const response = await this.get(`/api/proprietarios/${id}`);
        return response.success ? response.data : null;
    },

    async createProprietario(data) {
        const response = await this.post('/api/proprietarios/', data);
        // Invalidar cache após criar
        if (response.success && window.cacheService) {
            window.cacheService.invalidate('proprietarios');
        }
        return response;
    },

    async updateProprietario(id, data) {
        const response = await this.put(`/api/proprietarios/${id}`, data);
        // Invalidar cache após atualizar
        if (response.success && window.cacheService) {
            window.cacheService.invalidate('proprietarios');
        }
        return response;
    },

    async deleteProprietario(id) {
        const response = await this.delete(`/api/proprietarios/${id}`);
        // Invalidar cache após deletar
        if (window.cacheService) {
            window.cacheService.invalidate('proprietarios');
        }
        return response;
    },

    // === MÉTODOS ESPECÍFICOS PARA IMÓVEIS ===
    async getImoveis(useCache = true) {
        if (useCache && window.cacheService) {
            return await window.cacheService.get('imoveis', async () => {
                const response = await this.get('/api/imoveis/');
                return response.success ? response.data : null;
            });
        }
        const response = await this.get('/api/imoveis/');
        return response.success ? response.data : null;
    },

    async getImovel(id) {
        const response = await this.get(`/api/imoveis/${id}`);
        return response.success ? response.data : null;
    },

    async createImovel(data) {
        const response = await this.post('/api/imoveis/', data);
        // Invalidar cache após criar
        if (response.success && window.cacheService) {
            window.cacheService.invalidate('imoveis');
        }
        return response;
    },

    async updateImovel(id, data) {
        const response = await this.put(`/api/imoveis/${id}`, data);
        // Invalidar cache após atualizar
        if (response.success && window.cacheService) {
            window.cacheService.invalidate('imoveis');
        }
        return response;
    },

    async deleteImovel(id) {
        const response = await this.delete(`/api/imoveis/${id}`);
        // Invalidar cache após deletar
        if (window.cacheService) {
            window.cacheService.invalidate('imoveis');
        }
        return response;
    },

    // === MÉTODOS ESPECÍFICOS PARA ALUGUÉIS ===
    async getAlugueis(ano = null, mes = null) {
        let endpoint = '/api/alugueis/listar';
        const params = [];
        if (ano) params.push(`ano=${encodeURIComponent(ano)}`);
        if (mes) params.push(`mes=${encodeURIComponent(mes)}`);
        if (params.length > 0) {
            endpoint += `?${params.join('&')}`;
        }
        const response = await this.get(endpoint);
        return response.success ? response.data : null;
    },

    async createAluguel(data) {
        const response = await this.post('/api/alugueis/', data);
        return response;
    },

    async updateAluguel(id, data) {
        const response = await this.put(`/api/alugueis/${id}`, data);
        return response;
    },

    async deleteAluguel(id) {
        const response = await this.delete(`/api/alugueis/${id}`);
        return response;
    },

    async getAnosDisponiveisAlugueis(useCache = true) {
        const fetchFn = async () => {
            try {
                const response = await this.get('/api/alugueis/anos-disponiveis/');
                
                // Verificar se a resposta tem a estrutura esperada
                if (response && response.success && response.data) {
                    return response.data;
                } else if (response && response.anos) {
                    // Fallback para resposta direta sem wrapper
                    return response;
                } else {
                    return null;
                }
            } catch (error) {
                console.error('❌ Erro ao obter anos disponíveis:', error);
                throw error;
            }
        };

        if (useCache && window.cacheService) {
            return await window.cacheService.get('anos_disponiveis', fetchFn);
        }
        return await fetchFn();
    },

    async getMesesDisponiveisAlugueis(ano) {
        try {
            const response = await this.get(`/api/alugueis/meses/${ano}`);
            
            // Manejar diferentes formatos de respuesta
            if (response && response.success && response.data) {
                return response.data;
            } else if (response && response.meses) {
                return response;
            } else {
                return null;
            }
        } catch (error) {
            console.error('❌ Erro ao obter meses disponíveis:', error);
            throw error;
        }
    },

    async getDistribuicaoMatrizAlugueis(ano = null, mes = null) {
        let endpoint = '/api/alugueis/distribuicao-matriz';
        const params = [];
        if (ano) params.push(`ano=${encodeURIComponent(ano)}`);
        if (mes) params.push(`mes=${encodeURIComponent(mes)}`);
        if (params.length > 0) {
            endpoint += `?${params.join('&')}`;
        }
        const response = await this.get(endpoint);
        return response.success ? response.data : null;
    },

    async getUltimoPeriodoAlugueis() {
        const response = await this.get('/api/alugueis/ultimo-periodo/');
        return response.success ? response.data : null;
    },

    async getDistribuicaoTodosMesesAlugueis(ano) {
        const response = await this.get(`/api/alugueis/distribuicao-todos-meses/?ano=${ano}`);
        return response.success ? response.data : null;
    },

    // === MÉTODOS ESPECÍFICOS PARA USUÁRIOS ===
    async getUsuarios() {
        const response = await this.get('/api/auth/usuarios');
        return response.success ? response.data : null;
    },

    async createUsuario(data) {
        const response = await this.post('/api/auth/cadastrar-usuario', data);
        return response;
    },

    async updateUsuario(id, data) {
        const response = await this.put(`/api/auth/alterar-usuario/${id}`, data);
        return response;
    },

    async deleteUsuario(id) {
        const response = await this.delete(`/api/auth/usuario/${id}`);
        return response;
    },

    // === MÉTODOS DE SISTEMA ===
    async getDashboardSummary() {
        const response = await this.get('/api/dashboard/summary');
        return response.success ? response.data : null;
    },
    async getHealth() {
        try {
            const response = await this.get('/api/health');
            return response.success ? response.data : null;
        } catch (error) {
            return null;
        }
    },

    async getConfig() {
        try {
            const response = await this.get('/api/config');
            return response.success ? response.data : null;
        } catch (error) {
            return null;
        }
    }
};

// Log de inicialização
