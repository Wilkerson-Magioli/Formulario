# Ministério Pão Vivo — formulário de participação

Ao finalizar, o navegador gera uma ficha PNG com as respostas, identidade visual do Ministério e autorização de contato. A ficha é criada localmente, não é enviada ao servidor e pode ser baixada. A imagem fica disponível apenas para download pelo doador. A ficha não é um comprovante bancário. Ao finalizar, o navegador abre o WhatsApp com o cadastro em texto; o doador precisa confirmar o envio no WhatsApp. Há um link alternativo se a abertura for bloqueada.

Projeto local em português (Brasil), com HTML, CSS e JavaScript, sem dependências de execução no navegador.

## Executar

No terminal desta pasta:

```sh
npm run dev
```

Abra http://127.0.0.1:5173. Para editar no VS Code, abra esta pasta ou execute `code .`.

## Arquivos

- `public/index.html`: textos, campos, dados bancários e links.
- `public/styles.css`: identidade visual e layout responsivo.
- `public/app.js`: eventos, campos condicionais, Pix e navegação entre etapas.
- `public/participation.js`: máscaras, validação, dados normalizados, resumo e mensagem do WhatsApp.
- `public/card-renderer.js`: desenho e dimensionamento da ficha PNG.
- `public/participation-card.js`: prévia, download e descarte da imagem.
- `tests/`: testes automatizados com o executor nativo do Node.js.
- `public/assets/`: logotipo e QR Code extraídos do PDF fornecido.
- `server.mjs`: servidor local usando apenas recursos do Node.js.

## Funcionamento

O formulário valida os campos e mostra uma etapa final com as orientações. Quem contribui vê o QR Code Pix, o valor de referência e os dados bancários. O cadastro em texto é preparado para o número oficial (51) 99346-3773. O envio no WhatsApp exige confirmação do doador. A ficha PNG fica somente para download e uso pessoal do doador. O comprovante deve ser anexado manualmente na conversa. Não há banco de dados, upload, cobrança ou confirmação bancária nesta versão. Os dados não são guardados pelo projeto nem em localStorage.

Quem escolhe apenas oração não precisa preencher os campos financeiros. Oração e contribuição podem ser selecionadas juntas. A oferta mensal não cadastra débito ou recorrência automática.

O QR Code original foi decodificado e seu payload foi utilizado no botão Copia e Cola. Os dados de agência e conta seguem a mensagem do solicitante. Antes de confirmar a doação, o doador deve conferir o favorecido no aplicativo bancário.

Paleta consultada no site oficial: creme `#FFF6E5`, dourado `#F9BF51`, laranja `#ED6124`. Fontes Google têm alternativas locais caso a conexão não esteja disponível.

## Validação

`npm run check` verifica a sintaxe do JavaScript. O site pode ser hospedado como arquivos estáticos a partir de `public/`, usando HTTPS. O projeto usa publicação estática pelo Sites, com configuração em `.openai/hosting.json`. Execute `npm run build` para preparar `dist/`.

Na entrega, foram verificados no Chrome: visualização em desktop e celular (390 px), ausência de rolagem horizontal, máscaras de CEP e telefone, validação de participação, fluxo apenas de oração, oferta mensal, desativação dos campos financeiros, mensagem e destinatário do WhatsApp, alternativa de cópia manual do Pix e ausência de erros JavaScript. Nenhuma mensagem ou doação foi enviada durante os testes.

## QR Code de acesso e endereço público

- Formulário: https://pao-vivo-participar.risencrab2.chatgpt.site/
- Página para baixar e divulgar o QR Code 1: https://pao-vivo-participar.risencrab2.chatgpt.site/acesso.html
- Arquivo de imagem: `public/assets/qr-code-acesso.png`.

O QR Code 1 leva ao formulário público. O QR Code 2 é o Pix original e aparece depois do preenchimento para quem escolheu contribuir. O cadastro fica em memória apenas durante o preenchimento e deve ser enviado pelo visitante no WhatsApp. Ainda não há persistência de cadastros ou migração para Next.js nesta versão.

O QR Code de acesso usa o logotipo, moldura dourada e fundo creme, sem o título "Ministério Pão Vivo - Doações" e sem o cabeçalho "QR CODE 1 — ACESSO AO FORMULÁRIO". Os módulos usam o marrom escuro `#523F1B` e preservam margem branca de quatro módulos. A arte pode ser regenerada por `scripts/style-access-qr.py` com Pillow e ReportLab. O QR Code Pix original não foi alterado.

A página `/acesso` usa fundo branco, logotipo oficial centralizado, fotografia da comunidade do site oficial e o laranja `#D36A38` da referência fornecida. Não possui botões de navegação nem o parágrafo de instruções removido. O QR Code em si também é um link acessível ao formulário. A arte para divulgação é regenerada com esses mesmos recursos pelo script.

## Contato oficial de WhatsApp

Modo de teste encerrado. O cadastro e o envio de comprovantes usam **(51) 99346-3773** (`5551993463773`). Não há indicação de teste na página, na mensagem ou na ficha. O texto é preparado automaticamente, mas o doador confirma o envio no WhatsApp. A ficha em imagem fica somente para download pelo doador.

O valor da oferta usa máscara monetária brasileira com centavos automáticos: digitar `100` exibe `1,00`, e digitar `123456` exibe `1.234,56`. O valor é convertido para número antes de gerar a ficha. A validação exige valor maior que zero e de até R$ 9.999.999,00.

## Finalização

Depois de enviar o cadastro, contribuir e enviar o comprovante, o doador marca uma confirmação e pode finalizar. A tela de sucesso registra somente essa declaração; não há verificação automática de pagamento ou entrega de mensagens. Quem participa apenas em oração possui finalização própria, sem mensagem de doação. O botão Sair exibe agradecimento, limpa o formulário e remove a ficha gerada da memória da página.

## Manutenção e testes automatizados

Use Node.js 22 ou superior e `npm ci` para instalar o Prettier, usado somente no desenvolvimento. Execute:

```sh
npm run check
npm test
npm run format:check
npm run build
```

`npm run format` padroniza HTML, CSS e JavaScript. Os scripts do navegador usam `defer` na ordem declarada no HTML. O objeto `Participation` reúne as regras compartilhadas; a mesma ficha normalizada alimenta o texto e a imagem.

Os testes cobrem valores, máscaras, conteúdo e destinatário do WhatsApp, oração, contribuição, confirmação antes de finalizar, limpeza ao sair, download e cancelamento de gerações antigas da ficha. Usam interface e navegador simulados, sem enviar mensagens ou realizar pagamentos. A inspeção visual em navegador real continua necessária para mudanças de layout.

## Contribuição por boleto

Ao escolher Boleto bancário, o doador informa se é pessoa física ou jurídica. CPF ou CNPJ é obrigatório e recebe máscara e validação dos dígitos verificadores; CNPJs numéricos e alfanuméricos são aceitos. Para pessoa jurídica, a razão social também é obrigatória. Esses dados entram na mensagem do WhatsApp e na ficha PNG somente para boleto. Trocar para Pix, transferência ou somente oração exclui esses campos do cadastro preparado.

O Ministério emite o boleto manualmente pelo banco e envia ao WhatsApp informado. O site não gera boleto bancário nem código de barras de cobrança. A finalização de boleto orienta aguardar a emissão, sem declarar pagamento realizado. O PDF de acesso continua levando ao início da página inicial.

## QR Code com link clicável

A página `/acesso` oferece o link “Toque aqui para participar e doar” abaixo do QR Code e o download da versão clicável em PDF. O PDF está em `public/assets/qr-code-acesso-clicavel.pdf`; tanto o código quanto o botão abrem o início da página inicial. Para enviar pelo WhatsApp com os links preservados, anexe o PDF como documento. Uma imagem PNG ou uma captura de tela não preserva links clicáveis.

Para regenerar o PDF, use `python scripts/create-clickable-qr.py` com ReportLab instalado. A arte-base está em `public/assets/qr-code-divulgacao.png`.
