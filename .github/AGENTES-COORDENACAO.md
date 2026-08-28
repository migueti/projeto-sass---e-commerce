# Coordenação entre abas de IA

O hook `hooks/coordinate-agents.json` injeta este protocolo no início da sessão e antes de cada prompt:

- Trate as outras abas como sessões concorrentes no mesmo workspace.
- Consulte `git status` e o diff antes de editar.
- Preserve alterações que não pertencem à sua tarefa.
- Trabalhe em escopo pequeno e valide imediatamente após editar.
- Não use `git reset`, `git checkout` ou comandos destrutivos para desfazer trabalho de outra sessão.
- O hook registra cada sessão identificada em `.git/agent-coordination/`, que é transitório e não deve ser commitado.

O registro informa presença, não sincroniza históricos de conversa nem resolve conflitos automaticamente. Para dividir trabalho, cada aba deve declarar no prompt quais arquivos ou objetivo está assumindo.

## Registro de execução e documentação

- Antes de iniciar cada tarefa, defina objetivo, arquivos impactados, validação mínima e risco de regressão.
- Registre o que foi analisado, o que foi decidido e o que será validado em um arquivo de sessão ou nota de trabalho.
- Quando a mudança tiver um impacto real em arquitetura, produto ou segurança, documente a decisão com contexto, motivo e ponto de atenção.
- Se o Obsidian MCP estiver disponível, sincronize a observação diretamente para a base de conhecimento do projeto. Quando não estiver disponível, grave o mesmo registro em um arquivo local persistente do ambiente e mencione a limitação no resumo final.
- Mantenha os registros curtos, objetivos e úteis para retomada de contexto por futuras sessões.

## Checklist de engenharia

- Entenda a causa raiz antes de editar; leia o menor contexto necessário para formular uma hipótese.
- Prefira correções focadas e testes de regressão pequenos sobre refatorações amplas.
- Valide com o comando mais específico possível: teste de arquivo, typecheck ou lint do escopo alterado.
- Respeite regras de domínio: propriedade do usuário, valores monetários em centavos, revalidação de rotas e segurança de mutações.
- Atualize documentação diretamente relacionada ao comportamento alterado.
