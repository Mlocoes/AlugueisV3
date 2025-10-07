import os
import sys
from passlib.context import CryptContext

# Adiciona o diretório do backend ao path para que possamos importar os módulos
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'backend')))

from config import SessionLocal, engine
from models_final import Usuario

# --- Configurações ---
ADMIN_USER = "admin"
ADMIN_PASS = "admin00"

# Contexto para hash de senhas
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def create_admin_user():
    """
    Cria o usuário administrador no banco de dados SQLite se ele não existir.
    """
    db = SessionLocal()
    try:
        # Verificar se o usuário já existe
        existing_user = db.query(Usuario).filter(Usuario.usuario == ADMIN_USER).first()
        if existing_user:
            print(f"✅ Usuário '{ADMIN_USER}' já existe. Nenhuma ação necessária.")
            return

        # Criar o novo usuário administrador
        hashed_password = pwd_context.hash(ADMIN_PASS)
        admin_user = Usuario(
            usuario=ADMIN_USER,
            senha=hashed_password,
            tipo_de_usuario='administrador'
        )
        db.add(admin_user)
        db.commit()
        print(f"✅ Usuário administrador '{ADMIN_USER}' criado com sucesso!")

    except Exception as e:
        print(f"🚨 Erro ao criar usuário administrador: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    print("Iniciando a configuração do usuário administrador...")
    # Define uma chave secreta dummy para a importação de config não falhar
    os.environ['SECRET_KEY'] = 'dummy-key-for-script'
    create_admin_user()
    print("Configuração finalizada.")