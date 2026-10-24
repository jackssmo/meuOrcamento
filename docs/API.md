# Referência da API

URL base local:

```text
http://localhost:3000/api
```

Rotas privadas exigem:

```http
Authorization: Bearer <token>
```

## Autenticação

### `POST /auth/register`

Cria uma conta e inicializa cartões padrão (Nubank, Inter, Mercado Pago).

```json
{
  "name": "Jackson",
  "email": "jackson@example.com",
  "password": "senha-segura"
}
```

### `POST /auth/login`

Autentica o usuário e retorna `token` e `user`.

### `GET /auth/profile`

Retorna os dados do usuário autenticado sem a senha.

### `PUT /auth/profile`

Atualiza nome, e-mail e opcionalmente a senha.

```json
{
  "name": "Jackson",
  "email": "jackson@example.com",
  "currentPassword": "senha-atual",
  "newPassword": "nova-senha"
}
```

## Transações

### `POST /transactions`

Cria uma receita ou despesa.

```json
{
  "description": "Supermercado",
  "amount": 350.50,
  "type": "expense",
  "category": "alimentacao",
  "card": "Nubank",
  "is_paid": false,
  "date": "2026-10-30",
  "is_fixed": false,
  "installments": 1
}
```

`is_fixed` é usado para receitas recorrentes. Para despesas parceladas, use `installments` maior que 1.
`is_paid`: boolean que indica se a despesa já foi paga. Despesas pagas não comprometem o limite do cartão (o valor é abatido).

### `GET /transactions`

Parâmetros opcionais:

- `month`: 1 a 12;
- `year`;
- `search`;
- `type`: `income` ou `expense`;
- `page`;
- `pageSize`.

Resposta:

```json
{
  "data": [],
  "pagination": {
    "page": 1,
    "pageSize": 20,
    "total": 0,
    "totalPages": 0
  }
}
```

### `GET /transactions/summary`

Recebe `month` e `year` e retorna receitas, despesas, saldo e saldo realizado.

### `PUT /transactions/:id`

Edita descrição, valor, tipo, categoria, data, cartão e status de pagamento (`is_paid`).

### `PATCH /transactions/:id/payment`

Alterna ou define o status de pagamento de uma despesa. Ao marcar como paga (`is_paid: true`), o limite do cartão associado é liberado automaticamente.

```json
{
  "is_paid": true
}
```

### `DELETE /transactions/:id`

Exclui uma transação. Se for uma receita fixa ou parcelamento, pode remover ocorrências da mesma série via `?scope=series`.

## Relatórios

### `GET /financial/reports/monthly?year=2026`

Retorna totais mensais do ano.

### `GET /financial/reports/monthly?month=10&year=2026`

Retorna gastos por categoria, despesas por cartão e totais diários do mês.

## Recursos financeiros auxiliares

Rotas autenticadas disponíveis para `cards`, `accounts`, `categories`, `budgets` e `goals`:

```text
GET    /financial/:resource
POST   /financial/:resource
PATCH  /financial/:resource/:id
DELETE /financial/:resource/:id
```

### Cartões de Crédito (`cards`)

- `GET /financial/cards`: Retorna os cartões com `credit_limit`, `used_limit` (calculado a partir das despesas pendentes do cartão) e `available_limit` (`credit_limit - used_limit`).
- `POST /financial/cards`: Cria cartão com `name` e `credit_limit`.
- `PATCH /financial/cards/:id`: Atualiza `name` e/ou `credit_limit`.
