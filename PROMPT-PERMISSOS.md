# Sistema de Permissões - Gestão de Aluguéis V3

## Contexto do Sistema

Você está trabalhando em um sistema de gestão de aluguéis imobiliários com PostgreSQL. O sistema possui as seguintes entidades principais:

- **Proprietários**: Donos dos imóveis
- **Imóveis**: Propriedades cadastradas
- **Participações**: Percentual de propriedade de cada proprietário em cada imóvel
- **Aluguéis**: Informações financeiras (taxa de administração, valores líquidos)
- **Usuários**: Sistema de autenticação com tipos "administrador" e "usuario"

## Objetivo

Implementar um sistema de **Permissões** que controle quais proprietários cada usuário pode visualizar nas telas financeiras (Aluguéis e Relatórios).

---

## Regras de Negócio

### 1. Modelo de Permissões
- **Relacionamento**: 1 usuário → N proprietários
- Um usuário pode ter permissão para visualizar dados financeiros de múltiplos proprietários
- A permissão é granular por proprietário

### 2. Permissões Padrão (IMPORTANTE)

**Sem permissão financeira por padrão:**
- Usuários NÃO podem ver informações financeiras de NENHUM proprietário por padrão
- É necessário conceder permissão explicitamente

**Acesso irrestrito a dados cadastrais:**
- TODOS os usuários podem visualizar SEM restrições:
  - ✅ Tela de **Proprietários** (dados cadastrais completos)
  - ✅ Tela de **Imóveis** (dados cadastrais completos)
  - ✅ Tela de **Participações** (porcentagens de propriedade)

### 3. Escopo das Permissões

As permissões aplicam-se EXCLUSIVAMENTE a:
- ❌ **Aluguéis**: Dados financeiros (taxa_administracao_total, taxa_administracao_proprietario, valor_liquido_proprietario)
- ❌ **Relatórios**: Todos os relatórios que exibam dados financeiros

### 4. Comportamento por Tipo de Usuário

**Administradores** (`tipo_de_usuario = 'administrador'`):
- Têm acesso TOTAL a todos os dados financeiros (bypass de permissões)
- Podem gerenciar permissões de outros usuários

**Usuários comuns** (`tipo_de_usuario = 'usuario'`):
- Visualizam apenas dados financeiros dos proprietários aos quais têm permissão
- Se não tiverem permissão para nenhum proprietário: telas de Aluguéis/Relatórios aparecem vazias

---

## Especificação Técnica

### 1. Alteração no Banco de Dados

#### Opção A: Campo JSON na tabela usuarios (RECOMENDADA para simplicidade)
```sql
-- Adicionar campo para armazenar IDs dos proprietários permitidos
ALTER TABLE usuarios 
ADD COLUMN proprietarios_permitidos INTEGER[] DEFAULT '{}';

-- Adicionar campo de auditoria
ALTER TABLE usuarios 
ADD COLUMN permissoes_atualizadas_em TIMESTAMP,
ADD COLUMN permissoes_atualizadas_por INTEGER REFERENCES usuarios(id);

-- Comentários
COMMENT ON COLUMN usuarios.proprietarios_permitidos IS 'Array de IDs de proprietários que o usuário pode visualizar dados financeiros';
COMMENT ON COLUMN usuarios.permissoes_atualizadas_em IS 'Última atualização das permissões';
COMMENT ON COLUMN usuarios.permissoes_atualizadas_por IS 'ID do usuário que fez a última atualização';

-- Índice para melhor performance
CREATE INDEX idx_usuarios_proprietarios_permitidos ON usuarios USING GIN (proprietarios_permitidos);
```

#### Opção B: Tabela de Relacionamento (para auditoria mais robusta)
```sql
-- Tabela de permissões com histórico completo
CREATE TABLE IF NOT EXISTS usuario_permissoes (
    id SERIAL PRIMARY KEY,
    uuid UUID DEFAULT uuid_generate_v4() UNIQUE NOT NULL,
    usuario_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    proprietario_id INTEGER NOT NULL REFERENCES proprietarios(id) ON DELETE CASCADE,
    concedida_por INTEGER REFERENCES usuarios(id),
    data_concessao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ativo BOOLEAN DEFAULT TRUE,
    UNIQUE(usuario_id, proprietario_id)
);

-- Índices
CREATE INDEX idx_usuario_permissoes_usuario ON usuario_permissoes(usuario_id) WHERE ativo = TRUE;
CREATE INDEX idx_usuario_permissoes_proprietario ON usuario_permissoes(proprietario_id) WHERE ativo = TRUE;

-- Comentários
COMMENT ON TABLE usuario_permissoes IS 'Permissões de visualização de dados financeiros por proprietário';
```

### 2. Funções SQL Auxiliares
```sql
-- Função para verificar se usuário tem permissão para um proprietário
CREATE OR REPLACE FUNCTION usuario_tem_permissao(
    p_usuario_id INTEGER,
    p_proprietario_id INTEGER
) RETURNS BOOLEAN AS $$
DECLARE
    v_tipo_usuario VARCHAR(20);
    v_tem_permissao BOOLEAN;
BEGIN
    -- Buscar tipo de usuário
    SELECT tipo_de_usuario INTO v_tipo_usuario
    FROM usuarios WHERE id = p_usuario_id;
    
    -- Administradores têm acesso total
    IF v_tipo_usuario = 'administrador' THEN
        RETURN TRUE;
    END IF;
    
    -- Verificar se o proprietário está no array de permitidos (Opção A)
    SELECT p_proprietario_id = ANY(proprietarios_permitidos)
    INTO v_tem_permissao
    FROM usuarios
    WHERE id = p_usuario_id;
    
    RETURN COALESCE(v_tem_permissao, FALSE);
END;
$$ LANGUAGE plpgsql;

-- Função para obter proprietários permitidos de um usuário
CREATE OR REPLACE FUNCTION obter_proprietarios_permitidos(p_usuario_id INTEGER)
RETURNS TABLE(proprietario_id INTEGER) AS $$
DECLARE
    v_tipo_usuario VARCHAR(20);
BEGIN
    -- Buscar tipo de usuário
    SELECT tipo_de_usuario INTO v_tipo_usuario
    FROM usuarios WHERE id = p_usuario_id;
    
    -- Administradores veem todos
    IF v_tipo_usuario = 'administrador' THEN
        RETURN QUERY SELECT id FROM proprietarios WHERE ativo = TRUE;
    ELSE
        -- Usuários comuns veem apenas os permitidos
        RETURN QUERY 
        SELECT UNNEST(proprietarios_permitidos) 
        FROM usuarios 
        WHERE id = p_usuario_id;
    END IF;
END;
$$ LANGUAGE plpgsql;
```

### 3. Query para Aluguéis com Filtro de Permissões
```sql
-- Buscar aluguéis respeitando permissões do usuário
SELECT a.* 
FROM alugueis a
WHERE a.proprietario_id IN (
    SELECT obter_proprietarios_permitidos(:usuario_id)
)
ORDER BY a.ano DESC, a.mes DESC;
```

---

## Especificação da Tela de Permissões

### Interface com Handsontable

#### Estrutura da Tabela

**Colunas:**
1. **ID** (oculta) - ID do usuário
2. **Usuário** - Nome de usuário (não editável)
3. **Tipo** - Tipo de usuário (administrador/usuario) (não editável)
4. **Proprietários Permitidos** - Lista de proprietários (editável)
5. **Última Atualização** - Data da última modificação (não editável)
6. **Atualizado Por** - Quem fez a última alteração (não editável)

#### Configuração do Handsontable
```javascript
const hotSettings = {
  data: dadosUsuarios, // Array com dados dos usuários
  colHeaders: [
    'Usuário',
    'Tipo',
    'Proprietários Permitidos',
    'Última Atualização',
    'Atualizado Por'
  ],
  columns: [
    { 
      data: 'usuario', 
      readOnly: true,
      className: 'htLeft htMiddle'
    },
    { 
      data: 'tipo_de_usuario', 
      readOnly: true,
      className: 'htCenter htMiddle',
      renderer: function(instance, td, row, col, prop, value) {
        td.innerHTML = value === 'administrador' 
          ? '<span class="badge bg-primary">Admin</span>' 
          : '<span class="badge bg-secondary">Usuário</span>';
        return td;
      }
    },
    { 
      data: 'proprietarios_permitidos',
      type: 'dropdown',
      source: listaProprietarios, // ['João Silva', 'Maria Santos', ...]
      allowInvalid: false,
      multiple: true, // Permite seleção múltipla
      filter: true,
      // Renderer customizado para mostrar chips/badges
      renderer: function(instance, td, row, col, prop, value) {
        if (!value || value.length === 0) {
          td.innerHTML = '<span class="text-muted">Nenhum proprietário</span>';
        } else {
          const badges = value.map(prop => 
            `<span class="badge bg-success me-1">${prop}</span>`
          ).join('');
          td.innerHTML = badges;
        }
        return td;
      }
    },
    { 
      data: 'permissoes_atualizadas_em',
      readOnly: true,
      type: 'date',
      dateFormat: 'DD/MM/YYYY HH:mm',
      className: 'htCenter htMiddle'
    },
    { 
      data: 'atualizado_por_nome',
      readOnly: true,
      className: 'htCenter htMiddle'
    }
  ],
  licenseKey: 'non-commercial-and-evaluation',
  height: 'auto',
  stretchH: 'all',
  autoWrapRow: true,
  manualColumnResize: true,
  filters: true,
  dropdownMenu: true,
  contextMenu: true,
  
  // Callback após alteração
  afterChange: function(changes, source) {
    if (source === 'edit') {
      // Salvar alterações no backend
      salvarPermissoes(changes);
    }
  },
  
  // Desabilitar edição para administradores (opcional)
  cells: function(row, col) {
    const cellProperties = {};
    const rowData = this.instance.getSourceDataAtRow(row);
    
    if (rowData.tipo_de_usuario === 'administrador') {
      // Administradores não precisam de permissões (têm acesso total)
      if (col === 2) { // Coluna de proprietários
        cellProperties.readOnly = true;
        cellProperties.className = 'htDimmed';
      }
    }
    
    return cellProperties;
  }
};

const hot = new Handsontable(container, hotSettings);
```

#### Funcionalidades Adicionais da Tela

**1. Filtros e Busca**
```html
<!-- Barra de ferramentas -->
<div class="toolbar mb-3">
  <input type="text" id="searchUser" class="form-control" 
         placeholder="Buscar usuário..." style="max-width: 300px;">
  
  <select id="filterTipo" class="form-select" style="max-width: 200px;">
    <option value="">Todos os tipos</option>
    <option value="usuario">Usuários</option>
    <option value="administrador">Administradores</option>
  </select>
  
  <button class="btn btn-primary" onclick="salvarTodasPermissoes()">
    <i class="bi bi-save"></i> Salvar Alterações
  </button>
</div>
```

**2. Editor de Permissões em Modal (alternativa/complemento)**
```html
<!-- Modal para edição detalhada -->
<div class="modal fade" id="modalPermissoes">
  <div class="modal-dialog modal-lg">
    <div class="modal-content">
      <div class="modal-header">
        <h5 class="modal-title">Editar Permissões - <span id="nomeUsuario"></span></h5>
      </div>
      <div class="modal-body">
        <div class="row">
          <div class="col-6">
            <h6>Proprietários Disponíveis</h6>
            <div id="listaDisponivel" class="list-group" style="max-height: 400px; overflow-y: auto;">
              <!-- Lista de proprietários sem permissão -->
            </div>
          </div>
          <div class="col-6">
            <h6>Proprietários Permitidos</h6>
            <div id="listaPermitidos" class="list-group" style="max-height: 400px; overflow-y: auto;">
              <!-- Lista de proprietários com permissão -->
            </div>
          </div>
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" data-bs-dismiss="modal">Cancelar</button>
        <button class="btn btn-primary" onclick="salvarPermissoesModal()">Salvar</button>
      </div>
    </div>
  </div>
</div>
```

---

## Implementação Backend

### 1. Endpoints da API
```javascript
// GET - Listar usuários com suas permissões
app.get('/api/permissoes', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        u.id,
        u.usuario,
        u.tipo_de_usuario,
        u.proprietarios_permitidos,
        u.permissoes_atualizadas_em,
        ua.usuario as atualizado_por_nome
      FROM usuarios u
      LEFT JOIN usuarios ua ON u.permissoes_atualizadas_por = ua.id
      ORDER BY u.tipo_de_usuario, u.usuario
    `);
    
    // Enriquecer dados com nomes dos proprietários
    for (let user of result.rows) {
      if (user.proprietarios_permitidos && user.proprietarios_permitidos.length > 0) {
        const props = await pool.query(
          'SELECT id, nome, sobrenome FROM proprietarios WHERE id = ANY($1)',
          [user.proprietarios_permitidos]
        );
        user.proprietarios_nomes = props.rows.map(p => 
          `${p.nome} ${p.sobrenome || ''}`.trim()
        );
      } else {
        user.proprietarios_nomes = [];
      }
    }
    
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PUT - Atualizar permissões de um usuário
app.put('/api/permissoes/:usuarioId', async (req, res) => {
  const { usuarioId } = req.params;
  const { proprietarios_ids } = req.body;
  const usuarioLogadoId = req.session.userId; // ID do usuário autenticado
  
  try {
    const result = await pool.query(`
      UPDATE usuarios 
      SET 
        proprietarios_permitidos = $1,
        permissoes_atualizadas_em = NOW(),
        permissoes_atualizadas_por = $2
      WHERE id = $3
      RETURNING *
    `, [proprietarios_ids, usuarioLogadoId, usuarioId]);
    
    res.json({ 
      success: true, 
      message: 'Permissões atualizadas com sucesso',
      usuario: result.rows[0]
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET - Verificar permissão de um usuário para um proprietário específico
app.get('/api/permissoes/verificar/:usuarioId/:proprietarioId', async (req, res) => {
  const { usuarioId, proprietarioId } = req.params;
  
  try {
    const result = await pool.query(
      'SELECT usuario_tem_permissao($1, $2) as tem_permissao',
      [usuarioId, proprietarioId]
    );
    
    res.json({ tem_permissao: result.rows[0].tem_permissao });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET - Obter proprietários permitidos para um usuário
app.get('/api/permissoes/proprietarios/:usuarioId', async (req, res) => {
  const { usuarioId } = req.params;
  
  try {
    const result = await pool.query(`
      SELECT p.*
      FROM proprietarios p
      WHERE p.id IN (
        SELECT obter_proprietarios_permitidos($1)
      )
      ORDER BY p.nome
    `, [usuarioId]);
    
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
```

### 2. Middleware de Autorização
```javascript
// Middleware para filtrar dados financeiros por permissões
const filtrarPorPermissoes = async (req, res, next) => {
  const usuarioId = req.session.userId;
  
  if (!usuarioId) {
    return res.status(401).json({ error: 'Não autenticado' });
  }
  
  try {
    // Buscar tipo de usuário e proprietários permitidos
    const result = await pool.query(`
      SELECT tipo_de_usuario, proprietarios_permitidos
      FROM usuarios
      WHERE id = $1
    `, [usuarioId]);
    
    const usuario = result.rows[0];
    
    // Administradores têm acesso total
    if (usuario.tipo_de_usuario === 'administrador') {
      req.proprietariosPermitidos = null; // null = sem filtro
    } else {
      req.proprietariosPermitidos = usuario.proprietarios_permitidos || [];
    }
    
    next();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Aplicar middleware nas rotas de aluguéis e relatórios
app.get('/api/alugueis', filtrarPorPermissoes, async (req, res) => {
  try {
    let query = 'SELECT * FROM alugueis WHERE 1=1';
    let params = [];
    
    // Filtrar por proprietários permitidos
    if (req.proprietariosPermitidos !== null) {
      if (req.proprietariosPermitidos.length === 0) {
        // Usuário sem permissões - retorna vazio
        return res.json([]);
      }
      query += ' AND proprietario_id = ANY($1)';
      params.push(req.proprietariosPermitidos);
    }
    
    query += ' ORDER BY ano DESC, mes DESC';
    
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
```

---

## Comportamento nas Telas

### Tela de Aluguéis

**Para Administradores:**
- Visualizam TODOS os aluguéis de TODOS os proprietários
- Sem mensagens de restrição

**Para Usuários Comuns:**

**Cenário 1: Usuário COM permissões**
```
┌─────────────────────────────────────────────┐
│ Aluguéis - João Silva (Usuário)            │
├─────────────────────────────────────────────┤
│ Filtros: Ano [2024] Mês [Todos]            │
├─────────────────────────────────────────────┤
│ Exibindo aluguéis de: Maria Santos,        │
│ Pedro Costa (2 proprietários permitidos)    │
├─────────────────────────────────────────────┤
│ [Tabela com aluguéis filtrados]            │
└─────────────────────────────────────────────┘
```

**Cenário 2: Usuário SEM permissões**
```
┌─────────────────────────────────────────────┐
│ Aluguéis - João Silva (Usuário)            │
├─────────────────────────────────────────────┤
│ ⚠️ Você não tem permissão para visualizar  │
│    dados financeiros de nenhum proprietário│
│                                             │
│ 📋 Você pode visualizar:                    │
│    • Proprietários (dados cadastrais)      │
│    • Imóveis (dados cadastrais)            │
│    • Participações (porcentagens)          │
│                                             │
│ Entre em contato com o administrador para  │
│ solicitar acesso aos dados financeiros.    │
└─────────────────────────────────────────────┘
```

### Tela de Relatórios

**Aplicar mesmo filtro:**
- Relatórios mostram apenas dados dos proprietários permitidos
- Totalizações consideram apenas os dados visíveis
- Gráficos e dashboards respeitam as permissões

---

## Casos de Uso

### Caso 1: Contador Externo
```
Situação: Contador precisa ver dados de 3 proprietários específicos
Ação:
1. Admin acessa tela de Permissões
2. Localiza o usuário "contador_externo"
3. Seleciona os 3 proprietários no dropdown
4. Salva as alterações
Resultado:
- Contador vê apenas aluguéis e relatórios desses 3 proprietários
- Continua vendo todos os proprietários na tela de cadastro
```

### Caso 2: Assistente Administrativo
```
Situação: Assistente cuida apenas de cadastros
Ação:
1. Admin NÃO concede nenhuma permissão financeira
Resultado:
- Assistente acessa Proprietários ✅
- Assistente acessa Imóveis ✅
- Assistente acessa Participações ✅
- Assistente acessa Aluguéis ⚠️ (tela vazia com aviso)
- Assistente acessa Relatórios ⚠️ (tela vazia com aviso)
```

### Caso 3: Sócio da Imobiliária
```
Situação: Sócio quer ver apenas seus próprios imóveis
Ação:
1. Admin concede permissão apenas para o proprietário do sócio
Resultado:
- Sócio vê todos os proprietários e imóveis (cadastro)
- Sócio vê apenas seus próprios aluguéis e relatórios
```

---

## Checklist de Implementação

### Banco de Dados
- [ ] Executar ALTER TABLE para adicionar campos
- [ ] Criar funções auxiliares (usuario_tem_permissao, obter_proprietarios_permitidos)
- [ ] Criar índices para performance
- [ ] Testar queries de permissão

### Backend
- [ ] Criar endpoints CRUD para permissões
- [ ] Implementar middleware de autorização
- [ ] Aplicar filtro em rotas de aluguéis
- [ ] Aplicar filtro em rotas de relatórios
- [ ] Adicionar logs de auditoria

### Frontend
- [ ] Criar tela de Permissões com Handsontable
- [ ] Implementar editor de proprietários múltiplos
- [ ] Adicionar mensagens informativas em telas vazias
- [ ] Testar comportamento para admin vs usuário
- [ ] Adicionar indicadores visuais de permissões

### Testes
- [ ] Testar acesso de administrador (deve ver tudo)
- [ ] Testar usuário sem permissões (deve ver telas vazias)
- [ ] Testar usuário com permissões parciais
- [ ] Testar edição de permissões
- [ ] Testar performance com muitos proprietários

### Documentação
- [ ] Documentar estrutura de permissões
- [ ] Criar guia para administradores
- [ ] Documentar API de permissões

---

## Perguntas para Validação

Antes de finalizar a implementação, confirme:

1. **Administradores devem ter acesso automático a tudo ou também precisam de permissões explícitas?**
   - Sugestão: Acesso automático (bypass de permissões)

2. **Permissões podem ter data de expiração?**
   - Sugestão: Não inicialmente, pode ser feature futura

3. **Deve haver notificação quando um usuário receber novas permissões?**
   - Sugestão: Email opcional ao conceder permissões

4. **Deve haver auditoria de quem acessou quais dados financeiros?**
   - Sugestão: Log de acessos para compliance

5. **Deve ser possível conceder permissões temporárias (ex: por 30 dias)?**
   - Sugestão: Feature futura v2

---

**Agora implemente esta funcionalidade seguindo as especificações acima, adaptando ao seu stack tecnológico atual.**
