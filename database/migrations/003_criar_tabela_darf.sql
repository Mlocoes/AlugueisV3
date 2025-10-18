-- Migração: Adicionar tabela DARF
-- Data: 18/10/2025
-- Descrição: Criação da tabela para gerenciamento de DARFs (Documento de Arrecadação de Receitas Federais)

-- Criar tabela DARF
CREATE TABLE IF NOT EXISTS darfs (
    id SERIAL PRIMARY KEY,
    uuid UUID NOT NULL UNIQUE DEFAULT gen_random_uuid(),
    proprietario_id INTEGER NOT NULL REFERENCES proprietarios(id) ON DELETE CASCADE,
    data DATE NOT NULL,
    valor_darf NUMERIC(12,2) NOT NULL CHECK (valor_darf >= 0),
    data_cadastro TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraint única: cada proprietário pode ter apenas um DARF por data
    CONSTRAINT uq_darf_proprietario_data UNIQUE (proprietario_id, data)
);

-- Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_darf_proprietario ON darfs(proprietario_id);
CREATE INDEX IF NOT EXISTS idx_darf_data ON darfs(data);
CREATE INDEX IF NOT EXISTS idx_darf_data_proprietario ON darfs(data, proprietario_id);

-- Comentários
COMMENT ON TABLE darfs IS 'Tabela de DARF - Documento de Arrecadação de Receitas Federais';
COMMENT ON COLUMN darfs.id IS 'ID único do DARF';
COMMENT ON COLUMN darfs.uuid IS 'UUID único do DARF para referências externas';
COMMENT ON COLUMN darfs.proprietario_id IS 'ID do proprietário (FK para proprietarios.id)';
COMMENT ON COLUMN darfs.data IS 'Data do DARF';
COMMENT ON COLUMN darfs.valor_darf IS 'Valor do DARF em reais';
COMMENT ON COLUMN darfs.data_cadastro IS 'Data e hora de cadastro do registro';

-- Grant permissions (ajustar conforme necessário)
GRANT SELECT, INSERT, UPDATE, DELETE ON darfs TO alugueis_user;
GRANT USAGE, SELECT ON SEQUENCE darfs_id_seq TO alugueis_user;

-- Verificar estrutura criada
SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'darfs'
ORDER BY ordinal_position;

-- Verificar constraints
SELECT
    conname AS constraint_name,
    contype AS constraint_type
FROM pg_constraint
WHERE conrelid = 'darfs'::regclass;

-- Verificar índices
SELECT
    indexname,
    indexdef
FROM pg_indexes
WHERE tablename = 'darfs';

COMMIT;
