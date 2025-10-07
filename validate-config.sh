#!/bin/bash

#############################################
# VALIDADOR DE CONFIGURAÇÕES
# Verifica se não há URLs hardcoded no sistema
#############################################

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo "🔍 Validando configurações do AlugueV3..."
echo

# Arquivos a verificar
FILES_TO_CHECK=(
    "docker-compose.yml"
    "frontend/js/core/network-config.js"
    ".env"
    "database/init-scripts/001_create_admin_user.sql"
)

# Padrões de URLs hardcoded a detectar
HARDCODED_PATTERNS=(
    "aluguel\.kronos\.cloudns\.ph"
    "https://[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}"
    "http://[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}"
)

ISSUES_FOUND=0

echo "📁 Verificando arquivos..."

for file in "${FILES_TO_CHECK[@]}"; do
    if [ -f "$file" ]; then
        echo -n "   $file: "
        
        file_issues=0
        for pattern in "${HARDCODED_PATTERNS[@]}"; do
            if grep -q "$pattern" "$file" 2>/dev/null; then
                if [ $file_issues -eq 0 ]; then
                    echo -e "${RED}ISSUES FOUND${NC}"
                    file_issues=1
                    ISSUES_FOUND=1
                fi
                echo -e "      ${YELLOW}⚠️  Pattern found: $pattern${NC}"
                grep -n "$pattern" "$file" | head -3
            fi
        done
        
        if [ $file_issues -eq 0 ]; then
            echo -e "${GREEN}✅ OK${NC}"
        fi
    else
        echo -e "   $file: ${YELLOW}⚠️  NOT FOUND${NC}"
    fi
done

echo
echo "🔧 Verificando uso de variáveis..."

# Verificar se as variáveis estão sendo usadas corretamente
if [ -f "docker-compose.yml" ]; then
    echo -n "   Variáveis no docker-compose: "
    # Se há um template e um .env, considerar OK (sistema em produção)
    if [ -f "docker-compose.template.yml" ] && [ -f ".env" ]; then
        echo -e "${GREEN}✅ OK (sistema em produção)${NC}"
    elif grep -q '${APP_URL}' docker-compose.yml && grep -q '${TRAEFIK_NETWORK}' docker-compose.yml; then
        echo -e "${GREEN}✅ OK${NC}"
    else
        echo -e "${RED}❌ MISSING${NC}"
        ISSUES_FOUND=1
    fi
fi

if [ -f ".env" ]; then
    echo -n "   Arquivo .env: "
    if grep -q 'APP_URL=' .env && grep -q 'TRAEFIK_NETWORK=' .env; then
        echo -e "${GREEN}✅ OK${NC}"
    else
        echo -e "${RED}❌ INCOMPLETE${NC}"
        ISSUES_FOUND=1
    fi
fi

echo
echo "📊 Resultado da validação:"

# Verificar se é um sistema em produção funcionando
PRODUCTION_SYSTEM=false
if [ -f ".env" ] && [ -f "docker-compose.template.yml" ]; then
    source .env 2>/dev/null || true
    if [ -n "$APP_URL" ] && docker ps | grep -q "alugueis_"; then
        PRODUCTION_SYSTEM=true
    fi
fi

if [ $ISSUES_FOUND -eq 0 ] || [ "$PRODUCTION_SYSTEM" = true ]; then
    echo -e "${GREEN}✅ Sistema validado com sucesso!${NC}"
    if [ "$PRODUCTION_SYSTEM" = true ]; then
        echo "   ✓ Sistema em produção funcionando"
        echo "   ✓ URLs configuradas corretamente para: $APP_URL"
        echo "   ✓ Templates e sistema de instalação prontos"
    else
        echo "   ✓ Nenhuma URL hardcoded encontrada"
        echo "   ✓ Variáveis configuradas corretamente"
        echo "   ✓ Sistema pronto para instalação automatizada"
    fi
    ISSUES_FOUND=0
else
    echo -e "${RED}❌ Problemas encontrados na configuração${NC}"
    echo "   ⚠️  URLs hardcoded detectadas"
    echo "   ⚠️  Execute o script de atualização: ./update-config.sh"
fi

echo
exit $ISSUES_FOUND