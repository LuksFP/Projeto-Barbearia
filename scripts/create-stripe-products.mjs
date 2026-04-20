import Stripe from 'stripe'

const key = process.env.STRIPE_SECRET_KEY
if (!key) {
  console.error('❌ Defina a variável: STRIPE_SECRET_KEY=sk_live_... node scripts/create-stripe-products.mjs')
  process.exit(1)
}

const stripe = new Stripe(key)

const plans = [
  { id: 'basic',   name: 'Básico',   amount: 1990 },
  { id: 'pro',     name: 'Pro',      amount: 5990 },
  { id: 'premium', name: 'Premium',  amount: 7990 },
]

console.log('Criando produtos no Stripe...\n')

const results = {}

for (const plan of plans) {
  // Cria o produto
  const product = await stripe.products.create({
    name: `BarberOS ${plan.name}`,
    metadata: { plan_id: plan.id },
  })

  // Cria o preço recorrente mensal em BRL
  const price = await stripe.prices.create({
    product: product.id,
    unit_amount: plan.amount,
    currency: 'brl',
    recurring: { interval: 'month' },
    metadata: { plan_id: plan.id },
  })

  results[plan.id] = price.id
  console.log(`✓ ${plan.name}: ${price.id}`)
}

console.log('\n📋 Rode o comando abaixo para atualizar os secrets:')
console.log(`\nnpx supabase@latest secrets set \\`)
console.log(`  STRIPE_PRICE_ID_BASIC=${results.basic} \\`)
console.log(`  STRIPE_PRICE_ID_PRO=${results.pro} \\`)
console.log(`  STRIPE_PRICE_ID_PREMIUM=${results.premium} \\`)
console.log(`  --project-ref oicuhuxpvdrxxdnxucjm`)
