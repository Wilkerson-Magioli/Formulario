SELECT count(*) AS doacoes_pontuais,
       sum(valor_declarado_centavos) / 100.0 AS total_em_reais,
       count(*) FILTER (WHERE ano_informado_excel IS NULL) AS sem_ano
FROM ministerio.participacoes
WHERE origem = 'excel'
  AND frequencia = 'nao_regular'
  AND valor_declarado_centavos > 0;
