import re
import pytest
from playwright.sync_api import Page, expect

# Define as credenciais de admin
ADMIN_USERNAME = "admin"
ADMIN_PASSWORD = "admin00"

# URL base da aplicação frontend
BASE_URL = "http://127.0.0.1:3001"

@pytest.fixture(scope="module", autouse=True)
def run_servers():
    """
    Fixture para garantir que os servidores backend e frontend estejam rodando.
    """
    # Em um ambiente de CI/CD real, os servidores seriam iniciados aqui.
    # Para este contexto, os servidores são iniciados manualmente antes dos testes.
    yield

def test_fluxo_completo_de_navegacao(page: Page):
    """
    Testa o fluxo completo de um usuário: login, navegação por todas as
    seções principais e, finalmente, logout.
    """
    # 1. Acessar a página de login
    page.goto(f"{BASE_URL}/index.html")

    # 2. Verificar se está na página de login
    expect(page.locator('h4:has-text("Sistema de Aluguéis")')).to_be_visible(timeout=10000)

    # 3. Preencher o formulário de login
    page.fill("input#login-usuario", ADMIN_USERNAME)
    page.fill("input#login-senha", ADMIN_PASSWORD)

    # 4. Clicar no botão de login
    page.click("button#login-submit")

    # 5. Verificar se o login foi bem-sucedido
    user_info = page.locator("div#header-user-info")
    expect(user_info).to_be_visible(timeout=15000) # Aumentar timeout para dar tempo da app carregar
    expect(user_info).to_have_text(re.compile(r"admin", re.IGNORECASE))
    print("✅ Login realizado com sucesso.")

    # 6. Navegar pelas seções principais
    secoes = {
        "dashboard": "Dashboard",
        "proprietarios": "Proprietários",
        "imoveis": "Imóveis",
        "alugueis": "Aluguéis",
        "participacoes": "Participações",
        "relatorios": "Relatórios",
    }

    for view_id, titulo_esperado in secoes.items():
        print(f"Navegando para: {titulo_esperado}...")
        # Clicar no link de navegação
        page.click(f"a[data-view='{view_id}']")

        # Verificar se o título da página foi atualizado
        titulo_pagina = page.locator("#page-title")
        expect(titulo_pagina).to_have_text(titulo_esperado, timeout=10000)
        print(f"✅ Navegou com sucesso para: {titulo_esperado}")

    # 7. Realizar o logout
    print("Realizando logout...")
    page.click("button#logout-btn")

    # 8. Verificar se o logout foi bem-sucedido
    expect(page.locator("#login-screen")).to_be_visible(timeout=10000)
    print("✅ Logout realizado com sucesso.")