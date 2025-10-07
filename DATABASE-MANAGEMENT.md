# 🗄️ Gestão da Base de Dados - AlugueV3

## 🎯 **Nova Funcionalidade: Controle da Base de Dados**

O script de instalação agora oferece **controle total** sobre a base de dados durante a instalação.

### ✅ **Opções Disponíveis**

#### **1. Preservar Dados Existentes (Padrão)**
```bash
./install.sh
# Quando perguntado:
# "Deseja zerar a base de dados? (s/N):" → Responder "N" ou Enter
```

**O que acontece:**
- ✅ **Dados preservados**: Todos os registros existentes são mantidos
- ✅ **Usuários mantidos**: Usuários existentes permanecem intactos
- ✅ **Admin atualizado**: Apenas a senha do admin é atualizada
- ✅ **Zero perda**: Nenhum dado é removido

#### **2. Zerar Base de Dados (Nova Instalação)**
```bash
./install.sh
# Quando perguntado:
# "Deseja zerar a base de dados? (s/N):" → Responder "s"
```

**O que acontece:**
- 💥 **Dados removidos**: TODOS os dados são apagados
- 🗑️ **Volume removido**: Volume Docker da base é deletado
- ✨ **Instalação limpa**: Base recriada do zero
- 👤 **Admin novo**: Usuário admin criado novamente

### 🛡️ **Avisos de Segurança**

Quando há dados existentes, o script mostra:

```bash
⚠️  Base de dados existente detectada!
   ⚠️  Atenção: Zerar a base de dados irá remover TODOS os dados existentes
   incluindo usuários, propriedades, contratos e históricos

Deseja zerar a base de dados? (s/N):
```

### 📊 **Feedback Claro**

#### **Quando Preserva Dados:**
```bash
[INFO] Preservando dados existentes da base de dados...
[INFO] Usuário admin 'admin' já existe - atualizando apenas a senha...
[SUCCESS] Senha do admin atualizada

🗄️  STATUS DA BASE DE DADOS:
   💾 Base de dados: PRESERVADA (dados anteriores mantidos)
   🔄 Admin: Senha atualizada
```

#### **Quando Zera Dados:**
```bash
[INFO] Removendo dados da base de dados conforme solicitado...
[WARNING] Base de dados zerada!
[INFO] Criando usuário admin 'admin' (base zerada)...
[SUCCESS] Usuário admin criado

🗄️  STATUS DA BASE DE DADOS:
   💥 Base de dados: ZERADA (dados anteriores removidos)
   ✨ Estado: Nova instalação limpa
```

### 🔄 **Cenários de Uso**

#### **📈 Atualização de Sistema (Preservar)**
- Atualizando versão do AlugueV3
- Mudando configurações de rede
- Corrigindo problemas de configuração
- Renovando certificados SSL

#### **🆕 Nova Instalação (Zerar)**
- Primeira instalação
- Correção de dados corrompidos
- Mudança completa de ambiente
- Reset para testes

### 🧪 **Teste da Funcionalidade**

#### **Teste 1: Preservar Dados**
```bash
# 1. Verificar dados existentes
docker exec alugueis_postgres psql -h localhost -U alugueisv3_usuario -d alugueisv3_db -c "SELECT COUNT(*) FROM usuarios;"

# 2. Executar instalação preservando
./install.sh
# Responder "N" quando perguntado sobre zerar BD

# 3. Verificar dados mantidos
docker exec alugueis_postgres psql -h localhost -U alugueisv3_usuario -d alugueisv3_db -c "SELECT COUNT(*) FROM usuarios;"
```

#### **Teste 2: Zerar Dados**
```bash
# 1. Verificar dados existentes
docker exec alugueis_postgres psql -h localhost -U alugueisv3_usuario -d alugueisv3_db -c "SELECT COUNT(*) FROM usuarios;"

# 2. Executar instalação zerando
./install.sh
# Responder "s" quando perguntado sobre zerar BD

# 3. Verificar base limpa
docker exec alugueis_postgres psql -h localhost -U alugueisv3_usuario -d alugueisv3_db -c "SELECT COUNT(*) FROM usuarios;"
# Deve mostrar apenas 1 (usuário admin)
```

### ⚠️ **Importante: Backup**

**Sempre fazer backup antes de zerar:**

```bash
# Backup completo
docker exec alugueis_postgres pg_dump -h localhost -U alugueisv3_usuario alugueisv3_db > backup_$(date +%Y%m%d_%H%M%S).sql

# Restaurar backup (se necessário)
docker exec -i alugueis_postgres psql -h localhost -U alugueisv3_usuario -d alugueisv3_db < backup_20251007_093000.sql
```

### 🎯 **Vantagens**

- ✅ **Controle total**: Usuário decide o que fazer com os dados
- ✅ **Segurança**: Avisos claros sobre perda de dados
- ✅ **Flexibilidade**: Adequado para todos os cenários
- ✅ **Transparência**: Feedback claro sobre o que aconteceu
- ✅ **Prevenção**: Impossível perder dados por acidente

### 📋 **Resumo dos Comandos**

```bash
# Preservar dados (recomendado para atualizações)
./install.sh
# Responder "N" para zerar BD

# Zerar dados (para nova instalação)
./install.sh  
# Responder "s" para zerar BD

# Verificar status atual
./validate-config.sh

# Backup de segurança
docker exec alugueis_postgres pg_dump -h localhost -U alugueisv3_usuario alugueisv3_db > backup.sql
```

**Com essa funcionalidade, o AlugueV3 oferece instalação profissional com controle total sobre os dados!** 🚀