/**
 * Módulo Dashboard - Gestão do dashboard principal com dados agregados do backend.
 */
class DashboardModule {
    constructor() {
        this.charts = {};
        this.summaryData = {};
        this.initialized = false;
        this.isViewActive = false;
        this.dataLoaded = false;
        this.isLoading = false;
        this.uiManager = window.uiManager;
        this.apiService = window.apiService;
    }

    init() {
        if (this.initialized) return;

        window.addEventListener('view-shown', (e) => {
            if (e.detail.viewId === 'dashboard') {
                this.isViewActive = true;
                if (!this.dataLoaded) {
                    this.load();
                } else {
                    // Se os dados já foram carregados mas a view não estava ativa,
                    // criar os gráficos agora
                    this.createCharts();
                }
            }
        });

        window.addEventListener('navigate', (e) => {
            if (this.isViewActive && e.detail.view !== 'dashboard') {
                this.isViewActive = false;
                this.destroyAllCharts();
            }
        });

        this.initialized = true;
    }

    async handleApiCall(apiCall, loadingMessage, errorMessagePrefix) {
        try {
            this.uiManager.showLoading(loadingMessage);
            return await apiCall();
        } catch (error) {
            this.uiManager.showError(`${errorMessagePrefix}: ${error.message}`);
            console.error(errorMessagePrefix, error);
            return null;
        } finally {
            this.uiManager.hideLoading();
        }
    }

    async load() {
        if (this.isLoading) return;
        this.isLoading = true;

        const summary = await this.handleApiCall(
            () => this.apiService.getDashboardSummary(),
            'Carregando dashboard...',
            'Erro ao carregar dados do dashboard'
        );
        this.isLoading = false;

        if (summary) {
            this.dataLoaded = true;
            this.summaryData = summary;

            // Sempre atualizar estatísticas quando dados são carregados
            this.updateStats();

            if (this.isViewActive) {
                this.createCharts();
            }
        }
    }

    updateStats() {
        const { 
            total_proprietarios,
            total_imoveis,
            total_alugueis_ano_corrente,
            receitas_ultimo_mes,
            variacao_percentual
        } = this.summaryData;

        // Desktop stats
        this.updateCounter('dashboard-total-proprietarios', total_proprietarios);
        this.updateCounter('dashboard-total-inmuebles', total_imoveis);
        this.updateCounter('dashboard-ingresos-mensuales', `R$ ${receitas_ultimo_mes.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`);
        
        // Variação percentual com formatação especial
        const variacaoElement = document.getElementById('dashboard-variacao-percentual');
        if (variacaoElement && variacao_percentual !== undefined) {
            const sinal = variacao_percentual >= 0 ? '+' : '';
            const cor = variacao_percentual >= 0 ? 'text-success' : 'text-danger';
            const icone = variacao_percentual >= 0 ? 'fa-arrow-up' : 'fa-arrow-down';
            variacaoElement.innerHTML = `<span class="${cor}">${sinal}${variacao_percentual.toFixed(2)}% <i class="fas ${icone}"></i></span>`;
        }

        // Mobile stats
        this.updateCounter('mobile-stats-proprietarios', total_proprietarios);
        this.updateCounter('mobile-stats-imoveis', total_imoveis);
        this.updateCounter('mobile-stats-receita', `R$ ${receitas_ultimo_mes.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`);
        
        // Variação percentual mobile
        const variacaoMobileElement = document.getElementById('mobile-stats-variacao');
        if (variacaoMobileElement && variacao_percentual !== undefined) {
            const sinal = variacao_percentual >= 0 ? '+' : '';
            const cor = variacao_percentual >= 0 ? 'text-success' : 'text-danger';
            const icone = variacao_percentual >= 0 ? 'fa-arrow-up' : 'fa-arrow-down';
            variacaoMobileElement.innerHTML = `<span class="${cor}">${sinal}${variacao_percentual.toFixed(2)}% <i class="fas ${icone}"></i></span>`;
        }
    }

    updateCounter(elementId, value) {
        const element = document.getElementById(elementId);
        if (element) {
            element.textContent = value;
        }
    }

    createCharts() {
        this.destroyAllCharts();
        this.createIncomeChart();
    }

    destroyAllCharts() {
        for (const chartKey in this.charts) {
            if (this.charts[chartKey]) {
                this.charts[chartKey].destroy();
                this.charts[chartKey] = null;
            }
        }
    }

    createIncomeChart() {
        if (!this.isViewActive) {
            return;
        }

        const waitForCanvas = (retries = 0) => {
            const canvas = document.getElementById('ingresosChart');
            if (canvas && canvas.offsetParent !== null) {
                this.renderIncomeChart(canvas);
            } else if (retries < 10) {
                setTimeout(() => waitForCanvas(retries + 1), 100);
            }
        };
        waitForCanvas();
    }

    renderIncomeChart(canvas) {
        const { income_chart_data } = this.summaryData;
        if (!income_chart_data || !income_chart_data.labels || !income_chart_data.values) {
            console.error("Dados para o gráfico de receitas estão incompletos.");
            return;
        }

        const ctx = canvas.getContext('2d');
        if (!ctx) {
            console.error("Não foi possível obter o contexto 2D do canvas.");
            return;
        }

        this.charts.income = new Chart(ctx, {
            type: 'line',
            data: {
                labels: income_chart_data.labels,
                datasets: [{
                    label: 'Receitas (R$)',
                    data: income_chart_data.values,
                    borderColor: '#36A2EB',
                    backgroundColor: 'rgba(54, 162, 235, 0.1)',
                    borderWidth: 3,
                    fill: true,
                    tension: 0.4,
                    pointBackgroundColor: '#36A2EB',
                    pointBorderColor: '#ffffff',
                    pointBorderWidth: 2,
                    pointRadius: 6,
                    pointHoverRadius: 8
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        backgroundColor: 'rgba(0, 0, 0, 0.8)',
                        titleColor: 'white',
                        bodyColor: 'white',
                        borderColor: '#36A2EB',
                        borderWidth: 1
                    }
                },
                scales: {
                    x: { 
                        grid: { display: false },
                        ticks: { color: '#000000' }
                    },
                    y: {
                        beginAtZero: true,
                        grid: { 
                            borderDash: [5, 5],
                            color: 'rgba(0, 0, 0, 0.1)'
                        },
                        ticks: {
                            color: '#000000',
                            callback: value => `R$ ${value.toLocaleString('pt-BR')}`
                        }
                    }
                },
                layout: {
                    padding: 10
                },
                backgroundColor: '#ffffff'
            }
        });
    }

    async refresh() {
        this.dataLoaded = false;
        if (this.isViewActive) {
            await this.load();
        }
    }
}

// Inicialização do módulo
// A inicialização agora é feita pelo app.js durante initializeModules()
// para garantir a ordem correta e evitar sobrescrever a instância
document.addEventListener('DOMContentLoaded', () => {
    // Se o módulo ainda não foi inicializado (fallback para testes standalone)
    if (!window.dashboardModule) {
        window.dashboardModule = new DashboardModule();
        window.dashboardModule.init();
    }
});

// Exportar classe globalmente para o app.js
window.DashboardModule = DashboardModule;
