BEGIN;

ALTER TABLE ministerio.participacoes ADD COLUMN dados_enviados jsonb;

CREATE FUNCTION ministerio.registrar_participacao(chave uuid, dados jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, pg_temp
AS $$
DECLARE
    doador uuid;
BEGIN
    PERFORM pg_advisory_xact_lock(hashtextextended(chave::text, 0));
    IF EXISTS (SELECT 1 FROM ministerio.participacoes WHERE chave_envio = chave) THEN
        RETURN;
    END IF;

    INSERT INTO ministerio.doadores
        (nome, endereco, cep, email, whatsapp, documento_tipo, documento, razao_social, origem)
    VALUES (dados->>'nome', dados->>'endereco', dados->>'cep', dados->>'email',
            dados->>'whatsapp', dados->>'documentoTipo', dados->>'documento',
            dados->>'razaoSocial', 'formulario')
    ON CONFLICT (documento_tipo, documento) DO NOTHING
    RETURNING id INTO doador;

    IF doador IS NULL THEN
        SELECT id INTO STRICT doador FROM ministerio.doadores
        WHERE documento_tipo = dados->>'documentoTipo' AND documento = dados->>'documento';
    END IF;

    INSERT INTO ministerio.participacoes
        (doador_id, orando, contribuindo, frequencia, forma, valor_declarado_centavos,
         autoriza_contato, origem, chave_envio, dados_enviados)
    VALUES (doador, (dados->>'orando')::boolean, (dados->>'contribuindo')::boolean,
            dados->>'frequencia', dados->>'forma', (dados->>'centavos')::bigint,
            true, 'formulario', chave, dados);
END;
$$;

REVOKE ALL ON FUNCTION ministerio.registrar_participacao(uuid, jsonb) FROM PUBLIC;
CREATE ROLE mpv_formulario NOLOGIN;
GRANT USAGE ON SCHEMA ministerio TO mpv_formulario;
GRANT EXECUTE ON FUNCTION ministerio.registrar_participacao(uuid, jsonb) TO mpv_formulario;

COMMIT;
