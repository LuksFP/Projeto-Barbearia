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
  const { toggleTheme } = useTheme();
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
    { to: '/cortes', label: 'Cortes Modernos' },
    { to: '/loja', label: 'Loja' },
    { to: '/agendamento', label: 'Agendamento' },
    { to: '/fidelidade', label: 'Fidelidade' },
  ];
  const marketingLinks = [
    { id: 'templates', label: 'Templates' },
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'plans', label: 'Planos' },
  ];
  const isMarketingHome = location.pathname === '/';
  const appEntryPath = user?.role === 'admin' ? '/admin' : '/perfil';

  const scrollToTop = () => {
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  };

  const scrollToSection = (sectionId: string) => {
    const section = document.getElementById(sectionId);
    if (!section) return;

    const top = section.getBoundingClientRect().top + window.scrollY - 108;
    window.scrollTo({ top, left: 0, behavior: 'auto' });
  };

  const handleDesktopLinkClick = (to: string) => {
    if (location.pathname === to) {
      scrollToTop();
    }
  };

  const handleNavClick = (to: string) => {
    if (location.pathname !== to) {
      navigate(to);
    } else {
      scrollToTop();
    }

    setIsMobileMenuOpen(false);
  };

  const handleSectionNav = (sectionId: string) => {
    scrollToSection(sectionId);
    setIsMobileMenuOpen(false);
  };

  const cartItemsCount = items.reduce((acc, item) => acc + item.quantity, 0);

  return (
    <header
      className="fixed inset-x-0 top-0 z-50 px-3 pt-3 sm:px-4 sm:pt-4"
    >
      <div className="container mx-auto">
        <div
          className={`relative overflow-visible rounded-[1.75rem] border transition-all duration-300 ${
            isScrolled
              ? 'border-border/60 bg-background/80 backdrop-blur-2xl shadow-[0_18px_48px_-28px_hsl(var(--foreground)/0.45)]'
              : 'border-border/35 bg-background/50 backdrop-blur-xl shadow-[0_18px_42px_-30px_hsl(var(--foreground)/0.45)]'
          }`}
        >
          <div className="pointer-events-none absolute inset-0 rounded-[inherit] bg-gradient-to-r from-primary/10 via-transparent to-primary/5 opacity-60" />
          <div className="relative flex items-center justify-between h-20 px-4 sm:px-6 lg:px-7">
            {/* Logo */}
            <Link
              to="/"
              onClick={() => handleDesktopLinkClick('/')}
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
            <nav className="hidden lg:flex items-center gap-0.5">
              {isMarketingHome
                ? marketingLinks.map((link) => (
                    <button
                      key={link.id}
                      type="button"
                      onClick={() => handleSectionNav(link.id)}
                      className="rounded-full px-4 py-2.5 font-body text-sm font-medium tracking-wide text-foreground transition-all duration-300 hover:bg-background/45 hover:text-primary"
                    >
                      {link.label}
                    </button>
                  ))
                : navLinks.map((link) => {
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
                        onClick={() => handleDesktopLinkClick(link.to)}
                        className={`px-4 py-2.5 font-body font-medium text-sm tracking-wide transition-all duration-300 rounded-full relative group ${
                          location.pathname === link.to
                            ? 'text-primary bg-primary/8'
                            : 'text-foreground hover:text-primary hover:bg-background/45'
                        }`}
                      >
                        {link.label}
                        <span
                          className={`absolute bottom-1 left-1/2 -translate-x-1/2 h-0.5 bg-primary transition-all duration-300 ${
                            location.pathname === link.to
                              ? 'w-8'
                              : 'w-0 group-hover:w-full'
                          }`}
                        />
                      </Link>
                    );
                  })}
            </nav>

            {/* Desktop Actions */}
            <div className="hidden lg:flex items-center gap-1.5">
              <motion.div whileTap={{ scale: 0.9 }}>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={toggleTheme}
                  className="relative rounded-full hover:bg-background/45 hover:text-foreground"
                >
                  <Sun className="h-5 w-5 rotate-0 scale-100 transition-all duration-300 dark:-rotate-90 dark:scale-0" />
                  <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all duration-300 dark:rotate-0 dark:scale-100" />
                </Button>
              </motion.div>

              {isMarketingHome ? (
                <>
                  <Button
                    variant="outline"
                    onClick={() => scrollToSection('plans')}
                    className="rounded-full border-border/50 bg-background/35 px-5 backdrop-blur-sm hover:bg-background/55"
                  >
                    Ver Planos
                  </Button>
                  <Button
                    onClick={() => navigate(isAuthenticated ? appEntryPath : '/entrar')}
                    className="rounded-full px-6"
                  >
                    Entrar No Painel
                  </Button>
                </>
              ) : (
                <>
                  <SearchBar />
                  <CartDrawer />

                  {isAuthenticated && <NotificationDropdown />}

                  {isAuthenticated ? (
                    <div className="flex items-center gap-2">
                      {user?.role === 'admin' && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => navigate('/admin')}
                          className="rounded-full text-primary hover:bg-background/45"
                        >
                          <Shield className="h-5 w-5" />
                        </Button>
                      )}
                      {user?.role === 'subscription' && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => navigate('/assinatura')}
                          className="rounded-full text-amber-500 hover:bg-background/45"
                        >
                          <Crown className="h-5 w-5" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        onClick={() => navigate('/perfil')}
                        className="gap-2 rounded-full px-4 hover:bg-background/45"
                      >
                        <User className="h-5 w-5" />
                        <span>{user?.name}</span>
                      </Button>
                    </div>
                  ) : (
                    <Button
                      variant="outline"
                      onClick={() => navigate('/login')}
                      className="rounded-full border-border/50 bg-background/35 px-6 backdrop-blur-sm hover:bg-background/55"
                    >
                      Entrar
                    </Button>
                  )}
                </>
              )}
            </div>

            {/* Mobile Menu */}
            <div className="flex lg:hidden items-center gap-2">
              <motion.div whileTap={{ scale: 0.9 }}>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={toggleTheme}
                  className="relative rounded-full hover:bg-background/45 hover:text-foreground"
                >
                  <Sun className="h-5 w-5 rotate-0 scale-100 transition-all duration-300 dark:-rotate-90 dark:scale-0" />
                  <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all duration-300 dark:rotate-0 dark:scale-100" />
                </Button>
              </motion.div>
              
              <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon" className="rounded-full hover:bg-background/45">
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
                      {isMarketingHome
                        ? marketingLinks.map((link, index) => (
                            <motion.button
                              key={link.id}
                              onClick={() => handleSectionNav(link.id)}
                              className="px-4 py-3 font-body font-medium rounded-lg text-left text-foreground transition-colors hover:bg-secondary"
                              initial={{ opacity: 0, x: -20 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: index * 0.05 }}
                              whileTap={{ scale: 0.98 }}
                            >
                              {link.label}
                            </motion.button>
                          ))
                        : navLinks.map((link, index) => (
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
                    {isMarketingHome ? (
                      <>
                        <motion.div whileTap={{ scale: 0.98 }}>
                          <Button
                            variant="outline"
                            className="w-full justify-start"
                            onClick={() => handleSectionNav('plans')}
                          >
                            Ver Planos
                          </Button>
                        </motion.div>
                        <motion.div whileTap={{ scale: 0.98 }}>
                          <Button
                            variant="default"
                            className="w-full"
                            onClick={() => {
                              navigate(isAuthenticated ? appEntryPath : '/entrar');
                              setIsMobileMenuOpen(false);
                            }}
                          >
                            Entrar No Painel
                          </Button>
                        </motion.div>
                      </>
                    ) : (
                      <>
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
                        {isAuthenticated ? (
                          <motion.div whileTap={{ scale: 0.98 }}>
                            <div className="space-y-2">
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
                          </motion.div>
                        ) : (
                          <motion.div whileTap={{ scale: 0.98 }}>
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
                          </motion.div>
                        )}
                      </>
                    )}
                  </motion.div>
                </SheetContent>
              </Sheet>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
