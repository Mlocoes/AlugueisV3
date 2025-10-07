-- CRIAR USUÁRIO ADMIN AUTOMATICAMENTE
-- Gerado automaticamente durante a instalação

-- Inserir usuário administrador
INSERT INTO usuarios (usuario, senha, tipo_de_usuario) 
SELECT 'admin', 'TEMP_HASH_TO_UPDATE', 'administrador'
WHERE NOT EXISTS (
    SELECT 1 FROM usuarios WHERE usuario = 'admin'
);

-- Confirmar criação
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM usuarios WHERE usuario = 'admin') THEN
        RAISE NOTICE 'Usuário admin criado com sucesso!';
    ELSE
        RAISE NOTICE 'Falha ao criar usuário admin!';
    END IF;
END $$;
