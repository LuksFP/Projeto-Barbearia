// Testa o bloqueio após trial expirar e o fluxo de upgrade
// Usa a conta trial-exp-test@barberos-test.io com trial_ends_at no passado (setado via MCP)
import { chromium } from 'playwright';

const BASE   = 'https://barberos-pied.vercel.app';
const EMAIL  = 'trial-exp-test@barberos-test.io';
const SENHA  = 'TrialExp@2026';

function ok(msg)   { console.log('✅', msg); }
function fail(msg) { console.log('❌', msg); process.exitCode = 1; }

const browser = await chromium.launch({ headless: true });
const page    = await browser.newPage();

// ── 1. LOGIN COM CONTA DE TRIAL EXPIRADO ──────────────────────────────────────
console.log('\n── 1. Login com trial expirado ──');
console.log('Email:', EMAIL);
await page.goto(`${BASE}/entrar`, { waitUntil: 'networkidle' });
await page.fill('input[type="email"]',    EMAIL);
await page.fill('input[type="password"]', SENHA);
await page.click('button[type="submit"]');
await page.waitForTimeout(5000);

const urlAposLogin = page.url();
console.log('URL após login:', urlAposLogin);

// ── 2. DEVE SER BLOQUEADO DO DASHBOARD ────────────────────────────────────────
console.log('\n── 2. Tentativa de acessar dashboard ──');
await page.goto(`${BASE}/dashboard`, { waitUntil: 'networkidle' });
await page.waitForTimeout(2000);

const urlDashboard = page.url();
console.log('URL ao tentar /dashboard:', urlDashboard);

if (urlDashboard.includes('/planos')) {
  ok(`Bloqueado e redirecionado para ${urlDashboard}`);
} else if (urlDashboard.includes('/dashboard')) {
  fail('Acessou o dashboard com trial expirado — DEVE bloquear');
} else {
  fail(`URL inesperada: ${urlDashboard}`);
}

await page.screenshot({ path: 'trial-expired-blocked.png' });

// ── 3. BANNER DE TRIAL EXPIRADO ───────────────────────────────────────────────
console.log('\n── 3. Banner de trial expirado em /planos ──');
const bannerExpired = await page.locator('text=/teste encerrou|trial expirad/i').first().isVisible().catch(() => false);
bannerExpired
  ? ok('Banner "período de teste encerrou" visível')
  : fail('Banner de trial expirado não encontrado em /planos');

// ── 4. SELECIONA PLANO → DEVE IR PRA /PAGAMENTO (não /registrar) ──────────────
console.log('\n── 4. Selecionar plano com conta existente ──');

// Clica em qualquer CTA de plano (ex: Pro)
const ctaBtn = page.locator('button', { hasText: /Começar|Pro|Básico|Premium/i }).first();
if (await ctaBtn.isVisible().catch(() => false)) {
  await ctaBtn.click();
  await page.waitForTimeout(2000);
  const urlAposCta = page.url();
  console.log('URL após selecionar plano:', urlAposCta);

  if (urlAposCta.includes('/pagamento')) {
    ok(`Redirecionou para ${urlAposCta} (correto — conta já existe)`);
  } else if (urlAposCta.includes('/registrar')) {
    fail('Redirecionou para /registrar — deveria ir para /pagamento (conta já existe)');
  } else {
    fail(`URL inesperada: ${urlAposCta}`);
  }
} else {
  fail('Nenhum botão de plano encontrado em /planos');
}

await page.screenshot({ path: 'trial-expired-upgrade.png' });

// ── 5. ROTAS PROTEGIDAS CONTINUAM BLOQUEADAS ──────────────────────────────────
console.log('\n── 5. Rotas do dashboard bloqueadas ──');
const rotasProtegidas = [
  '/dashboard',
  '/dashboard/agenda',
  '/dashboard/financeiro',
];

for (const rota of rotasProtegidas) {
  await page.goto(`${BASE}${rota}`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(500);
  const url = page.url();
  if (!url.includes('/dashboard')) {
    ok(`${rota} → bloqueado (${url.split('/').pop()})`);
  } else {
    fail(`${rota} → acessível com trial expirado (não deveria)`);
  }
}

await browser.close();

console.log('\n' + (process.exitCode ? '❌ Alguns testes de expiração falharam' : '✅ Bloqueio de trial expirado funcionando corretamente'));
