# Instrucoes do MCP Mercado Pago

- Use o SDK oficial `@modelcontextprotocol/sdk` e transporte `stdio`.
- Para documentacao, use somente fontes oficiais do Mercado Pago Brasil e informe a URL especifica consultada.
- Nao invente endpoints, campos, respostas ou disponibilidade por pais. Quando a documentacao nao estiver disponivel, informe a limitacao.
- Nunca exponha `MERCADOPAGO_ACCESS_TOKEN`; use credenciais de teste durante o desenvolvimento.
- Mantenha `MERCADOPAGO_READ_ONLY=true` por padrao. Operacoes mutaveis exigem confirmacao explicita, idempotencia e validacao da documentacao oficial.
- Referencias: https://github.com/modelcontextprotocol/typescript-sdk e https://modelcontextprotocol.io/
