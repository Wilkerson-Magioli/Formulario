-- Executar após aprovar a prévia e aplicar a migração 004.
BEGIN;
INSERT INTO ministerio.doacoes_recebidas
    (doador_id, ano_pagamento, valor_recebido_centavos, situacao, participacao_excel_id)
SELECT doador_id, ano_informado_excel, valor_declarado_centavos, 'confirmado', id
FROM ministerio.participacoes
WHERE origem = 'excel' AND frequencia = 'nao_regular' AND valor_declarado_centavos > 0
ON CONFLICT (participacao_excel_id) DO NOTHING;
COMMIT;
