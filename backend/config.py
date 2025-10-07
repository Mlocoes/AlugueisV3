"""
Configuração da aplicação FastAPI - Sistema de Gestão de Aluguéis V2
"""
import os
import tempfile
import atexit
import shutil
from dotenv import load_dotenv
load_dotenv()
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# Configurações de ambiente
ENV = os.getenv("ENV", "development").lower()

# Configuração do banco de dados
# Modificado para usar SQLite para testes locais sem Docker
DATABASE_URL = "sqlite:///./alugueis.db"

# SQLAlchemy setup
engine = create_engine(
    DATABASE_URL,
    # O check_same_thread é necessário apenas para SQLite
    connect_args={"check_same_thread": False},
    pool_pre_ping=True
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# Dependency para obter sessão do banco
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# Configuração da aplicação FastAPI
APP_CONFIG = {
    "title": "Sistema de Gestão de Aluguéis V2",
    "description": "API para gestão de aluguéis, proprietários e imóveis - Versão 2",
    "version": "2.0.0",
    "docs_url": "/docs",
    "redoc_url": "/redoc"
}

import logging
# Configuração CORS mais segura - SEM WILDCARD por padrão
raw_origins = os.getenv("CORS_ALLOW_ORIGINS", "http://localhost:3000,http://127.0.0.1:3000,http://zeus.kronos.cloudns.ph:3000")

# Em produção, forçar origens específicas e não aceitar wildcard
if ENV == "production":
    if "*" in raw_origins or not raw_origins.strip():
        logging.warning("[CORS] AVISO: Usando CORS permissivo em produção! Configure CORS_ALLOW_ORIGINS com origens específicas.")
        ALLOW_ORIGINS = ["http://localhost:3000"]  # Fallback seguro
    else:
        ALLOW_ORIGINS = [origin.strip() for origin in raw_origins.split(",") if origin.strip()]
else:
    # Desenvolvimento - permitir localhost
    ALLOW_ORIGINS = [origin.strip() for origin in raw_origins.split(",") if origin.strip()]

logging.basicConfig(level=logging.INFO)
logging.info(f"[CORS] Ambiente: {ENV}")
logging.info(f"[CORS] ALLOW_ORIGINS: {ALLOW_ORIGINS}")

# Controlar credenciais por variável (padrão: true se usar cookies, false se wildcard)
if os.getenv("CORS_ALLOW_CREDENTIALS") is not None:
    allow_credentials_effective = os.getenv("CORS_ALLOW_CREDENTIALS", "false").lower() == "true"
else:
    # Permitir credentials por padrão, já que o sistema usa autenticação baseada em cookies
    allow_credentials_effective = True

# Se wildcard for usado, não permitir credenciais (requisito do navegador)
if "*" in ALLOW_ORIGINS:
    allow_credentials_effective = False
    logging.warning("[CORS] AVISO: Wildcard detectado - credentials desabilitadas")

CORS_CONFIG = {
    "allow_origins": ALLOW_ORIGINS,
    "allow_credentials": allow_credentials_effective,
    "allow_methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    "allow_headers": ["Authorization", "Content-Type", "Accept", "Origin", "X-Requested-With", "X-CSRF-Token"]
}

# Configurações de segredo e debug
SECRET_KEY = os.getenv("SECRET_KEY")

# Forçar SECRET_KEY a ser definido em todos os ambientes
if not SECRET_KEY:
    raise RuntimeError("SECRET_KEY deve ser definido no ambiente")

# DEBUG é falso por padrão. Para habilitar, defina a variável de ambiente DEBUG="true"
DEBUG = os.getenv("DEBUG", "false").lower() == "true"

# Configurações de upload seguras com tempfile
UPLOAD_DIR = tempfile.mkdtemp(prefix="alugueis_uploads_")
STORAGE_DIR = tempfile.mkdtemp(prefix="alugueis_storage_")

def cleanup_temp_dirs():
    """Remove os diretórios temporários criados."""
    shutil.rmtree(UPLOAD_DIR, ignore_errors=True)
    shutil.rmtree(STORAGE_DIR, ignore_errors=True)

atexit.register(cleanup_temp_dirs)
