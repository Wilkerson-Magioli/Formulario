BEGIN;

ALTER TABLE ministerio.doacoes_recebidas
    ALTER COLUMN data_pagamento DROP NOT NULL,
    ADD COLUMN ano_pagamento smallint CHECK (ano_pagamento BETWEEN 1900 AND 9999),
    ADD COLUMN participacao_excel_id uuid UNIQUE REFERENCES ministerio.participacoes(id),
    ADD CONSTRAINT doacao_referencia_temporal CHECK (
        data_pagamento IS NOT NULL OR ano_pagamento IS NOT NULL
        OR participacao_excel_id IS NOT NULL
    );

CREATE OR REPLACE VIEW ministerio.admin_doacoes AS
SELECT id, doador_id, data_pagamento, valor_recebido_centavos, forma, situacao,
       ano_pagamento
FROM ministerio.doacoes_recebidas;

COMMIT;
