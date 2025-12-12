import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { userService, User, UserRole } from '@/services/userService';

export type { UserRole } from '@/services/userService';

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<boolean>;
  signup: (name: string, email: string, password: string, role?: UserRole) => Promise<boolean>;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    // Check for existing session on mount
    const checkAuth = async () => {
      try {
        const currentUser = await userService.getCurrentUser();
        setUser(currentUser);
      } catch (error) {
        console.error('Auth check failed:', error);
      } finally {
        setLoading(false);
      }
    };
    checkAuth();
  }, []);

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      const loggedInUser = await userService.login({ email, password });

      if (loggedInUser) {
        setUser(loggedInUser);
        toast({
          title: 'Login realizado com sucesso!',
          description: `Bem-vindo de volta, ${loggedInUser.name}!`,
        });
        return true;
      }

      toast({
        title: 'Erro ao fazer login',
        description: 'Email ou senha incorretos',
        variant: 'destructive',
      });
      return false;
    } catch (error) {
      toast({
        title: 'Erro ao fazer login',
        description: 'Ocorreu um erro inesperado',
        variant: 'destructive',
      });
      return false;
    }
  };

  const signup = async (name: string, email: string, password: string, role: UserRole = 'client'): Promise<boolean> => {
    try {
      const newUser = await userService.signup(name, email, password, role);

      if (newUser) {
        setUser(newUser);
        toast({
          title: 'Cadastro realizado com sucesso!',
          description: `Bem-vindo, ${name}!`,
        });
        return true;
      }

      toast({
        title: 'Erro ao cadastrar',
        description: 'Este email já está cadastrado',
        variant: 'destructive',
      });
      return false;
    } catch (error) {
      toast({
        title: 'Erro ao cadastrar',
        description: 'Ocorreu um erro inesperado',
        variant: 'destructive',
      });
      return false;
    }
  };

  const logout = async () => {
    await userService.logout();
    setUser(null);
    toast({
      title: 'Logout realizado',
      description: 'Até logo!',
    });
    navigate('/');
  };

  if (loading) {
    return null; // Or a loading spinner
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        login,
        signup,
        logout,
        isAuthenticated: !!user,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
