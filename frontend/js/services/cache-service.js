/**
 * CacheService - Sistema Inteligente de Caché Frontend
 * 
 * Características:
 * - TTL (Time To Live) configurável por store
 * - Invalidação manual e automática
 * - Suporte a refresh forçado
 * - Eventos de atualização
 * - Estatísticas de uso
 * - Persistência opcional em localStorage
 * 
 * @version 1.0.0
 * @author GitHub Copilot
 */

class CacheService {
    constructor() {
        // Configuração de stores
        this.stores = {
            // Dados relativamente estáticos (5 minutos)
            proprietarios: {
                ttl: 300000,        // 5 minutos
                data: null,
                timestamp: 0,
                hits: 0,
                misses: 0
            },
            imoveis: {
                ttl: 300000,        // 5 minutos
                data: null,
                timestamp: 0,
                hits: 0,
                misses: 0
            },
            usuarios: {
                ttl: 600000,        // 10 minutos
                data: null,
                timestamp: 0,
                hits: 0,
                misses: 0
            },
            // Dados mais dinâmicos (2 minutos)
            participacoes_datas: {
                ttl: 120000,        // 2 minutos
                data: null,
                timestamp: 0,
                hits: 0,
                misses: 0
            },
            anos_disponiveis: {
                ttl: 300000,        // 5 minutos
                data: null,
                timestamp: 0,
                hits: 0,
                misses: 0
            }
        };

        // Configurações gerais
        this.config = {
            enablePersistence: false,    // localStorage para sobreviver reloads
            enableLogging: true,         // Logs de debug
            enableStats: true,           // Estatísticas de uso
            autoCleanup: true,           // Limpeza automática de caches expirados
            cleanupInterval: 60000       // 1 minuto
        };

        // Event listeners para atualização de dados
        this.listeners = new Map();

        // Inicializar
        this.init();
    }

    /**
     * Inicialização do serviço
     */
    init() {
        // Carregar dados persistidos (se habilitado)
        if (this.config.enablePersistence) {
            this.loadFromStorage();
        }

        // Configurar limpeza automática
        if (this.config.autoCleanup) {
            this.startAutoCleanup();
        }

        // Log de inicialização
        if (this.config.enableLogging) {
        }
    }

    /**
     * Obtém dados do cache ou busca via fetchFn
     * 
     * @param {string} key - Chave do store
     * @param {Function} fetchFn - Função para buscar dados se não estiver em cache
     * @param {boolean} forceRefresh - Força refresh ignorando cache
     * @returns {Promise<any>} Dados
     */
    async get(key, fetchFn, forceRefresh = false) {
        const store = this.stores[key];

        if (!store) {
            return await fetchFn();
        }

        // Verificar se precisa atualizar
        const now = Date.now();
        const isExpired = now - store.timestamp > store.ttl;
        const needsUpdate = forceRefresh || !store.data || isExpired;

        if (needsUpdate) {
            // Cache miss ou expirado
            store.misses++;
            
            if (this.config.enableLogging) {
            }

            try {
                // Buscar dados
                store.data = await fetchFn();
                store.timestamp = now;

                // Persistir se habilitado
                if (this.config.enablePersistence) {
                    this.saveToStorage(key);
                }

                // Notificar listeners
                this.notifyListeners(key, store.data);

                if (this.config.enableLogging) {
                }
            } catch (error) {
                console.error(`❌ CacheService: Erro ao buscar dados para "${key}"`, error);
                
                // Se temos dados antigos, retornar mesmo sendo expirados
                if (store.data) {
                    return store.data;
                }
                
                throw error;
            }
        } else {
            // Cache hit
            store.hits++;
            
            if (this.config.enableLogging) {
            }
        }

        return store.data;
    }

    /**
     * Define dados diretamente no cache
     * 
     * @param {string} key - Chave do store
     * @param {any} data - Dados a serem armazenados
     */
    set(key, data) {
        const store = this.stores[key];
        
        if (!store) {
            return;
        }

        store.data = data;
        store.timestamp = Date.now();

        // Persistir se habilitado
        if (this.config.enablePersistence) {
            this.saveToStorage(key);
        }

        // Notificar listeners
        this.notifyListeners(key, data);

        if (this.config.enableLogging) {
        }
    }

    /**
     * Invalida um cache específico
     * 
     * @param {string} key - Chave do store
     */
    invalidate(key) {
        const store = this.stores[key];
        
        if (!store) {
            return;
        }

        store.data = null;
        store.timestamp = 0;

        // Remover do storage
        if (this.config.enablePersistence) {
            this.removeFromStorage(key);
        }

        if (this.config.enableLogging) {
        }
    }

    /**
     * Invalida todos os caches
     */
    invalidateAll() {
        Object.keys(this.stores).forEach(key => {
            this.stores[key].data = null;
            this.stores[key].timestamp = 0;
        });

        // Limpar storage
        if (this.config.enablePersistence) {
            Object.keys(this.stores).forEach(key => {
                this.removeFromStorage(key);
            });
        }

        if (this.config.enableLogging) {
        }
    }

    /**
     * Verifica se um cache está válido
     * 
     * @param {string} key - Chave do store
     * @returns {boolean}
     */
    isValid(key) {
        const store = this.stores[key];
        if (!store || !store.data) return false;
        
        const now = Date.now();
        return now - store.timestamp < store.ttl;
    }

    /**
     * Obtém estatísticas de uso
     * 
     * @param {string} key - Chave específica (opcional)
     * @returns {Object} Estatísticas
     */
    getStats(key = null) {
        if (key) {
            const store = this.stores[key];
            if (!store) return null;

            const total = store.hits + store.misses;
            const hitRate = total > 0 ? (store.hits / total * 100).toFixed(2) : 0;

            return {
                key,
                hits: store.hits,
                misses: store.misses,
                total,
                hitRate: `${hitRate}%`,
                hasData: !!store.data,
                age: store.timestamp > 0 ? Date.now() - store.timestamp : 0,
                isValid: this.isValid(key)
            };
        }

        // Estatísticas gerais
        const stats = {};
        Object.keys(this.stores).forEach(k => {
            stats[k] = this.getStats(k);
        });

        // Totais
        const totals = Object.values(stats).reduce((acc, s) => ({
            hits: acc.hits + s.hits,
            misses: acc.misses + s.misses,
            total: acc.total + s.total
        }), { hits: 0, misses: 0, total: 0 });

        return {
            stores: stats,
            totals: {
                ...totals,
                hitRate: totals.total > 0 
                    ? `${(totals.hits / totals.total * 100).toFixed(2)}%` 
                    : '0%'
            }
        };
    }

    /**
     * Adiciona listener para atualizações de cache
     * 
     * @param {string} key - Chave do store
     * @param {Function} callback - Função a ser chamada quando dados forem atualizados
     */
    addListener(key, callback) {
        if (!this.listeners.has(key)) {
            this.listeners.set(key, []);
        }
        this.listeners.get(key).push(callback);
    }

    /**
     * Remove listener
     * 
     * @param {string} key - Chave do store
     * @param {Function} callback - Função a ser removida
     */
    removeListener(key, callback) {
        const callbacks = this.listeners.get(key);
        if (!callbacks) return;

        const index = callbacks.indexOf(callback);
        if (index > -1) {
            callbacks.splice(index, 1);
        }
    }

    /**
     * Notifica listeners sobre atualização
     * 
     * @param {string} key - Chave do store
     * @param {any} data - Dados atualizados
     */
    notifyListeners(key, data) {
        const callbacks = this.listeners.get(key);
        if (!callbacks || callbacks.length === 0) return;

        callbacks.forEach(callback => {
            try {
                callback(data);
            } catch (error) {
                console.error(`Erro ao notificar listener para "${key}"`, error);
            }
        });
    }

    /**
     * Persistência em localStorage
     */
    saveToStorage(key) {
        try {
            const store = this.stores[key];
            const cacheData = {
                data: store.data,
                timestamp: store.timestamp
            };
            localStorage.setItem(`cache_${key}`, JSON.stringify(cacheData));
        } catch (error) {
        }
    }

    loadFromStorage() {
        Object.keys(this.stores).forEach(key => {
            try {
                const cached = localStorage.getItem(`cache_${key}`);
                if (cached) {
                    const { data, timestamp } = JSON.parse(cached);
                    const store = this.stores[key];
                    
                    // Verificar se ainda é válido
                    if (Date.now() - timestamp < store.ttl) {
                        store.data = data;
                        store.timestamp = timestamp;
                        
                        if (this.config.enableLogging) {
                        }
                    } else {
                        // Remover cache expirado
                        localStorage.removeItem(`cache_${key}`);
                    }
                }
            } catch (error) {
            }
        });
    }

    removeFromStorage(key) {
        try {
            localStorage.removeItem(`cache_${key}`);
        } catch (error) {
        }
    }

    /**
     * Limpeza automática de caches expirados
     */
    startAutoCleanup() {
        setInterval(() => {
            let cleaned = 0;
            
            Object.entries(this.stores).forEach(([key, store]) => {
                if (store.data && !this.isValid(key)) {
                    this.invalidate(key);
                    cleaned++;
                }
            });

            if (cleaned > 0 && this.config.enableLogging) {
            }
        }, this.config.cleanupInterval);
    }

    /**
     * Debug: Exibe estatísticas no console
     */
    debug() {
        console.group('📊 CacheService - Estatísticas');
        const stats = this.getStats();
        
        console.table(stats.stores);
        
        console.groupEnd();
    }

    /**
     * Reseta estatísticas (mantém dados)
     */
    resetStats() {
        Object.values(this.stores).forEach(store => {
            store.hits = 0;
            store.misses = 0;
        });
        
        if (this.config.enableLogging) {
        }
    }
}

// Exportar instância global
window.cacheService = new CacheService();
