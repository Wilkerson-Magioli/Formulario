import ExcelJS from "exceljs";

const TAMANHO_PAGINA = 25;
const LIMITE_EXPORTACAO = 10000;
const rotulos = {
  mensal: "Mensal",
  pontual: "Pontual",
  regular: "Regular",
  nao_regular: "Não regular",
  pix: "Pix",
  transferencia: "Transferência",
  boleto: "Boleto",
  excel: "Excel",
  formulario: "Formulário",
  confirmado: "Confirmado",
  aguardando_conferencia: "Aguardando conferência",
};
const rotulo = (valor) => rotulos[valor] ?? null;
const simNao = (valor) => (valor == null ? null : valor ? "Sim" : "Não");
const reais = (valor) => (valor == null ? null : Number(valor) / 100);

function filtrar(sql, dados) {
  const busca =
    typeof dados.busca === "string" ? dados.busca.trim().slice(0, 160) : "";
  const numero = busca.replace(/\D/g, "");
  const contato = /^[\d.()/+ -]+$/.test(busca) && numero ? numero : null;
  const origem = dados.origem || null;
  const frequencia = dados.frequencia || null;
  const forma = dados.forma || null;
  return sql`
    SELECT d.* FROM ministerio.admin_doadores d
    WHERE (${origem}::text IS NULL OR d.origem = ${origem})
      AND (
        ${busca} = '' OR strpos(lower(concat_ws(' ', d.nome, d.razao_social, d.email, d.documento)), lower(${busca})) > 0
        OR (${contato}::text IS NOT NULL AND strpos(concat_ws(' ', d.documento, d.whatsapp, d.telefone_legado), ${contato}) > 0)
      )
      AND (
        (${frequencia}::text IS NULL AND ${forma}::text IS NULL) OR EXISTS (
          SELECT 1 FROM ministerio.admin_participacoes p WHERE p.doador_id = d.id
            AND (${frequencia}::text IS NULL OR p.frequencia = ${frequencia})
            AND (${forma}::text IS NULL OR p.forma = ${forma})
        )
      )
  `;
}

export async function listar(sql, dados) {
  const filtro = filtrar(sql, dados);
  const pagina =
    Number.isSafeInteger(dados.pagina) && dados.pagina > 0
      ? Math.min(dados.pagina, 100000)
      : 1;
  const [doadores, [contagem]] = await sql.transaction(
    [
      sql`SELECT d.* FROM (${filtro}) d ORDER BY lower(d.nome), d.id
        LIMIT ${TAMANHO_PAGINA} OFFSET ${(pagina - 1) * TAMANHO_PAGINA}`,
      sql`SELECT count(*) AS total FROM (${filtro}) d`,
    ],
    { isolationLevel: "RepeatableRead", readOnly: true },
  );
  return {
    doadores,
    pagina,
    total: Number(contagem.total),
    porPagina: TAMANHO_PAGINA,
  };
}

export async function historico(sql, id) {
  const [doadores, participacoes, doacoes] = await sql.transaction(
    [
      sql`SELECT * FROM ministerio.admin_doadores WHERE id = ${id}::uuid`,
      sql`SELECT * FROM ministerio.admin_participacoes WHERE doador_id = ${id}::uuid ORDER BY criado_em DESC, id`,
      sql`SELECT * FROM ministerio.admin_doacoes WHERE doador_id = ${id}::uuid ORDER BY data_pagamento DESC, id`,
    ],
    { isolationLevel: "RepeatableRead", readOnly: true },
  );
  return doadores.length
    ? { doador: doadores[0], participacoes, doacoes }
    : null;
}

function aba(livro, nome, colunas, linhas) {
  const planilha = livro.addWorksheet(nome, {
    views: [{ state: "frozen", ySplit: 1 }],
  });
  planilha.columns = colunas.map(([header, width, numFmt]) => ({
    header,
    width,
    style: numFmt ? { numFmt } : {},
  }));
  planilha.addRows(linhas);
  planilha.autoFilter = {
    from: { row: 1, column: 1 },
    to: { row: Math.max(1, planilha.rowCount), column: colunas.length },
  };
  planilha.getRow(1).height = 26;
  planilha.getRow(1).eachCell((cell) => {
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFF39A23" },
    };
    cell.font = { bold: true, color: { argb: "FF2D210E" } };
    cell.alignment = { vertical: "middle" };
  });
  for (let i = 2; i <= planilha.rowCount; i += 2) {
    planilha.getRow(i).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFF6F4F0" },
    };
  }
  return planilha;
}

export async function gerarExcel(doadores, participacoes, doacoes) {
  const livro = new ExcelJS.Workbook();
  livro.creator = "Ministério Pão Vivo";
  const dinheiro = '"R$" #,##0.00';
  aba(
    livro,
    "Doadores",
    [
      ["Código", 38],
      ["Nome", 36],
      ["Razão social", 34],
      ["Endereço", 48],
      ["CEP", 13],
      ["E-mail", 36],
      ["WhatsApp", 19],
      ["Telefone legado", 19],
      ["CPF / CNPJ", 22],
      ["Origem", 16],
    ],
    doadores.map((d) => [
      d.id,
      d.nome,
      d.razao_social,
      d.endereco,
      d.cep,
      d.email,
      d.whatsapp,
      d.telefone_legado,
      d.documento,
      rotulo(d.origem),
    ]),
  );
  aba(
    livro,
    "Participações",
    [
      ["Código do doador", 38],
      ["Nome", 36],
      ["Oração", 12],
      ["Contribuição", 16],
      ["Frequência", 20],
      ["Forma", 19],
      ["Valor de referência", 23, dinheiro],
      ["Ano informado no Excel", 24],
      ["Autoriza contato", 19],
      ["Origem", 16],
    ],
    participacoes.map((p) => [
      p.doador_id,
      p.nome,
      simNao(p.orando),
      simNao(p.contribuindo),
      rotulo(p.frequencia),
      rotulo(p.forma),
      reais(p.valor_declarado_centavos),
      p.ano_informado_excel,
      simNao(p.autoriza_contato),
      rotulo(p.origem),
    ]),
  );
  const pagamentos = aba(
    livro,
    "Doações recebidas",
    [
      ["Código do doador", 38],
      ["Nome", 36],
      ["Data", 15, "dd/mm/yyyy"],
      ["Valor recebido", 22, dinheiro],
      ["Forma", 19],
      ["Conferência", 30],
    ],
    doacoes.map((d) => [
      d.doador_id,
      d.nome,
      new Date(d.data_pagamento),
      reais(d.valor_recebido_centavos),
      rotulo(d.forma),
      rotulo(d.situacao),
    ]),
  );
  doacoes.forEach((d, i) => {
    pagamentos.getCell(i + 2, 6).font = {
      bold: true,
      color: { argb: d.situacao === "confirmado" ? "FF1F633D" : "FF86500A" },
    };
  });
  return Buffer.from(await livro.xlsx.writeBuffer());
}

export async function exportar(sql, dados) {
  const filtro = filtrar(sql, dados);
  const limite = LIMITE_EXPORTACAO + 1;
  const [doadores, participacoes, doacoes] = await sql.transaction(
    [
      sql`SELECT d.* FROM (${filtro}) d ORDER BY lower(d.nome), d.id LIMIT ${limite}`,
      sql`SELECT p.*, d.nome FROM ministerio.admin_participacoes p
        JOIN (${filtro}) d ON d.id = p.doador_id
        ORDER BY lower(d.nome), p.criado_em DESC, p.id LIMIT ${limite}`,
      sql`SELECT a.*, d.nome FROM ministerio.admin_doacoes a
        JOIN (${filtro}) d ON d.id = a.doador_id
        ORDER BY lower(d.nome), a.data_pagamento DESC, a.id LIMIT ${limite}`,
    ],
    { isolationLevel: "RepeatableRead", readOnly: true },
  );
  if (
    [doadores, participacoes, doacoes].some(
      (linhas) => linhas.length > LIMITE_EXPORTACAO,
    )
  )
    return null;
  return gerarExcel(doadores, participacoes, doacoes);
}
