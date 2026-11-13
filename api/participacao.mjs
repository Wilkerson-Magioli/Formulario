import { neon } from "@neondatabase/serverless";
import regras from "../public/participation.js";

const frequencias = new Map([
  ["Oferta mensal", "mensal"],
  ["Oferta pontual", "pontual"],
]);
const formas = new Map([
  ["Pix", "pix"],
  ["Transferência", "transferencia"],
  ["Boleto bancário", "boleto"],
]);

function validar(dados) {
  if (
    !dados ||
    dados.consentimento !== true ||
    typeof dados.orando !== "boolean" ||
    typeof dados.contribuindo !== "boolean" ||
    !(dados.orando || dados.contribuindo)
  )
    return null;

  const texto = (campo, limite) => {
    const valor = typeof dados[campo] === "string" ? dados[campo].trim() : "";
    return valor.length <= limite && !/[\u0000-\u001f\u007f]/.test(valor)
      ? valor
      : "";
  };
  const nome = texto("nome", 200);
  const endereco = texto("endereco", 400);
  const cep = texto("cep", 9);
  const email = texto("email", 200);
  const whatsapp = texto("whatsapp", 15);
  if (
    !nome ||
    !endereco ||
    !/^\d{5}-\d{3}$/.test(cep) ||
    !/^[^\s@]+@[^\s@]+$/.test(email) ||
    !/^\(\d{2}\) \d{4,5}-\d{4}$/.test(whatsapp)
  )
    return null;

  const { orando, contribuindo } = dados;
  const frequencia = contribuindo ? frequencias.get(dados.frequencia) : null;
  const forma = contribuindo ? formas.get(dados.metodo) : null;
  const centavos =
    contribuindo && typeof dados.valor === "number"
      ? Math.round(dados.valor * 100)
      : null;
  if (
    contribuindo &&
    (!frequencia ||
      !forma ||
      !Number.isSafeInteger(centavos) ||
      centavos <= 0 ||
      centavos > 999999900 ||
      centavos / 100 !== dados.valor)
  )
    return null;

  const dataParticipacao = texto("dataParticipacao", 10);
  const data = new Date(dataParticipacao + "T00:00:00Z");
  if (
    !/^\\d{4}-\\d{2}-\\d{2}$/.test(dataParticipacao) ||
    !Number.isFinite(data.getTime()) ||
    data.toISOString().slice(0, 10) !== dataParticipacao
  )
    return null;
  const registro = {
    dataParticipacao,
    nome,
    endereco,
    cep: cep.replace("-", ""),
    email,
    whatsapp: whatsapp.replace(/\D/g, ""),
    orando,
    contribuindo,
    frequencia,
    forma,
    centavos,
  };
  if (forma !== "boleto") return registro;
  const tipo = dados.tipoPessoa;
  const documento = texto("documento", 18);
  const razaoSocial = tipo === "PJ" ? texto("razaoSocial", 200) : null;
  if (
    !["PF", "PJ"].includes(tipo) ||
    !documento ||
    !/^[A-Z0-9./-]+$/i.test(documento) ||
    regras.validateTaxDocument(documento, tipo) ||
    (tipo === "PJ" && !razaoSocial)
  )
    return null;
  return {
    ...registro,
    razaoSocial,
    documentoTipo: tipo === "PJ" ? "cnpj" : "cpf",
    documento: documento.toUpperCase().replace(/[^A-Z0-9]/g, ""),
  };
}

async function lerCorpo(req) {
  if (req.body !== undefined) {
    const texto =
      typeof req.body === "string" ? req.body : JSON.stringify(req.body);
    if (Buffer.byteLength(texto) > 4096) throw new Error("Limite");
    return JSON.parse(texto);
  }
  const partes = [];
  let bytes = 0;
  for await (const parte of req) {
    bytes += parte.length;
    if (bytes > 4096) throw new Error("Limite");
    partes.push(parte);
  }
  return JSON.parse(Buffer.concat(partes).toString("utf8"));
}

export default async function participacao(req, res) {
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  const responder = (status, mensagem) =>
    res.writeHead(status).end(JSON.stringify({ mensagem }));
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return responder(405, "Use POST.");
  }
  if (req.headers["content-type"]?.split(";")[0] !== "application/json")
    return responder(415, "Envie os dados em JSON.");

  let corpo;
  try {
    corpo = await lerCorpo(req);
  } catch {
    return responder(400, "Não foi possível ler o cadastro.");
  }
  const chave = corpo?.chave;
  const registro = validar(corpo?.participacao);
  if (
    typeof chave !== "string" ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      chave,
    ) ||
    !registro
  )
    return responder(422, "Confira os campos do formulário.");

  try {
    const sql = neon(process.env.MPV_DATABASE_URL);
    await sql.query(
      "SELECT ministerio.registrar_participacao($1::uuid, $2::jsonb)",
      [chave, JSON.stringify(registro)],
    );
    return res.writeHead(204).end();
  } catch {
    return responder(503, "Não foi possível salvar agora. Tente novamente.");
  }
}
