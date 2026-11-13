CREATE OR REPLACE VIEW ministerio.admin_participacoes AS
SELECT id, doador_id, orando, contribuindo, frequencia, forma,
       valor_declarado_centavos, autoriza_contato, ano_informado_excel, origem, criado_em,
       dados_enviados->>'dataParticipacao' AS data_participacao
FROM ministerio.participacoes;
