# 🔐 Segurança - AlugueV3

## 🚨 Arquivos Sensíveis

### ⚠️ **NUNCA** commitar estes arquivos:

```bash
# Arquivos com credenciais sensíveis
.env                    # Senhas, chaves, URLs
docker-compose.yml      # Gerado automaticamente, pode conter dados sensíveis
backend/.env            # Configurações do backend

# Arquivos de backup
database/backups/*      # Dumps da base de dados
*.sql                   # Backups ou dados exportados
```

### ✅ **Arquivos seguros para commit:**

```bash
# Templates e exemplos (sem dados reais)
.env.example            # Exemplo de configuração
docker-compose.template.yml  # Template parametrizado
.gitignore              # Lista de arquivos ignorados

# Scripts e documentação
install.sh              # Script de instalação
*.md                    # Documentação
```

## 🛡️ **Princípios de Segurança**

### 1. **Separação de Configuração**
- ✅ **Template**: `docker-compose.template.yml` com variáveis `${VAR}`
- ✅ **Geração**: Script cria `docker-compose.yml` localmente
- ❌ **Nunca**: Valores hardcoded em arquivos versionados

### 2. **Variáveis de Ambiente**
```yaml
# ✅ CORRETO - Usa variáveis
environment:
  POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
  DATABASE_URL: ${DATABASE_URL}

# ❌ ERRADO - Valores expostos
environment:
  POSTGRES_PASSWORD: minhasenha123
  DATABASE_URL: postgresql://user:senha@host/db
```

### 3. **Rede e URLs**
```yaml
# ✅ CORRETO - Parametrizado
labels:
  - "traefik.http.routers.app.rule=Host(`${APP_URL}`)"
networks:
  - ${TRAEFIK_NETWORK}

# ❌ ERRADO - Hardcoded
labels:
  - "traefik.http.routers.app.rule=Host(`meusite.com`)"
networks:
  - kronos-net
```

## 🔄 **Fluxo Seguro**

### **Desenvolvimento:**
1. Editar `docker-compose.template.yml` com variáveis
2. Testar localmente com `./install.sh`
3. Commitar apenas template e scripts

### **Produção:**
1. Executar `./install.sh`
2. Script gera `docker-compose.yml` com valores reais
3. Arquivo local nunca é enviado ao repositório

## 🚨 **Verificação de Segurança**

### **Antes de cada commit:**
```bash
# Verificar se não há dados sensíveis
git diff --cached | grep -E "(password|senha|secret|key|token)"

# Verificar arquivos staged
git status

# Verificar .gitignore
cat .gitignore | grep -E "(\.env|docker-compose\.yml)"
```

### **Scripts de Verificação:**
```bash
# Verificar se docker-compose.yml tem variáveis
grep -E '\$\{[A-Z_]+\}' docker-compose.template.yml

# Verificar se não há valores hardcoded no template
! grep -E '(password|senha).*:.*[^$]' docker-compose.template.yml
```

## 🔐 **Boas Práticas**

### **1. Senhas Fortes**
- ✅ Geradas automaticamente pelo script
- ✅ Mínimo 12 caracteres
- ✅ Caracteres especiais, números e letras

### **2. Chaves Criptográficas**
- ✅ JWT: 256 bits de entropia
- ✅ CSRF: Chaves únicas por instalação
- ✅ Renovação em cada instalação

### **3. Rede**
- ✅ Containers isolados em rede própria
- ✅ PostgreSQL sem exposição externa
- ✅ HTTPS obrigatório via Traefik

### **4. Logs**
- ✅ Rotação automática (10MB, 3 arquivos)
- ✅ Sem senhas nos logs
- ✅ Health checks não verbosos

## 🆘 **Recuperação de Incidente**

### **Se dados sensíveis foram commitados:**

1. **Remover do histórico:**
```bash
git filter-branch --force --index-filter \
  'git rm --cached --ignore-unmatch docker-compose.yml' \
  --prune-empty --tag-name-filter cat -- --all
```

2. **Regenerar credenciais:**
```bash
./install.sh  # Gera novas senhas e chaves
```

3. **Force push (cuidado!):**
```bash
git push origin --force --all
```

## 📋 **Checklist de Segurança**

- [ ] ✅ `.env` está no `.gitignore`
- [ ] ✅ `docker-compose.yml` está no `.gitignore`
- [ ] ✅ Template usa apenas variáveis `${VAR}`
- [ ] ✅ Nenhum arquivo commitado tem senhas reais
- [ ] ✅ Scripts geram credenciais aleatórias
- [ ] ✅ HTTPS obrigatório em produção
- [ ] ✅ PostgreSQL não exposto externamente
- [ ] ✅ Backup de segurança antes de mudanças

---

**⚠️ LEMBRE-SE: Dados no repositório são públicos!**