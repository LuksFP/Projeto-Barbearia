// Testa o fluxo completo de trial: cadastro → dashboard direto → banner de trial
import { chromium } from 'playwright';

const BASE        = 'https://barberos-pied.vercel.app';
const SUPA_URL    = 'https://oicuhuxpvdrxxdnxucjm.supabase.co';
const SUPA_ANON   = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9pY3VodXhwdmRyeHhkbnh1Y2ptIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYwMjQzNTYsImV4cCI6MjA5MTYwMDM1Nn0.ogaYaAUnT87-8-FOuDDegrAbPXQjxRT0RPpiWheHY10';

const ts    = Date.now();
const EMAIL = `trial-test-${ts}@barberos-test.io`;
const SENHA = 'Trial@2026test';

function ok(msg)   { console.log('✅', msg); }
function fail(msg) { console.log('❌', msg); process.exitCode = 1; }

const browser = await chromium.launch({ headless: true });
const page    = await browser.newPage();

const erros = [];
page.on('console', m => { if (m.type() === 'error') erros.push(m.text()); });

// ── 1. CADASTRO ───────────────────────────────────────────────────────────────
console.log('\n── 1. Cadastro novo com trial ──');
console.log('Email:', EMAIL);
await page.goto(`${BASE}/registrar?plano=pro`, { waitUntil: 'networkidle' });

await page.fill('input[name="ownerName"]',      'Trial Teste');
await page.fill('input[name="barbershopName"]', `Barbearia Trial ${ts}`);
await page.fill('input[name="email"]',          EMAIL);
await page.fill('input[name="password"]',       SENHA);

await page.screenshot({ path: 'trial-form.png' });
await page.click('button[type="submit"]');

// Aguarda redirect (pode ser dashboard ou entrar)
await page.waitForTimeout(8000);

const urlApos = page.url();
console.log('URL após cadastro:', urlApos);

if (urlApos.includes('/dashboard')) {
  ok('Redirecionou para /dashboard (trial ativo — sem pagamento)');
} else if (urlApos.includes('/pagamento')) {
  fail('Redirecionou para /pagamento (trial NÃO está funcionando)');
} else if (urlApos.includes('/entrar')) {
  fail('Redirecionou para /entrar (sessão não iniciada)');
} else {
  fail(`URL inesperada: ${urlApos}`);
}

await page.screenshot({ path: 'trial-pos-cadastro.png' });

// ── 2. BANNER DE TRIAL ────────────────────────────────────────────────────────
console.log('\n── 2. Banner de trial no dashboard ──');

// O banner fica no topo do main — procura pelo texto "dias restante"
const bannerText = await page.locator('text=/dias? restante/i').first().textContent().catch(() => null);
if (bannerText) {
  ok(`Banner: "${bannerText.trim()}"`);
} else {
  fail('Banner de trial não encontrado no dashboard');
}

const btnAssinar = await page.locator('text=Assinar agora').first().isVisible().catch(() => false);
btnAssinar ? ok('Botão "Assinar agora" visível') : fail('Botão "Assinar agora" não encontrado');

// ── 3. DASHBOARD ACESSÍVEL ────────────────────────────────────────────────────
console.log('\n── 3. Rotas do dashboard com trial ──');
const rotas = [
  ['/dashboard',          'Visão Geral'],
  ['/dashboard/agenda',   'Agenda'],
  ['/dashboard/equipe',   'Equipe'],
  ['/dashboard/clientes', 'Clientes'],
];

for (const [rota, label] of rotas) {
  await page.goto(`${BASE}${rota}`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(500);
  const url = page.url();
  if (url.includes('/dashboard')) {
    ok(`${label} acessível`);
  } else {
    fail(`${label} → redirecionou para ${url} (deveria estar acessível no trial)`);
  }
}

// ── 4. VERIFICA CONTA VIA SUPABASE API ────────────────────────────────────────
console.log('\n── 4. Verifica account no Supabase ──');

// Faz login via API para pegar token
const loginRes = await fetch(`${SUPA_URL}/auth/v1/token?grant_type=password`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'apikey': SUPA_ANON,
  },
  body: JSON.stringify({ email: EMAIL, password: SENHA }),
}).then(r => r.json()).catch(() => null);

if (!loginRes?.access_token) {
  fail('Não conseguiu logar via API para verificar a conta');
} else {
  // Busca o saas_account
  const accountRes = await fetch(`${SUPA_URL}/rest/v1/saas_accounts?select=plan_status,trial_ends_at,plan`, {
    headers: {
      'apikey': SUPA_ANON,
      'Authorization': `Bearer ${loginRes.access_token}`,
    },
  }).then(r => r.json()).catch(() => null);

  const account = accountRes?.[0];
  if (!account) {
    fail('saas_account não encontrado no banco');
  } else {
    console.log('Account:', JSON.stringify(account));
    account.plan_status === 'trial'
      ? ok(`plan_status = '${account.plan_status}'`)
      : fail(`plan_status esperado 'trial', recebido '${account.plan_status}'`);

    if (account.trial_ends_at) {
      const endsAt  = new Date(account.trial_ends_at);
      const diffMs  = endsAt - Date.now();
      const diffH   = Math.round(diffMs / (1000 * 60 * 60));
      ok(`trial_ends_at = ${account.trial_ends_at} (em ~${diffH}h)`);
      diffH >= 47
        ? ok('Trial com pelo menos 2 dias (correto)')
        : fail(`Trial com menos de 2 dias (${diffH}h) — esperado ~48h`);
    } else {
      fail('trial_ends_at é null — RPC não está setando a data');
    }

    account.plan === null
      ? ok('plan = null (sem plano selecionado ainda — correto no trial)')
      : ok(`plan = '${account.plan}'`);
  }
}

// ── 5. BOTÃO "ASSINAR AGORA" LEVA PRA /PLANOS ─────────────────────────────────
console.log('\n── 5. Fluxo de upgrade pelo banner ──');
await page.goto(`${BASE}/dashboard`, { waitUntil: 'networkidle' });
await page.waitForTimeout(1000);
const btnEl = page.locator('text=Assinar agora').first();
if (await btnEl.isVisible().catch(() => false)) {
  await btnEl.click();
  await page.waitForTimeout(2000);
  const urlPlanos = page.url();
  urlPlanos.includes('/planos') || urlPlanos.includes('/pagamento')
    ? ok(`"Assinar agora" levou para ${urlPlanos}`)
    : fail(`"Assinar agora" levou para ${urlPlanos} (esperado /planos)`);
} else {
  fail('"Assinar agora" não encontrado para testar clique');
}

// ── RESUMO ────────────────────────────────────────────────────────────────────
console.log('\n── Console errors ──');
const errosFiltrados = erros.filter(e => !e.includes('406') && !e.includes('favicon'));
errosFiltrados.length
  ? errosFiltrados.forEach(e => console.log('⚠️ ', e.slice(0, 120)))
  : ok('Sem erros críticos no console');

await browser.close();

console.log('\n' + (process.exitCode ? '❌ Alguns testes falharam' : '✅ Trial flow completo — tudo OK'));
