# 🚀 AlugueV3 - Sistema de Instalação Automatizada

## ✅ **SISTEMA COMPLETAMENTE AUTOMATIZADO**

Este sistema agora possui instalação **100% automatizada** com:

### 🔧 **Scripts Disponíveis**

1. **`./install.sh`** - Instalação completa automatizada
2. **`./update-config.sh`** - Atualizar configurações
3. **`./validate-config.sh`** - Validar configurações

### 📋 **Características da Instalação**

#### ✅ **Detecção Automática**
- Detecta rede Traefik automaticamente
- Identifica configurações de ambiente
- Verifica pré-requisitos

#### ✅ **Configuração Inteligente**
- Gera senhas seguras automaticamente
- Cria chaves criptográficas únicas
- Configura CORS e SSL automaticamente
- **Nenhuma URL hardcoded** - tudo usa variáveis

#### ✅ **Perguntas Otimizadas**
- URL da aplicação (pergunta uma vez, aplica em frontend e backend)
- Usuário admin (com senha automática)
- Configurações de BD (com detecção de rede Traefik)
- **Não pergunta duas vezes a mesma informação**

#### ✅ **Segurança Automática**
- Usuário admin criado automaticamente
- Senhas hasheadas com bcrypt
- Certificados SSL Let's Encrypt
- Configuração CORS restritiva

### 🌐 **URLs Dinâmicas**

**TODAS as URLs agora usam variáveis:**

#### Frontend (`network-config.js`):
```javascript
getBaseURL() {
    // Detecta automaticamente o domínio atual
    const currentHost = window.location.hostname;
    const protocol = window.location.protocol;
    
    if (currentHost === 'localhost' || currentHost === '127.0.0.1') {
        return `http://${currentHost}:8000`;
    }
    
    return `${protocol}//${currentHost}`;
}
```

#### Docker Compose (`docker-compose.yml`):
```yaml
labels:
  - "traefik.http.routers.backend.rule=Host(`${APP_URL}`) && PathPrefix(`/api`)"
  - "traefik.docker.network=${TRAEFIK_NETWORK}"
```

#### Configuração (`.env`):
```bash
APP_URL=seu-dominio.com
TRAEFIK_NETWORK=kronos-net
FRONTEND_DOMAIN=${APP_URL}
BACKEND_DOMAIN=${APP_URL}
CORS_ALLOW_ORIGINS=https://${APP_URL}
```

### 🎯 **Instalação em Outros Servidores**

Para instalar em um novo servidor:

```bash
# 1. Clonar repositório
git clone <repo> AlugueV3
cd AlugueV3

# 2. Executar instalação (pergunta apenas o necessário)
chmod +x install.sh
./install.sh

# Perguntas durante a instalação:
# - URL da aplicação: exemplo.com
# - Usuário admin: (padrão: admin)
# - Senha admin: (gerada automaticamente)
# - Nome da BD: (padrão: aluguelv3_db)
# - Usuário BD: (padrão: aluguelv3_user)
# - Rede Traefik: (detectada automaticamente)

# 3. Sistema funcionando!
# Frontend: https://exemplo.com
# API: https://exemplo.com/api/
```

### 🔍 **Validação Automática**

```bash
# Verificar se há URLs hardcoded
./validate-config.sh

# Resultado esperado:
✅ Todas as configurações estão corretas!
   ✓ Nenhuma URL hardcoded encontrada
   ✓ Variáveis configuradas corretamente
   ✓ Sistema pronto para instalação automatizada
```

### 📁 **Arquivos do Sistema**

```
AlugueV3/
├── install.sh                 # ⭐ Instalação automatizada
├── update-config.sh           # 🔄 Atualizar configurações
├── validate-config.sh         # ✅ Validar sistema
├── docker-compose.template.yml # 📝 Template com variáveis
├── docker-compose.yml         # 🐳 Gerado automaticamente
├── .env                       # ⚙️ Configurações atuais
├── .env.example              # 📋 Exemplo de configuração
├── INSTALL.md                # 📖 Documentação completa
└── README-INSTALACAO.md      # 📋 Este arquivo
```

### 🎉 **Benefícios Conquistados**

- ✅ **Zero URLs hardcoded**
- ✅ **Instalação 100% automatizada**
- ✅ **Detecção automática de ambiente**
- ✅ **Perguntas otimizadas (não repetitivas)**
- ✅ **Configuração inteligente**
- ✅ **Segurança por padrão**
- ✅ **Usuário admin criado automaticamente**
- ✅ **Certificados SSL automáticos**
- ✅ **Sistema validado e testado**

### 🚀 **Próxima Instalação**

Na próxima instalação, você só precisa:

1. **Executar `./install.sh`**
2. **Responder as perguntas básicas**
3. **Sistema funcionando!**

**Tempo estimado: 2-3 minutos** ⚡

---

**Sistema testado e validado em:** 07/10/2025  
**Status:** ✅ **PRONTO PARA PRODUÇÃO**