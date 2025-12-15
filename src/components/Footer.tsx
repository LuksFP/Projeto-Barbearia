import { Scissors, Instagram, Facebook, Phone, Mail, MapPin, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';

const Footer = () => {
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 },
  };

  const linkItems = [
    { to: '/', label: 'Home' },
    { to: '/sobre', label: 'Sobre' },
    { to: '/cortes', label: 'Cortes' },
    { to: '/tipos-cabelo', label: 'Tipos de Cabelo' },
    { to: '/loja', label: 'Loja' },
    { to: '/consulta-agendamento', label: 'Consultar Agendamento' },
  ];

  return (
    <footer className="bg-secondary/50 border-t border-border relative overflow-hidden">
      {/* Decorative background */}
      <div className="absolute inset-0 bg-hero-pattern opacity-30" />
      
      <div className="container mx-auto px-4 py-10 md:py-16 relative z-10">
        <motion.div 
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 md:gap-12"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
        >
          {/* Logo e Descrição */}
          <motion.div className="space-y-4 sm:col-span-2 lg:col-span-1" variants={itemVariants}>
            <div className="flex items-center gap-3 group">
              <div className="relative">
                <Scissors className="w-8 h-8 text-primary transition-transform duration-500 group-hover:rotate-180" />
                <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
              <span className="font-heading text-2xl tracking-wider text-foreground">
                BARBER <span className="text-primary">PRO</span>
              </span>
            </div>
            <p className="font-body text-sm text-muted-foreground leading-relaxed max-w-xs">
              Experiência premium em cortes masculinos desde 2008. Excelência em cada detalhe, transformando estilos com maestria.
            </p>
            
            {/* Social icons */}
            <div className="flex gap-3 pt-2">
              <motion.a
                href="#"
                className="w-10 h-10 rounded-xl bg-card border border-border flex items-center justify-center hover:bg-primary hover:border-primary transition-all duration-300 group/icon hover-lift"
                whileTap={{ scale: 0.95 }}
              >
                <Instagram className="w-4 h-4 text-muted-foreground group-hover/icon:text-primary-foreground transition-colors" />
              </motion.a>
              <motion.a
                href="#"
                className="w-10 h-10 rounded-xl bg-card border border-border flex items-center justify-center hover:bg-primary hover:border-primary transition-all duration-300 group/icon hover-lift"
                whileTap={{ scale: 0.95 }}
              >
                <Facebook className="w-4 h-4 text-muted-foreground group-hover/icon:text-primary-foreground transition-colors" />
              </motion.a>
            </div>
          </motion.div>

          {/* Links Rápidos */}
          <motion.div variants={itemVariants}>
            <h4 className="font-heading text-xl mb-5 text-foreground">NAVEGAÇÃO</h4>
            <ul className="space-y-3">
              {linkItems.map((link) => (
                <li key={link.to}>
                  <Link
                    to={link.to}
                    className="group flex items-center gap-2 font-body text-sm text-muted-foreground hover:text-primary transition-colors"
                  >
                    <ChevronRight className="w-3 h-3 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-200" />
                    <span>{link.label}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </motion.div>

          {/* Contato */}
          <motion.div variants={itemVariants}>
            <h4 className="font-heading text-xl mb-5 text-foreground">CONTATO</h4>
            <ul className="space-y-4">
              <li>
                <a href="tel:+5511987654321" className="flex items-center gap-3 font-body text-sm text-muted-foreground hover:text-primary transition-colors group">
                  <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                    <Phone className="w-4 h-4 text-primary" />
                  </div>
                  <span>(11) 98765-4321</span>
                </a>
              </li>
              <li>
                <a href="mailto:contato@barberpro.com" className="flex items-center gap-3 font-body text-sm text-muted-foreground hover:text-primary transition-colors group">
                  <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                    <Mail className="w-4 h-4 text-primary" />
                  </div>
                  <span className="break-all">contato@barberpro.com</span>
                </a>
              </li>
              <li className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <MapPin className="w-4 h-4 text-primary" />
                </div>
                <span className="font-body text-sm text-muted-foreground">
                  Rua dos Barbeiros, 123<br />São Paulo - SP
                </span>
              </li>
            </ul>
          </motion.div>

          {/* Horários */}
          <motion.div variants={itemVariants}>
            <h4 className="font-heading text-xl mb-5 text-foreground">HORÁRIOS</h4>
            <ul className="space-y-3">
              <li className="flex justify-between font-body text-sm">
                <span className="text-muted-foreground">Seg - Sex</span>
                <span className="text-foreground font-medium">09:00 - 20:00</span>
              </li>
              <li className="flex justify-between font-body text-sm">
                <span className="text-muted-foreground">Sábado</span>
                <span className="text-foreground font-medium">09:00 - 18:00</span>
              </li>
              <li className="flex justify-between font-body text-sm">
                <span className="text-muted-foreground">Domingo</span>
                <span className="text-foreground font-medium">Fechado</span>
              </li>
            </ul>
            
            {/* CTA */}
            <div className="mt-6 p-4 rounded-xl bg-primary/10 border border-primary/20">
              <p className="font-body text-xs text-muted-foreground mb-2">Agende seu horário</p>
              <Link 
                to="/agendamento-visitante" 
                className="font-heading text-lg text-primary hover:text-primary/80 transition-colors"
              >
                Fazer Agendamento →
              </Link>
            </div>
          </motion.div>
        </motion.div>

        {/* Bottom bar */}
        <motion.div 
          className="border-t border-border mt-10 md:mt-14 pt-6 md:pt-8 flex flex-col md:flex-row justify-between items-center gap-4"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.4 }}
        >
          <p className="font-body text-xs text-muted-foreground text-center md:text-left">
            © 2024 Barber Pro. Todos os direitos reservados.
          </p>
          <div className="flex gap-6">
            <Link to="#" className="font-body text-xs text-muted-foreground hover:text-primary transition-colors">
              Termos de Uso
            </Link>
            <Link to="#" className="font-body text-xs text-muted-foreground hover:text-primary transition-colors">
              Privacidade
            </Link>
          </div>
        </motion.div>
      </div>
    </footer>
  );
};

export default Footer;
