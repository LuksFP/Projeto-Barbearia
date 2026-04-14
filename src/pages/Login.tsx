import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Eye, EyeOff, ArrowLeft, Scissors } from 'lucide-react';

const Login = () => {
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const { login, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/perfil');
    }
  }, [isAuthenticated, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const success = await login(loginEmail, loginPassword);
    if (success) {
      navigate('/perfil');
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white pt-16 flex flex-col">
      <div className="border-b border-white/5 shrink-0">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-2 text-white/40 hover:text-white text-sm font-body transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Início
          </button>
          <span className="font-heading text-lg text-amber-400 tracking-wider">BARBEROS</span>
          <Link to="/planos" className="text-white/40 hover:text-white text-sm font-body transition-colors">
            Quero ser barbeiro
          </Link>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-md">
          <Card className="border-white/8 bg-white/[0.03]">
            <CardHeader className="space-y-4">
              <div className="w-14 h-14 rounded-2xl border border-amber-500/20 bg-amber-500/10 flex items-center justify-center">
                <Scissors className="w-6 h-6 text-amber-400" />
              </div>
              <div>
                <p className="text-amber-400 text-xs font-semibold tracking-[0.3em] uppercase font-body mb-2">
                  Acesso
                </p>
                <CardTitle className="font-heading text-3xl tracking-wide text-white mb-2">
                  ENTRE NO PAINEL
                </CardTitle>
                <CardDescription className="font-body text-white/45 text-sm leading-6">
                  Este acesso é para quem já tem conta de barbeiro. Cadastro de cliente foi removido.
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="login-email" className="text-white/40 text-xs uppercase tracking-wide font-body">
                    Email
                  </Label>
                  <Input
                    id="login-email"
                    type="email"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    placeholder="rafael@barbearia.com"
                    required
                    className="bg-white/[0.03] border-white/8 text-white placeholder:text-white/20 focus:border-amber-500/50"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="login-password" className="text-white/40 text-xs uppercase tracking-wide font-body">
                    Senha
                  </Label>
                  <div className="relative">
                    <Input
                      id="login-password"
                      type={showPassword ? 'text' : 'password'}
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      placeholder="Sua senha"
                      required
                      className="bg-white/[0.03] border-white/8 text-white placeholder:text-white/20 focus:border-amber-500/50 pr-12"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-white/20 hover:text-white/50 transition-colors"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <Button type="submit" className="w-full bg-amber-500 text-[#0a0a0a] hover:bg-amber-400">
                  Entrar no painel
                </Button>
              </form>

              <div className="mt-6 flex flex-col gap-3 text-sm font-body text-white/30">
                <p>
                  Se você é dono da barbearia e ainda não tem conta, escolha um plano e crie o acesso do barbeiro.
                </p>
                <Link to="/planos" className="text-amber-400/80 hover:text-amber-400 transition-colors">
                  Ver planos
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Login;
