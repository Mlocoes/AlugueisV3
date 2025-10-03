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
        console.log('🔄 ParticipacoesModule.load() - Iniciando carga...');
        
        // Re-avaliar tipo de dispositivo
        this.isMobile = window.deviceManager && window.deviceManager.deviceType === 'mobile';
        console.log(`📱 Tipo de dispositivo: ${this.isMobile ? 'MOBILE' : 'DESKTOP'}`);
        
        // Sempre re-buscar elementos DOM (podem ter sido recriados ao mudar de tela)
        const getContainer = () => this.isMobile
            ? document.getElementById('participacoes-list-mobile')
            : document.getElementById('participacoes-matrix-body');

        this.container = getContainer();

        // Retry múltiplas vezes se não encontrar (timing issue)
        // Aumentado para 10 tentativas com delay maior
        if (!this.container) {
            console.log('⏳ ParticipacoesModule: Container não encontrado, tentando novamente...');
            for (let i = 0; i < 10; i++) {
                await new Promise(resolve => setTimeout(resolve, 300));
                this.container = getContainer();
                if (this.container) {
                    console.log(`✅ Container encontrado após ${i + 1} tentativa(s)`);
                    break;
                }
            }
        }

        if (!this.container) {
            console.warn('⚠️ ParticipacoesModule: Container não encontrado após tentativas. View pode não estar ativa ainda.');
            return;
        }

        console.log('✅ ParticipacoesModule: Container encontrado, inicializando...');
        this.bindContainerEvents();
        await this.loadDatas();
        
        console.log('✅ ParticipacoesModule.load() - Carga completa!');
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

            // Selecionar primeira versão (ou null se não houver dados)
            this.selectedData = this.datas.length ? this.datas[0].versao_id : null;

            // Renderizar seletor (desktop only)
            if (!this.isMobile) {
                this.renderDataSelector();
            }
            
            // Carregar participações (se houver versão selecionada)
            if (this.selectedData) {
                // Mobile e desktop usam this.selectedData (versão mais recente)
                await this.loadParticipacoes(this.selectedData);
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
            
            console.log('🔍 loadParticipacoes - dataId:', dataId);
            
            // Carregar participações + dados em cache
            const [participacoes, proprietarios, imoveis] = await Promise.all([
                this.apiService.getParticipacoes(dataId),
                this.cacheService ? this.apiService.getProprietarios(true) : this.apiService.getProprietarios(false),
                this.cacheService ? this.apiService.getImoveis(true) : this.apiService.getImoveis(false)
            ]);
            
            this.participacoes = participacoes || [];
            this.proprietarios = proprietarios || [];
            this.imoveis = imoveis || [];
            
            console.log('📊 Dados carregados:', {
                participacoes: this.participacoes.length,
                proprietarios: this.proprietarios.length,
                imoveis: this.imoveis.length
            });
            
            // Log das primeiras participações para debug
            if (this.participacoes.length > 0) {
                console.log('📋 Primeira participação:', this.participacoes[0]);
            }
            
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
        
        console.log(`🔎 Filtro aplicado - targetVersaoId: ${targetVersaoId}`);
        console.log(`📊 Total participações: ${this.participacoes.length}, Filtradas: ${participacoesFiltradas.length}`);

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
        // Se selectedData é "ativo" ou null, queremos participações com versao_id null
        // Caso contrário, selectedData pode ser data_registro (string ISO) ou versao_id
        const isAtivo = (this.selectedData === 'ativo' || this.selectedData === null);
        
        console.log(`🖥️  renderDesktop - selectedData: ${this.selectedData}, isAtivo: ${isAtivo}`);
        console.log(`📊 Total participações: ${this.participacoes.length}`);
        
        if (this.participacoes.length > 0) {
            console.log('📋 Primeira participação:', this.participacoes[0]);
        }

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
                // Para participações ativas (versao_id = null), simplesmente pegamos todas
                // As participações já foram filtradas no backend pelo data_registro
                const part = this.participacoes.find(p => 
                    p.imovel_id === imovel.id &&
                    p.proprietario_id === prop.id
                );

                const val = part 
                    ? (part.porcentagem < 1 ? part.porcentagem * 100 : part.porcentagem) 
                    : 0;
                
                // Log se encontrou participação na primeira linha
                if (part && imovel.id === this.imoveis[0].id && prop.id === this.proprietarios[0].id) {
                    console.log(`✅ Participação encontrada:`, part, `valor: ${val}%`);
                }
                
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

        console.log('[EditParticipacao] Iniciando edição');
        console.log('[EditParticipacao] Imóvel:', imovel.nome);
        console.log('[EditParticipacao] this.selectedData:', this.selectedData);
        console.log('[EditParticipacao] this.isMobile:', this.isMobile);

        // Determinar versão target
        const targetVersaoId = (this.selectedData === 'ativo' || this.selectedData === null) 
            ? null 
            : this.selectedData;

        console.log('[EditParticipacao] targetVersaoId calculado:', targetVersaoId);

        // Obter participações atuais para esta versão
        const participacoesAtuais = this.proprietarios.map(prop => {
            const part = this.participacoes.find(p => 
                p.imovel_id == imovelId && 
                p.proprietario_id === prop.id
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
            try {
                this.uiManager.showLoading('Preparando dados...');
                
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
                    this.uiManager.hideLoading();
                    this.uiManager.showError("A soma das porcentagens deve ser 100.");
                    return;
                }

                console.log('[EditParticipacao] =================================');
                console.log('[EditParticipacao] selectedData:', this.selectedData);
                
                // CRÍTICO: Usar a versão que está sendo EXIBIDA na tela como base
                // A lógica é: Versão apresentada + edição do usuário = nova versão
                let responseParticipacoes = await this.apiService.getParticipacoes(this.selectedData);
                let todasParticipacoes = responseParticipacoes || [];
                
                console.log('[EditParticipacao] Participações retornadas:', todasParticipacoes.length);
                
                const expectedTotal = this.imoveis.length * this.proprietarios.length;
                console.log('[EditParticipacao] Total esperado:', expectedTotal);
                
                // PROTEÇÃO: Se a versão retornou menos que o esperado, buscar TODAS as versões
                // Isso acontece quando a última versão foi corrompida (salvou só 10 em vez de 190)
                if (todasParticipacoes.length < expectedTotal) {
                    console.warn('[EditParticipacao] ⚠️ Versão incompleta! Buscando todas as participações...');
                    
                    // Buscar todas as versões disponíveis
                    const allVersions = await this.cacheService.get('participacoes_datas', 
                        () => this.apiService.getParticipacoesDatas());
                    
                    if (allVersions && allVersions.length > 0) {
                        // Buscar a versão mais antiga (primeira importação completa)
                        const oldestVersion = allVersions[allVersions.length - 1].versao_id;
                        console.log('[EditParticipacao] Buscando versão mais antiga:', oldestVersion);
                        
                        const fallbackResponse = await this.apiService.getParticipacoes(oldestVersion);
                        if (fallbackResponse && fallbackResponse.length >= expectedTotal) {
                            todasParticipacoes = fallbackResponse;
                            console.log('[EditParticipacao] ✅ Versão completa encontrada:', todasParticipacoes.length);
                        }
                    }
                }
                
                // Construir lista completa: UMA participação por cada combinação imóvel × proprietário
                const allParticipacoes = [];
                
                // Para CADA imóvel
                this.imoveis.forEach(im => {
                    // Para CADA proprietário
                    this.proprietarios.forEach(prop => {
                        if (im.id === imovel.id) {
                            // Usar os dados editados para o imóvel atual
                            const edited = updatedForImovel.find(p => p.proprietario_id === prop.id);
                            if (edited) {
                                allParticipacoes.push(edited);
                            } else {
                                console.error(`[EditParticipacao] ERRO: Não encontrei dados editados para proprietário ${prop.id}`);
                                // Adicionar com 0 para não quebrar
                                allParticipacoes.push({
                                    imovel_id: im.id,
                                    proprietario_id: prop.id,
                                    porcentagem: 0
                                });
                            }
                        } else {
                            // Para outros imóveis, buscar a participação atual do backend
                            const part = todasParticipacoes.find(p => 
                                p.imovel_id === im.id && 
                                p.proprietario_id === prop.id
                            );
                            
                            const porcentagem = part 
                                ? (part.porcentagem < 1 ? part.porcentagem * 100 : part.porcentagem)
                                : 0;
                            
                            allParticipacoes.push({
                                imovel_id: im.id,
                                proprietario_id: prop.id,
                                porcentagem: porcentagem
                            });
                        }
                    });
                });
                
                console.log('[EditParticipacao] Total de participações construídas:', allParticipacoes.length);
                console.log('[EditParticipacao] Participações editadas:', updatedForImovel);
                console.log('[EditParticipacao] =================================');
                
                // Validar que tenhamos o número correto
                if (allParticipacoes.length !== expectedTotal) {
                    this.uiManager.hideLoading();
                    console.error('[EditParticipacao] ERROR: Número de participações incorreto!');
                    console.error('[EditParticipacao] Esperado:', expectedTotal, 'Atual:', allParticipacoes.length);
                    this.uiManager.showError(`Erro: Número incorreto de participações (${allParticipacoes.length} em vez de ${expectedTotal})`);
                    return;
                }

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
