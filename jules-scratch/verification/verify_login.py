from playwright.sync_api import sync_playwright, Page, expect
import re

# --- Configurações ---
BASE_URL = "http://127.0.0.1:3001"
ADMIN_USERNAME = "admin"
ADMIN_PASSWORD = "admin00"
SCREENSHOT_PATH = "jules-scratch/verification/verification.png"

def run_verification(page: Page):
    """
    Executa a verificação de login e captura a tela do dashboard.
    """
    print("Iniciando verificação do frontend...")

    # 1. Acessar a página de login
    print(f"Navegando para {BASE_URL}...")
    page.goto(BASE_URL)

    # 2. Verificar se a página de login está visível
    expect(page.locator('h4:has-text("Sistema de Aluguéis")')).to_be_visible(timeout=10000)
    print("Página de login carregada.")

    # 3. Preencher o formulário de login
    print("Preenchendo credenciais...")
    page.fill("input#login-usuario", ADMIN_USERNAME)
    page.fill("input#login-senha", ADMIN_PASSWORD)

    # 4. Clicar no botão de login
    print("Realizando login...")
    page.click("button#login-submit")

    # 5. Verificar se o login foi bem-sucedido e o dashboard está visível
    print("Verificando o dashboard...")
    dashboard_title = page.locator("#page-title")
    expect(dashboard_title).to_have_text("Dashboard", timeout=15000)

    user_info = page.locator("div#header-user-info")
    expect(user_info).to_be_visible()
    print("Login bem-sucedido. Dashboard visível.")

    # 6. Tirar a screenshot da página principal
    print(f"Capturando tela e salvando em {SCREENSHOT_PATH}...")
    page.screenshot(path=SCREENSHOT_PATH)
    print("Screenshot capturada com sucesso.")

def main():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        try:
            run_verification(page)
        except Exception as e:
            print(f"Ocorreu um erro durante a verificação: {e}")
        finally:
            browser.close()

if __name__ == "__main__":
    main()