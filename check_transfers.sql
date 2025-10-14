SELECT
    t.id,
    t.nome_transferencia,
    t.valor_total,
    CASE
        WHEN jsonb_array_length(t.id_proprietarios::jsonb) > 0
        THEN (SELECT SUM((elem->>'valor')::float) FROM jsonb_array_elements(t.id_proprietarios::jsonb) elem)
        ELSE 0
    END as soma_calculada,
    CASE
        WHEN ABS(t.valor_total - COALESCE((SELECT SUM((elem->>'valor')::float) FROM jsonb_array_elements(t.id_proprietarios::jsonb) elem), 0)) < 0.01
        THEN 'OK'
        ELSE 'INCONSISTENTE'
    END as status
FROM transferencias t
ORDER BY t.id;
