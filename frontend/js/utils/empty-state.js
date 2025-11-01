/**
 * Utilitário para exibir estados vazios e mensagens de permissões
 * @version 1.0.0
 */

class EmptyStateManager {
    /**
     * Mostrar mensagem de sem permissões
     * @param {HTMLElement} container - Container onde exibir a mensagem
     * @param {string} tipo - Tipo de dados (alugueis, relatorios, darf, etc)
     */
    static showNoPermissions(container, tipo = 'dados') {
        if (!container) return;

        const messages = {
            'alugueis': 'aluguéis',
            'relatorios': 'relatórios financeiros',
            'darf': 'dados de DARF',
            'dashboard': 'dados do dashboard',
            'dados': 'dados financeiros'
        };

        const tipoLabel = messages[tipo] || tipo;

        container.innerHTML = `
            <div class="empty-state-container py-5">
                <div class="text-center">
                    <div class="empty-state-icon mb-4">
                        <i class="fas fa-lock" style="font-size: 5rem; color: #6c757d; opacity: 0.3;"></i>
                    </div>
                    <h4 class="text-muted mb-3">Sem Permissões de Acesso</h4>
                    <p class="text-muted mb-4">
                        Você não tem permissão para visualizar ${tipoLabel}.<br>
                        Entre em contato com um administrador para solicitar acesso.
                    </p>
                    <div class="alert alert-info d-inline-block text-start" style="max-width: 500px;">
                        <i class="fas fa-info-circle me-2"></i>
                        <strong>Como funciona:</strong><br>
                        <small>
                            • Administradores podem gerenciar suas permissões na tela <strong>Permissões</strong><br>
                            • Você receberá acesso aos proprietários específicos conforme necessário<br>
                            • Após receber permissões, faça logout e login novamente
                        </small>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Mostrar mensagem de lista vazia (sem dados disponíveis)
     * @param {HTMLElement} container - Container onde exibir a mensagem
     * @param {string} tipo - Tipo de dados
     * @param {string} mensagemPersonalizada - Mensagem customizada (opcional)
     */
    static showEmptyList(container, tipo = 'dados', mensagemPersonalizada = null) {
        if (!container) return;

        const messages = {
            'alugueis': {
                icon: 'fa-handshake',
                title: 'Nenhum Aluguel Encontrado',
                message: 'Não há registros de aluguéis para o período selecionado.'
            },
            'relatorios': {
                icon: 'fa-chart-bar',
                title: 'Nenhum Relatório Disponível',
                message: 'Não há dados suficientes para gerar relatórios.'
            },
            'darf': {
                icon: 'fa-file-invoice-dollar',
                title: 'Nenhum DARF Registrado',
                message: 'Não há registros de DARF para exibir.'
            },
            'proprietarios': {
                icon: 'fa-users',
                title: 'Nenhum Proprietário Cadastrado',
                message: 'Comece cadastrando proprietários no sistema.'
            },
            'imoveis': {
                icon: 'fa-building',
                title: 'Nenhum Imóvel Cadastrado',
                message: 'Comece cadastrando imóveis no sistema.'
            }
        };

        const config = messages[tipo] || {
            icon: 'fa-inbox',
            title: 'Nenhum Registro Encontrado',
            message: 'Não há dados para exibir.'
        };

        container.innerHTML = `
            <div class="empty-state-container py-5">
                <div class="text-center">
                    <div class="empty-state-icon mb-4">
                        <i class="fas ${config.icon}" style="font-size: 4rem; color: #6c757d; opacity: 0.3;"></i>
                    </div>
                    <h5 class="text-muted mb-2">${config.title}</h5>
                    <p class="text-muted">
                        ${mensagemPersonalizada || config.message}
                    </p>
                </div>
            </div>
        `;
    }

    /**
     * Mostrar mensagem de erro
     * @param {HTMLElement} container - Container onde exibir a mensagem
     * @param {string} mensagem - Mensagem de erro
     */
    static showError(container, mensagem = 'Erro ao carregar dados') {
        if (!container) return;

        container.innerHTML = `
            <div class="alert alert-danger m-3" role="alert">
                <i class="fas fa-exclamation-triangle me-2"></i>
                <strong>Erro:</strong> ${mensagem}
            </div>
        `;
    }

    /**
     * Mostrar loading
     * @param {HTMLElement} container - Container onde exibir o loading
     */
    static showLoading(container, mensagem = 'Carregando...') {
        if (!container) return;

        container.innerHTML = `
            <div class="text-center py-5">
                <div class="spinner-border text-primary mb-3" role="status">
                    <span class="visually-hidden">Carregando...</span>
                </div>
                <p class="text-muted">${mensagem}</p>
            </div>
        `;
    }

    /**
     * Verificar se usuário tem permissões
     * Se não tiver, mostrar mensagem e retornar false
     * @param {HTMLElement} container - Container onde exibir mensagem
     * @param {Array|null} proprietariosPermitidos - Lista de IDs permitidos (null = admin)
     * @param {string} tipo - Tipo de dados
     * @returns {boolean} - true se tem permissões, false se não tem
     */
    static checkPermissions(container, proprietariosPermitidos, tipo = 'dados') {
        // Se é null, é admin (tem todas as permissões)
        if (proprietariosPermitidos === null) {
            return true;
        }

        // Se é array vazio, não tem permissões
        if (Array.isArray(proprietariosPermitidos) && proprietariosPermitidos.length === 0) {
            this.showNoPermissions(container, tipo);
            return false;
        }

        // Tem permissões
        return true;
    }

    /**
     * Criar badge de permissões para exibir na UI
     * @param {Array|null} proprietariosPermitidos - Lista de IDs permitidos
     * @returns {string} - HTML do badge
     */
    static createPermissionBadge(proprietariosPermitidos) {
        if (proprietariosPermitidos === null) {
            return '<span class="badge bg-success"><i class="fas fa-infinity me-1"></i>Admin - Acesso Total</span>';
        }

        const count = proprietariosPermitidos.length;
        if (count === 0) {
            return '<span class="badge bg-danger"><i class="fas fa-ban me-1"></i>Sem Permissões</span>';
        }

        return `<span class="badge bg-primary"><i class="fas fa-check me-1"></i>${count} Proprietário${count > 1 ? 's' : ''}</span>`;
    }
}

// Registrar globalmente
window.EmptyStateManager = EmptyStateManager;
