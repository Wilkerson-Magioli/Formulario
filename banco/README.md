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
