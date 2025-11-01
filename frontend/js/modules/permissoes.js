/**
 * Módulo de Gestão de Permissões
 * Gerencia permissões de acesso aos dados financeiros dos proprietários
 * @version 1.0.0
 */

class PermissoesModule {
    constructor() {
        this.apiService = window.apiService;
        this.uiManager = window.uiManager;
        this.hot = null; // Instância do Handsontable
        this.container = null;
        this.usuarios = [];
        this.proprietarios = [];
        this.permissoes = [];
        this.isAdmin = false;
    }

    async load() {
        console.log('🔐 [PermissoesModule] Inicializando módulo de permissões...');
        
        // Verificar se usuário é admin
        this.isAdmin = window.authService && window.authService.isAdmin();
        if (!this.isAdmin) {
            // Aguardar container para mostrar mensagem de acesso negado
            this.container = await this.waitForContainer();
            this.showAccessDenied();
            return;
        }

        this.container = await this.waitForContainer();
        if (!this.container) {
            console.error('❌ [PermissoesModule] Container não encontrado após múltiplas tentativas');
            return;
        }

        await this.init();
    }

    async waitForContainer() {
        // Tentar encontrar o container com retry
        for (let i = 0; i < 15; i++) {
            const container = document.getElementById('permissoes-table-container');
            if (container) {
                console.log('✅ [PermissoesModule] Container encontrado');
                return container;
            }
            await new Promise(resolve => setTimeout(resolve, 100));
        }
        return null;
    }

    showAccessDenied() {
        if (this.container) {
            this.container.innerHTML = `
                <div class="alert alert-warning" role="alert">
                    <i class="fas fa-exclamation-triangle me-2"></i>
                    <strong>Acesso Negado:</strong> Apenas administradores podem gerenciar permissões.
                </div>
            `;
        }
    }

    async init() {
        try {
            // Mostrar loading
            this.showLoading();

            // Carregar dados
            await this.loadData();

            // Inicializar Handsontable
            this.initHandsontable();

            // Setup events
            this.setupEvents();

            console.log('✅ [PermissoesModule] Módulo inicializado com sucesso');
        } catch (error) {
            console.error('❌ [PermissoesModule] Erro ao inicializar:', error);
            this.showError('Erro ao carregar módulo de permissões');
        }
    }

    showLoading() {
        this.container.innerHTML = `
            <div class="text-center py-5">
                <div class="spinner-border text-primary" role="status">
                    <span class="visually-hidden">Carregando...</span>
                </div>
                <p class="mt-3 text-muted">Carregando permissões...</p>
            </div>
        `;
    }

    showError(message) {
        this.container.innerHTML = `
            <div class="alert alert-danger" role="alert">
                <i class="fas fa-exclamation-circle me-2"></i>
                ${message}
            </div>
        `;
    }

    async loadData() {
        try {
            // Carregar usuários
            const usersResponse = await this.apiService.get('/api/auth/usuarios');
            this.usuarios = usersResponse.data || [];

            // Carregar proprietários
            const propsResponse = await this.apiService.get('/api/proprietarios/listar');
            this.proprietarios = propsResponse.data || [];

            // Carregar permissões
            const permResponse = await this.apiService.get('/api/permissoes/usuarios');
            this.permissoes = permResponse.data || [];

            console.log('📊 [PermissoesModule] Dados carregados:', {
                usuarios: this.usuarios.length,
                proprietarios: this.proprietarios.length,
                permissoes: this.permissoes.length
            });
        } catch (error) {
            console.error('❌ [PermissoesModule] Erro ao carregar dados:', error);
            throw error;
        }
    }

    initHandsontable() {
        // Limpar container
        this.container.innerHTML = '<div id="hot-permissoes"></div>';
        const hotElement = document.getElementById('hot-permissoes');

        // Preparar dados para a tabela
        const tableData = this.prepareTableData();

        // Configuração do Handsontable
        this.hot = new Handsontable(hotElement, {
            data: tableData,
            colHeaders: [
                'ID',
                'Usuário',
                'Login',
                'Tipo',
                'Proprietários Permitidos',
                'Última Atualização',
                'Ações'
            ],
            columns: [
                { data: 'id', type: 'numeric', readOnly: true, width: 60 },
                { data: 'nome', type: 'text', readOnly: true, width: 150 },
                { data: 'login', type: 'text', readOnly: true, width: 120 },
                { 
                    data: 'tipo', 
                    type: 'dropdown',
                    source: ['admin', 'usuario'],
                    readOnly: true,
                    width: 100,
                    renderer: this.tipoRenderer.bind(this)
                },
                { 
                    data: 'proprietarios_permitidos',
                    type: 'text',
                    width: 300,
                    renderer: this.proprietariosRenderer.bind(this),
                    editor: false
                },
                { 
                    data: 'permissoes_atualizadas_em',
                    type: 'text',
                    readOnly: true,
                    width: 150,
                    renderer: this.dateRenderer.bind(this)
                },
                {
                    data: 'actions',
                    readOnly: true,
                    width: 120,
                    renderer: this.actionsRenderer.bind(this)
                }
            ],
            rowHeaders: true,
            stretchH: 'all',
            autoWrapRow: true,
            autoWrapCol: true,
            height: 'auto',
            maxRows: tableData.length,
            licenseKey: 'non-commercial-and-evaluation',
            language: 'pt-BR',
            contextMenu: false,
            afterChange: this.onCellChange.bind(this),
            className: 'htCenter htMiddle'
        });

        // Event listeners para ações
        hotElement.addEventListener('click', this.handleTableClick.bind(this));
    }

    prepareTableData() {
        return this.permissoes.map(user => {
            const proprietariosIds = user.proprietarios_permitidos || [];
            const proprietariosNomes = proprietariosIds
                .map(id => {
                    const prop = this.proprietarios.find(p => p.id === id);
                    return prop ? prop.nome : `ID:${id}`;
                })
                .join(', ');

            return {
                id: user.id,
                nome: user.nome,
                login: user.login,
                tipo: user.tipo,
                proprietarios_permitidos: proprietariosNomes || (user.tipo === 'admin' ? 'TODOS' : 'Nenhum'),
                proprietarios_permitidos_ids: proprietariosIds,
                permissoes_atualizadas_em: user.permissoes_atualizadas_em,
                actions: ''
            };
        });
    }

    // Renderers customizados
    tipoRenderer(instance, td, row, col, prop, value, cellProperties) {
        td.innerHTML = '';
        const badge = document.createElement('span');
        badge.className = value === 'admin' ? 'badge bg-danger' : 'badge bg-primary';
        badge.textContent = value === 'admin' ? 'Admin' : 'Usuário';
        td.appendChild(badge);
        return td;
    }

    proprietariosRenderer(instance, td, row, col, prop, value, cellProperties) {
        td.innerHTML = '';
        const rowData = instance.getSourceDataAtRow(row);
        
        if (rowData.tipo === 'admin') {
            const badge = document.createElement('span');
            badge.className = 'badge bg-success';
            badge.innerHTML = '<i class="fas fa-infinity me-1"></i>TODOS';
            td.appendChild(badge);
        } else if (!value || value === 'Nenhum') {
            const badge = document.createElement('span');
            badge.className = 'badge bg-secondary';
            badge.innerHTML = '<i class="fas fa-ban me-1"></i>Nenhum';
            td.appendChild(badge);
        } else {
            td.innerHTML = `<small>${value}</small>`;
        }
        
        return td;
    }

    dateRenderer(instance, td, row, col, prop, value, cellProperties) {
        td.innerHTML = '';
        if (value) {
            const date = new Date(value);
            td.textContent = date.toLocaleString('pt-BR', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        } else {
            td.textContent = '-';
        }
        return td;
    }

    actionsRenderer(instance, td, row, col, prop, value, cellProperties) {
        td.innerHTML = '';
        const rowData = instance.getSourceDataAtRow(row);
        
        // Não permitir editar o próprio usuário logado
        const currentUserId = window.authService?.getUserId();
        if (rowData.id === currentUserId) {
            td.innerHTML = '<small class="text-muted">Você</small>';
            return td;
        }

        const btnEdit = document.createElement('button');
        btnEdit.className = 'btn btn-sm btn-primary me-1';
        btnEdit.innerHTML = '<i class="fas fa-edit"></i>';
        btnEdit.setAttribute('data-action', 'edit');
        btnEdit.setAttribute('data-user-id', rowData.id);
        btnEdit.title = 'Editar Permissões';

        const btnLog = document.createElement('button');
        btnLog.className = 'btn btn-sm btn-info';
        btnLog.innerHTML = '<i class="fas fa-history"></i>';
        btnLog.setAttribute('data-action', 'log');
        btnLog.setAttribute('data-user-id', rowData.id);
        btnLog.title = 'Ver Histórico';

        td.appendChild(btnEdit);
        td.appendChild(btnLog);
        
        return td;
    }

    handleTableClick(event) {
        const target = event.target.closest('button[data-action]');
        if (!target) return;

        const action = target.getAttribute('data-action');
        const userId = parseInt(target.getAttribute('data-user-id'));

        if (action === 'edit') {
            this.editPermissions(userId);
        } else if (action === 'log') {
            this.showPermissionLog(userId);
        }
    }

    async editPermissions(userId) {
        const user = this.permissoes.find(u => u.id === userId);
        if (!user) return;

        // Criar modal de edição
        const modalHtml = this.getEditModalHtml(user);
        
        // Adicionar modal ao DOM
        let modalElement = document.getElementById('modal-editar-permissoes');
        if (modalElement) {
            modalElement.remove();
        }
        
        document.body.insertAdjacentHTML('beforeend', modalHtml);
        modalElement = document.getElementById('modal-editar-permissoes');
        
        // Inicializar modal do Bootstrap
        const modal = new bootstrap.Modal(modalElement);
        modal.show();

        // Setup do select múltiplo
        this.setupPermissionsSelect(user);

        // Salvar permissões
        const saveBtn = document.getElementById('btn-salvar-permissoes');
        saveBtn.onclick = async () => {
            await this.savePermissions(userId, modal);
        };
    }

    getEditModalHtml(user) {
        return `
            <div class="modal fade" id="modal-editar-permissoes" tabindex="-1">
                <div class="modal-dialog modal-lg">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title">
                                <i class="fas fa-user-lock me-2"></i>
                                Editar Permissões - ${user.nome}
                            </h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body">
                            <div class="alert alert-info">
                                <i class="fas fa-info-circle me-2"></i>
                                <strong>Usuário:</strong> ${user.nome} (${user.login})<br>
                                <strong>Tipo:</strong> ${user.tipo === 'admin' ? 'Administrador' : 'Usuário'}
                            </div>

                            ${user.tipo === 'admin' ? `
                                <div class="alert alert-success">
                                    <i class="fas fa-crown me-2"></i>
                                    Administradores têm acesso a TODOS os dados automaticamente.
                                </div>
                            ` : `
                                <form id="form-permissoes">
                                    <div class="mb-3">
                                        <label for="select-proprietarios" class="form-label">
                                            <strong>Proprietários Permitidos</strong>
                                        </label>
                                        <select id="select-proprietarios" class="form-select" multiple size="10">
                                            ${this.proprietarios.map(prop => `
                                                <option value="${prop.id}">${prop.nome}</option>
                                            `).join('')}
                                        </select>
                                        <div class="form-text">
                                            Selecione os proprietários cujos dados este usuário pode visualizar.
                                            Use Ctrl+Click para seleção múltipla.
                                        </div>
                                    </div>
                                    
                                    <div class="d-flex gap-2">
                                        <button type="button" class="btn btn-sm btn-outline-primary" id="btn-selecionar-todos">
                                            <i class="fas fa-check-square me-1"></i>Selecionar Todos
                                        </button>
                                        <button type="button" class="btn btn-sm btn-outline-secondary" id="btn-limpar-selecao">
                                            <i class="fas fa-times-circle me-1"></i>Limpar Seleção
                                        </button>
                                    </div>
                                </form>
                            `}
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">
                                Cancelar
                            </button>
                            ${user.tipo !== 'admin' ? `
                                <button type="button" class="btn btn-primary" id="btn-salvar-permissoes">
                                    <i class="fas fa-save me-1"></i>Salvar Permissões
                                </button>
                            ` : ''}
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    setupPermissionsSelect(user) {
        if (user.tipo === 'admin') return;

        const select = document.getElementById('select-proprietarios');
        if (!select) return;

        // Pré-selecionar proprietários
        const currentPermissions = user.proprietarios_permitidos || [];
        Array.from(select.options).forEach(option => {
            option.selected = currentPermissions.includes(parseInt(option.value));
        });

        // Botões helper
        const btnSelectAll = document.getElementById('btn-selecionar-todos');
        const btnClear = document.getElementById('btn-limpar-selecao');

        if (btnSelectAll) {
            btnSelectAll.onclick = () => {
                Array.from(select.options).forEach(opt => opt.selected = true);
            };
        }

        if (btnClear) {
            btnClear.onclick = () => {
                Array.from(select.options).forEach(opt => opt.selected = false);
            };
        }
    }

    async savePermissions(userId, modal) {
        try {
            const select = document.getElementById('select-proprietarios');
            const selectedIds = Array.from(select.selectedOptions).map(opt => parseInt(opt.value));

            // Mostrar loading
            const saveBtn = document.getElementById('btn-salvar-permissoes');
            const originalText = saveBtn.innerHTML;
            saveBtn.disabled = true;
            saveBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span>Salvando...';

            // Enviar para API
            await this.apiService.put(`/api/permissoes/usuarios/${userId}`, {
                proprietarios_permitidos: selectedIds
            });

            // Sucesso
            this.uiManager.showToast('Permissões atualizadas com sucesso!', 'success');
            
            // Recarregar dados e atualizar tabela
            await this.loadData();
            this.hot.loadData(this.prepareTableData());
            
            // Fechar modal
            modal.hide();
            
        } catch (error) {
            console.error('❌ [PermissoesModule] Erro ao salvar permissões:', error);
            this.uiManager.showToast('Erro ao salvar permissões', 'error');
            
            // Restaurar botão
            const saveBtn = document.getElementById('btn-salvar-permissoes');
            if (saveBtn) {
                saveBtn.disabled = false;
                saveBtn.innerHTML = '<i class="fas fa-save me-1"></i>Salvar Permissões';
            }
        }
    }

    async showPermissionLog(userId) {
        try {
            const response = await this.apiService.get(`/api/permissoes/usuarios/${userId}/log`);
            const logs = response.data || [];

            const user = this.permissoes.find(u => u.id === userId);
            const modalHtml = this.getLogModalHtml(user, logs);

            // Adicionar modal ao DOM
            let modalElement = document.getElementById('modal-log-permissoes');
            if (modalElement) {
                modalElement.remove();
            }
            
            document.body.insertAdjacentHTML('beforeend', modalHtml);
            modalElement = document.getElementById('modal-log-permissoes');
            
            const modal = new bootstrap.Modal(modalElement);
            modal.show();

        } catch (error) {
            console.error('❌ [PermissoesModule] Erro ao carregar log:', error);
            this.uiManager.showToast('Erro ao carregar histórico', 'error');
        }
    }

    getLogModalHtml(user, logs) {
        return `
            <div class="modal fade" id="modal-log-permissoes" tabindex="-1">
                <div class="modal-dialog modal-xl">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title">
                                <i class="fas fa-history me-2"></i>
                                Histórico de Permissões - ${user.nome}
                            </h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body">
                            ${logs.length === 0 ? `
                                <div class="alert alert-info">
                                    <i class="fas fa-info-circle me-2"></i>
                                    Nenhuma alteração de permissões registrada.
                                </div>
                            ` : `
                                <div class="table-responsive">
                                    <table class="table table-striped table-hover">
                                        <thead>
                                            <tr>
                                                <th>Data/Hora</th>
                                                <th>Ação</th>
                                                <th>Alterado Por</th>
                                                <th>Permissões Anteriores</th>
                                                <th>Novas Permissões</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            ${logs.map(log => `
                                                <tr>
                                                    <td>${new Date(log.data_alteracao).toLocaleString('pt-BR')}</td>
                                                    <td>
                                                        <span class="badge bg-info">${log.acao}</span>
                                                    </td>
                                                    <td>${log.alterado_por_nome || 'Sistema'}</td>
                                                    <td><small>${this.formatPermissionsArray(log.proprietarios_anteriores)}</small></td>
                                                    <td><small>${this.formatPermissionsArray(log.proprietarios_novos)}</small></td>
                                                </tr>
                                            `).join('')}
                                        </tbody>
                                    </table>
                                </div>
                            `}
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">
                                Fechar
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    formatPermissionsArray(idsArray) {
        if (!idsArray || idsArray.length === 0) return 'Nenhum';
        
        return idsArray
            .map(id => {
                const prop = this.proprietarios.find(p => p.id === id);
                return prop ? prop.nome : `ID:${id}`;
            })
            .join(', ');
    }

    setupEvents() {
        // Botão de recarregar
        const btnReload = document.getElementById('btn-reload-permissoes');
        if (btnReload) {
            btnReload.onclick = async () => {
                await this.loadData();
                this.hot.loadData(this.prepareTableData());
                this.uiManager.showToast('Dados atualizados', 'success');
            };
        }
    }

    onCellChange(changes, source) {
        // Prevenir edição direta na tabela
        // As edições devem ser feitas através do modal
        if (source === 'edit') {
            this.hot.loadData(this.prepareTableData());
        }
    }

    // Cleanup ao sair da view
    destroy() {
        if (this.hot) {
            this.hot.destroy();
            this.hot = null;
        }
        console.log('🔐 [PermissoesModule] Módulo destruído');
    }
}

// Registrar módulo globalmente
window.PermissoesModule = PermissoesModule;
