BEGIN;

CREATE SCHEMA ministerio;
REVOKE ALL ON SCHEMA ministerio FROM PUBLIC;

CREATE TABLE ministerio.doadores (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    nome text NOT NULL CHECK (btrim(nome) <> ''),
    endereco text,
    cep text CHECK (cep ~ '^[0-9]{8}$'),
    email text,
    whatsapp text,
    documento_tipo text,
    documento text,
    razao_social text,
    origem text NOT NULL CHECK (origem IN ('formulario', 'excel')),
    criado_em timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT documento_formato CHECK (
        (documento_tipo IS NULL AND documento IS NULL)
        OR (documento_tipo IS NOT NULL AND documento IS NOT NULL AND (
            (documento_tipo = 'cpf' AND documento ~ '^[0-9]{11}$')
            OR (documento_tipo = 'cnpj' AND documento ~ '^[A-Z0-9]{12}[0-9]{2}$')
        ))
    ),
    UNIQUE (documento_tipo, documento)
);

CREATE TABLE ministerio.participacoes (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    doador_id uuid NOT NULL REFERENCES ministerio.doadores (id),
    orando boolean,
    contribuindo boolean,
    frequencia text CHECK (frequencia IN ('mensal', 'pontual', 'regular', 'nao_regular')),
    forma text CHECK (forma IN ('pix', 'transferencia', 'boleto')),
    valor_declarado_centavos bigint CHECK (valor_declarado_centavos > 0),
    autoriza_contato boolean,
    ano_informado_excel smallint CHECK (ano_informado_excel BETWEEN 1900 AND 9999),
    origem text NOT NULL CHECK (origem IN ('formulario', 'excel')),
    chave_envio uuid UNIQUE,
    criado_em timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT participacao_formulario_completa CHECK (
        origem = 'excel' OR (
            chave_envio IS NOT NULL
            AND orando IS NOT NULL AND contribuindo IS NOT NULL
            AND (orando OR contribuindo)
            AND ano_informado_excel IS NULL
            AND (
                (contribuindo AND frequencia IS NOT NULL
                    AND frequencia IN ('mensal', 'pontual')
                    AND forma IS NOT NULL AND valor_declarado_centavos IS NOT NULL)
                OR (NOT contribuindo AND frequencia IS NULL
                    AND forma IS NULL AND valor_declarado_centavos IS NULL)
            )
        )
    )
);

CREATE TABLE ministerio.doacoes_recebidas (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    doador_id uuid NOT NULL REFERENCES ministerio.doadores (id),
    data_pagamento date NOT NULL,
    valor_recebido_centavos bigint NOT NULL CHECK (valor_recebido_centavos > 0),
    forma text CHECK (forma IN ('pix', 'transferencia', 'boleto')),
    situacao text NOT NULL DEFAULT 'aguardando_conferencia'
        CHECK (situacao IN ('aguardando_conferencia', 'confirmado')),
    criado_em timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX participacoes_por_doador ON ministerio.participacoes (doador_id);
CREATE INDEX doacoes_por_doador_e_data
    ON ministerio.doacoes_recebidas (doador_id, data_pagamento DESC);

REVOKE ALL ON ALL TABLES IN SCHEMA ministerio FROM PUBLIC;

COMMIT;
