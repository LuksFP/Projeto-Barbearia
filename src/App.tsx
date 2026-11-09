import { Component, ReactNode, lazy, Suspense, useEffect } from "react";
import { syncPwaHead } from "@/lib/pwaHead";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";

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
const NotFound = lazy(() => import("./pages/NotFound"));
const Termos = lazy(() => import("./pages/legal/Termos"));
const Privacidade = lazy(() => import("./pages/legal/Privacidade"));

// Páginas do modelo antigo que já foram indexadas: mandam pro início em vez de 404
const OLD_PATHS = [
  "/sobre", "/cortes", "/tipos-cabelo", "/tipos-cabelo/*", "/loja", "/perfil", "/admin",
  "/checkout", "/confirmacao", "/rastreamento", "/agendamento", "/agendamento-visitante",
  "/consulta-agendamento", "/depoimentos", "/fidelidade", "/assinatura",
];

// Site público da barbearia (/b/:slug)
const BarbershopHome = lazy(() => import("./pages/barbershop/BarbershopHome"));
const StorePage = lazy(() => import("./pages/barbershop/StorePage"));
const ProductPage = lazy(() => import("./pages/barbershop/ProductPage"));
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
const DashboardSugestoes = lazy(() => import("./pages/dashboard/DashboardSugestoes"));
const DashboardProdutos = lazy(() => import("./pages/dashboard/DashboardProdutos"));
const AceitarConvite = lazy(() => import("./pages/AceitarConvite"));

const queryClient = new QueryClient();

// Fallback enquanto o chunk da rota carrega — spinner no tema escuro.
const PageFallback = () => (
  <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
    <div className="w-8 h-8 rounded-full border-2 border-amber-500/30 border-t-amber-500 animate-spin" />
  </div>
);

/** Manifesto do app só nas telas do barbeiro (ver src/lib/pwaHead.ts). */
const PwaHeadSync = () => {
  const { pathname } = useLocation();
  useEffect(() => syncPwaHead(pathname), [pathname]);
  return null;
};

const App = () => (
  <ErrorBoundary>
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <PwaHeadSync />
          <SaasAccountProvider>
          <AuthProvider>
            <NotificationProvider>
              <SubscriptionProvider>
                <LoyaltyProvider>
                  <CartProvider>
                    <TenantProvider>
                      <Suspense fallback={<PageFallback />}>
                      <Routes>
                        {/* ── Landing do SaaS ── menu e rodapé próprios (src/components/landing) */}
                        <Route path="/" element={<Index />} />

                        {/* ── Endereços do modelo antigo ("Barber Pro") → início */}
                        <Route path="/login" element={<Navigate to="/entrar" replace />} />
                        {OLD_PATHS.map(path => (
                          <Route key={path} path={path} element={<Navigate to="/" replace />} />
                        ))}

                        {/* ── Documentos legais */}
                        <Route path="/termos" element={<Termos />} />
                        <Route path="/privacidade" element={<Privacidade />} />

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
                          <Route path="loja" element={<StorePage />} />
                          <Route path="loja/:productId" element={<ProductPage />} />
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
                          <Route path="loja" element={<DashboardProdutos />} />
                          <Route path="clube" element={<DashboardClube />} />
                          <Route path="personalizar" element={<DashboardPersonalizar />} />
                          <Route path="configuracoes" element={<DashboardConfiguracoes />} />
                          <Route path="assinatura" element={<DashboardAssinatura />} />
                          <Route path="financeiro" element={<DashboardFinanceiro />} />
                          <Route path="sugestoes" element={<DashboardSugestoes />} />
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
