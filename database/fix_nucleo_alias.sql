-- Script para corrigir associação de proprietários ao alias "Nucleo"
-- Adicionar Jandira aos proprietários do alias Nucleo

-- Primeiro, verificar IDs dos proprietários
SELECT id, nome FROM proprietarios WHERE nome IN ('Jandira', 'Carla', 'Fabio', 'Manoel');

-- Verificar o alias atual
SELECT id, alias, id_proprietarios FROM alias WHERE alias = 'Nucleo';

-- Atualizar o alias Nucleo para incluir Jandira (assumindo IDs baseados na consulta acima)
-- Substitua os IDs pelos valores corretos retornados pela consulta
UPDATE alias
SET id_proprietarios = '1,2,3,4'  -- IDs de Jandira, Carla, Fabio, Manoel
WHERE alias = 'Nucleo';