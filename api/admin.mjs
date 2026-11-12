import {
  createHash,
  createHmac,
  randomBytes,
  timingSafeEqual,
} from "node:crypto";
import { neon } from "@neondatabase/serverless";
import { exportar, historico, listar } from "../lib/admin-dados.mjs";

const COOKIE = "mpv_admin";
const DURACAO = 3600;
const digest = (valor) => createHash("sha256").update(valor).digest();
const iguais = (a, b) => timingSafeEqual(digest(a), digest(b));
const assinatura = (senha, valor) =>
  createHmac("sha256", senha)
    .update("mpv-admin:" + valor)
    .digest("base64url");

function cookie(res, valor, duracao) {
  const seguro =
    process.env.VERCEL || process.env.NODE_ENV === "production"
      ? "; Secure"
      : "";
  res.setHeader(
    "Set-Cookie",
    COOKIE +
      "=" +
      valor +
      "; Path=/api/admin; HttpOnly; SameSite=Strict; Max-Age=" +
      duracao +
      seguro,
  );
}

function autenticado(req, senha) {
  const valor = req.headers.cookie
    ?.split(";")
    .map((item) => item.trim())
    .find((item) => item.startsWith(COOKIE + "="))
    ?.slice(COOKIE.length + 1);
  if (!valor || !/^\d{10}\.[a-f0-9]{32}\.[\w-]{43}$/.test(valor)) return false;
  const [expira, nonce, mac] = valor.split(".");
  return (
    Number(expira) > Date.now() / 1000 &&
    iguais(mac, assinatura(senha, expira + "." + nonce))
  );
}

async function corpo(req) {
  if (req.body !== undefined) {
    const valor =
      typeof req.body === "string" ? req.body : JSON.stringify(req.body);
    if (Buffer.byteLength(valor) > 4096) throw new Error("Limite");
    return JSON.parse(valor);
  }
  const partes = [];
  let tamanho = 0;
  for await (const parte of req) {
    tamanho += parte.length;
    if (tamanho > 4096) throw new Error("Limite");
    partes.push(parte);
  }
  return JSON.parse(Buffer.concat(partes).toString("utf8"));
}

function filtrosValidos(dados) {
  const opcoes = {
    origem: ["excel", "formulario"],
    frequencia: ["mensal", "pontual", "regular", "nao_regular"],
    forma: ["pix", "transferencia", "boleto"],
  };
  return Object.entries(opcoes).every(
    ([campo, valores]) =>
      dados[campo] == null ||
      dados[campo] === "" ||
      valores.includes(dados[campo]),
  );
}

export default async function admin(req, res) {
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("X-Content-Type-Options", "nosniff");
  const json = (status, valor) =>
    res
      .writeHead(status, {
        "Content-Type": "application/json; charset=utf-8",
      })
      .end(JSON.stringify(valor));
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return json(405, { mensagem: "Use POST." });
  }
  if (req.headers["content-type"]?.split(";")[0] !== "application/json")
    return json(415, { mensagem: "Use JSON." });

  let dados;
  try {
    dados = await corpo(req);
    if (!dados || typeof dados !== "object" || Array.isArray(dados))
      throw new Error();
  } catch {
    return json(400, { mensagem: "Requisição inválida." });
  }

  const senha = process.env.MPV_ADMIN_PASSWORD;
  if (!senha || senha.length < 32)
    return json(503, { mensagem: "Área administrativa indisponível." });
  if (dados.acao === "entrar") {
    if (typeof dados.senha !== "string" || !iguais(dados.senha, senha))
      return json(401, { mensagem: "Senha incorreta." });
    const valor =
      Math.floor(Date.now() / 1000 + DURACAO) +
      "." +
      randomBytes(16).toString("hex");
    cookie(res, valor + "." + assinatura(senha, valor), DURACAO);
    return json(200, { autenticado: true });
  }
  if (dados.acao === "sair") {
    cookie(res, "", 0);
    return json(200, { autenticado: false });
  }
  if (!autenticado(req, senha))
    return json(401, { mensagem: "Entre para acessar a área administrativa." });
  if (dados.acao === "sessao") return json(200, { autenticado: true });
  if (!filtrosValidos(dados))
    return json(400, { mensagem: "Filtros inválidos." });

  try {
    const sql = neon(process.env.MPV_ADMIN_DATABASE_URL);
    if (dados.acao === "listar") return json(200, await listar(sql, dados));
    if (dados.acao === "historico") {
      if (
        typeof dados.id !== "string" ||
        !/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(dados.id)
      )
        return json(400, { mensagem: "Cadastro inválido." });
      const resultado = await historico(sql, dados.id);
      return resultado
        ? json(200, resultado)
        : json(404, { mensagem: "Doador não encontrado." });
    }
    if (dados.acao === "exportar") {
      const arquivo = await exportar(sql, dados);
      if (!arquivo || arquivo.length > 4_000_000)
        return json(413, {
          mensagem:
            "A exportação ficou grande. Aplique filtros e tente novamente.",
        });
      return res
        .writeHead(200, {
          "Content-Type":
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "Content-Disposition":
            'attachment; filename="ministerio-pao-vivo-doadores.xlsx"',
        })
        .end(arquivo);
    }
    return json(400, { mensagem: "Ação inválida." });
  } catch {
    return json(503, {
      mensagem: "Não foi possível consultar o banco. Tente novamente.",
    });
  }
}
