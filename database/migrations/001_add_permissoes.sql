-- =====================================================
-- Migração: Sistema de Permissões
-- Data: 2025-11-01
-- Descrição: Adiciona campos para controle de permissões
--            de visualização de dados financeiros por proprietário
-- =====================================================

-- 1. Adicionar campos de permissões na tabela usuarios
ALTER TABLE usuarios 
ADD COLUMN IF NOT EXISTS proprietarios_permitidos INTEGER[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS permissoes_atualizadas_em TIMESTAMP,
ADD COLUMN IF NOT EXISTS permissoes_atualizadas_por INTEGER REFERENCES usuarios(id);

-- 2. Adicionar comentários para documentação
COMMENT ON COLUMN usuarios.proprietarios_permitidos IS 'Array de IDs de proprietários que o usuário pode visualizar dados financeiros';
COMMENT ON COLUMN usuarios.permissoes_atualizadas_em IS 'Última atualização das permissões';
COMMENT ON COLUMN usuarios.permissoes_atualizadas_por IS 'ID do usuário que fez a última atualização';

-- 3. Criar índice GIN para melhor performance em queries com arrays
CREATE INDEX IF NOT EXISTS idx_usuarios_proprietarios_permitidos 
ON usuarios USING GIN (proprietarios_permitidos);

-- 4. Função para verificar se usuário tem permissão para um proprietário
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
    
    -- Administradores têm acesso total (bypass de permissões)
    IF v_tipo_usuario = 'administrador' THEN
        RETURN TRUE;
    END IF;
    
    -- Verificar se o proprietário está no array de permitidos
    SELECT p_proprietario_id = ANY(proprietarios_permitidos)
    INTO v_tem_permissao
    FROM usuarios
    WHERE id = p_usuario_id;
    
    RETURN COALESCE(v_tem_permissao, FALSE);
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION usuario_tem_permissao IS 'Verifica se um usuário tem permissão para visualizar dados financeiros de um proprietário específico';

-- 5. Função para obter proprietários permitidos de um usuário
CREATE OR REPLACE FUNCTION obter_proprietarios_permitidos(p_usuario_id INTEGER)
RETURNS TABLE(proprietario_id INTEGER) AS $$
DECLARE
    v_tipo_usuario VARCHAR(20);
BEGIN
    -- Buscar tipo de usuário
    SELECT tipo_de_usuario INTO v_tipo_usuario
    FROM usuarios WHERE id = p_usuario_id;
    
    -- Administradores veem todos os proprietários ativos
    IF v_tipo_usuario = 'administrador' THEN
        RETURN QUERY SELECT id FROM proprietarios WHERE ativo = TRUE;
    ELSE
        -- Usuários comuns veem apenas os proprietários permitidos
        RETURN QUERY 
        SELECT UNNEST(proprietarios_permitidos)::INTEGER
        FROM usuarios 
        WHERE id = p_usuario_id;
    END IF;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION obter_proprietarios_permitidos IS 'Retorna lista de IDs de proprietários que o usuário pode visualizar dados financeiros';

-- 6. View auxiliar para facilitar consultas de permissões
CREATE OR REPLACE VIEW vw_usuarios_permissoes AS
SELECT 
    u.id,
    u.usuario,
    u.tipo_de_usuario,
    u.proprietarios_permitidos,
    u.permissoes_atualizadas_em,
    u.permissoes_atualizadas_por,
    ua.usuario as atualizado_por_nome,
    CASE 
        WHEN u.tipo_de_usuario = 'administrador' THEN TRUE
        WHEN u.proprietarios_permitidos IS NULL THEN FALSE
        WHEN array_length(u.proprietarios_permitidos, 1) > 0 THEN TRUE
        ELSE FALSE
    END as tem_permissoes
FROM usuarios u
LEFT JOIN usuarios ua ON u.permissoes_atualizadas_por = ua.id;

COMMENT ON VIEW vw_usuarios_permissoes IS 'View consolidada com informações de permissões dos usuários';

-- 7. Log de auditoria (opcional, para rastreamento futuro)
CREATE TABLE IF NOT EXISTS log_permissoes (
    id SERIAL PRIMARY KEY,
    uuid UUID DEFAULT gen_random_uuid() UNIQUE NOT NULL,
    usuario_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    acao VARCHAR(50) NOT NULL, -- 'conceder', 'revogar', 'atualizar'
    proprietarios_anteriores INTEGER[],
    proprietarios_novos INTEGER[],
    modificado_por INTEGER REFERENCES usuarios(id),
    data_modificacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    observacoes TEXT
);

CREATE INDEX IF NOT EXISTS idx_log_permissoes_usuario ON log_permissoes(usuario_id);
CREATE INDEX IF NOT EXISTS idx_log_permissoes_data ON log_permissoes(data_modificacao);

COMMENT ON TABLE log_permissoes IS 'Log de auditoria de alterações de permissões';

-- 8. Trigger para registrar alterações de permissões
CREATE OR REPLACE FUNCTION registrar_alteracao_permissoes()
RETURNS TRIGGER AS $$
BEGIN
    -- Registrar apenas se houve alteração nas permissões
    IF OLD.proprietarios_permitidos IS DISTINCT FROM NEW.proprietarios_permitidos THEN
        INSERT INTO log_permissoes (
            usuario_id,
            acao,
            proprietarios_anteriores,
            proprietarios_novos,
            modificado_por,
            observacoes
        ) VALUES (
            NEW.id,
            'atualizar',
            OLD.proprietarios_permitidos,
            NEW.proprietarios_permitidos,
            NEW.permissoes_atualizadas_por,
            'Alteração automática via trigger'
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_log_permissoes ON usuarios;
CREATE TRIGGER trg_log_permissoes
AFTER UPDATE ON usuarios
FOR EACH ROW
EXECUTE FUNCTION registrar_alteracao_permissoes();

-- 9. Verificação final
DO $$
BEGIN
    RAISE NOTICE '✓ Migração de permissões aplicada com sucesso!';
    RAISE NOTICE '  - Campo proprietarios_permitidos adicionado';
    RAISE NOTICE '  - Funções usuario_tem_permissao() e obter_proprietarios_permitidos() criadas';
    RAISE NOTICE '  - Índices otimizados criados';
    RAISE NOTICE '  - Log de auditoria configurado';
END $$;
