import { Component, ReactNode, lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

class ErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean }> {
  state = { hasError: false }
  static getDerivedStateFromError() { return { hasError: true } }
  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-8">
          <div className="text-center space-y-4">
            <p className="text-white/60 font-body">Algo deu errado.</p>
            <button
              onClick={() => { this.setState({ hasError: false }); window.location.href = '/dashboard'; }}
              className="px-4 py-2 bg-amber-500 text-black rounded-lg text-sm font-semibold"
            >
              Voltar ao início
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}

import { ThemeProvider } from "@/contexts/ThemeContext";
import { CartProvider } from "@/contexts/CartContext";
import { AuthProvider } from "@/contexts/AuthContext";
import { LoyaltyProvider } from "@/contexts/LoyaltyContext";
import { NotificationProvider } from "@/contexts/NotificationContext";
import { SubscriptionProvider } from "@/contexts/SubscriptionContext";
import { TenantProvider } from "@/contexts/TenantContext";
import { SaasAccountProvider } from "@/contexts/SaasAccountContext";
import SaasGuard from "@/guards/SaasGuard";

// Layouts — carregados imediatamente (pequenos, usados em toda navegação)
import LandingLayout from "@/layouts/LandingLayout";
import PublicSiteLayout from "@/layouts/PublicSiteLayout";
import DashboardLayout from "@/layouts/DashboardLayout";

// ── Eager: fluxo SaaS crítico (carregado imediatamente) ───────────────────────
import Planos          from "./pages/saas/Planos";
import Registrar       from "./pages/saas/Registrar";
import Pagamento       from "./pages/saas/Pagamento";
import EntrarSaas      from "./pages/saas/EntrarSaas";
import EsqueciSenha    from "./pages/saas/EsqueciSenha";
import NovaSenha       from "./pages/saas/NovaSenha";
import AuthCallback    from "./pages/saas/AuthCallback";
import BemVindo        from "./pages/saas/BemVindo";
import CompletarRegistro from "./pages/saas/CompletarRegistro";
import NotFound        from "./pages/NotFound";
import AceitarConvite  from "./pages/AceitarConvite";

// ── Lazy: dashboard (grande, só acessa quem tem plano ativo) ──────────────────
const DashboardOverview      = lazy(() => import("./pages/dashboard/DashboardOverview"));
const DashboardAgenda        = lazy(() => import("./pages/dashboard/DashboardAgenda"));
const DashboardEquipe        = lazy(() => import("./pages/dashboard/DashboardEquipe"));
const DashboardClientes      = lazy(() => import("./pages/dashboard/DashboardClientes"));
const DashboardServicos      = lazy(() => import("./pages/dashboard/DashboardServicos"));
const DashboardClube         = lazy(() => import("./pages/dashboard/DashboardClube"));
const DashboardConfiguracoes = lazy(() => import("./pages/dashboard/DashboardConfiguracoes"));
const DashboardAssinatura    = lazy(() => import("./pages/dashboard/DashboardAssinatura"));
const DashboardFinanceiro    = lazy(() => import("./pages/dashboard/DashboardFinanceiro"));
const DashboardPersonalizar  = lazy(() => import("./pages/dashboard/DashboardPersonalizar"));

// ── Lazy: landing e site público (raro acessar) ───────────────────────────────
const Index               = lazy(() => import("./pages/Index"));
const Sobre               = lazy(() => import("./pages/Sobre"));
const Cortes              = lazy(() => import("./pages/Cortes"));
const TiposCabelo         = lazy(() => import("./pages/TiposCabelo"));
const CabeloLiso          = lazy(() => import("./pages/CabeloLiso"));
const CabeloOndulado      = lazy(() => import("./pages/CabeloOndulado"));
const CabeloCrespo        = lazy(() => import("./pages/CabeloCrespo"));
const Profile             = lazy(() => import("./pages/Profile"));
const Admin               = lazy(() => import("./pages/Admin"));
const Agendamento         = lazy(() => import("./pages/Agendamento"));
const AgendamentoVisitante = lazy(() => import("./pages/AgendamentoVisitante"));
const ConsultaAgendamento = lazy(() => import("./pages/ConsultaAgendamento"));
const Depoimentos         = lazy(() => import("./pages/Depoimentos"));
const Fidelidade          = lazy(() => import("./pages/Fidelidade"));
const Assinatura          = lazy(() => import("./pages/Assinatura"));
const Demo                = lazy(() => import("./pages/Demo"));
const BarbershopHome      = lazy(() => import("./pages/barbershop/BarbershopHome"));

const PageLoader = () => (
  <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
    <div className="w-8 h-8 rounded-full border-2 border-amber-500/30 border-t-amber-500 animate-spin" />
  </div>
)

const queryClient = new QueryClient();

const App = () => (
  <ErrorBoundary>
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <SaasAccountProvider>
          <AuthProvider>
            <NotificationProvider>
              <SubscriptionProvider>
                <LoyaltyProvider>
                  <CartProvider>
                    <TenantProvider>
                      <Suspense fallback={<PageLoader />}>
                      <Routes>
                        {/* ── Landing do SaaS ── */}
                        <Route element={<LandingLayout />}>
                          <Route path="/" element={<Index />} />
                          <Route path="/sobre" element={<Sobre />} />
                          <Route path="/cortes" element={<Cortes />} />
                          <Route path="/tipos-cabelo" element={<TiposCabelo />} />
                          <Route path="/tipos-cabelo/liso" element={<CabeloLiso />} />
                          <Route path="/tipos-cabelo/ondulado" element={<CabeloOndulado />} />
                          <Route path="/tipos-cabelo/crespo" element={<CabeloCrespo />} />
                          <Route path="/loja" element={<Navigate to="/" replace />} />
                          <Route path="/login" element={<Navigate to="/entrar" replace />} />
                          <Route path="/perfil" element={<Profile />} />
                          <Route path="/admin" element={<Admin />} />
                          <Route path="/checkout" element={<Navigate to="/" replace />} />
                          <Route path="/confirmacao" element={<Navigate to="/" replace />} />
                          <Route path="/rastreamento" element={<Navigate to="/" replace />} />
                          <Route path="/agendamento" element={<Agendamento />} />
                          <Route path="/agendamento-visitante" element={<AgendamentoVisitante />} />
                          <Route path="/consulta-agendamento" element={<ConsultaAgendamento />} />
                          <Route path="/depoimentos" element={<Depoimentos />} />
                          <Route path="/fidelidade" element={<Fidelidade />} />
                          <Route path="/assinatura" element={<Assinatura />} />
                        </Route>

                        {/* ── Fluxo SaaS ── */}
                        <Route path="/planos" element={<Planos />} />
                        <Route path="/registrar" element={<Registrar />} />
                        <Route path="/pagamento" element={<Pagamento />} />
                        <Route path="/bem-vindo" element={<BemVindo />} />
                        <Route path="/entrar" element={<EntrarSaas />} />
                        <Route path="/esqueci-senha" element={<EsqueciSenha />} />
                        <Route path="/nova-senha" element={<NovaSenha />} />
                        <Route path="/auth/callback" element={<AuthCallback />} />
                        <Route path="/registrar/completar" element={<CompletarRegistro />} />
                        <Route path="/demo/:plan" element={<Demo />} />
                        <Route path="/aceitar-convite" element={<AceitarConvite />} />

                        {/* ── Site público da barbearia ── */}
                        <Route path="/b/:slug" element={<PublicSiteLayout />}>
                          <Route index element={<BarbershopHome />} />
                        </Route>

                        {/* ── Dashboard ── protegido */}
                        <Route path="/dashboard" element={
                          <SaasGuard><DashboardLayout /></SaasGuard>
                        }>
                          <Route index element={<DashboardOverview />} />
                          <Route path="agenda" element={<DashboardAgenda />} />
                          <Route path="equipe" element={<DashboardEquipe />} />
                          <Route path="clientes" element={<DashboardClientes />} />
                          <Route path="servicos" element={<DashboardServicos />} />
                          <Route path="clube" element={<DashboardClube />} />
                          <Route path="personalizar" element={<DashboardPersonalizar />} />
                          <Route path="configuracoes" element={<DashboardConfiguracoes />} />
                          <Route path="assinatura" element={<DashboardAssinatura />} />
                          <Route path="financeiro" element={<DashboardFinanceiro />} />
                        </Route>

                        <Route path="*" element={<NotFound />} />
                      </Routes>
                      </Suspense>
                    </TenantProvider>
                  </CartProvider>
                </LoyaltyProvider>
              </SubscriptionProvider>
            </NotificationProvider>
          </AuthProvider>
          </SaasAccountProvider>
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
