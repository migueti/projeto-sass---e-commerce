---
name: "Engenharia de Código com MCPs"
description: "Use when analyzing, reviewing, refactoring, debugging, or improving code and engineering practices in this workspace. Always coordinate Context7, Sequential Thinking, and Obsidian when this instruction is invoked."
---
# Engenharia de Código com MCPs

- Como esta instrução é invocada explicitamente pelo usuário, trate a ativação dos MCPs como pré-condição: no início de cada tarefa, verifique Context7, Sequential Thinking e Obsidian antes de analisar ou editar qualquer arquivo.
- Se algum servidor estiver desativado, interrompa o fluxo de implementação e informe ao usuário que ele precisa ser reativado pelos controles de MCP do VS Code. Não presuma que a instrução consegue ligar servidores desativados; depois da reativação, repita a verificação.
- Se o ambiente não expuser o estado ou o controle de um servidor, registre essa limitação e não esconda a falha; use os MCPs que estiverem disponíveis e sinalize quais não puderam ser ativados.
- Comece pelo ponto mais concreto disponível: arquivo, símbolo, teste, erro, comando ou comportamento reproduzível.
- Antes da primeira edição, leia apenas o contexto local necessário para formular uma hipótese falsificável sobre a causa ou o comportamento esperado e defina uma checagem barata que possa refutá-la.
- Sempre use o MCP Sequential Thinking para decompor o problema, questionar hipóteses e revisar a decisão antes de editar, mesmo em tarefas aparentemente simples.
- Sempre use o MCP Context7 para consultar documentação atual relacionada ao stack, às bibliotecas, aos frameworks, aos SDKs, às APIs ou às CLIs do projeto. Resolva o identificador da biblioteca antes de consultar sua documentação; quando não houver uma biblioteca diretamente envolvida, consulte a documentação do framework principal ou do VS Code/agent customization.
- Sempre use o MCP Obsidian para buscar e ler notas relevantes sobre decisões, processos ou domínio antes de alterar comportamentos documentados. Se não houver nota aplicável, registre explicitamente essa ausência no resumo.
- Não simule nem invente resultados de MCP. Se algum MCP estiver indisponível, falhar ou não retornar contexto útil, registre qual etapa foi afetada e continue apenas com as fontes locais verificáveis.
- Analise código frágil com foco na causa raiz: contratos, validação, autorização, estado, concorrência, tratamento de erros, observabilidade, desempenho e legibilidade, conforme o risco da mudança.
- Prefira as convenções, abstrações e comandos existentes no repositório. Faça a menor alteração que resolva o problema e não refatore áreas não relacionadas.
- Depois da primeira edição, execute imediatamente a validação mais específica disponível: teste focado, comando de reprodução, typecheck, lint ou build. Corrija problemas no mesmo escopo e repita a validação.
- Ao finalizar, informe o que mudou, quais MCPs foram usados, a validação executada e qualquer lacuna ou risco residual. Não considere a tarefa concluída sem uma validação executável quando o ambiente oferecer uma.