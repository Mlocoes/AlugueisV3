#!/bin/bash

#############################################
# INSTALAÇÃO AUTOMATIZADA - AlugueV3
# Sistema de Gestão de Aluguéis V3
# Versão: 3.0.0
#############################################

set -e

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Funções auxiliares
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Banner
echo -e "${BLUE}"
echo "╔══════════════════════════════════════════════════════════╗"
echo "║                 AlugueV3 - Instalação                   ║"
echo "║              Sistema de Gestão de Aluguéis              ║"
echo "║                      Versão 3.0                         ║"
echo "╚══════════════════════════════════════════════════════════╝"
echo -e "${NC}"

# Verificações iniciais
log_info "Verificando pré-requisitos..."

# Verificar Docker
if ! command -v docker &> /dev/null; then
    log_error "Docker não está instalado"
    exit 1
fi

# Verificar Docker Compose
if ! docker compose version &> /dev/null; then
    log_error "Docker Compose (docker compose) não está instalado ou não funciona."
    exit 1
fi

log_success "Pré-requisitos verificados"

# Detectar rede Traefik automaticamente
log_info "Detectando configuração Traefik..."

TRAEFIK_NETWORK=""
TRAEFIK_NETWORKS=$(docker network ls --format "{{.Name}}" | grep -E "(traefik|proxy)" | head -1)

if [ -n "$TRAEFIK_NETWORKS" ]; then
    TRAEFIK_NETWORK="$TRAEFIK_NETWORKS"
    log_success "Rede Traefik detectada: $TRAEFIK_NETWORK"
else
    # Tentar detectar redes externas
    EXTERNAL_NETWORKS=$(docker network ls --filter "driver=bridge" --format "{{.Name}}" | grep -v bridge | grep -v host | head -1)
    if [ -n "$EXTERNAL_NETWORKS" ]; then
        echo
        log_warning "Nenhuma rede Traefik encontrada automaticamente"
        echo "Redes disponíveis:"
        docker network ls --format "table {{.Name}}\t{{.Driver}}\t{{.Scope}}"
        echo
        read -p "Digite o nome da rede do Traefik (padrão: kronos-net): " user_network
        TRAEFIK_NETWORK=${user_network:-kronos-net}
    else
        TRAEFIK_NETWORK="kronos-net"
        log_warning "Usando rede padrão: $TRAEFIK_NETWORK"
    fi
fi

# Detectar configuração existente
EXISTING_CONFIG=false
if [ -f .env ]; then
    log_info "Configuração existente detectada..."
    source .env 2>/dev/null || true
    
    if [ -n "$APP_URL" ] && [ -n "$POSTGRES_USER" ]; then
        log_success "Configuração válida encontrada"
        echo "   🌐 URL atual: $APP_URL"
        echo "   🗄️  BD User: $POSTGRES_USER"
        echo "   👤 Admin: ${ADMIN_USER:-admin}"
        echo
        read -p "Usar configuração existente? (S/n): " use_existing
        if [[ $use_existing =~ ^[Nn]$ ]]; then
            log_info "Configuração será recriada"
        else
            EXISTING_CONFIG=true
            log_success "Usando configuração existente"
        fi
    fi
fi

# Configuração da aplicação
if [ "$EXISTING_CONFIG" = false ]; then
    echo
    log_info "Configuração da aplicação..."

    # URL da aplicação
    read -p "Digite a URL da aplicação (ex: aluguel.exemplo.com): " APP_URL
    while [[ -z "$APP_URL" ]]; do
        log_error "URL é obrigatória"
        read -p "Digite a URL da aplicação (ex: aluguel.exemplo.com): " APP_URL
    done

    # Configuração do usuário admin
    echo
    log_info "Configuração do usuário administrador..."
    read -p "Nome do usuário admin (padrão: admin): " ADMIN_USER
    ADMIN_USER=${ADMIN_USER:-admin}

    # Gerar senha aleatória ou permitir personalização
    ADMIN_PASS_DEFAULT=$(openssl rand -base64 12 | tr -d "=+/" | cut -c1-12)
    read -p "Senha do admin (padrão: $ADMIN_PASS_DEFAULT): " ADMIN_PASS
    ADMIN_PASS=${ADMIN_PASS:-$ADMIN_PASS_DEFAULT}

    # Configuração da base de dados (apenas se não há detecção de credenciais existentes)
    if [ -z "$DB_USER" ]; then
        echo
        log_info "Configuração da base de dados..."
        read -p "Nome da base de dados (padrão: aluguelv3_db): " DB_NAME
        DB_NAME=${DB_NAME:-aluguelv3_db}

        read -p "Usuário da base de dados (padrão: aluguelv3_user): " DB_USER
        DB_USER=${DB_USER:-aluguelv3_user}

        # Gerar senha da BD
        DB_PASS=$(openssl rand -base64 16 | tr -d "=+/" | cut -c1-16)
    else
        log_info "Usando credenciais existentes da base de dados"
    fi

    # Gerar chaves secretas
    SECRET_KEY=$(openssl rand -hex 32)
    CSRF_SECRET_KEY=$(openssl rand -hex 32)
else
    # Usar configuração existente
    APP_URL=${APP_URL}
    ADMIN_USER=${ADMIN_USER:-admin}
    ADMIN_PASS=${ADMIN_PASS:-admin00}
    DB_NAME=${POSTGRES_DB}
    DB_USER=${POSTGRES_USER}
    DB_PASS=${POSTGRES_PASSWORD}
    SECRET_KEY=${SECRET_KEY}
    CSRF_SECRET_KEY=${CSRF_SECRET_KEY}
    
    log_info "Usando configuração existente detectada"
fi

# Resumo da configuração
echo
echo -e "${YELLOW}╔══════════════════════════════════════════════════════════╗${NC}"
echo -e "${YELLOW}║                  RESUMO DA CONFIGURAÇÃO                  ║${NC}"
echo -e "${YELLOW}╚══════════════════════════════════════════════════════════╝${NC}"
echo
echo -e "🌐 URL da Aplicação: ${GREEN}https://$APP_URL${NC}"
echo -e "🔗 Rede Traefik: ${GREEN}$TRAEFIK_NETWORK${NC}"
echo -e "👤 Admin User: ${GREEN}$ADMIN_USER${NC}"
echo -e "🔑 Admin Pass: ${GREEN}$ADMIN_PASS${NC}"
echo -e "🗄️  Database: ${GREEN}$DB_NAME${NC}"
echo -e "👥 DB User: ${GREEN}$DB_USER${NC}"
echo -e "🔐 DB Pass: ${GREEN}$DB_PASS${NC}"
echo

read -p "Confirmar instalação? (s/N): " confirm
if [[ ! $confirm =~ ^[Ss]$ ]]; then
    log_warning "Instalação cancelada"
    exit 0
fi

# Pergunta sobre zerar base de dados
RESET_DATABASE=false
if docker volume ls -q | grep -q "postgres_data"; then
    echo
    log_warning "Base de dados existente detectada!"
    echo -e "   ${YELLOW}⚠️  Atenção: Zerar a base de dados irá remover TODOS os dados existentes${NC}"
    echo -e "   ${YELLOW}   incluindo usuários, propriedades, contratos e históricos${NC}"
    echo
    read -p "Deseja zerar a base de dados? (s/N): " reset_db
    if [[ $reset_db =~ ^[Ss]$ ]]; then
        RESET_DATABASE=true
        log_warning "Base de dados será ZERADA durante a instalação"
    else
        RESET_DATABASE=false
        log_info "Base de dados existente será PRESERVADA"
        
        # Detectar credenciais existentes do container
        log_info "Detectando credenciais existentes da base de dados..."
        if docker ps -q -f name=alugueis_postgres | grep -q .; then
            EXISTING_DB_USER=$(docker inspect alugueis_postgres 2>/dev/null | grep -o '"POSTGRES_USER=[^"]*"' | cut -d'=' -f2 | tr -d '"' | head -1)
            EXISTING_DB_PASS=$(docker inspect alugueis_postgres 2>/dev/null | grep -o '"POSTGRES_PASSWORD=[^"]*"' | cut -d'=' -f2 | tr -d '"' | head -1)
            EXISTING_DB_NAME=$(docker inspect alugueis_postgres 2>/dev/null | grep -o '"POSTGRES_DB=[^"]*"' | cut -d'=' -f2 | tr -d '"' | head -1)
            
            if [ -n "$EXISTING_DB_USER" ] && [ -n "$EXISTING_DB_PASS" ]; then
                DB_USER="$EXISTING_DB_USER"
                DB_PASS="$EXISTING_DB_PASS"
                DB_NAME="${EXISTING_DB_NAME:-$DB_NAME}"
                log_success "Credenciais existentes detectadas:"
                echo -e "   👥 Usuário: ${GREEN}$DB_USER${NC}"
                echo -e "   🗄️  Base: ${GREEN}$DB_NAME${NC}"
            fi
        fi
    fi
fi

# Começar instalação
echo
log_info "Iniciando instalação..."

# Parar serviços existentes se estiverem rodando
if docker compose ps -q | grep -q .; then
    log_info "Parando serviços existentes..."
    docker compose down
fi

# Remover volume da base de dados baseado na escolha do usuário
if [ "$RESET_DATABASE" = true ] && docker volume ls -q | grep -q "postgres_data"; then
    log_info "Removendo dados da base de dados conforme solicitado..."
    docker volume rm $(docker volume ls -q | grep postgres_data) 2>/dev/null || true
    log_warning "Base de dados zerada!"
elif docker volume ls -q | grep -q "postgres_data"; then
    log_info "Preservando dados existentes da base de dados..."
fi

# Criar ou atualizar arquivo .env
if [ "$EXISTING_CONFIG" = false ]; then
    log_info "Criando arquivo de configuração .env..."
    cat > .env << EOF
# Configuração da Base de Dados
POSTGRES_DB=$DB_NAME
POSTGRES_USER=$DB_USER
POSTGRES_PASSWORD=$DB_PASS
DATABASE_URL=postgresql://$DB_USER:$DB_PASS@alugueis_postgres:5432/$DB_NAME

# Configuração do Usuário Admin
ADMIN_USER=$ADMIN_USER
ADMIN_PASS=$ADMIN_PASS

# Chaves de Segurança
SECRET_KEY=$SECRET_KEY
CSRF_SECRET_KEY=$CSRF_SECRET_KEY

# Configuração da Aplicação
APP_URL=$APP_URL
FRONTEND_DOMAIN=$APP_URL
BACKEND_DOMAIN=$APP_URL
TRAEFIK_NETWORK=$TRAEFIK_NETWORK

# Configuração CORS
CORS_ALLOW_CREDENTIALS=true
CORS_ALLOW_ORIGINS=https://$APP_URL
DEBUG=false

# SSL/TLS
SSL_ENABLED=true
EOF
else
    log_info "Usando arquivo .env existente..."
fi

# Atualizar network-config.js
log_info "Configurando frontend..."
sed -i "s|https://.*\..*\..*|https://\${APP_URL}|g" frontend/js/core/network-config.js
sed -i "s|return \`https://.*\`;|return \`https://$APP_URL\`;|g" frontend/js/core/network-config.js

# Atualizar script de criação do usuário admin
log_info "Configurando usuário administrador..."
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

# Iniciar serviços
log_info "Iniciando serviços..."
docker compose up -d

# Aguardar serviços ficarem prontos
log_info "Aguardando serviços ficarem prontos..."
sleep 30

# Verificar se o banco está pronto
log_info "Verificando base de dados..."
max_attempts=30
attempt=0
while [ $attempt -lt $max_attempts ]; do
    if docker exec alugueis_postgres pg_isready -U $DB_USER -d $DB_NAME > /dev/null 2>&1; then
        break
    fi
    sleep 2
    ((attempt++))
done

if [ $attempt -eq $max_attempts ]; then
    log_error "Timeout aguardando base de dados"
    exit 1
fi

log_success "Base de dados pronta"

# Gerar hash da senha do admin
log_info "Configurando senha do administrador..."
ADMIN_HASH=$(docker exec alugueis_backend python -c "
from routers.auth import get_password_hash
print(get_password_hash('$ADMIN_PASS'))
" 2>/dev/null | tail -1)

# Verificar se usuário admin já existe
USER_EXISTS=$(docker exec alugueis_postgres psql -h localhost -U $DB_USER -d $DB_NAME -t -c "SELECT COUNT(*) FROM usuarios WHERE usuario = '$ADMIN_USER';" 2>/dev/null | tr -d ' ')

if [ "$USER_EXISTS" = "1" ]; then
    if [ "$RESET_DATABASE" = false ]; then
        log_info "Usuário admin '$ADMIN_USER' já existe - atualizando apenas a senha..."
        docker exec alugueis_postgres psql -h localhost -U $DB_USER -d $DB_NAME -c "
        UPDATE usuarios SET senha = '$ADMIN_HASH' WHERE usuario = '$ADMIN_USER';
        " > /dev/null
        log_success "Senha do admin atualizada"
    else
        log_info "Criando usuário admin '$ADMIN_USER' (base zerada)..."
        docker exec alugueis_postgres psql -h localhost -U $DB_USER -d $DB_NAME -c "
        INSERT INTO usuarios (usuario, senha, tipo_de_usuario) 
        VALUES ('$ADMIN_USER', '$ADMIN_HASH', 'administrador');
        " > /dev/null
        log_success "Usuário admin criado"
    fi
else
    log_info "Criando usuário admin '$ADMIN_USER'..."
    docker exec alugueis_postgres psql -h localhost -U $DB_USER -d $DB_NAME -c "
    INSERT INTO usuarios (usuario, senha, tipo_de_usuario) 
    VALUES ('$ADMIN_USER', '$ADMIN_HASH', 'administrador');
    " > /dev/null
    log_success "Usuário admin criado com sucesso"
fi

# Verificar se a aplicação está funcionando
log_info "Verificando aplicação..."
sleep 10

if curl -s -f "https://$APP_URL/api/health" > /dev/null; then
    log_success "API funcionando"
else
    log_warning "API pode não estar totalmente pronta ainda"
fi

if curl -s -f "https://$APP_URL/" > /dev/null; then
    log_success "Frontend funcionando"
else
    log_warning "Frontend pode não estar totalmente pronto ainda"
fi

# Instalação concluída
echo
echo -e "${GREEN}╔══════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║                 INSTALAÇÃO CONCLUÍDA!                    ║${NC}"
echo -e "${GREEN}╚══════════════════════════════════════════════════════════╝${NC}"
echo
echo -e "🎉 AlugueV3 instalado com sucesso!"
echo
echo -e "${BLUE}📋 INFORMAÇÕES DE ACESSO:${NC}"
echo -e "   🌐 URL: ${GREEN}https://$APP_URL${NC}"
echo -e "   👤 Usuário: ${GREEN}$ADMIN_USER${NC}"
echo -e "   🔑 Senha: ${GREEN}$ADMIN_PASS${NC}"
echo
echo -e "${BLUE}🗄️  STATUS DA BASE DE DADOS:${NC}"
if [ "$RESET_DATABASE" = true ]; then
    echo -e "   💥 Base de dados: ${YELLOW}ZERADA${NC} (dados anteriores removidos)"
    echo -e "   ✨ Estado: ${GREEN}Nova instalação limpa${NC}"
else
    echo -e "   💾 Base de dados: ${GREEN}PRESERVADA${NC} (dados anteriores mantidos)"
    echo -e "   🔄 Admin: ${GREEN}Senha atualizada${NC}"
fi
echo
echo -e "${BLUE}🔧 COMANDOS ÚTEIS:${NC}"
echo -e "   Ver logs: ${YELLOW}docker compose logs -f${NC}"
echo -e "   Parar: ${YELLOW}docker compose down${NC}"
echo -e "   Reiniciar: ${YELLOW}docker compose restart${NC}"
echo
echo -e "${BLUE}📊 MONITORAMENTO:${NC}"
echo -e "   API Health: ${YELLOW}https://$APP_URL/api/health${NC}"
echo -e "   Adminer: Acesso apenas interno"
echo

log_success "Instalação finalizada!"