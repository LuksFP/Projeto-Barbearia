import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Scissors, Moon, Sun, Menu, X, User, ShoppingCart, Shield, Crown } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { useCart } from '@/contexts/CartContext';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { motion, AnimatePresence } from 'framer-motion';
import CartDrawer from './CartDrawer';
import SearchBar from './SearchBar';
import MegaMenu from './MegaMenu';
import NotificationDropdown from './NotificationDropdown';

const Header = () => {
  const { theme, toggleTheme } = useTheme();
  const { user, isAuthenticated } = useAuth();
  const { items } = useCart();
  const location = useLocation();
  const navigate = useNavigate();
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navLinks = [
    { to: '/', label: 'Home' },
    { to: '/sobre', label: 'Sobre' },
    { to: '/cortes', label: 'Cortes Modernos' },
    { to: '/tipos-cabelo', label: 'Tipos de Cabelo' },
    { to: '/loja', label: 'Loja' },
    { to: '/depoimentos', label: 'Depoimentos' },
    { to: '/agendamento', label: 'Agendamento' },
    { to: '/fidelidade', label: 'Fidelidade' },
  ];

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleNavClick = (to: string) => {
    navigate(to);
    scrollToTop();
    setIsMobileMenuOpen(false);
  };

  const cartItemsCount = items.reduce((acc, item) => acc + item.quantity, 0);

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled
          ? 'bg-background/95 backdrop-blur-md shadow-lg border-b border-border'
          : 'bg-transparent'
      }`}
    >
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-20">
          {/* Logo */}
          <Link
            to="/"
            onClick={scrollToTop}
            className="flex items-center gap-3 group z-50"
          >
            <div className="relative">
              <Scissors className="w-8 h-8 text-primary transition-transform duration-300 group-hover:rotate-180" />
              <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
            <span className="font-heading text-3xl tracking-wider text-foreground">
              BARBER <span className="text-primary">PRO</span>
            </span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center gap-1">
            {navLinks.map((link) => {
              // Use mega menu for Loja and Cortes
              if (link.to === '/loja' || link.to === '/cortes') {
                return (
                  <MegaMenu
                    key={link.to}
                    label={link.label}
                    to={link.to}
                  />
                );
              }

              return (
                <Link
                  key={link.to}
                  to={link.to}
                  onClick={scrollToTop}
                  className={`px-4 py-2 font-body font-medium text-sm tracking-wide transition-all duration-300 rounded-lg relative group ${
                    location.pathname === link.to
                      ? 'text-primary'
                      : 'text-foreground hover:text-primary'
                  }`}
                >
                  {link.label}
                  <span
                    className={`absolute bottom-0 left-1/2 -translate-x-1/2 h-0.5 bg-primary transition-all duration-300 ${
                      location.pathname === link.to
                        ? 'w-full'
                        : 'w-0 group-hover:w-full'
                    }`}
                  />
                </Link>
              );
            })}
          </nav>

          {/* Desktop Actions */}
          <div className="hidden lg:flex items-center gap-2">
            <SearchBar />
            <CartDrawer />
            
            {isAuthenticated && <NotificationDropdown />}
            
            <motion.div whileTap={{ scale: 0.9 }}>
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleTheme}
                className="relative hover:bg-transparent hover:text-foreground"
              >
                <Sun className="h-5 w-5 rotate-0 scale-100 transition-all duration-300 dark:-rotate-90 dark:scale-0" />
                <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all duration-300 dark:rotate-0 dark:scale-100" />
              </Button>
            </motion.div>

            {isAuthenticated ? (
              <div className="flex items-center gap-2">
                {user?.role === 'admin' && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => navigate('/admin')}
                    className="text-primary"
                  >
                    <Shield className="h-5 w-5" />
                  </Button>
                )}
                {user?.role === 'subscription' && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => navigate('/assinatura')}
                    className="text-amber-500"
                  >
                    <Crown className="h-5 w-5" />
                  </Button>
                )}
                <Button
                  variant="ghost"
                  onClick={() => navigate('/perfil')}
                  className="gap-2"
                >
                  <User className="h-5 w-5" />
                  <span>{user?.name}</span>
                </Button>
              </div>
            ) : (
              <Button variant="outline" onClick={() => navigate('/login')}>
                Entrar
              </Button>
            )}
          </div>

          {/* Mobile Menu */}
          <div className="flex lg:hidden items-center gap-2">
            <motion.div whileTap={{ scale: 0.9 }}>
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleTheme}
                className="relative hover:bg-transparent hover:text-foreground"
              >
                <Sun className="h-5 w-5 rotate-0 scale-100 transition-all duration-300 dark:-rotate-90 dark:scale-0" />
                <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all duration-300 dark:rotate-0 dark:scale-100" />
              </Button>
            </motion.div>
            
            <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon">
                  {isMobileMenuOpen ? (
                    <X className="h-6 w-6" />
                  ) : (
                    <Menu className="h-6 w-6" />
                  )}
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[300px] sm:w-[400px]">
                <SheetHeader>
                  <SheetTitle className="text-left font-heading text-2xl">
                    Menu
                  </SheetTitle>
                </SheetHeader>
                
                <AnimatePresence>
                  <motion.nav 
                    className="flex flex-col gap-2 mt-8"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.1 }}
                  >
                    {navLinks.map((link, index) => (
                      <motion.button
                        key={link.to}
                        onClick={() => handleNavClick(link.to)}
                        className={`px-4 py-3 font-body font-medium rounded-lg text-left transition-colors ${
                          location.pathname === link.to
                            ? 'bg-primary/10 text-primary'
                            : 'text-foreground hover:bg-secondary'
                        }`}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.05 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        {link.label}
                      </motion.button>
                    ))}
                  </motion.nav>
                </AnimatePresence>

                <motion.div 
                  className="mt-8 pt-8 border-t border-border space-y-3"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                >
                  {/* Cart Button */}
                  <motion.div whileTap={{ scale: 0.98 }}>
                    <Button
                      variant="outline"
                      className="w-full justify-start gap-2"
                      onClick={() => {
                        setIsMobileMenuOpen(false);
                        document.dispatchEvent(new CustomEvent('openCartDrawer'));
                      }}
                    >
                      <ShoppingCart className="h-5 w-5" />
                      <span>Carrinho</span>
                      {cartItemsCount > 0 && (
                        <motion.span 
                          className="ml-auto bg-primary text-primary-foreground rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold"
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ type: "spring", stiffness: 500, damping: 15 }}
                        >
                          {cartItemsCount}
                        </motion.span>
                      )}
                    </Button>
                  </motion.div>

                  {/* User Button */}
                  <motion.div whileTap={{ scale: 0.98 }}>
                    {isAuthenticated ? (
                      <div className="space-y-2">
                        {user?.role === 'admin' && (
                          <Button
                            variant="outline"
                            className="w-full justify-start gap-2 text-primary"
                            onClick={() => {
                              navigate('/admin');
                              setIsMobileMenuOpen(false);
                            }}
                          >
                            <Shield className="h-5 w-5" />
                            <span>Painel Admin</span>
                          </Button>
                        )}
                        {user?.role === 'subscription' && (
                          <Button
                            variant="outline"
                            className="w-full justify-start gap-2 text-amber-500"
                            onClick={() => {
                              navigate('/assinatura');
                              setIsMobileMenuOpen(false);
                            }}
                          >
                            <Crown className="h-5 w-5" />
                            <span>Minha Assinatura</span>
                          </Button>
                        )}
                        <Button
                          variant="outline"
                          className="w-full justify-start gap-2"
                          onClick={() => {
                            navigate('/perfil');
                            setIsMobileMenuOpen(false);
                          }}
                        >
                          <User className="h-5 w-5" />
                          <span>{user?.name}</span>
                        </Button>
                      </div>
                    ) : (
                      <Button
                        variant="default"
                        className="w-full"
                        onClick={() => {
                          navigate('/login');
                          setIsMobileMenuOpen(false);
                        }}
                      >
                        Entrar
                      </Button>
                    )}
                  </motion.div>
                </motion.div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;