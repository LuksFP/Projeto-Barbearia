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

// Layouts — 3 áreas distintas do produto (eager: estruturais, sempre no wrapper)
import LandingLayout from "@/layouts/LandingLayout";
import PublicSiteLayout from "@/layouts/PublicSiteLayout";
import DashboardLayout from "@/layouts/DashboardLayout";

// ── Páginas lazy — cada área vira seu próprio chunk (dashboard não pesa no
//    bundle do site público, e vice-versa). ────────────────────────────────
// Fluxo de assinatura SaaS
const Planos = lazy(() => import("./pages/saas/Planos"));
const Registrar = lazy(() => import("./pages/saas/Registrar"));
const Pagamento = lazy(() => import("./pages/saas/Pagamento"));
const BemVindo = lazy(() => import("./pages/saas/BemVindo"));
const EntrarSaas = lazy(() => import("./pages/saas/EntrarSaas"));
const EsqueciSenha = lazy(() => import("./pages/saas/EsqueciSenha"));
const NovaSenha = lazy(() => import("./pages/saas/NovaSenha"));
const AuthCallback = lazy(() => import("./pages/saas/AuthCallback"));
const CompletarRegistro = lazy(() => import("./pages/saas/CompletarRegistro"));

// Landing do SaaS
const Index = lazy(() => import("./pages/Index"));
const Sobre = lazy(() => import("./pages/Sobre"));
const Cortes = lazy(() => import("./pages/Cortes"));
const TiposCabelo = lazy(() => import("./pages/TiposCabelo"));
const CabeloLiso = lazy(() => import("./pages/CabeloLiso"));
const CabeloOndulado = lazy(() => import("./pages/CabeloOndulado"));
const CabeloCrespo = lazy(() => import("./pages/CabeloCrespo"));
const Profile = lazy(() => import("./pages/Profile"));
const Admin = lazy(() => import("./pages/Admin"));
const Agendamento = lazy(() => import("./pages/Agendamento"));
const AgendamentoVisitante = lazy(() => import("./pages/AgendamentoVisitante"));
const ConsultaAgendamento = lazy(() => import("./pages/ConsultaAgendamento"));
const Depoimentos = lazy(() => import("./pages/Depoimentos"));
const Fidelidade = lazy(() => import("./pages/Fidelidade"));
const Assinatura = lazy(() => import("./pages/Assinatura"));
const NotFound = lazy(() => import("./pages/NotFound"));

// Site público da barbearia (/b/:slug)
const BarbershopHome = lazy(() => import("./pages/barbershop/BarbershopHome"));
const Demo = lazy(() => import("./pages/Demo"));

// Dashboard da barbearia (/dashboard/*)
const DashboardOverview = lazy(() => import("./pages/dashboard/DashboardOverview"));
const DashboardAgenda = lazy(() => import("./pages/dashboard/DashboardAgenda"));
const DashboardLembretes = lazy(() => import("./pages/dashboard/DashboardLembretes"));
const DashboardReativar = lazy(() => import("./pages/dashboard/DashboardReativar"));
const DashboardEquipe = lazy(() => import("./pages/dashboard/DashboardEquipe"));
const DashboardClientes = lazy(() => import("./pages/dashboard/DashboardClientes"));
const DashboardServicos = lazy(() => import("./pages/dashboard/DashboardServicos"));
const DashboardClube = lazy(() => import("./pages/dashboard/DashboardClube"));
const DashboardConfiguracoes = lazy(() => import("./pages/dashboard/DashboardConfiguracoes"));
const DashboardAssinatura = lazy(() => import("./pages/dashboard/DashboardAssinatura"));
const DashboardFinanceiro = lazy(() => import("./pages/dashboard/DashboardFinanceiro"));
const DashboardPersonalizar = lazy(() => import("./pages/dashboard/DashboardPersonalizar"));
const AceitarConvite = lazy(() => import("./pages/AceitarConvite"));

const queryClient = new QueryClient();

// Fallback enquanto o chunk da rota carrega — spinner no tema escuro.
const PageFallback = () => (
  <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
    <div className="w-8 h-8 rounded-full border-2 border-amber-500/30 border-t-amber-500 animate-spin" />
  </div>
);

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
                      <Suspense fallback={<PageFallback />}>
                      <Routes>
                        {/* ── Landing do SaaS ── Header + Footer do projeto */}
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

                        {/* ── Fluxo de assinatura SaaS ── sem Header/Footer da landing */}
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

                        {/* ── Site público da barbearia ── branding da casa */}
                        <Route path="/b/:slug" element={<PublicSiteLayout />}>
                          <Route index element={<BarbershopHome />} />
                        </Route>

                        {/* ── Dashboard da barbearia ── protegido pelo SaasGuard */}
                        <Route path="/dashboard" element={
                          <SaasGuard><DashboardLayout /></SaasGuard>
                        }>
                          <Route index element={<DashboardOverview />} />
                          <Route path="agenda" element={<DashboardAgenda />} />
                          <Route path="lembretes" element={<DashboardLembretes />} />
                          <Route path="equipe" element={<DashboardEquipe />} />
                          <Route path="clientes" element={<DashboardClientes />} />
                          <Route path="reativar" element={<DashboardReativar />} />
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
