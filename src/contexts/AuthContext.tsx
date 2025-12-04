import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';

export type UserRole = 'client' | 'admin';

interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
}

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<boolean>;
  signup: (name: string, email: string, password: string) => Promise<boolean>;
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
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const storedUser = localStorage.getItem('currentUser');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
  }, []);

  const login = async (email: string, password: string): Promise<boolean> => {
    const users = JSON.parse(localStorage.getItem('users') || '[]');
    const foundUser = users.find(
      (u: any) => u.email === email && u.password === password
    );

    if (foundUser) {
      const userData = { 
        id: foundUser.id, 
        name: foundUser.name, 
        email: foundUser.email,
        role: foundUser.role || 'client' as UserRole
      };
      setUser(userData);
      localStorage.setItem('currentUser', JSON.stringify(userData));
      toast({
        title: 'Login realizado com sucesso!',
        description: `Bem-vindo de volta, ${foundUser.name}!`,
      });
      return true;
    }

    toast({
      title: 'Erro ao fazer login',
      description: 'Email ou senha incorretos',
      variant: 'destructive',
    });
    return false;
  };

  const signup = async (name: string, email: string, password: string): Promise<boolean> => {
    const users = JSON.parse(localStorage.getItem('users') || '[]');
    
    if (users.find((u: any) => u.email === email)) {
      toast({
        title: 'Erro ao cadastrar',
        description: 'Este email já está cadastrado',
        variant: 'destructive',
      });
      return false;
    }

    // First user is admin, rest are clients
    const isFirstUser = users.length === 0;
    const newUser = {
      id: Date.now().toString(),
      name,
      email,
      password,
      role: isFirstUser ? 'admin' : 'client' as UserRole,
      createdAt: new Date().toISOString(),
    };

    users.push(newUser);
    localStorage.setItem('users', JSON.stringify(users));

    const userData = { 
      id: newUser.id, 
      name: newUser.name, 
      email: newUser.email,
      role: newUser.role as UserRole
    };
    setUser(userData);
    localStorage.setItem('currentUser', JSON.stringify(userData));

    toast({
      title: 'Cadastro realizado com sucesso!',
      description: `Bem-vindo, ${name}!`,
    });
    return true;
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('currentUser');
    toast({
      title: 'Logout realizado',
      description: 'Até logo!',
    });
    navigate('/');
  };

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
