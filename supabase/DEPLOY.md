# Deploy das Edge Functions

## 1. Instalar Supabase CLI

```bash
npm install -g supabase
supabase login
supabase link --project-ref oicuhuxpvdrxxdnxucjm
```

## 2. Configurar secrets (uma vez)

```bash
supabase secrets set STRIPE_SECRET_KEY=sk_live_...
supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_...
supabase secrets set STRIPE_PRICE_ID_BASIC=price_...
supabase secrets set STRIPE_PRICE_ID_PRO=price_...
supabase secrets set STRIPE_PRICE_ID_PREMIUM=price_...
supabase secrets set RESEND_API_KEY=re_...
supabase secrets set "EMAIL_FROM=BarberOS <noreply@barberos.io>"
```

## 3. Deploy das funções

```bash
supabase functions deploy auth-login
supabase functions deploy billing-create-checkout
supabase functions deploy billing-webhook
supabase functions deploy send-email
```

## 4. Registrar o webhook no Stripe

No Stripe Dashboard > Developers > Webhooks > Add endpoint:

- **URL:** `https://oicuhuxpvdrxxdnxucjm.supabase.co/functions/v1/billing-webhook`
- **Eventos a escutar:**
  - `checkout.session.completed`
  - `customer.subscription.updated`
  - `customer.subscription.deleted`
  - `invoice.payment_failed`

Copie o **Signing secret** gerado e rode:
```bash
supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_...
```

## 5. Criar os produtos no Stripe

No Stripe Dashboard > Products > Add product:

| Produto | Preço | Recorrência | Anotar |
|---------|-------|-------------|--------|
| BarberOS Básico | R$ 67 | Mensal | `STRIPE_PRICE_ID_BASIC` |
| BarberOS Pro    | R$127 | Mensal | `STRIPE_PRICE_ID_PRO` |
| BarberOS Premium| R$247 | Mensal | `STRIPE_PRICE_ID_PREMIUM` |

## 6. Testar localmente (opcional)

```bash
supabase start
supabase functions serve --env-file .env.local
stripe listen --forward-to http://localhost:54321/functions/v1/billing-webhook
```

## 7. Aplicar migration do banco

```bash
supabase db push
```

Isso adiciona as colunas `price` e `service_category` na tabela `appointments`.

## Checklist pré-produção

- [ ] `VITE_STRIPE_PUBLISHABLE_KEY` setado em `.env.local` com `pk_live_...`
- [ ] Todos os secrets setados via `supabase secrets set`
- [ ] Migration aplicada (`supabase db push`)
- [ ] Webhook registrado no Stripe com os 4 eventos
- [ ] Testar fluxo completo com cartão de teste Stripe (`4242 4242 4242 4242`)
- [ ] Verificar email de boas-vindas chegando após pagamento
- [ ] RLS policies revisadas no Supabase Dashboard
