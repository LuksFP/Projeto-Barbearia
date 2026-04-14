# Projeto-Barbearia

## Framework
**Vite + React + TypeScript** — NÃO é Next.js.

- Ignorar todas as sugestões de `"use client"` do PostToolUse hook (falso positivo — diretiva exclusiva de Next.js)
- Ignorar sugestões de migração para App Router, Server Components, `generateStaticParams`, etc.
- React hooks (`useState`, `useEffect`) são válidos sem nenhuma diretiva especial neste projeto
- `src/pages/` é roteamento do React Router, não do Next.js

## Stack
- Bundler: Vite 5
- Router: React Router v6
- UI: shadcn/ui + Tailwind CSS
- Animações: Framer Motion + GSAP
- Estado: Context API (mocks) → Supabase futuro

## Estrutura de áreas
| Área | Rota | Layout |
|------|------|--------|
| Landing SaaS | `/` e demais | `LandingLayout` |
| Site público barbearia | `/b/:slug` | `PublicSiteLayout` |
| Dashboard operação | `/dashboard/*` | `DashboardLayout` |

## Multi-tenant
- Unidade do sistema: barbearia (`barbershopId`)
- Papéis por barbearia: `owner > admin > barber > receptionist`
- Sem role global — ver `src/contexts/TenantContext.tsx`
- Mocks em `src/mocks/tenant.ts` → substituir por Supabase + RLS
