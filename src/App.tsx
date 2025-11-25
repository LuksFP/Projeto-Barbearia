import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { CartProvider } from "@/contexts/CartContext";
import { AuthProvider } from "@/contexts/AuthContext";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
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
import Checkout from "./pages/Checkout";
import OrderConfirmation from "./pages/OrderConfirmation";
import Rastreamento from "./pages/Rastreamento";
import Agendamento from "./pages/Agendamento";
import Depoimentos from "./pages/Depoimentos";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
            <CartProvider>
              <div className="flex flex-col min-h-screen">
                <Header />
                <main className="flex-1">
                  <Routes>
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
                    <Route path="/checkout" element={<Checkout />} />
                    <Route path="/confirmacao" element={<OrderConfirmation />} />
                    <Route path="/rastreamento" element={<Rastreamento />} />
                    <Route path="/agendamento" element={<Agendamento />} />
                    <Route path="/depoimentos" element={<Depoimentos />} />
                    <Route path="*" element={<NotFound />} />
                  </Routes>
                </main>
                <Footer />
              </div>
            </CartProvider>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
