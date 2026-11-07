"""Prepara o primeiro lote aprovado da planilha de parceiros."""

import argparse
import base64
import hashlib
import io
import json
import re
import unicodedata
from collections import Counter
from decimal import Decimal
from pathlib import Path
from uuid import NAMESPACE_URL, uuid5

from openpyxl import load_workbook


SHA256_LOTE_APROVADO = "383671a0e38d436f77ffcf4185308afe85134dfaefc532166f55644eb5033fc6"
SAIDA = Path(__file__).resolve().parents[1] / "output" / "importacao-parceiros.sql"
EMAIL = re.compile(r"[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}")


def texto(valor):
    return "" if valor is None else str(valor).strip()


def nome_normalizado(nome):
    letras = unicodedata.normalize("NFD", nome.casefold())
    return " ".join("".join(c for c in letras if not unicodedata.combining(c)).split())


def cpf_valido(valor):
    if not re.fullmatch(r"[0-9. -]+", texto(valor)):
        return None
    digitos = re.sub(r"\D", "", texto(valor))
    if isinstance(valor, int):
        digitos = digitos.zfill(11)
    if len(digitos) != 11 or len(set(digitos)) == 1:
        return None
    for tamanho in (9, 10):
        soma = sum(int(digitos[i]) * (tamanho + 1 - i) for i in range(tamanho))
        if (soma * 10 % 11) % 10 != int(digitos[tamanho]):
            return None
    return digitos


def telefone_com_ddd(valor):
    numero = texto(valor)
    if not re.fullmatch(r"[0-9+() .-]+", numero):
        return None
    digitos = re.sub(r"\D", "", numero)
    if len(digitos) in (12, 13) and digitos.startswith("55"):
        digitos = digitos[2:]
    return digitos if len(digitos) in (10, 11) else None


def centavos(valor):
    if type(valor) not in (int, float):
        return None
    quantia = Decimal(str(valor)) * 100
    if not quantia.is_finite() or not 0 < quantia <= 2**63 - 1:
        return None
    return int(quantia) if quantia == quantia.to_integral_value() else None


def ler_planilha(arquivo):
    with arquivo:
        livro = load_workbook(arquivo, read_only=True, data_only=True)
        try:
            aba, = [aba for aba in livro if aba.title.strip() == "Lista de Parceiros"]
            linhas = aba.iter_rows(min_row=2, max_col=9, values_only=True)
            cabecalho = tuple(texto(c) for c in next(linhas)[1:])
            esperado = ("ANO", "NOMES", "Endereço", "Valor  Regular",
                        "Valor não Regular", "CPF", "Tel/Celular", "e-mail- Skype")
            if cabecalho != esperado:
                raise ValueError("As colunas não correspondem à planilha revisada.")
            return [(numero, linha) for numero, linha in enumerate(linhas, 3)
                    if isinstance(linha[2], str) and texto(linha[2])]
        finally:
            livro.close()


def preparar_lote(linhas):
    candidatos = []
    for numero, (_, ano, nome, endereco, regular, nao_regular, cpf, tel, contato) in linhas:
        emails = EMAIL.findall(texto(contato))
        doador = {
            "id": id_legado(numero, "doador"),
            "nome": texto(nome),
            "endereco": texto(endereco) or None,
            "email": emails[0].lower() if len(emails) == 1 else None,
            "documento": cpf_valido(cpf),
            "telefone_legado": telefone_com_ddd(tel),
        }
        ano = int(texto(ano)) if re.fullmatch(r"(19|20)[0-9]{2}", texto(ano)) else None
        ofertas = {"regular": centavos(regular), "nao_regular": centavos(nao_regular)}
        candidatos.append((numero, doador, ano, ofertas))

    campos = ("nome", "email", "documento", "telefone_legado")
    contagens = {
        campo: Counter(chave(campo, doador[campo]) for _, doador, _, _ in candidatos
                       if doador[campo])
        for campo in campos
    }
    doadores, participacoes, revisao = [], [], []
    for numero, doador, ano, ofertas in candidatos:
        if any(contagens[campo][chave(campo, doador[campo])] > 1 for campo in campos):
            revisao.append(numero)
            continue
        doadores.append(doador)
        referencias = [(tipo, valor) for tipo, valor in ofertas.items() if valor is not None]
        if not referencias and ano is not None:
            referencias = [(None, None)]
        for tipo, valor in referencias:
            participacoes.append({
                "id": id_legado(numero, tipo or "ano"),
                "doador_id": doador["id"],
                "frequencia": tipo,
                "valor_declarado_centavos": valor,
                "ano_informado_excel": ano,
            })
    return doadores, participacoes, revisao


def chave(campo, valor):
    return nome_normalizado(valor) if campo == "nome" else valor


def id_legado(numero, registro):
    return str(uuid5(NAMESPACE_URL, f"ministerio-pao-vivo/lista-de-parceiros/lote-1/{numero}/{registro}"))


def json_sql(registros):
    dados = json.dumps(registros, ensure_ascii=False).encode("utf-8")
    # Base64 mantém nomes e endereços fora da sintaxe SQL. Não é criptografia.
    codificado = base64.b64encode(dados).decode("ascii")
    return f"convert_from(decode('{codificado}', 'base64'), 'UTF8')::jsonb"


def gerar_sql(doadores, participacoes):
    return f"""-- Lote privado. Contém dados pessoais codificados, não criptografados.
BEGIN;

ALTER TABLE ministerio.doadores ADD COLUMN IF NOT EXISTS telefone_legado text;

INSERT INTO ministerio.doadores
    (id, nome, endereco, email, telefone_legado, documento_tipo, documento, origem)
SELECT id, nome, endereco, email, telefone_legado,
       CASE WHEN documento IS NOT NULL THEN 'cpf' END, documento, 'excel'
FROM jsonb_to_recordset({json_sql(doadores)})
    AS origem(id uuid, nome text, endereco text, email text, telefone_legado text, documento text)
ON CONFLICT (id) DO NOTHING;

INSERT INTO ministerio.participacoes
    (id, doador_id, frequencia, valor_declarado_centavos, ano_informado_excel, origem)
SELECT id, doador_id, frequencia, valor_declarado_centavos, ano_informado_excel, 'excel'
FROM jsonb_to_recordset({json_sql(participacoes)})
    AS origem(id uuid, doador_id uuid, frequencia text,
              valor_declarado_centavos bigint, ano_informado_excel smallint)
ON CONFLICT (id) DO NOTHING;

COMMIT;
"""


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("planilha", type=Path)
    parser.add_argument("--gerar-sql", action="store_true")
    args = parser.parse_args()
    conteudo = args.planilha.read_bytes()
    if args.gerar_sql and hashlib.sha256(conteudo).hexdigest() != SHA256_LOTE_APROVADO:
        parser.error("O arquivo mudou. Revise a planilha antes de gerar o SQL.")
    linhas = ler_planilha(io.BytesIO(conteudo))
    doadores, participacoes, revisao = preparar_lote(linhas)
    print(f"Candidatos: {len(linhas)} | Doadores: {len(doadores)} | "
          f"Participações: {len(participacoes)} | Pagamentos: 0")
    print(f"Revisão ({len(revisao)}): {', '.join(map(str, revisao))}")
    if args.gerar_sql:
        if (len(linhas), len(doadores), len(revisao)) != (326, 290, 36):
            parser.error("O lote mudou. Revise a planilha antes de gerar o SQL.")
        SAIDA.parent.mkdir(exist_ok=True)
        SAIDA.write_text(gerar_sql(doadores, participacoes), encoding="utf-8")
        print(f"Arquivo privado: {SAIDA}")


if __name__ == "__main__":
    main()
