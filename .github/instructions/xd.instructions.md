---
description: Políticas obrigatórias do projeto para agents, MCPs e validação local
applyTo: '**/*.{ts,tsx,js,jsx,json,md}'
---

Sempre que trabalhar neste projeto, o agente deve usar os MCPs e ferramentas a seguir antes de decidir uma alteração de código, arquitetura, debug ou validação:

- Context7: consulte a documentação atual do framework, biblioteca, SDK, API ou CLI envolvida antes de implementar algo novo ou ajustar configuração.
- Sequential Thinking: decomponha o problema, formule hipóteses, revise alternativas e escolha a menor mudança segura.
- Engenharia Local: valide o projeto com os comandos e verificações disponíveis do workspace antes de concluir a tarefa.

## Contexto do projeto
- Este repositório é um app de finanças pessoais em Next.js 16 com App Router e React 19.
- O sistema gerencia contas, categorias, lançamentos, recorrências, metas financeiras e acesso pago/admin.
- Dados financeiros são por usuário autenticado; todas as operações de leitura/escrita devem respeitar ownership e sessão.
- O banco é Prisma e o padrão de dinheiro é em centavos (Int) para valores monetários.
- Validação de formulários e APIs usa schemas Zod compartilhados e parse de datas locais em YYYY-MM-DD.

## Regras obrigatórias
- Todo acesso a dados do usuário deve derivar da sessão via requireUser(), requirePaidUser() ou requireAdminUser().
- Não use IDs vindos do cliente como fonte de verdade para ownership, nem para queries ou mutations.
- Sempre inclua userId na consulta de registros e em relações relacionadas (conta, categoria, transação, meta, etc.).
- Use Server Actions para mutations; use transações Prisma quando múltiplas entidades forem alteradas ao mesmo tempo.
- Revalide rotas após mutações bem-sucedidas com revalidatePath() ou revalidatePaths().
- Preserve regras financeiras: valores em centavos, datas em YYYY-MM-DD, validação via Zod e consistência do dashboard.
- Ajustes em cobrança/pagamento devem respeitar acesso pago no servidor; checkout não concede acesso automaticamente.
- Acesso admin deve vir do papel ADMIN ou do email configurado em ADMIN_EMAIL; não hardcode credenciais de admin.
- Preserve nomenclatura e mensagens em português para rotas, labels e erros de validação.
- O app deve funcionar em ambiente local sem expor secrets, tokens, senhas ou dados financeiros em logs ou respostas.

## Proibido
- Não inventar regras de negócio que não existam no projeto.
- Não usar IDs do cliente como autoridade sobre propriedade de dados.
- Não persistir valores monetários em decimal; nunca use floats para dinheiro.
- Não duplicar validação ou acesso em componentes, rotas e actions quando um helper compartilhado já exista.
- Não ignorar autenticação, autorização, concorrência ou proteção de rotas.
- Não responder em inglês quando o padrão do projeto e do usuário forem em português.
- Não fechar uma tarefa sem validação executável concreta.

## Critérios de aceite
- A mudança resolve o problema com a menor alteração possível.
- A regra de negócio foi preservada e a autenticação/ownership continuam corretos.
- O código respeita Prisma, Zod, userId e revalidação da rota quando aplicável.
- A validação mais específica disponível foi executada e o resultado foi confirmado.
- A resposta final foi dada em português e sem inventar conclusões.

## Política de implementação rígida
- Sempre que um problema envolver segurança, auth, acesso pago, concorrência, transações, dashboard financeiro ou persistência, estude a regra de negócio antes de alterar qualquer fluxo.
- O servidor é a fonte de autoridade; a UI não substitui validação nem autorização.
- Quando houver um problema de build/dev, trate a causa raiz antes de propor correção.
- Respeite o padrão do projeto e evite refatorações sem necessidade.
- Sempre responda em português e mantenha a comunicação técnica clara, objetiva e sem inventar fatos.

## Formato de toolset recomendado

```jsonc
{
  "context7": {
    "tools": [
      "mcp_context7_query-docs",
      "mcp_context7_resolve-library-id"
    ],
    "description": "Documentação atual de bibliotecas e frameworks",
    "icon": "book"
  },
  "sequentialThinking": {
    "tools": [
      "mcp_sequential-th_sequentialthinking"
    ],
    "description": "Análise passo a passo e revisão de hipóteses",
    "icon": "debug"
  },
  "engenhariaLocal": {
    "tools": [
      "mcp_engenharia-lo_analisar_arquivo",
      "mcp_engenharia-lo_ler_protocolo",
      "mcp_engenharia-lo_validar_projeto"
    ],
    "description": "Validação e inspeção local do projeto",
    "icon": "tools"
  }
}
```

Este formato deve ser usado quando for configurar grupos de ferramentas para o ambiente do editor.

Regras finais de ativação:
- O arquivo .github/instructions/xd.instructions.md deve permanecer no workspace do projeto para que o agente carregue estas regras automaticamente.
- A ativação automática depende da engine do editor/agent reconhecer arquivos de instrução em .github/instructions e do reload do contexto atual.
- Em caso de dúvidas, valide a presença do arquivo e o applyTo antes de concluir a tarefa.
- Em qualquer tarefa de engenharia, responda sempre em português, priorize o comportamento real do app e valide com comando executável antes de afirmar que a correção está concluída.