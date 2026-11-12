BEGIN;

ALTER TABLE ministerio.doadores ADD COLUMN IF NOT EXISTS telefone_legado text;

CREATE VIEW ministerio.admin_doadores AS
SELECT d.id,
       coalesce(p.dados_enviados->>'nome', d.nome) AS nome,
       coalesce(p.dados_enviados->>'endereco', d.endereco) AS endereco,
       coalesce(p.dados_enviados->>'cep', d.cep) AS cep,
       coalesce(p.dados_enviados->>'email', d.email) AS email,
       coalesce(p.dados_enviados->>'whatsapp', d.whatsapp) AS whatsapp,
       d.telefone_legado,
       d.documento_tipo,
       d.documento,
       coalesce(p.dados_enviados->>'razaoSocial', d.razao_social) AS razao_social,
       d.origem, d.criado_em
FROM ministerio.doadores d
LEFT JOIN LATERAL (
    SELECT dados_enviados
    FROM ministerio.participacoes
    WHERE doador_id = d.id AND origem = 'formulario'
    ORDER BY criado_em DESC, id DESC
    LIMIT 1
) p ON true;

CREATE VIEW ministerio.admin_participacoes AS
SELECT id, doador_id, orando, contribuindo, frequencia, forma,
       valor_declarado_centavos, autoriza_contato, ano_informado_excel, origem, criado_em
FROM ministerio.participacoes;

CREATE VIEW ministerio.admin_doacoes AS
SELECT id, doador_id, data_pagamento, valor_recebido_centavos, forma, situacao
FROM ministerio.doacoes_recebidas;

CREATE ROLE mpv_admin_leitura NOLOGIN;
GRANT USAGE ON SCHEMA ministerio TO mpv_admin_leitura;
GRANT SELECT ON ministerio.admin_doadores, ministerio.admin_participacoes,
    ministerio.admin_doacoes TO mpv_admin_leitura;

COMMIT;
