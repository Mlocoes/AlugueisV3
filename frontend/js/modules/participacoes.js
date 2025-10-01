/**
 * Módulo de Participações - Refactorizado com GridComponent
 * 
 * Melhorias:
 * - Uso de GridComponent para renderização
 * - Cache inteligente de proprietários e imóveis
 * - VersionManager para lógica de versões
 * - Código mais limpo e manutenível
 * - Performance melhorada
 * 
 * @version 2.0.0
 */

class ParticipacoesModule {
    constructor() {
        this.apiService = window.apiService;
        this.uiManager = window.uiManager;
        this.cacheService = window.cacheService;
        
        // Dados
        this.participacoes = [];
        this.proprietarios = [];
        this.imoveis = [];
        this.datas = [];
        this.selectedData = null;
        
        // UI
        this.container = null;
        this.grid = null;
        this.isMobile = false;
    }

    async load() {
        // Re-avaliar tipo de dispositivo
        this.isMobile = window.deviceManager && window.deviceManager.deviceType === 'mobile';
        
        // Identificar container - usar tbody para desktop
        this.container = this.isMobile
            ? document.getElementById('participacoes-list-mobile')
            : document.getElementById('participacoes-matrix-body');

        // Retry se não encontrar (timing issue)
        if (!this.container) {
            await new Promise(resolve => setTimeout(resolve, 100));
            this.container = this.isMobile
                ? document.getElementById('participacoes-list-mobile')
                : document.getElementById('participacoes-matrix-body');
        }

        if (!this.container) {
            console.warn("ParticipacoesModule: Container not found. View might not be active.");
            return;
        }

        this.bindContainerEvents();
        await this.loadDatas();
    }

    bindContainerEvents() {
        if (!this.container) return;
        
        // Delegação de eventos para botões
        this.container.addEventListener('click', e => {
            const novaVersaoButton = e.target.closest('.nova-versao-btn');
            const editParticipacaoButton = e.target.closest('.edit-participacao-btn');
            
            if (novaVersaoButton) {
                const imovelId = novaVersaoButton.dataset.imovelId;
                if (imovelId) {
                    this.novaVersao(imovelId);
                }
            }
            
            if (editParticipacaoButton) {
                const imovelId = editParticipacaoButton.dataset.imovelId;
                if (imovelId) {
                    this.editParticipacao(imovelId);
                }
            }
        });
    }

    async loadDatas() {
        try {
            this.uiManager.showLoading('Carregando conjuntos...');
            
            // Usar cache para datas
            const datas = await this.apiService.getDatasParticipacoes(true);
            
            this.datas = (datas && Array.isArray(datas)) ? datas : [];

            // Mobile: apenas o mais recente
            if (this.isMobile && this.datas.length > 0) {
                this.datas = [this.datas[0]];
            }

            // Selecionar primeira versão (ativo)
            this.selectedData = this.datas.length ? this.datas[0].versao_id : "ativo";

            // Renderizar seletor (desktop only)
            if (!this.isMobile) {
                this.renderDataSelector();
            }
            
            // Carregar participações
            if (this.selectedData) {
                const dataToLoad = this.isMobile ? null : this.selectedData;
                await this.loadParticipacoes(dataToLoad);
            }
        } catch (error) {
            this.uiManager.showAlert('Erro ao carregar conjuntos: ' + error.message, 'error');
        } finally {
            this.uiManager.hideLoading();
        }
    }

    renderDataSelector() {
        const container = document.getElementById('participacoes-data-selector');
        if (!container) return;

        if (!this.datas.length) {
            SecurityUtils.setSafeHTML(container, '<span class="text-muted">Nenhum conjunto disponível</span>');
            return;
        }

        let html = '<label for="data-participacoes" class="form-label me-2">Conjunto:</label>';
        html += `<select id="data-participacoes" class="form-select" style="width: auto;">`;
        
        this.datas.forEach(item => {
            const value = item.versao_id || "ativo";
            const isSelected = value === (this.selectedData || "ativo");
            html += `<option value="${SecurityUtils.escapeHtml(value)}"${isSelected ? ' selected' : ''}>${SecurityUtils.escapeHtml(item.label)}</option>`;
        });
        
        html += '</select>';
        SecurityUtils.setSafeHTML(container, html);

        // Event listener
        document.getElementById('data-participacoes').addEventListener('change', (e) => {
            this.selectedData = e.target.value;
            this.loadParticipacoes(this.selectedData);
        });
    }

    async loadParticipacoes(dataId = null) {
        try {
            this.uiManager.showLoading('Carregando participações...');
            
            // Carregar participações + dados em cache
            const [participacoes, proprietarios, imoveis] = await Promise.all([
                this.apiService.getParticipacoes(dataId),
                this.cacheService ? this.apiService.getProprietarios(true) : this.apiService.getProprietarios(false),
                this.cacheService ? this.apiService.getImoveis(true) : this.apiService.getImoveis(false)
            ]);
            
            this.participacoes = participacoes || [];
            this.proprietarios = proprietarios || [];
            this.imoveis = imoveis || [];
            
            this.render();
        } catch (error) {
            this.uiManager.showAlert('Erro ao carregar participações: ' + error.message, 'error');
        } finally {
            this.uiManager.hideLoading();
        }
    }

    render() {
        if (!this.container) return;
        
        if (this.isMobile) {
            this.renderMobile();
        } else {
            this.renderDesktop();
        }
        
        this.applyPermissions();
    }

    renderMobile() {
        const isAdmin = window.authService && window.authService.isAdmin();

        // Determinar targetVersaoId
        let targetVersaoId;
        if (this.isMobile) {
            targetVersaoId = null; // Sempre ativas no mobile
        } else {
            targetVersaoId = (this.selectedData === 'ativo' || this.selectedData === null) 
                ? null 
                : parseInt(this.selectedData, 10);
        }

        // Filtrar participações
        const participacoesFiltradas = this.participacoes.filter(p => {
            if (targetVersaoId === null) {
                return p.versao_id == null || p.versao_id === undefined;
            } else {
                return p.versao_id === targetVersaoId;
            }
        });

        // Renderizar cards
        const cardsHtml = this.imoveis.map(imovel => {
            const participacoesDoImovel = participacoesFiltradas.filter(p =>
                p.imovel_id === imovel.id && p.porcentagem > 0
            );
            
            if (participacoesDoImovel.length === 0) return '';

            const participantsHtml = participacoesDoImovel.map(part => {
                const proprietario = this.proprietarios.find(prop => prop.id === part.proprietario_id);
                const percentage = (part.porcentagem < 1 ? part.porcentagem * 100 : part.porcentagem).toFixed(2);
                
                return `
                    <li class="list-group-item d-flex justify-content-between align-items-center">
                        ${proprietario ? SecurityUtils.escapeHtml(proprietario.nome) : 'Desconhecido'}
                        <span class="badge bg-primary rounded-pill">${percentage}%</span>
                    </li>
                `;
            }).join('');

            const actionButton = isAdmin 
                ? `<button class="btn btn-sm btn-outline-primary nova-versao-btn" data-imovel-id="${imovel.id}">
                    <i class="fas fa-edit me-1"></i>Editar
                   </button>` 
                : '';

            return `
                <div class="card mobile-card mb-3 shadow-sm">
                    <div class="card-header bg-light d-flex justify-content-between align-items-center">
                        <h5 class="card-title mb-0">${SecurityUtils.escapeHtml(imovel.nome)}</h5>
                        ${actionButton}
                    </div>
                    <ul class="list-group list-group-flush">
                        ${participantsHtml}
                    </ul>
                </div>
            `;
        }).join('');

        this.container.innerHTML = cardsHtml || '<div class="alert alert-info">Nenhuma participação encontrada.</div>';
    }

    renderDesktop() {
        const isAdmin = window.authService && window.authService.isAdmin();
        
        // Determinar versão target
        const targetVersaoId = (this.selectedData === 'ativo' || this.selectedData === null) 
            ? null 
            : this.selectedData;

        if (this.proprietarios.length === 0 || this.imoveis.length === 0) {
            this.container.innerHTML = '<tr><td colspan="100" class="text-center">Nenhuma participação encontrada.</td></tr>';
            // Atualizar o thead também
            const thead = document.getElementById('participacoes-matrix-head');
            if (thead) {
                thead.innerHTML = '<tr><th>Imóvel</th><th>Info</th></tr>';
            }
            return;
        }

        // Renderizar THEAD com colunas dinâmicas
        const thead = document.getElementById('participacoes-matrix-head');
        if (thead) {
            let theadHtml = '<tr><th width="200">Imóvel</th>';
            this.proprietarios.forEach(prop => {
                theadHtml += `<th class="text-center">${SecurityUtils.escapeHtml(prop.nome || 'Sem nome')}</th>`;
            });
            theadHtml += '<th class="text-center">Total</th>';
            if (isAdmin) {
                theadHtml += '<th width="120">Ações</th>';
            }
            theadHtml += '</tr>';
            thead.innerHTML = theadHtml;
        }

        // Renderizar TBODY com linhas por imóvel
        const rowsHtml = this.imoveis.map(imovel => {
            let total = 0;
            let cellsHtml = `<td><strong>${SecurityUtils.escapeHtml(imovel.nome || 'Sem nome')}</strong></td>`;

            // Célula para cada proprietário
            this.proprietarios.forEach(prop => {
                const part = this.participacoes.find(p =>
                    p.imovel_id === imovel.id &&
                    p.proprietario_id === prop.id &&
                    (p.versao_id || null) === targetVersaoId
                );

                const val = part 
                    ? (part.porcentagem < 1 ? part.porcentagem * 100 : part.porcentagem) 
                    : 0;
                
                total += val;
                const displayVal = val === 0 ? '-' : `${val.toFixed(2)}%`;
                cellsHtml += `<td class="text-center">${displayVal}</td>`;
            });

            // Célula de total
            const totalClass = Math.round(total) === 100 ? 'text-success' : 'text-danger';
            cellsHtml += `<td class="text-center ${totalClass}"><strong>${Math.round(total)}%</strong></td>`;

            // Célula de ações
            if (isAdmin) {
                cellsHtml += `
                    <td class="text-center">
                        <button class="btn btn-sm btn-outline-primary edit-participacao-btn" 
                                data-imovel-id="${imovel.id}" title="Editar participações">
                            <i class="fas fa-edit"></i>
                        </button>
                    </td>
                `;
            }

            return `<tr data-imovel-id="${imovel.id}">${cellsHtml}</tr>`;
        }).join('');

        this.container.innerHTML = rowsHtml;
        
        // Mostrar a tabela
        const tableContainer = document.getElementById('participacoes-table-container');
        if (tableContainer) {
            tableContainer.style.display = 'block';
        }
    }

    async editParticipacao(imovelId) {
        if (!window.authService.isAdmin()) {
            this.uiManager.showError('Apenas administradores podem editar participações.');
            return;
        }

        const imovel = this.imoveis.find(i => i.id == imovelId);
        if (!imovel) return;

        // Determinar versão target
        const targetVersaoId = (this.selectedData === 'ativo' || this.selectedData === null) 
            ? null 
            : this.selectedData;

        // Obter participações atuais para esta versão
        const participacoesAtuais = this.proprietarios.map(prop => {
            const part = this.participacoes.find(p => 
                p.imovel_id == imovelId && 
                p.proprietario_id === prop.id &&
                (p.versao_id || null) === targetVersaoId
            );
            
            const porcentagem = part 
                ? (part.porcentagem < 1 ? part.porcentagem * 100 : part.porcentagem) 
                : 0;
            
            return { 
                proprietario: prop, 
                porcentagem,
                participacao_id: part ? part.id : null
            };
        });

        // Criar e mostrar modal de edição
        const modalId = 'edit-participacao-modal';
        this.createEditModal(modalId, imovel, participacoesAtuais, targetVersaoId);
        
        const modal = new bootstrap.Modal(document.getElementById(modalId));
        modal.show();
    }

    createEditModal(modalId, imovel, participacoes, versaoId) {
        // Remover modal anterior se existir
        let modalElement = document.getElementById(modalId);
        if (modalElement) modalElement.remove();

        // Criar inputs
        const inputsHtml = participacoes.map(p => `
            <div class="mb-2">
                <label for="edit-prop-${p.proprietario.id}" class="form-label">
                    ${SecurityUtils.escapeHtml(p.proprietario.nome)}
                </label>
                <input 
                    type="number" 
                    class="form-control" 
                    id="edit-prop-${p.proprietario.id}" 
                    value="${p.porcentagem.toFixed(2)}" 
                    step="0.01" 
                    min="0" 
                    max="100"
                >
            </div>
        `).join('');

        // HTML do modal
        const modalHtml = `
            <div class="modal fade" id="${modalId}" tabindex="-1">
                <div class="modal-dialog modal-dialog-centered">
                    <div class="modal-content">
                        <div class="modal-header bg-primary text-white">
                            <h5 class="modal-title">Editar Participações - ${SecurityUtils.escapeHtml(imovel.nome)}</h5>
                            <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body">
                            ${inputsHtml}
                            <div class="mt-3 fw-bold">
                                Total: <span id="edit-total-percent">100.00</span>%
                            </div>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancelar</button>
                            <button type="button" class="btn btn-primary" id="save-edit-participacao">Salvar</button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', modalHtml);

        // Elementos do modal
        const modalInstance = document.getElementById(modalId);
        const totalEl = modalInstance.querySelector('#edit-total-percent');

        // Função para atualizar total
        const updateTotal = () => {
            let total = 0;
            participacoes.forEach(p => {
                const input = modalInstance.querySelector(`#edit-prop-${p.proprietario.id}`);
                total += parseFloat(input.value) || 0;
            });
            totalEl.textContent = total.toFixed(2);
            totalEl.style.color = Math.abs(100 - total) < 0.01 ? 'green' : 'red';
        };

        // Event listeners para inputs
        modalInstance.querySelectorAll('input[type="number"]').forEach(input => {
            input.addEventListener('input', updateTotal);
        });

        // Event listener para salvar
        document.getElementById('save-edit-participacao').addEventListener('click', async () => {
            // Recopilar datos modificados para este imóvel
            const updatedForImovel = participacoes.map(p => {
                const input = modalInstance.querySelector(`#edit-prop-${p.proprietario.id}`);
                return {
                    imovel_id: imovel.id,
                    proprietario_id: p.proprietario.id,
                    porcentagem: parseFloat(input.value) || 0
                };
            });

            // Validar total para este imóvel
            const totalImovel = updatedForImovel.reduce((sum, p) => sum + p.porcentagem, 0);
            if (Math.abs(100 - totalImovel) > 0.01) {
                this.uiManager.showError("A soma das porcentagens deve ser 100.");
                return;
            }

            // Construir lista completa de participações: 
            // - Mantener todas las participaciones existentes de otros imóveis
            // - Reemplazar solo las del imóvel editado
            const allParticipacoes = [];
            
            // Determinar versão target
            const targetVersaoId = (this.selectedData === 'ativo' || this.selectedData === null) 
                ? null 
                : this.selectedData;

            // Agregar participações de TODOS los otros imóveis (sin cambios)
            this.imoveis.forEach(im => {
                if (im.id !== imovel.id) {
                    // Para otros imóveis, mantener sus participações actuales
                    this.proprietarios.forEach(prop => {
                        const part = this.participacoes.find(p => 
                            p.imovel_id === im.id && 
                            p.proprietario_id === prop.id &&
                            (p.versao_id || null) === targetVersaoId
                        );
                        
                        if (part) {
                            const porcentagem = part.porcentagem < 1 
                                ? part.porcentagem * 100 
                                : part.porcentagem;
                            
                            allParticipacoes.push({
                                imovel_id: im.id,
                                proprietario_id: prop.id,
                                porcentagem: porcentagem
                            });
                        }
                    });
                }
            });

            // Agregar las participações editadas del imóvel actual
            allParticipacoes.push(...updatedForImovel);

            try {
                this.uiManager.showLoading('Salvando participações...');
                
                // Enviar TODAS las participaciones al endpoint
                await this.apiService.createNovaVersaoParticipacoes({ 
                    participacoes: allParticipacoes 
                });
                
                // Invalidar cache
                if (this.cacheService) {
                    this.cacheService.invalidate('participacoes');
                    this.cacheService.invalidate('participacoes_datas');
                }
                
                this.uiManager.hideLoading();
                this.uiManager.showSuccessToast('Sucesso', 'Participações atualizadas.');
                
                // Fechar modal
                bootstrap.Modal.getInstance(modalInstance).hide();
                
                // Recarregar datas para mostrar nova versão
                await this.loadDatas();
            } catch (error) {
                this.uiManager.showError('Erro ao salvar: ' + error.message);
                this.uiManager.hideLoading();
            }
        });

        // Atualizar total inicial
        updateTotal();
    }

    async novaVersao(imovelId) {
        if (!window.authService.isAdmin()) {
            this.uiManager.showError('Apenas administradores podem criar uma nova versão.');
            return;
        }

        const imovel = this.imoveis.find(i => i.id == imovelId);
        if (!imovel) return;

        // Obter participações atuais
        const participacoesAtuais = this.proprietarios.map(prop => {
            const part = this.participacoes.find(p => 
                p.imovel_id == imovelId && 
                p.proprietario_id === prop.id
            );
            
            const porcentagem = part 
                ? (part.porcentagem < 1 ? part.porcentagem * 100 : part.porcentagem) 
                : 0;
            
            return { proprietario: prop, porcentagem };
        });

        // Criar e mostrar modal
        const modalId = 'nova-versao-modal';
        this.createModal(modalId, imovel, participacoesAtuais);
        
        const modal = new bootstrap.Modal(document.getElementById(modalId));
        modal.show();
    }

    createModal(modalId, imovel, participacoes) {
        // Remover modal anterior se existir
        let modalElement = document.getElementById(modalId);
        if (modalElement) modalElement.remove();

        // Criar inputs
        const inputsHtml = participacoes.map(p => `
            <div class="mb-2">
                <label for="prop-${p.proprietario.id}" class="form-label">
                    ${SecurityUtils.escapeHtml(p.proprietario.nome)}
                </label>
                <input 
                    type="number" 
                    class="form-control" 
                    id="prop-${p.proprietario.id}" 
                    value="${p.porcentagem.toFixed(2)}" 
                    step="0.01" 
                    min="0" 
                    max="100"
                >
            </div>
        `).join('');

        // HTML do modal
        const modalHtml = `
            <div class="modal fade" id="${modalId}" tabindex="-1">
                <div class="modal-dialog modal-dialog-centered">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title">Nova Versão para ${SecurityUtils.escapeHtml(imovel.nome)}</h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body">
                            ${inputsHtml}
                            <div class="mt-3 fw-bold">
                                Total: <span id="total-percent">100.00</span>%
                            </div>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancelar</button>
                            <button type="button" class="btn btn-primary" id="save-nova-versao">Salvar</button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', modalHtml);

        // Elementos do modal
        const modalInstance = document.getElementById(modalId);
        const totalEl = modalInstance.querySelector('#total-percent');

        // Função para atualizar total
        const updateTotal = () => {
            let total = 0;
            participacoes.forEach(p => {
                const input = modalInstance.querySelector(`#prop-${p.proprietario.id}`);
                total += parseFloat(input.value) || 0;
            });
            totalEl.textContent = total.toFixed(2);
            totalEl.style.color = Math.abs(100 - total) < 0.01 ? 'green' : 'red';
        };

        // Event listeners para inputs
        modalInstance.querySelectorAll('input[type="number"]').forEach(input => {
            input.addEventListener('input', updateTotal);
        });

        // Event listener para salvar
        document.getElementById('save-nova-versao').addEventListener('click', async () => {
            const newParticipacoes = participacoes.map(p => {
                const input = modalInstance.querySelector(`#prop-${p.proprietario.id}`);
                return {
                    imovel_id: imovel.id,
                    proprietario_id: p.proprietario.id,
                    porcentagem: parseFloat(input.value) || 0
                };
            });

            // Validar total
            const total = newParticipacoes.reduce((sum, p) => sum + p.porcentagem, 0);
            if (Math.abs(100 - total) > 0.01) {
                this.uiManager.showError("A soma das porcentagens deve ser 100.");
                return;
            }

            try {
                this.uiManager.showLoading('Salvando nova versão...');
                
                await this.apiService.createNovaVersaoParticipacoes({ 
                    participacoes: newParticipacoes 
                });
                
                // Invalidar cache de datas após criar nova versão
                if (this.cacheService) {
                    this.cacheService.invalidate('participacoes_datas');
                }
                
                this.uiManager.hideLoading();
                this.uiManager.showSuccessToast('Sucesso', 'Nova versão de participações salva.');
                
                // Fechar modal
                bootstrap.Modal.getInstance(modalInstance).hide();
                
                // Recarregar datas
                this.loadDatas();
            } catch (error) {
                this.uiManager.showError('Erro ao salvar: ' + error.message);
                this.uiManager.hideLoading();
            }
        });

        // Atualizar total inicial
        updateTotal();
    }

    applyPermissions() {
        const isAdmin = window.authService && window.authService.isAdmin();
        
        document.querySelectorAll('.admin-only').forEach(el => {
            el.style.display = isAdmin ? 'inline-block' : 'none';
        });
    }
}

// Inicializar quando DOM estiver pronto
document.addEventListener('DOMContentLoaded', () => {
    window.participacoesModule = new ParticipacoesModule();
});
