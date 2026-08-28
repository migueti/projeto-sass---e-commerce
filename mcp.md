# Engenharia com MCPs

Use este servidor como uma camada local de contexto e feedback para mudanças de engenharia.

## Fluxo recomendado

1. Leia o protocolo e analise apenas os arquivos relevantes.
2. Use Context7 para documentação atual de bibliotecas e frameworks.
3. Use Sequential Thinking para formular uma hipótese falsificável e escolher a menor mudança.
4. Consulte a skill adequada em `mattpock/`: `tdd.md`, `diagnosing-bugs.md`, `code-review.md` ou `improve-codebase-architecture.md`.
5. Edite somente depois de definir uma checagem focada; valide novamente e depois rode os gates necessários.

## Ferramentas locais

- `ler_protocolo`: retorna estas regras.
- `analisar_arquivo`: lê arquivos de texto do repositório, bloqueando segredos, bancos e diretórios gerados.
- `validar_projeto`: executa `test`, `typecheck`, `lint` ou `build` com timeout e sem variáveis de ambiente secretas.

O transporte é stdio: mensagens de diagnóstico devem ir para `stderr`, nunca para `stdout`.