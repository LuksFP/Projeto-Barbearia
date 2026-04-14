import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { CartProvider } from "@/contexts/CartContext";
import { AuthProvider } from "@/contexts/AuthContext";
import { LoyaltyProvider } from "@/contexts/LoyaltyContext";
import { NotificationProvider } from "@/contexts/NotificationContext";
import { SubscriptionProvider } from "@/contexts/SubscriptionContext";
import { TenantProvider } from "@/contexts/TenantContext";
import { SaasAccountProvider } from "@/contexts/SaasAccountContext";
import SaasGuard from "@/guards/SaasGuard";

// ── Fluxo de assinatura SaaS ──────────────────────────────────────────────
import Planos from "./pages/saas/Planos";
import Registrar from "./pages/saas/Registrar";
import Pagamento from "./pages/saas/Pagamento";
import BemVindo from "./pages/saas/BemVindo";
import EntrarSaas from "./pages/saas/EntrarSaas";
import EsqueciSenha from "./pages/saas/EsqueciSenha";
import NovaSenha from "./pages/saas/NovaSenha";

// Layouts — 3 áreas distintas do produto
import LandingLayout from "@/layouts/LandingLayout";
import PublicSiteLayout from "@/layouts/PublicSiteLayout";
import DashboardLayout from "@/layouts/DashboardLayout";

// ── Landing do SaaS (existente — não mexer) ───────────────────────────────
import Index from "./pages/Index";
import Sobre from "./pages/Sobre";
import Cortes from "./pages/Cortes";
import TiposCabelo from "./pages/TiposCabelo";
import CabeloLiso from "./pages/CabeloLiso";
import CabeloOndulado from "./pages/CabeloOndulado";
import CabeloCrespo from "./pages/CabeloCrespo";
import Loja from "./pages/Loja";
import Login from "./pages/Login";
import Profile from "./pages/Profile";
import Admin from "./pages/Admin";
import Checkout from "./pages/Checkout";
import OrderConfirmation from "./pages/OrderConfirmation";
import Rastreamento from "./pages/Rastreamento";
import Agendamento from "./pages/Agendamento";
import AgendamentoVisitante from "./pages/AgendamentoVisitante";
import ConsultaAgendamento from "./pages/ConsultaAgendamento";
import Depoimentos from "./pages/Depoimentos";
import Fidelidade from "./pages/Fidelidade";
import Assinatura from "./pages/Assinatura";
import NotFound from "./pages/NotFound";

// ── Site público da barbearia (/b/:slug) ──────────────────────────────────
import BarbershopHome from "./pages/barbershop/BarbershopHome";
import Demo from "./pages/Demo";

// ── Dashboard da barbearia (/dashboard/*) ─────────────────────────────────
import DashboardOverview from "./pages/dashboard/DashboardOverview";
import DashboardAgenda from "./pages/dashboard/DashboardAgenda";
import DashboardEquipe from "./pages/dashboard/DashboardEquipe";
import DashboardClientes from "./pages/dashboard/DashboardClientes";
import DashboardServicos from "./pages/dashboard/DashboardServicos";
import DashboardClube from "./pages/dashboard/DashboardClube";
import DashboardConfiguracoes from "./pages/dashboard/DashboardConfiguracoes";
import DashboardAssinatura from "./pages/dashboard/DashboardAssinatura";
import DashboardFinanceiro from "./pages/dashboard/DashboardFinanceiro";
import AceitarConvite from "./pages/AceitarConvite";
import DashboardPersonalizar from "./pages/dashboard/DashboardPersonalizar";

const queryClient = new QueryClient();

const App = () => (
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
                          <Route path="/loja" element={<Loja />} />
                          <Route path="/login" element={<Login />} />
                          <Route path="/perfil" element={<Profile />} />
                          <Route path="/admin" element={<Admin />} />
                          <Route path="/checkout" element={<Checkout />} />
                          <Route path="/confirmacao" element={<OrderConfirmation />} />
                          <Route path="/rastreamento" element={<Rastreamento />} />
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
);

export default App;
