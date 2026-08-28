# Plano de Engenharia

## Objetivo

Melhorar confiabilidade, segurança e capacidade de evolução sem alterar o domínio financeiro sem testes que sustentem a mudança.

## Ordem de execução

### 1. Melhorar o retorno das Server Actions

Substituir erros esperados lançados diretamente por um estado de formulário tipado, preservando exceções inesperadas para observabilidade.

- Prioridade: alta.
- Escopo: `app/actions/` e formulários que usam `action`.
- Critério de aceite: validações e conflitos exibem mensagens no formulário; falhas inesperadas continuam sendo capturadas pelo fluxo existente.
- Testes: validação inválida, usuário sem acesso, recurso inexistente e conflito concorrente.

### 2. Reforçar testes de ownership

Cobrir todas as mutações com registros de outro usuário para garantir que IDs enviados pelo cliente não atravessem a fronteira de propriedade.

- Prioridade: alta.
- Escopo: ações de transações, categorias, metas e recorrências; endpoints de exclusão.
- Critério de aceite: nenhuma operação altera ou revela registros pertencentes a outro usuário.
- Testes: criar, editar, excluir e relacionar conta, categoria e meta com IDs externos.

### 3. Consolidar invalidação de cache

Extrair um helper pequeno para os caminhos de revalidação repetidos após mutações financeiras.

- Prioridade: média.
- Escopo: ações de contas, transações, metas e recorrências.
- Critério de aceite: os mesmos caminhos atuais continuam sendo invalidados, sem duplicação de listas.
- Testes: typecheck e testes das ações; revisar manualmente os caminhos afetados.

### 4. Reduzir consultas preliminares vulneráveis a corrida

Revisar operações que fazem `findFirst` seguido de `create` ou `delete`, mantendo restrições no banco e tratando códigos Prisma de forma consistente.

- Prioridade: média.
- Escopo: categorias, contas e demais entidades com unicidade ou exclusão condicionada.
- Critério de aceite: concorrência não gera duplicidade nem mensagens genéricas para conflitos conhecidos.
- Testes: simular conflito `P2002` e atualização concorrente quando aplicável.

## Gate de cada mudança

1. Formular uma hipótese falsificável a partir de um arquivo, símbolo, teste ou comportamento reproduzível.
2. Consultar Sequential Thinking, Context7 e engenharia-local conforme a instrução de engenharia do workspace.
3. Fazer a menor edição possível e adicionar teste antes de ampliar o escopo.
4. Executar primeiro o teste focado; depois rodar `npm test`, `npm run typecheck` e `npm run lint` quando a alteração atravessar seus respectivos limites.
5. Registrar riscos residuais e não misturar alterações não relacionadas.