import { useState, useEffect } from 'react';
import { useAuth, UserRole } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Crown, User } from 'lucide-react';

const Login = () => {
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [signupName, setSignupName] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [signupRole, setSignupRole] = useState<UserRole>('client');
  const { login, signup, isAuthenticated } = useAuth();
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

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    const success = await signup(signupName, signupEmail, signupPassword, signupRole);
    if (success) {
      navigate('/perfil');
    }
  };

  return (
    <div className="min-h-screen pt-20 pb-16">
      <div className="container mx-auto px-4 py-12">
        <h1 className="font-heading text-5xl text-center mb-8">
          <span className="text-primary">ÁREA DO</span> CLIENTE
        </h1>

        <div className="max-w-md mx-auto">
          <Tabs defaultValue="login" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login">Login</TabsTrigger>
              <TabsTrigger value="signup">Cadastro</TabsTrigger>
            </TabsList>

            <TabsContent value="login">
              <Card>
                <CardHeader>
                  <CardTitle className="font-heading text-2xl">Bem-vindo de volta</CardTitle>
                  <CardDescription className="font-body">
                    Entre com suas credenciais para acessar sua conta
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleLogin} className="space-y-4">
                    <div>
                      <Label htmlFor="login-email">Email</Label>
                      <Input
                        id="login-email"
                        type="email"
                        value={loginEmail}
                        onChange={(e) => setLoginEmail(e.target.value)}
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="login-password">Senha</Label>
                      <Input
                        id="login-password"
                        type="password"
                        value={loginPassword}
                        onChange={(e) => setLoginPassword(e.target.value)}
                        required
                      />
                    </div>
                    <Button type="submit" className="w-full">
                      Entrar
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="signup">
              <Card>
                <CardHeader>
                  <CardTitle className="font-heading text-2xl">Criar conta</CardTitle>
                  <CardDescription className="font-body">
                    Cadastre-se para ter acesso a ofertas exclusivas
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSignup} className="space-y-4">
                    <div>
                      <Label htmlFor="signup-name">Nome</Label>
                      <Input
                        id="signup-name"
                        type="text"
                        value={signupName}
                        onChange={(e) => setSignupName(e.target.value)}
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="signup-email">Email</Label>
                      <Input
                        id="signup-email"
                        type="email"
                        value={signupEmail}
                        onChange={(e) => setSignupEmail(e.target.value)}
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="signup-password">Senha</Label>
                      <Input
                        id="signup-password"
                        type="password"
                        value={signupPassword}
                        onChange={(e) => setSignupPassword(e.target.value)}
                        required
                      />
                    </div>
                    
                    <div className="space-y-3">
                      <Label>Tipo de Conta</Label>
                      <RadioGroup
                        value={signupRole}
                        onValueChange={(value) => setSignupRole(value as UserRole)}
                        className="space-y-3"
                      >
                        <div className="flex items-center space-x-3 border border-border rounded-lg p-4 hover:border-primary transition-colors cursor-pointer">
                          <RadioGroupItem value="client" id="client" />
                          <Label htmlFor="client" className="flex items-center gap-2 cursor-pointer flex-1">
                            <User className="w-5 h-5 text-muted-foreground" />
                            <div>
                              <p className="font-heading">Cliente</p>
                              <p className="text-sm text-muted-foreground font-body">Acesso básico à loja e agendamentos</p>
                            </div>
                          </Label>
                        </div>
                        <div className="flex items-center space-x-3 border border-primary/50 rounded-lg p-4 hover:border-primary bg-primary/5 transition-colors cursor-pointer">
                          <RadioGroupItem value="subscription" id="subscription" />
                          <Label htmlFor="subscription" className="flex items-center gap-2 cursor-pointer flex-1">
                            <Crown className="w-5 h-5 text-primary" />
                            <div>
                              <p className="font-heading text-primary">Cliente Assinatura</p>
                              <p className="text-sm text-muted-foreground font-body">Descontos exclusivos e benefícios VIP</p>
                            </div>
                          </Label>
                        </div>
                      </RadioGroup>
                    </div>

                    <Button type="submit" className="w-full">
                      Criar Conta
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
};

export default Login;