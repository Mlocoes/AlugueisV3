import pytest
import requests
import random
import string
import re

# --- Configurações do Teste ---
BASE_URL = "http://127.0.0.1:8000/api"
ADMIN_USERNAME = "admin"
ADMIN_PASSWORD = "admin00"

def get_auth_token():
    """Obtém um token de autenticação JWT para o usuário admin."""
    login_data = {
        "usuario": ADMIN_USERNAME,
        "senha": ADMIN_PASSWORD
    }
    response = requests.post(f"{BASE_URL}/auth/login", json=login_data)
    response.raise_for_status()  # Lança exceção se o login falhar
    return response.json()["access_token"]

@pytest.fixture(scope="module")
def auth_headers():
    """Fixture do Pytest que fornece os headers de autenticação para os testes."""
    token = get_auth_token()
    return {"Authorization": f"Bearer {token}"}

def random_string(length=10):
    """Gera uma string aleatória para nomes únicos."""
    return ''.join(random.choice(string.ascii_lowercase) for i in range(length))

def test_crud_proprietario(auth_headers):
    """
    Testa o ciclo completo de CRUD (Create, Read, Update, Delete) para um proprietário,
    verificando a consistência dos dados em cada etapa.
    """
    # Dados do novo proprietário
    nome_proprietario = f"Teste_{random_string()}"
    documento_original = f"{random.randint(100, 999)}.{random.randint(100, 999)}.{random.randint(100, 999)}-{random.randint(10, 99)}"
    telefone_original = "(11) 98765-4321"

    novo_proprietario_data = {
        "nome": nome_proprietario,
        "documento": documento_original,
        "email": f"{nome_proprietario}@teste.com",
        "telefone": telefone_original,
        "banco": "Banco Teste",
        "agencia": "0001",
        "conta": "12345-6",
        "observacoes": "Proprietário de teste criado via API."
    }

    # 1. CREATE: Criar um novo proprietário
    print(f"\n1. Criando proprietário: {nome_proprietario}")
    response = requests.post(f"{BASE_URL}/proprietarios", json=novo_proprietario_data, headers=auth_headers)
    assert response.status_code == 201, f"Falha ao criar proprietário: {response.text}"
    created_proprietario = response.json()
    proprietario_id = created_proprietario["id"]
    print(f"   Proprietário criado com ID: {proprietario_id}")

    # Verificar se os dados criados são consistentes, levando em conta a limpeza de dados
    cleaned_documento = re.sub(r'\D', '', documento_original)
    cleaned_telefone = re.sub(r'\D', '', telefone_original)

    assert created_proprietario.get("nome") == novo_proprietario_data["nome"]
    assert created_proprietario.get("documento") == cleaned_documento
    assert created_proprietario.get("telefone") == cleaned_telefone
    assert created_proprietario.get("email") == novo_proprietario_data["email"]
    assert created_proprietario.get("banco") == novo_proprietario_data["banco"]

    # 2. READ: Ler o proprietário recém-criado
    print(f"\n2. Lendo proprietário ID: {proprietario_id}")
    response = requests.get(f"{BASE_URL}/proprietarios/{proprietario_id}", headers=auth_headers)
    assert response.status_code == 200, f"Falha ao ler proprietário: {response.text}"
    read_proprietario = response.json()

    # Verificar se os dados lidos são consistentes com os dados criados
    assert read_proprietario["id"] == proprietario_id
    assert read_proprietario["nome"] == nome_proprietario
    assert read_proprietario["documento"] == cleaned_documento
    print("   Dados lidos são consistentes.")

    # 3. UPDATE: Atualizar o nome e email do proprietário
    nome_atualizado = f"Teste_Atualizado_{random_string()}"
    dados_atualizacao = {"nome": nome_atualizado, "email": f"{nome_atualizado}@teste.com"}
    print(f"\n3. Atualizando proprietário ID: {proprietario_id} com nome: {nome_atualizado}")

    response = requests.put(f"{BASE_URL}/proprietarios/{proprietario_id}", json=dados_atualizacao, headers=auth_headers)
    assert response.status_code == 200, f"Falha ao atualizar proprietário: {response.text}"
    updated_proprietario = response.json()

    # Verificar se a atualização foi bem-sucedida
    assert updated_proprietario["nome"] == nome_atualizado
    assert updated_proprietario["email"] == f"{nome_atualizado}@teste.com"
    print("   Proprietário atualizado com sucesso.")

    # 4. DELETE: Excluir o proprietário
    print(f"\n4. Excluindo proprietário ID: {proprietario_id}")
    response = requests.delete(f"{BASE_URL}/proprietarios/{proprietario_id}", headers=auth_headers)
    assert response.status_code == 200, f"Falha ao excluir proprietário: {response.text}"
    assert "Proprietário excluído com sucesso" in response.json()["mensagem"]
    print("   Proprietário excluído com sucesso.")

    # 5. VERIFY DELETION: Tentar ler o proprietário excluído
    print(f"\n5. Verificando a exclusão do proprietário ID: {proprietario_id}")
    response = requests.get(f"{BASE_URL}/proprietarios/{proprietario_id}", headers=auth_headers)
    assert response.status_code == 404, "O proprietário não foi excluído corretamente (ainda foi encontrado)."
    print("   Verificação de exclusão confirmada (HTTP 404).")
    print("\n✅ Teste de consistência de valores para Proprietário concluído com sucesso!")