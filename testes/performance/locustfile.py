from locust import HttpUser, task, between
import random

# --- Configurações do Teste de Carga ---
ADMIN_USERNAME = "admin"
ADMIN_PASSWORD = "admin00"

class ApiUser(HttpUser):
    """
    Classe de usuário que simula o comportamento de um cliente da API.
    """
    # Espera entre 1 e 3 segundos entre as tarefas
    wait_time = between(1, 3)

    def on_start(self):
        """
        Executado uma vez por usuário virtual no início do teste.
        Realiza o login para obter o token de autenticação.
        """
        try:
            response = self.client.post("/api/auth/login", json={
                "usuario": ADMIN_USERNAME,
                "senha": ADMIN_PASSWORD
            })
            response.raise_for_status()
            self.token = response.json()["access_token"]
            self.headers = {"Authorization": f"Bearer {self.token}"}
            print("Login bem-sucedido, token obtido.")
        except Exception as e:
            print(f"Falha no login: {e}")
            # Se o login falhar, o usuário não continuará com outras tarefas.
            self.stop(True)

    @task(3) # Tarefa com maior peso
    def get_proprietarios(self):
        """
        Testa o endpoint de listagem de proprietários.
        """
        self.client.get("/api/proprietarios", headers=self.headers, name="/api/proprietarios")

    @task(2)
    def get_imoveis(self):
        """
        Testa o endpoint de listagem de imóveis.
        """
        self.client.get("/api/imoveis", headers=self.headers, name="/api/imoveis")

    @task(1)
    def get_alugueis(self):
        """
        Testa o endpoint de listagem de aluguéis.
        """
        # Simula a busca por um período aleatório
        mes = random.randint(1, 12)
        ano = random.randint(2022, 2024)
        self.client.get(f"/api/alugueis?mes={mes}&ano={ano}", headers=self.headers, name="/api/alugueis?mes=[mes]&ano=[ano]")

    @task(1)
    def get_dashboard_stats(self):
        """
        Testa o endpoint do dashboard.
        """
        self.client.get("/api/dashboard/estatisticas-gerais", headers=self.headers, name="/api/dashboard/estatisticas-gerais")

# Para executar este teste:
# 1. Certifique-se de que o servidor backend está rodando.
# 2. No terminal, navegue até o diretório 'testes/performance'.
# 3. Execute o comando:
#    locust -f locustfile.py --host http://127.0.0.1:8000
# 4. Abra o navegador em http://localhost:8089 para iniciar o teste de carga.