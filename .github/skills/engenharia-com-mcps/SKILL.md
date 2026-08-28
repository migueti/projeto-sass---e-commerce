---
name: engenharia-com-mcps
description: "Conduza melhorias, revisões, debugging, refatorações e planejamento de engenharia com coordenação entre abas de IA. Use quando a tarefa envolver qualidade, segurança, autorização, concorrência, validação, observabilidade ou evolução do projeto. Consulte Context7, Sequential Thinking e Obsidian antes de decidir; valide mudanças e registre o trabalho."
argument-hint: "Descreva o problema, comportamento, arquivo ou objetivo de engenharia"
user-invocable: true
disable-model-invocation: false
---

# Engenharia com MCPs

## Objetivo

Produzir mudanças pequenas, seguras e verificáveis, mantendo todas as sessões de IA coordenadas pelo estado compartilhado do workspace e pela documentação do projeto.

## Quando usar

- Investigar bugs, falhas de build, regressões ou comportamentos inesperados.
- Revisar segurança, ownership, autenticação, autorização e limites de acesso.
- Melhorar validação, concorrência, transações, observabilidade ou desempenho.
- Refatorar código existente sem alterar contratos indevidamente.
- Planejar uma etapa técnica com critérios de aceite e riscos explícitos.

## Protocolo obrigatório

1. **Coordenar sessões**
   - Consulte `git status` e o diff antes de editar.
   - Leia `.github/AGENTES-COORDENACAO.md` quando a tarefa envolver múltiplas abas.
   - Preserve alterações de outras sessões; não use `git reset`, `git checkout` ou comandos destrutivos.
   - Declare mentalmente um escopo de arquivos e evite editar o mesmo arquivo que outra sessão está modificando.

2. **Verificar MCPs**
   - Use Sequential Thinking para decompor o problema, questionar hipóteses e revisar a decisão.
   - Resolva o ID da biblioteca e consulte Context7 para a documentação atual do framework, biblioteca, SDK, API ou CLI envolvida.
   - Busque e leia notas relevantes no Obsidian antes de alterar comportamento documentado.
   - Se um MCP obrigatório estiver indisponível, registre a limitação. Quando a instrução do projeto exigir o MCP como pré-condição, interrompa a implementação e peça a reativação.
   - Não invente resultados de ferramentas.

3. **Formular uma hipótese**
   - Comece pelo anchor mais concreto: arquivo, símbolo, teste, erro, comando ou reprodução.
   - Leia somente o contexto local necessário.
   - Escreva uma hipótese falsificável sobre a causa ou comportamento esperado.
   - Defina uma checagem barata que possa refutar a hipótese.
   - Escolha o menor escopo capaz de testar essa hipótese.

4. **Planejar antes de editar**
   - Defina objetivo, arquivos impactados, validação mínima, risco de regressão e critério de aceite.
   - Preserve APIs e padrões locais.
   - Para mutations, confirme autenticação, ownership, validação de relações, valores monetários em centavos, datas civis e revalidação de rotas.
   - Para código concorrente, prefira transações e atualizações condicionais atômicas quando o domínio exigir consistência.

5. **Editar e validar**
   - Faça a menor edição possível, preferindo um teste de regressão próximo da regra alterada.
   - Imediatamente após a primeira edição, execute o teste focado ou a reprodução mais específica disponível.
   - Se falhar, corrija somente o mesmo escopo e repita a checagem antes de ampliar a investigação.
   - Depois, execute os gates adequados: `npm test`, `npm run typecheck`, `npm run lint` e `npm run build` quando aplicável.
   - Use `git diff --check` ao finalizar.

6. **Registrar o trabalho**
   - No Obsidian, acrescente uma nota curta contendo data, objetivo, contexto, hipótese, decisão, arquivos, validações, resultado, risco residual e próximo passo.
   - Prefira uma nota existente de engenharia quando houver uma relacionada; leia-a antes de acrescentar conteúdo.
   - Se o Obsidian estiver indisponível, registre a mesma informação em arquivo local de sessão e informe a limitação no resumo.
   - Não registre segredos, tokens, dados financeiros ou conteúdo sensível.

## Critérios de conclusão

A tarefa só está concluída quando:

- A mudança atende um critério de aceite claro.
- O teste focado ou reprodução foi executado após a edição.
- Os gates relevantes foram executados e seus resultados são conhecidos.
- Alterações concorrentes foram preservadas.
- O resultado, os MCPs utilizados, os riscos residuais e o próximo passo foram registrados no Obsidian ou localmente.

## Limites importantes

Esta skill coordena contexto de trabalho, mas não sincroniza automaticamente o histórico das conversas entre abas nem resolve conflitos de edição. Cada sessão deve declarar seu objetivo e arquivos assumidos. O registro compartilhado indica presença e decisões; ele não substitui revisão humana nem controle de versão.
