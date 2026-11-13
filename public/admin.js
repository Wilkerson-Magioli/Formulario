const elemento = (id) => document.getElementById(id);
const login = elemento("login");
const filtros = elemento("filtros");
const detalhes = elemento("detalhes");
const statusLista = elemento("status-lista");
const statusLogin = elemento("status-login");
const exportar = elemento("exportar");
const anterior = elemento("anterior");
const proxima = elemento("proxima");
const rotulos = {
  orando: "Orando",
  mensal: "Mensal",
  pontual: "Pontual",
  regular: "Regular",
  nao_regular: "Não regular",
  pix: "Pix",
  transferencia: "Transferência",
  boleto: "Boleto",
  confirmado: "Confirmado",
  aguardando_conferencia: "Aguardando conferência",
  formulario: "Formulário",
  excel: "Excel",
};
const moeda = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});
const data = new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC" });
const dinheiro = (valor) =>
  valor == null ? "—" : moeda.format(Number(valor) / 100);
const dia = (valor) => (valor ? data.format(new Date(valor)) : "—");
const texto = (valor) => (valor == null || valor === "" ? "—" : String(valor));
const rotulo = (valor) =>
  Object.hasOwn(rotulos, valor) ? rotulos[valor] : "—";
const resumo = (valores, orando) =>
  [...(valores ?? []), ...(orando ? ["orando"] : [])].map(rotulo).join(", ");
const simNao = (valor) => (valor == null ? "—" : valor ? "Sim" : "Não");
let filtrosAtivos = {};
let pagina = 1;
let sessao = 0;
let requisicaoLista = 0;
let requisicaoDetalhes = 0;

async function chamar(acao, dados = {}, arquivo = false) {
  const resposta = await fetch("/api/admin", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ acao, ...dados }),
  });
  if (!resposta.ok) {
    const erro = await resposta.json().catch(() => ({}));
    if (resposta.status === 401 && acao !== "entrar" && acao !== "sessao")
      mostrarAcesso("Sua sessão terminou. Entre novamente.");
    throw new Error(erro.mensagem || "Não foi possível concluir a operação.");
  }
  return arquivo ? resposta.blob() : resposta.json();
}

function mostrarAcesso(mensagem = "") {
  sessao++;
  elemento("acesso").hidden = false;
  elemento("cadastros").hidden = true;
  elemento("sair").hidden = true;
  if (detalhes.open) detalhes.close();
  elemento("detalhes-conteudo").replaceChildren();
  elemento("linhas").replaceChildren();
  filtros.reset();
  filtrosAtivos = {};
  statusLogin.textContent = mensagem;
  login.elements.senha.focus();
}

function mostrarCadastros() {
  sessao++;
  elemento("acesso").hidden = true;
  elemento("cadastros").hidden = false;
  elemento("sair").hidden = false;
  elemento("titulo-cadastros").focus();
  carregarLista(1);
}

function criar(tag, conteudo) {
  const node = document.createElement(tag);
  node.textContent = conteudo;
  return node;
}

function linhaDoador(doador) {
  const linha = document.createElement("tr");
  const nome = criar("button", doador.nome);
  nome.type = "button";
  nome.className = "nome";
  nome.addEventListener("click", () => carregarDetalhes(doador.id));
  const primeira = linha.insertCell();
  primeira.append(nome);
  for (const valor of [
    doador.email,
    doador.whatsapp,
    doador.telefone_legado,
    rotulo(doador.origem),
    resumo(doador.frequencias, doador.orando),
    resumo(doador.formas, doador.orando),
  ])
    linha.insertCell().textContent = texto(valor);
  return linha;
}

async function carregarLista(destino) {
  const atual = ++requisicaoLista;
  const inicio = sessao;
  const vigente = () => atual === requisicaoLista && inicio === sessao;
  statusLista.textContent = "Buscando doadores…";
  anterior.disabled = proxima.disabled = exportar.disabled = true;
  elemento("pagina").textContent = "";
  elemento("linhas").replaceChildren();
  try {
    const resultado = await chamar("listar", {
      ...filtrosAtivos,
      pagina: destino,
    });
    if (!vigente()) return;
    pagina = resultado.pagina;
    const totalPaginas = Math.max(
      1,
      Math.ceil(resultado.total / resultado.porPagina),
    );
    elemento("linhas").replaceChildren(...resultado.doadores.map(linhaDoador));
    elemento("pagina").textContent = "Página " + pagina + " de " + totalPaginas;
    statusLista.textContent =
      resultado.total === 0
        ? "Nenhum doador encontrado."
        : resultado.total +
          (resultado.total === 1
            ? " doador encontrado."
            : " doadores encontrados.");
    anterior.disabled = pagina === 1;
    proxima.disabled = pagina >= totalPaginas;
    exportar.disabled = resultado.total === 0;
  } catch (erro) {
    if (vigente()) statusLista.textContent = erro.message;
  }
}

function secaoHistorico(titulo, colunas, linhas, vazio) {
  const secao = document.createElement("section");
  secao.append(criar("h3", titulo));
  if (linhas.length === 0) {
    secao.append(criar("p", vazio));
    return secao;
  }
  const caixa = document.createElement("div");
  caixa.className = "tabela";
  caixa.tabIndex = 0;
  caixa.setAttribute("role", "region");
  caixa.setAttribute("aria-label", titulo);
  const tabela = document.createElement("table");
  const cabecalho = tabela.createTHead().insertRow();
  for (const titulo of colunas) {
    const th = criar("th", titulo);
    th.scope = "col";
    cabecalho.append(th);
  }
  const corpo = tabela.createTBody();
  for (const valores of linhas) {
    const linha = corpo.insertRow();
    for (const valor of valores) linha.insertCell().textContent = texto(valor);
  }
  caixa.append(tabela);
  secao.append(caixa);
  return secao;
}

async function carregarDetalhes(id) {
  const atual = ++requisicaoDetalhes;
  const inicio = sessao;
  const vigente = () =>
    atual === requisicaoDetalhes && inicio === sessao && detalhes.open;
  const conteudo = elemento("detalhes-conteudo");
  elemento("detalhes-titulo").textContent = "Histórico do doador";
  conteudo.textContent = "Carregando…";
  detalhes.showModal();
  try {
    const { doador, participacoes, doacoes } = await chamar("historico", {
      id,
    });
    if (!vigente()) return;
    elemento("detalhes-titulo").textContent = doador.nome;
    const campos = document.createElement("dl");
    for (const [chave, valor] of [
      ["Endereço", doador.endereco],
      ["CEP", doador.cep],
      ["E-mail", doador.email],
      ["WhatsApp", doador.whatsapp],
      ["Telefone legado", doador.telefone_legado],
      ["CPF / CNPJ", doador.documento],
      ["Razão social", doador.razao_social],
      ["Origem", rotulo(doador.origem)],
    ]) {
      const grupo = document.createElement("div");
      grupo.append(criar("dt", chave), criar("dd", texto(valor)));
      campos.append(grupo);
    }
    conteudo.replaceChildren(
      campos,
      secaoHistorico(
        "Participações",
        [
          "Origem",
          "Oração",
          "Frequência",
          "Forma",
          "Valor de referência",
          "Ano no Excel",
        ],
        participacoes.map((p) => [
          rotulo(p.origem),
          simNao(p.orando),
          rotulo(p.frequencia),
          rotulo(p.forma),
          dinheiro(p.valor_declarado_centavos),
          p.ano_informado_excel,
        ]),
        "Nenhuma participação registrada.",
      ),
      secaoHistorico(
        "Doações recebidas",
        ["Data", "Valor recebido", "Forma", "Conferência"],
        doacoes.map((d) => [
          d.data_pagamento ? dia(d.data_pagamento) : d.ano_pagamento,
          dinheiro(d.valor_recebido_centavos),
          rotulo(d.forma),
          rotulo(d.situacao),
        ]),
        "Nenhuma doação recebida registrada.",
      ),
    );
  } catch (erro) {
    if (vigente()) conteudo.textContent = erro.message;
  }
}

login.addEventListener("submit", async (evento) => {
  evento.preventDefault();
  const botao = login.querySelector("button");
  botao.disabled = true;
  statusLogin.textContent = "Entrando…";
  try {
    await chamar("entrar", { senha: login.elements.senha.value });
    mostrarCadastros();
  } catch (erro) {
    statusLogin.textContent = erro.message;
  } finally {
    login.reset();
    botao.disabled = false;
  }
});
elemento("sair").addEventListener("click", async () => {
  try {
    await chamar("sair");
    mostrarAcesso();
  } catch (erro) {
    statusLista.textContent = erro.message;
  }
});
filtros.addEventListener("submit", (evento) => {
  evento.preventDefault();
  aplicarFiltros();
});
function aplicarFiltros() {
  filtrosAtivos = Object.fromEntries(new FormData(filtros));
  carregarLista(1);
}
filtros.addEventListener("change", (evento) => {
  if (evento.target.tagName === "SELECT") aplicarFiltros();
});
elemento("limpar").addEventListener("click", () => {
  filtros.reset();
  filtrosAtivos = {};
  carregarLista(1);
});
anterior.addEventListener("click", () => carregarLista(pagina - 1));
proxima.addEventListener("click", () => carregarLista(pagina + 1));
exportar.addEventListener("click", async () => {
  const inicio = sessao;
  const lista = requisicaoLista;
  exportar.disabled = true;
  try {
    const arquivo = await chamar("exportar", filtrosAtivos, true);
    if (inicio !== sessao) return;
    const link = document.createElement("a");
    const url = URL.createObjectURL(arquivo);
    link.href = url;
    link.download = "ministerio-pao-vivo-doadores.xlsx";
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 30000);
  } catch (erro) {
    if (inicio === sessao && lista === requisicaoLista)
      statusLista.textContent = erro.message;
  } finally {
    if (inicio === sessao && lista === requisicaoLista)
      exportar.disabled = false;
  }
});

chamar("sessao")
  .then(mostrarCadastros)
  .catch(() => {});
