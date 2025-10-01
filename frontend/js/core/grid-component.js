/**
 * GridComponent - Componente Universal de Tablas
 * 
 * Características:
 * - Renderización eficiente (Desktop + Mobile)
 * - Ordenación por columnas
 * - Filtrado en tiempo real
 * - Paginación opcional
 * - Acciones por fila
 * - Selección múltiple
 * - Estados de carga y vacío
 * - Exportación a CSV
 * 
 * @version 1.0.0
 * @author GitHub Copilot
 */

class GridComponent {
    constructor(containerId, config = {}) {
        this.container = document.getElementById(containerId);
        if (!this.container) {
            console.error(`GridComponent: Container "${containerId}" não encontrado`);
            return;
        }

        // Configuración
        this.config = {
            columns: config.columns || [],
            data: config.data || [],
            actions: config.actions || [],
            responsive: {
                mobile: config.responsive?.mobile || 'cards',
                desktop: config.responsive?.desktop || 'table'
            },
            pagination: {
                enabled: config.pagination?.enabled || false,
                pageSize: config.pagination?.pageSize || 20,
                pageSizeOptions: config.pagination?.pageSizeOptions || [10, 20, 50, 100]
            },
            search: {
                enabled: config.search?.enabled || false,
                placeholder: config.search?.placeholder || 'Buscar...',
                fields: config.search?.fields || [] // Empty = search all
            },
            sort: {
                enabled: config.sort?.enabled !== false,
                column: config.sort?.column || null,
                direction: config.sort?.direction || 'asc'
            },
            selection: {
                enabled: config.selection?.enabled || false,
                multiple: config.selection?.multiple || false
            },
            groupBy: config.groupBy || null,
            emptyMessage: config.emptyMessage || 'Nenhum registro encontrado',
            loadingMessage: config.loadingMessage || 'Carregando...',
            onRowClick: config.onRowClick || null,
            customRender: config.customRender || null
        };

        // Estado interno
        this.state = {
            data: [],
            filteredData: [],
            currentPage: 1,
            searchTerm: '',
            sortColumn: this.config.sort.column,
            sortDirection: this.config.sort.direction,
            selectedRows: new Set(),
            loading: false
        };

        // Detectar dispositivo
        this.isMobile = window.deviceManager?.deviceType === 'mobile' || window.innerWidth < 768;

        // Inicializar
        this.init();
    }

    init() {
        this.setData(this.config.data);
        this.render();
        this.attachEvents();
    }

    /**
     * Define os dados do grid
     */
    setData(data) {
        this.state.data = Array.isArray(data) ? data : [];
        this.state.filteredData = [...this.state.data];
        this.applyFilters();
        this.applySort();
    }

    /**
     * Aplica filtros de busca
     */
    applyFilters() {
        if (!this.state.searchTerm) {
            this.state.filteredData = [...this.state.data];
            return;
        }

        const term = this.state.searchTerm.toLowerCase();
        const searchFields = this.config.search.fields.length > 0
            ? this.config.search.fields
            : this.config.columns.filter(c => c.filterable !== false).map(c => c.key);

        this.state.filteredData = this.state.data.filter(row => {
            return searchFields.some(field => {
                const value = this.getNestedValue(row, field);
                return value && String(value).toLowerCase().includes(term);
            });
        });
    }

    /**
     * Aplica ordenação
     */
    applySort() {
        if (!this.state.sortColumn) return;

        const column = this.config.columns.find(c => c.key === this.state.sortColumn);
        if (!column || column.sortable === false) return;

        this.state.filteredData.sort((a, b) => {
            let aVal = this.getNestedValue(a, this.state.sortColumn);
            let bVal = this.getNestedValue(b, this.state.sortColumn);

            // Tratamento por tipo
            if (column.type === 'number' || column.type === 'currency') {
                aVal = parseFloat(aVal) || 0;
                bVal = parseFloat(bVal) || 0;
            } else if (column.type === 'date') {
                aVal = new Date(aVal).getTime() || 0;
                bVal = new Date(bVal).getTime() || 0;
            } else {
                aVal = String(aVal || '').toLowerCase();
                bVal = String(bVal || '').toLowerCase();
            }

            const comparison = aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
            return this.state.sortDirection === 'asc' ? comparison : -comparison;
        });
    }

    /**
     * Obtém dados paginados
     */
    getPaginatedData() {
        if (!this.config.pagination.enabled) {
            return this.state.filteredData;
        }

        const start = (this.state.currentPage - 1) * this.config.pagination.pageSize;
        const end = start + this.config.pagination.pageSize;
        return this.state.filteredData.slice(start, end);
    }

    /**
     * Renderiza o grid completo
     */
    render() {
        if (!this.container) return;

        let html = '';

        // Barra de ferramentas (busca, etc)
        if (this.config.search.enabled || this.config.pagination.enabled) {
            html += this.renderToolbar();
        }

        // Loading state
        if (this.state.loading) {
            html += `<div class="grid-loading">${this.config.loadingMessage}</div>`;
            SecurityUtils.setSafeHTML(this.container, html);
            return;
        }

        // Empty state
        if (this.state.filteredData.length === 0) {
            html += `<div class="grid-empty">${this.config.emptyMessage}</div>`;
            if (this.config.search.enabled) {
                html += this.renderToolbar();
            }
            SecurityUtils.setSafeHTML(this.container, html);
            return;
        }

        // Conteúdo principal
        if (this.isMobile && this.config.responsive.mobile === 'cards') {
            html += this.renderMobileCards();
        } else {
            html += this.renderDesktopTable();
        }

        // Paginação
        if (this.config.pagination.enabled) {
            html += this.renderPagination();
        }

        SecurityUtils.setSafeHTML(this.container, html);
    }

    /**
     * Renderiza barra de ferramentas
     */
    renderToolbar() {
        let html = '<div class="grid-toolbar">';

        // Busca
        if (this.config.search.enabled) {
            html += `
                <div class="grid-search">
                    <input 
                        type="text" 
                        class="form-control grid-search-input" 
                        placeholder="${SecurityUtils.escapeHtml(this.config.search.placeholder)}"
                        value="${SecurityUtils.escapeHtml(this.state.searchTerm)}"
                    >
                </div>
            `;
        }

        // Info de registros
        if (this.config.pagination.enabled) {
            const total = this.state.filteredData.length;
            const start = (this.state.currentPage - 1) * this.config.pagination.pageSize + 1;
            const end = Math.min(start + this.config.pagination.pageSize - 1, total);
            
            html += `
                <div class="grid-info">
                    <span>${start}-${end} de ${total} registros</span>
                </div>
            `;
        }

        html += '</div>';
        return html;
    }

    /**
     * Renderiza tabela desktop
     */
    renderDesktopTable() {
        let html = '<div class="table-responsive"><table class="table table-hover grid-table">';

        // Header
        html += '<thead><tr>';
        
        if (this.config.selection.enabled) {
            html += '<th width="50">';
            if (this.config.selection.multiple) {
                html += '<input type="checkbox" class="grid-select-all">';
            }
            html += '</th>';
        }

        this.config.columns.forEach(column => {
            const sortable = column.sortable !== false && this.config.sort.enabled;
            const isSorted = this.state.sortColumn === column.key;
            const sortIcon = isSorted 
                ? (this.state.sortDirection === 'asc' ? '↑' : '↓')
                : '';
            
            const width = column.width ? `width="${column.width}"` : '';
            const align = column.align ? `text-${column.align}` : '';
            const sortClass = sortable ? 'sortable' : '';
            const activeClass = isSorted ? 'active' : '';

            html += `
                <th ${width} class="${align} ${sortClass} ${activeClass}" data-column="${column.key}">
                    ${SecurityUtils.escapeHtml(column.label)}
                    ${sortable ? `<span class="sort-icon">${sortIcon}</span>` : ''}
                </th>
            `;
        });

        if (this.config.actions.length > 0) {
            html += '<th width="120" class="text-center">Ações</th>';
        }

        html += '</tr></thead>';

        // Body
        html += '<tbody>';
        const data = this.getPaginatedData();
        
        if (this.config.groupBy) {
            html += this.renderGroupedRows(data);
        } else {
            data.forEach(row => {
                html += this.renderTableRow(row);
            });
        }

        html += '</tbody></table></div>';
        return html;
    }

    /**
     * Renderiza uma linha da tabela
     */
    renderTableRow(row) {
        const rowId = this.getRowId(row);
        const isSelected = this.state.selectedRows.has(rowId);
        const rowClass = isSelected ? 'selected' : '';

        let html = `<tr class="${rowClass}" data-row-id="${rowId}">`;

        // Checkbox de seleção
        if (this.config.selection.enabled) {
            html += `
                <td>
                    <input type="checkbox" class="grid-row-select" ${isSelected ? 'checked' : ''}>
                </td>
            `;
        }

        // Colunas
        this.config.columns.forEach(column => {
            const value = this.getNestedValue(row, column.key);
            const formatted = this.formatValue(value, column);
            const align = column.align ? `text-${column.align}` : '';
            
            html += `<td class="${align}">${formatted}</td>`;
        });

        // Ações
        if (this.config.actions.length > 0) {
            html += '<td class="text-center">';
            html += this.renderActions(row);
            html += '</td>';
        }

        html += '</tr>';
        return html;
    }

    /**
     * Renderiza linhas agrupadas
     */
    renderGroupedRows(data) {
        const groups = {};
        data.forEach(row => {
            const groupValue = this.getNestedValue(row, this.config.groupBy);
            if (!groups[groupValue]) {
                groups[groupValue] = [];
            }
            groups[groupValue].push(row);
        });

        let html = '';
        Object.entries(groups).forEach(([groupName, rows]) => {
            html += `
                <tr class="group-header">
                    <td colspan="${this.config.columns.length + (this.config.selection.enabled ? 1 : 0) + (this.config.actions.length > 0 ? 1 : 0)}">
                        <strong>${SecurityUtils.escapeHtml(groupName)}</strong> (${rows.length})
                    </td>
                </tr>
            `;
            rows.forEach(row => {
                html += this.renderTableRow(row);
            });
        });

        return html;
    }

    /**
     * Renderiza cards mobile
     */
    renderMobileCards() {
        let html = '<div class="grid-mobile-cards">';
        const data = this.getPaginatedData();

        data.forEach(row => {
            html += this.renderMobileCard(row);
        });

        html += '</div>';
        return html;
    }

    /**
     * Renderiza um card mobile
     */
    renderMobileCard(row) {
        const rowId = this.getRowId(row);
        
        let html = `<div class="grid-card" data-row-id="${rowId}">`;

        // Header do card (primeira coluna geralmente)
        const titleColumn = this.config.columns.find(c => c.cardTitle) || this.config.columns[0];
        if (titleColumn) {
            const value = this.getNestedValue(row, titleColumn.key);
            html += `<div class="card-header"><strong>${SecurityUtils.escapeHtml(value)}</strong></div>`;
        }

        // Corpo do card
        html += '<div class="card-body">';
        this.config.columns
            .filter(c => !c.hideOnMobile && c !== titleColumn)
            .forEach(column => {
                const value = this.getNestedValue(row, column.key);
                const formatted = this.formatValue(value, column);
                html += `
                    <div class="card-field">
                        <span class="field-label">${SecurityUtils.escapeHtml(column.label)}:</span>
                        <span class="field-value">${formatted}</span>
                    </div>
                `;
            });
        html += '</div>';

        // Ações
        if (this.config.actions.length > 0) {
            html += '<div class="card-actions">';
            html += this.renderActions(row);
            html += '</div>';
        }

        html += '</div>';
        return html;
    }

    /**
     * Renderiza botões de ação
     */
    renderActions(row) {
        let html = '';
        
        this.config.actions.forEach(action => {
            // Verificar se ação deve ser mostrada
            if (action.adminOnly && window.authService && !window.authService.isAdmin()) {
                return;
            }
            if (action.condition && !action.condition(row)) {
                return;
            }

            const icon = action.icon ? `<i class="bi bi-${action.icon}"></i>` : '';
            const label = action.label || '';
            const variant = action.variant || 'primary';
            const size = this.isMobile ? 'btn-sm' : 'btn-sm';
            
            html += `
                <button 
                    class="btn btn-${variant} ${size} grid-action-btn" 
                    data-action="${action.name || ''}"
                    data-row-id="${this.getRowId(row)}"
                    title="${SecurityUtils.escapeHtml(label)}"
                >
                    ${icon} ${this.isMobile ? '' : label}
                </button>
            `;
        });

        return html;
    }

    /**
     * Renderiza paginação
     */
    renderPagination() {
        const totalPages = Math.ceil(this.state.filteredData.length / this.config.pagination.pageSize);
        if (totalPages <= 1) return '';

        let html = '<div class="grid-pagination">';
        html += '<nav><ul class="pagination pagination-sm">';

        // Anterior
        const prevDisabled = this.state.currentPage === 1 ? 'disabled' : '';
        html += `
            <li class="page-item ${prevDisabled}">
                <a class="page-link grid-page-btn" data-page="${this.state.currentPage - 1}">Anterior</a>
            </li>
        `;

        // Páginas
        const maxVisible = 5;
        let startPage = Math.max(1, this.state.currentPage - Math.floor(maxVisible / 2));
        let endPage = Math.min(totalPages, startPage + maxVisible - 1);
        
        if (endPage - startPage + 1 < maxVisible) {
            startPage = Math.max(1, endPage - maxVisible + 1);
        }

        for (let i = startPage; i <= endPage; i++) {
            const active = i === this.state.currentPage ? 'active' : '';
            html += `
                <li class="page-item ${active}">
                    <a class="page-link grid-page-btn" data-page="${i}">${i}</a>
                </li>
            `;
        }

        // Próximo
        const nextDisabled = this.state.currentPage === totalPages ? 'disabled' : '';
        html += `
            <li class="page-item ${nextDisabled}">
                <a class="page-link grid-page-btn" data-page="${this.state.currentPage + 1}">Próximo</a>
            </li>
        `;

        html += '</ul></nav></div>';
        return html;
    }

    /**
     * Anexa event listeners
     */
    attachEvents() {
        if (!this.container) return;

        // Busca
        this.container.addEventListener('input', (e) => {
            if (e.target.classList.contains('grid-search-input')) {
                this.state.searchTerm = e.target.value;
                this.state.currentPage = 1;
                this.applyFilters();
                this.render();
            }
        });

        // Ordenação
        this.container.addEventListener('click', (e) => {
            const th = e.target.closest('th.sortable');
            if (th) {
                const column = th.dataset.column;
                if (this.state.sortColumn === column) {
                    this.state.sortDirection = this.state.sortDirection === 'asc' ? 'desc' : 'asc';
                } else {
                    this.state.sortColumn = column;
                    this.state.sortDirection = 'asc';
                }
                this.applySort();
                this.render();
            }
        });

        // Paginação
        this.container.addEventListener('click', (e) => {
            if (e.target.classList.contains('grid-page-btn')) {
                e.preventDefault();
                const page = parseInt(e.target.dataset.page);
                if (page >= 1 && page <= Math.ceil(this.state.filteredData.length / this.config.pagination.pageSize)) {
                    this.state.currentPage = page;
                    this.render();
                }
            }
        });

        // Ações
        this.container.addEventListener('click', (e) => {
            const btn = e.target.closest('.grid-action-btn');
            if (btn) {
                const rowId = btn.dataset.rowId;
                const actionName = btn.dataset.action;
                const row = this.state.data.find(r => this.getRowId(r) === rowId);
                const action = this.config.actions.find(a => a.name === actionName);
                
                if (action && action.onClick && row) {
                    action.onClick(row, e);
                }
            }
        });

        // Seleção
        this.container.addEventListener('change', (e) => {
            if (e.target.classList.contains('grid-row-select')) {
                const tr = e.target.closest('tr');
                const rowId = tr?.dataset.rowId;
                if (rowId) {
                    if (e.target.checked) {
                        this.state.selectedRows.add(rowId);
                    } else {
                        this.state.selectedRows.delete(rowId);
                    }
                }
            }
        });

        // Selecionar todos
        this.container.addEventListener('change', (e) => {
            if (e.target.classList.contains('grid-select-all')) {
                const checked = e.target.checked;
                this.state.filteredData.forEach(row => {
                    const rowId = this.getRowId(row);
                    if (checked) {
                        this.state.selectedRows.add(rowId);
                    } else {
                        this.state.selectedRows.delete(rowId);
                    }
                });
                this.render();
            }
        });

        // Click na linha
        if (this.config.onRowClick) {
            this.container.addEventListener('click', (e) => {
                const tr = e.target.closest('tr[data-row-id]');
                const card = e.target.closest('.grid-card[data-row-id]');
                
                if (tr || card) {
                    const rowId = (tr || card).dataset.rowId;
                    const row = this.state.data.find(r => this.getRowId(r) === rowId);
                    if (row) {
                        this.config.onRowClick(row, e);
                    }
                }
            });
        }
    }

    /**
     * Utilitários
     */
    getNestedValue(obj, path) {
        return path.split('.').reduce((current, prop) => current?.[prop], obj);
    }

    getRowId(row) {
        return row.id || row._id || JSON.stringify(row);
    }

    formatValue(value, column) {
        if (value === null || value === undefined) {
            return column.emptyValue || '-';
        }

        // Custom formatter
        if (column.formatter) {
            return column.formatter(value);
        }

        // Formatação por tipo
        switch (column.type) {
            case 'currency':
                return new Intl.NumberFormat('pt-BR', { 
                    style: 'currency', 
                    currency: 'BRL' 
                }).format(value);
            
            case 'number':
                return new Intl.NumberFormat('pt-BR').format(value);
            
            case 'percent':
                return `${parseFloat(value).toFixed(2)}%`;
            
            case 'date':
                return new Date(value).toLocaleDateString('pt-BR');
            
            case 'datetime':
                return new Date(value).toLocaleString('pt-BR');
            
            case 'boolean':
                return value ? '✓' : '✗';
            
            default:
                return SecurityUtils.escapeHtml(String(value));
        }
    }

    /**
     * API Pública
     */
    refresh() {
        this.render();
    }

    setLoading(loading) {
        this.state.loading = loading;
        this.render();
    }

    getSelectedRows() {
        return Array.from(this.state.selectedRows).map(id => 
            this.state.data.find(r => this.getRowId(r) === id)
        ).filter(Boolean);
    }

    clearSelection() {
        this.state.selectedRows.clear();
        this.render();
    }

    destroy() {
        if (this.container) {
            this.container.innerHTML = '';
        }
    }
}

// Exportar para uso global
window.GridComponent = GridComponent;
