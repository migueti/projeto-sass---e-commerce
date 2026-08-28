# Modelo de domínio

## Contextos delimitados

### Identidade e acesso

Responsável por usuários, sessões, papéis administrativos e elegibilidade de acesso.

### Financeiro pessoal

Responsável por contas, categorias, transações, metas e recorrências. O usuário é o limite de ownership de todos os dados financeiros.

### Cobrança

Responsável por preço do plano, pagamentos, checkout e confirmação por webhook. O status de pagamento não substitui a autorização administrativa.

## Linguagem ubíqua

- **Conta financeira**: carteira ou conta que possui saldo inicial e lançamentos.
- **Lançamento**: receita ou despesa ocorrida em uma data civil.
- **Meta**: objetivo financeiro com valor alvo, valor guardado e status.
- **Aporte**: lançamento de despesa vinculado a uma meta.
- **Recorrência**: regra que gera lançamentos futuros segundo uma frequência.
- **Dinheiro**: valor representado por inteiros em centavos de real.
- **Administrador**: usuário com papel `ADMIN` ou e-mail administrativo configurado.

## Camadas

- `lib/domain/`: entidades, objetos de valor, invariantes e contratos de repositório.
- `lib/application/`: casos de uso que coordenam o domínio.
- `lib/infrastructure/`: adaptadores para Prisma e serviços externos.
- `app/actions/` e `app/api/`: entrada do sistema; autenticam, validam ownership, chamam casos de uso e revalidam rotas.

## Agregados aplicados

`Transaction` é uma entidade do contexto Financeiro. `Money` é seu objeto de valor para impedir valores fracionários ou negativos. A criação passa pelo caso de uso `createTransaction`, enquanto a action mantém as regras de sessão, ownership de conta/categoria e parsing de formulário.

`FinancialGoal` é um agregado do mesmo contexto. Ele protege o valor alvo, o valor guardado, o limite de aportes e a transição para `COMPLETED`. A action mantém a transação que atualiza a meta e cria o lançamento vinculado.

## Próximas evoluções

1. Extrair o motor de recorrências como serviço de domínio concorrente.
2. Isolar cobrança e confirmação de pagamento como contexto externo ao Financeiro.
3. Adicionar repositórios Prisma para os agregados conforme cada caso de uso for migrado.