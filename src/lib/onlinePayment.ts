// Chave do pagamento online da loja (Mercado Pago). Desligada até a
// plataforma configurar o app do MP e os secrets das Edge Functions.
// Ligar: VITE_ONLINE_PAYMENT=on na Vercel (e redeploy do front).
// Desligada: some a seção em Configurações e o anúncio. O "Pagar agora" do
// site já depende de a barbearia ter conectado, então não aparece de qualquer jeito.
export const ONLINE_PAYMENT_ON = import.meta.env.VITE_ONLINE_PAYMENT === 'on'
