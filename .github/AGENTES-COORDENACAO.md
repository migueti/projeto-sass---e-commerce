# Coordenação entre abas de IA

O hook `hooks/coordinate-agents.json` injeta este protocolo no início da sessão e antes de cada prompt:

- Trate as outras abas como sessões concorrentes no mesmo workspace.
- Consulte `git status` e o diff antes de editar.
- Preserve alterações que não pertencem à sua tarefa.
- Trabalhe em escopo pequeno e valide imediatamente após editar.
- Não use `git reset`, `git checkout` ou comandos destrutivos para desfazer trabalho de outra sessão.
- O hook registra cada sessão identificada em `.git/agent-coordination/`, que é transitório e não deve ser commitado.

O registro informa presença, não sincroniza históricos de conversa nem resolve conflitos automaticamente. Para dividir trabalho, cada aba deve declarar no prompt quais arquivos ou objetivo está assumindo.
