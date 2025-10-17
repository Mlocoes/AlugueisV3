/**
 * Módulo de Gerenciamento de Locale
 * Detecta e gerencia a formatação regional do sistema
 */

class LocaleManager {
    constructor() {
        // Detectar locale do navegador/sistema do usuário
        this.userLocale = this.detectUserLocale();
        console.log('🌍 Locale detectado:', this.userLocale);
    }

    /**
     * Detecta o locale do usuário
     * @returns {string} Código do locale (ex: 'pt-BR', 'en-US')
     */
    detectUserLocale() {
        // Tentar navigator.language (mais preciso)
        if (navigator.language) {
            return navigator.language;
        }
        
        // Fallback para navigator.userLanguage (IE antigo)
        if (navigator.userLanguage) {
            return navigator.userLanguage;
        }
        
        // Fallback para navigator.languages[0]
        if (navigator.languages && navigator.languages.length > 0) {
            return navigator.languages[0];
        }
        
        // Fallback padrão: português Brasil
        return 'pt-BR';
    }

    /**
     * Formata um número como moeda
     * @param {number} value - Valor numérico
     * @param {object} options - Opções adicionais de formatação
     * @returns {string} Valor formatado
     */
    formatCurrency(value, options = {}) {
        const defaultOptions = {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
            ...options
        };

        return parseFloat(value || 0).toLocaleString(this.userLocale, defaultOptions);
    }

    /**
     * Formata um número
     * @param {number} value - Valor numérico
     * @param {object} options - Opções de formatação
     * @returns {string} Valor formatado
     */
    formatNumber(value, options = {}) {
        return parseFloat(value || 0).toLocaleString(this.userLocale, options);
    }

    /**
     * Formata uma data
     * @param {Date|string} date - Data a ser formatada
     * @param {object} options - Opções de formatação
     * @returns {string} Data formatada
     */
    formatDate(date, options = {}) {
        const dateObj = date instanceof Date ? date : new Date(date);
        return dateObj.toLocaleString(this.userLocale, options);
    }

    /**
     * Formata um número como porcentagem
     * @param {number} value - Valor numérico (0.15 = 15%)
     * @param {object} options - Opções de formatação
     * @returns {string} Porcentagem formatada
     */
    formatPercent(value, options = {}) {
        const defaultOptions = {
            style: 'percent',
            minimumFractionDigits: 0,
            maximumFractionDigits: 2,
            ...options
        };

        return parseFloat(value || 0).toLocaleString(this.userLocale, defaultOptions);
    }

    /**
     * Obtém o separador decimal do locale atual
     * @returns {string} Separador decimal (',' ou '.')
     */
    getDecimalSeparator() {
        const formatted = (1.1).toLocaleString(this.userLocale);
        return formatted.charAt(1); // Pega o caractere entre 1 e 1
    }

    /**
     * Obtém o separador de milhares do locale atual
     * @returns {string} Separador de milhares ('.' ou ',')
     */
    getThousandsSeparator() {
        const formatted = (1000).toLocaleString(this.userLocale);
        return formatted.charAt(1); // Pega o caractere entre 1 e 000
    }

    /**
     * Obtém informações do locale atual
     * @returns {object} Informações do locale
     */
    getLocaleInfo() {
        return {
            locale: this.userLocale,
            decimalSeparator: this.getDecimalSeparator(),
            thousandsSeparator: this.getThousandsSeparator(),
            currency: this.getCurrencyInfo()
        };
    }

    /**
     * Obtém informações de moeda do locale
     * @returns {object} Informações de moeda
     */
    getCurrencyInfo() {
        // Mapear locales para símbolos de moeda
        const currencyMap = {
            'pt-BR': { symbol: 'R$', code: 'BRL', name: 'Real Brasileiro' },
            'en-US': { symbol: '$', code: 'USD', name: 'US Dollar' },
            'es-ES': { symbol: '€', code: 'EUR', name: 'Euro' },
            'en-GB': { symbol: '£', code: 'GBP', name: 'British Pound' },
            'de-DE': { symbol: '€', code: 'EUR', name: 'Euro' },
            'fr-FR': { symbol: '€', code: 'EUR', name: 'Euro' },
        };

        // Buscar exato
        if (currencyMap[this.userLocale]) {
            return currencyMap[this.userLocale];
        }

        // Buscar por prefixo de idioma (pt-BR -> pt)
        const langPrefix = this.userLocale.split('-')[0];
        const matchingLocale = Object.keys(currencyMap).find(key => 
            key.startsWith(langPrefix)
        );

        if (matchingLocale) {
            return currencyMap[matchingLocale];
        }

        // Fallback: Real Brasileiro
        return currencyMap['pt-BR'];
    }
}

// Criar instância global
if (typeof window !== 'undefined') {
    window.localeManager = new LocaleManager();
    console.log('✅ LocaleManager inicializado:', window.localeManager.getLocaleInfo());
}
