# Ministério Pão Vivo — formulário de participação

Projeto local em português (Brasil), com HTML, CSS e JavaScript, sem instalação de dependências.

## Executar

No terminal desta pasta:

```sh
npm run dev
```

Abra http://127.0.0.1:5173. Para editar no VS Code, abra esta pasta ou execute `code .`.

## Arquivos

- `public/index.html`: textos, campos, dados bancários e links.
- `public/styles.css`: identidade visual e layout responsivo.
- `public/app.js`: campos condicionais, máscaras, Pix e mensagem do WhatsApp.
- `public/assets/`: logotipo e QR Code extraídos do PDF fornecido.
- `server.mjs`: servidor local usando apenas recursos do Node.js.

## Funcionamento

O formulário valida os campos e mostra uma etapa final com as orientações. Quem contribui vê o QR Code Pix, o valor de referência e os dados bancários. O botão de cadastro abre uma mensagem para o WhatsApp **(51) 99346-3773**. O visitante precisa tocar em enviar; o envio não é automático. O comprovante deve ser anexado manualmente na conversa. Não há banco de dados, upload, cobrança ou confirmação bancária nesta versão. Os dados não são guardados pelo projeto nem em localStorage.

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
