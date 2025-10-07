#!/bin/bash

#############################################
# SCRIPT DE ATUALIZAÇÃO DE CONFIGURAÇÕES
# AlugueV3 - Sistema de Gestão de Aluguéis
#############################################

set -e

# Cores
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

# Verificar se o arquivo .env existe
if [ ! -f .env ]; then
    echo "Arquivo .env não encontrado!"
    echo "Execute primeiro: ./install.sh"
    exit 1
fi

# Carregar variáveis do .env
source .env

echo "Atualizando configurações com base no .env..."

# Atualizar docker-compose.yml com base no template
if [ -f docker-compose.template.yml ]; then
    log_info "Gerando docker-compose.yml atualizado..."
    # Exportar variáveis para envsubst
    export APP_URL TRAEFIK_NETWORK POSTGRES_DB POSTGRES_USER POSTGRES_PASSWORD DATABASE_URL
    export SECRET_KEY CSRF_SECRET_KEY DEBUG CORS_ALLOW_CREDENTIALS
    envsubst < docker-compose.template.yml > docker-compose.yml
    log_success "docker-compose.yml atualizado"
fi

# Atualizar network-config.js
if [ -n "$APP_URL" ]; then
    log_info "Atualizando configuração do frontend..."
    
    # Criar backup
    cp frontend/js/core/network-config.js frontend/js/core/network-config.js.backup
    
    # Atualizar URL específica se ainda estiver hardcoded
    sed -i "s|https://aluguel\.kronos\.cloudns\.ph|https://$APP_URL|g" frontend/js/core/network-config.js
    sed -i "s|http://aluguel\.kronos\.cloudns\.ph|https://$APP_URL|g" frontend/js/core/network-config.js
    
    log_success "Configuração do frontend atualizada"
fi

# Atualizar script de criação do admin se necessário
if [ -n "$ADMIN_USER" ] && [ -n "$ADMIN_PASS" ]; then
    log_info "Atualizando script de criação do usuário admin..."
    
    cat > database/init-scripts/001_create_admin_user.sql << EOF
-- CRIAR USUÁRIO ADMIN AUTOMATICAMENTE
-- Gerado automaticamente durante a instalação

-- Inserir usuário administrador
INSERT INTO usuarios (usuario, senha, tipo_de_usuario) 
SELECT '$ADMIN_USER', 'TEMP_HASH_TO_UPDATE', 'administrador'
WHERE NOT EXISTS (
    SELECT 1 FROM usuarios WHERE usuario = '$ADMIN_USER'
);

-- Confirmar criação
DO \$\$
BEGIN
    IF EXISTS (SELECT 1 FROM usuarios WHERE usuario = '$ADMIN_USER') THEN
        RAISE NOTICE 'Usuário $ADMIN_USER criado com sucesso!';
    ELSE
        RAISE NOTICE 'Falha ao criar usuário $ADMIN_USER!';
    END IF;
END \$\$;
EOF
    
    log_success "Script do usuário admin atualizado"
fi

log_success "Todas as configurações foram atualizadas!"
echo
echo "Para aplicar as mudanças:"
echo "  docker-compose down"
echo "  docker-compose up -d"