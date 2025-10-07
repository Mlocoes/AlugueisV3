# 🛡️ Guia de Resolução de Problemas - AlugueV3

## ❌ **Erro: "role aluguelv3_user does not exist"**

### 📋 **Problema**
Este erro ocorre quando há incompatibilidade entre as configurações do arquivo `.env` e a base de dados PostgreSQL existente.

### 🔍 **Diagnóstico**
```bash
# 1. Verificar configuração atual do container PostgreSQL
docker exec alugueis_postgres env | grep POSTGRES

# 2. Verificar arquivo .env
cat .env | grep POSTGRES

# 3. Verificar se há conflito
```

### ✅ **Solução Rápida**

#### **Opção 1: Corrigir .env para corresponder ao container existente**
```bash
# Editar .env com configurações corretas
nano .env

# Alterar para:
POSTGRES_DB=alugueisv3_db
POSTGRES_USER=alugueisv3_usuario
POSTGRES_PASSWORD=alugueisv3_senha
DATABASE_URL=postgresql://alugueisv3_usuario:alugueisv3_senha@alugueis_postgres:5432/alugueisv3_db
```

#### **Opção 2: Reinstalação limpa**
```bash
# Parar serviços
docker-compose down -v

# Executar instalação nova
./install.sh
```

### 🔧 **Criar usuário admin manualmente**
```bash
# 1. Gerar hash da senha
ADMIN_HASH=$(docker exec alugueis_backend python -c "
from routers.auth import get_password_hash
print(get_password_hash('admin00'))
" 2>/dev/null | tail -1)

# 2. Criar usuário na base de dados
docker exec alugueis_postgres psql -U alugueisv3_usuario -d alugueisv3_db -c "
INSERT INTO usuarios (usuario, senha, tipo_de_usuario) 
VALUES ('admin', '$ADMIN_HASH', 'administrador');
"

# 3. Verificar criação
docker exec alugueis_postgres psql -U alugueisv3_usuario -d alugueisv3_db -c "
SELECT usuario, tipo_de_usuario FROM usuarios;
"
```

### 🧪 **Testar login**
```bash
curl -X POST "https://aluguel.kronos.cloudns.ph/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"usuario": "admin", "senha": "admin00"}'
```

## 🚀 **Script de Instalação Melhorado**

### ✅ **Características Atuais**
- ✅ Detecta configurações existentes
- ✅ Preserva dados quando necessário
- ✅ Não remove volume desnecessariamente
- ✅ Pergunta antes de sobrescrever configurações

### 📋 **Uso Recomendado**

#### **Para Nova Instalação:**
```bash
./install.sh
# Responder às perguntas normalmente
```

#### **Para Sistema Existente:**
```bash
./install.sh
# Quando aparecer "Usar configuração existente? (S/n):"
# Responder "S" para manter dados existentes
```

### ⚠️ **Cuidados Importantes**

1. **Backup Antes de Reinstalar:**
   ```bash
   # Fazer backup da base de dados
   docker exec alugueis_postgres pg_dump -U alugueisv3_usuario alugueisv3_db > backup.sql
   ```

2. **Verificar Estado dos Containers:**
   ```bash
   docker ps | grep alugueis
   ```

3. **Verificar Configuração:**
   ```bash
   ./validate-config.sh
   ```

## 🔍 **Comandos de Diagnóstico**

### **Verificar Estado da Base de Dados:**
```bash
# Listar usuários na base
docker exec alugueis_postgres psql -U alugueisv3_usuario -d alugueisv3_db -c "\du"

# Listar tabelas
docker exec alugueis_postgres psql -U alugueisv3_usuario -d alugueisv3_db -c "\dt"

# Verificar usuários do sistema
docker exec alugueis_postgres psql -U alugueisv3_usuario -d alugueisv3_db -c "SELECT * FROM usuarios;"
```

### **Verificar Logs:**
```bash
# Logs do PostgreSQL
docker logs alugueis_postgres

# Logs do Backend
docker logs alugueis_backend

# Logs de todos os serviços
docker-compose logs -f
```

### **Verificar Conectividade:**
```bash
# Teste de conectividade com a base
docker exec alugueis_postgres pg_isready -U alugueisv3_usuario -d alugueisv3_db

# Teste da API
curl https://aluguel.kronos.cloudns.ph/api/health
```

## 🎯 **Prevenção de Problemas**

1. **Sempre fazer backup antes de mudanças grandes**
2. **Usar `./validate-config.sh` regularmente**
3. **Verificar logs quando houver problemas**
4. **Manter configurações consistentes entre .env e containers**
5. **Testar login após qualquer mudança na base de dados**

## 📞 **Suporte Rápido**

```bash
# Comando diagnóstico completo
echo "=== DIAGNÓSTICO ALUGUEL V3 ==="
echo "Containers:"
docker ps | grep alugueis
echo
echo "Configuração PostgreSQL:"
docker exec alugueis_postgres env | grep POSTGRES
echo
echo "Arquivo .env:"
grep POSTGRES .env
echo
echo "Usuários na base:"
docker exec alugueis_postgres psql -U alugueisv3_usuario -d alugueisv3_db -c "SELECT COUNT(*) FROM usuarios;" 2>/dev/null || echo "Erro conectando à base"
echo
echo "Status API:"
curl -s https://aluguel.kronos.cloudns.ph/api/health | jq .status 2>/dev/null || echo "API não acessível"
```

**Com essas correções, o sistema deve funcionar de forma mais robusta e confiável!** 🎉