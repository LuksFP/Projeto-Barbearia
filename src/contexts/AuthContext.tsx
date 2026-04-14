import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { supabasePublic } from '@/lib/supabase-public';
import { userService, User } from '@/services/userService';

export type { UserRole } from '@/services/userService';

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    // Restaura sessão pública existente
    userService.getCurrentUser().then(setUser);

    // Escuta mudanças no cliente público — isolado do cliente SaaS
    const { data: { subscription } } = supabasePublic.auth.onAuthStateChange(async (_event, session) => {
      if (!session) { setUser(null); return; }
      const u = await userService.getCurrentUser();
      setUser(u);
    });

    return () => subscription.unsubscribe();
  }, []);

  const login = async (email: string, password: string): Promise<boolean> => {
    const loggedInUser = await userService.login({ email, password });
    if (loggedInUser) {
      setUser(loggedInUser);
      toast({ title: 'Login realizado!', description: `Bem-vindo de volta, ${loggedInUser.name}!` });
      return true;
    }
    toast({ title: 'Erro ao fazer login', description: 'Email ou senha incorretos', variant: 'destructive' });
    return false;
  };

  const logout = async () => {
    await userService.logout();
    setUser(null);
    toast({ title: 'Logout realizado', description: 'Até logo!' });
    navigate('/');
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, isAuthenticated: !!user }}>
      {children}
    </AuthContext.Provider>
  );
};
