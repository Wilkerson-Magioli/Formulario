# Banco de dados do Ministério Pão Vivo

## Etapa 1

1. No console do Neon, crie um projeto dedicado ao Ministério Pão Vivo ou selecione o projeto já reservado para ele.
2. Abra o **SQL Editor** e selecione a branch e o banco de destino. Use a conta proprietária do banco para aplicar a migração.
3. Execute o conteúdo completo de `migracoes/001_criar_cadastros_e_doacoes.sql` uma única vez por banco. A transação evita que uma falha deixe apenas parte das tabelas criada.
4. Confirme que a consulta abaixo retorna `doacoes_recebidas`, `doadores` e `participacoes`.

```sql
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'ministerio'
ORDER BY table_name;
```

O esquema `ministerio` não concede acesso ao papel público do PostgreSQL. As credenciais com permissões específicas para a API serão configuradas na etapa de integração e usadas somente no servidor. Não use a conta proprietária na API.

Os campos ausentes na planilha podem ficar nulos. CPF e CNPJ são opcionais, armazenados como texto sem pontuação e únicos por tipo. A migração verifica o formato. A validação dos dígitos verificadores cabe à importação e à API.

Uma participação registra uma intenção. Os rótulos históricos `regular` e `nao_regular` ficam separados de `mensal` e `pontual`. Pagamentos têm registros próprios e aguardam conferência por padrão. Os valores são armazenados em centavos para preservar a precisão.

## Etapa 2

Com Python e `openpyxl`, execute na raiz do projeto:

```powershell
python -B banco/importar_parceiros.py "LISTA DE PARCEIROS CADASTRADOS PELA FICHA.xlsx" --gerar-sql
```

Sem `--gerar-sql`, o programa exibe apenas a prévia e os números das linhas em revisão. A geração exige a versão exata da planilha aprovada. O SQL gerado em `output/importacao-parceiros.sql` contém dados pessoais e fica fora do Git. Execute o arquivo apenas no banco autorizado.

O primeiro lote inclui 290 doadores e 290 participações. O telefone antigo fica em `telefone_legado`, separado do WhatsApp informado no formulário. Nenhum pagamento é lançado. A execução é transacional. Reaplicar o mesmo arquivo preserva os registros existentes e não duplica o lote. Um CPF já associado a outro código interrompe a carga para revisão.

Depois de executar o arquivo no Neon, confira as quantidades:

```sql
SELECT
    (SELECT count(*) FROM ministerio.doadores WHERE origem = 'excel') AS doadores_excel,
    (SELECT count(*) FROM ministerio.participacoes WHERE origem = 'excel') AS participacoes_excel,
    (SELECT count(*) FROM ministerio.doacoes_recebidas) AS pagamentos;
```

## Etapa 3

1. No SQL Editor do Neon, selecione a branch `production` e o banco `neondb`. Execute `migracoes/002_registrar_participacao.sql` com a conta que aplicou a etapa 1.
2. Em uma sessão administrativa do `psql` conectada ao mesmo banco, crie o login com `CREATE ROLE mpv_formulario_api LOGIN;` e conceda o papel com `GRANT mpv_formulario TO mpv_formulario_api;`. No Windows, use `\set HISTFILE NUL` antes de definir a senha com `ALTER ROLE mpv_formulario_api WITH PASSWORD 'SUA_NOVA_SENHA';`. Execute em uma sessão privada. Esse login pode chamar a função de cadastro e fica sem acesso direto às tabelas.
3. No projeto da Vercel, abra **Settings → Environments → Production**. Em **Environment Variables**, crie `MPV_DATABASE_URL` como **Secret**, com a conexão do login restrito. Mantenha a configuração de TLS indicada pelo Neon. A variável deve estar configurada antes de publicar a integração.
4. Após a publicação, confira o cadastro e a abertura do WhatsApp. Um cadastro gera uma participação, sem lançar um pagamento. O envio da mensagem continua sendo confirmado pelo participante no aplicativo.

O reenvio do mesmo formulário após uma falha reutiliza a chave de envio enquanto a página estiver aberta. Se o CPF ou CNPJ já existir, o banco vincula a participação ao cadastro correspondente e guarda os dados recebidos na participação. Sem documento, um envio novo cria outro cadastro, pois e-mail e telefone podem ser compartilhados.

Para testar localmente com um banco de teste, forneça `MPV_DATABASE_URL` ao processo do servidor e rode `npm run dev`.
