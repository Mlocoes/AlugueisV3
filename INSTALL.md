# 🏠 AlugueV3 - Instalação Automatizada

Sistema de Gestão de Aluguéis com instalação completamente automatizada.

## 🚀 Instalação Rápida

```bash
# 1. Clonar o repositório
git clone <repo-url> AlugueV3
cd AlugueV3

# 2. Executar instalação automatizada
chmod +x install.sh
./install.sh
```

## 📋 Pré-requisitos

- Docker >= 20.10
- Docker Compose >= 1.29
- Traefik funcionando (será detectado automaticamente)
- Acesso root/sudo

## ⚙️ O que a instalação faz automaticamente

### 🔍 **Detecção Automática**
- Detecta redes Traefik existentes
- Identifica configurações de proxy reverso
- Verifica pré-requisitos do sistema

### 🛠️ **Configuração Inteligente**
- Gera senhas seguras automaticamente
- Cria chaves de criptografia únicas
- Configura CORS e SSL automaticamente
- Atualiza todas as URLs no sistema

### 🗄️ **Base de Dados Inteligente**
- **Controle total**: Escolha preservar ou zerar dados existentes
- **Backup automático**: Aviso antes de remover dados
- Cria estrutura PostgreSQL completa
- Executa scripts de inicialização
- Cria/atualiza usuário administrador automaticamente
- Configura conexões seguras

### 🔐 **Segurança**
- Senhas hasheadas com bcrypt
- Chaves JWT seguras
- Configuração SSL/TLS automática
- Certificados Let's Encrypt

## 📝 Configurações Solicitadas

Durante a instalação, você será questionado sobre:

1. **URL da Aplicação** (ex: aluguel.exemplo.com)
2. **Usuário Admin** (padrão: admin)
3. **Senha Admin** (gerada automaticamente ou personalizada)
4. **Nome da Base de Dados** (padrão: aluguelv3_db)
5. **Usuário da BD** (padrão: aluguelv3_user)
6. **Rede Traefik** (detectada automaticamente)
7. **🆕 Gestão da BD**: Preservar dados existentes ou zerar completamente

## 🌐 Após a Instalação

### ✅ **Acesso ao Sistema**
- **Frontend**: `https://sua-url.com`
- **API**: `https://sua-url.com/api/`
- **Health Check**: `https://sua-url.com/api/health`

### 📊 **Monitoramento**
```bash
# Ver logs
docker-compose logs -f

# Status dos serviços
docker-compose ps

# Verificar saúde da API
curl https://sua-url.com/api/health
```

### 🔧 **Gestão**
```bash
# Parar serviços
docker-compose down

# Reiniciar serviços
docker-compose restart

# Atualizar configurações
./update-config.sh
```

## 📁 Estrutura dos Arquivos

```
AlugueV3/
├── install.sh                 # Script de instalação
├── update-config.sh           # Atualizar configurações
├── docker-compose.yml         # Configuração gerada
├── docker-compose.template.yml # Template base
├── .env                       # Configurações geradas
├── .env.example              # Exemplo de configuração
├── database/
│   └── init-scripts/         # Scripts de inicialização da BD
├── frontend/
│   └── js/core/
│       └── network-config.js # Configuração automática de URLs
└── backend/                  # API FastAPI
```

## �️ Gestão da Base de Dados

### ✅ **Preservar Dados (Recomendado)**
```bash
./install.sh
# Quando perguntado "Deseja zerar a base de dados? (s/N):"
# Responder "N" ou apenas pressionar Enter
```
- ✅ **Dados mantidos**: Todos os registros preservados
- ✅ **Usuários intactos**: Logins existentes continuam funcionando  
- ✅ **Admin atualizado**: Apenas senha do admin é renovada

### 💥 **Zerar Base de Dados (Nova Instalação)**
```bash
./install.sh
# Quando perguntado "Deseja zerar a base de dados? (s/N):"
# Responder "s"
```
- ⚠️ **ATENÇÃO**: Remove TODOS os dados existentes
- 🗑️ **Limpeza total**: Base recriada completamente do zero
- 👤 **Admin novo**: Usuário administrador recriado

### 🛡️ **Backup de Segurança**
Sempre recomendado antes de zerar:
```bash
docker exec alugueis_postgres pg_dump -h localhost -U alugueisv3_usuario alugueisv3_db > backup.sql
```

## �🔄 Reinstalação

Para reinstalar completamente:

```bash
# Parar e remover tudo
docker-compose down -v
docker volume prune -f

# Executar instalação novamente
./install.sh
```

## 🆘 Resolução de Problemas

### ❌ **Erro: Traefik não detectado**
```bash
# Verificar redes disponíveis
docker network ls

# Especificar rede manualmente durante a instalação
```

### ❌ **Erro: Porta ocupada**
```bash
# Verificar processos usando a porta
sudo netstat -tlnp | grep :80
sudo netstat -tlnp | grep :443
```

### ❌ **Erro: SSL não funciona**
```bash
# Verificar certificados Traefik
docker logs traefik

# Verificar DNS
nslookup sua-url.com
```

### ❌ **Erro: Base de dados não conecta**
```bash
# Verificar logs da BD
docker-compose logs postgres

# Verificar conectividade
docker exec alugueis_postgres pg_isready -U usuario -d database
```

## 🔐 Segurança

### **Senhas Geradas**
- Usuário admin: senha aleatória de 12 caracteres
- Base de dados: senha aleatória de 16 caracteres
- Chaves JWT: 256 bits de entropia

### **Configurações Seguras**
- Comunicação apenas HTTPS
- Headers de segurança configurados
- CORS restritivo
- Base de dados sem exposição externa

## 📞 Suporte

Para problemas de instalação:

1. Verificar logs: `docker-compose logs`
2. Verificar configuração: `cat .env`
3. Testar conectividade: `curl https://sua-url.com/api/health`
4. Verificar Traefik: `docker logs traefik`

## 🎯 Características

- ✅ Instalação zero-touch
- ✅ Detecção automática de ambiente
- ✅ Configuração inteligente
- ✅ Segurança por padrão
- ✅ Monitoramento integrado
- ✅ Backup automático de configurações
- ✅ Suporte a múltiplos ambientes