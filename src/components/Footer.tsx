import { Scissors, Instagram, Facebook, Phone, Mail, MapPin } from 'lucide-react';
import { Link } from 'react-router-dom';

const Footer = () => {
  return (
    <footer className="bg-secondary/30 border-t border-border">
      <div className="container mx-auto px-4 py-8 sm:py-10 md:py-12">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8">
          {/* Logo e Descrição */}
          <div className="space-y-3 sm:space-y-4 sm:col-span-2 lg:col-span-1">
            <div className="flex items-center gap-2 sm:gap-3">
              <Scissors className="w-6 h-6 sm:w-8 sm:h-8 text-primary" />
              <span className="font-heading text-xl sm:text-2xl tracking-wider text-foreground">
                BARBER <span className="text-primary">PRO</span>
              </span>
            </div>
            <p className="font-body text-xs sm:text-sm text-muted-foreground">
              Experiência premium em cortes masculinos desde 2008. Excelência em cada detalhe.
            </p>
          </div>

          {/* Links Rápidos */}
          <div>
            <h4 className="font-heading text-lg sm:text-xl mb-3 sm:mb-4">LINKS</h4>
            <ul className="space-y-2">
              {[
                { to: '/', label: 'Home' },
                { to: '/sobre', label: 'Sobre' },
                { to: '/cortes', label: 'Cortes' },
                { to: '/tipos-cabelo', label: 'Tipos de Cabelo' },
                { to: '/loja', label: 'Loja' },
                { to: '/consulta-agendamento', label: 'Consultar Agendamento' },
              ].map((link) => (
                <li key={link.to}>
                  <Link
                    to={link.to}
                    className="font-body text-xs sm:text-sm text-muted-foreground hover:text-primary transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contato */}
          <div>
            <h4 className="font-heading text-lg sm:text-xl mb-3 sm:mb-4">CONTATO</h4>
            <ul className="space-y-2 sm:space-y-3">
              <li className="flex items-center gap-2 font-body text-xs sm:text-sm text-muted-foreground">
                <Phone className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-primary flex-shrink-0" />
                (11) 98765-4321
              </li>
              <li className="flex items-center gap-2 font-body text-xs sm:text-sm text-muted-foreground">
                <Mail className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-primary flex-shrink-0" />
                <span className="break-all">contato@barberpro.com</span>
              </li>
              <li className="flex items-start gap-2 font-body text-xs sm:text-sm text-muted-foreground">
                <MapPin className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-primary mt-0.5 flex-shrink-0" />
                <span>Rua dos Barbeiros, 123<br />São Paulo - SP</span>
              </li>
            </ul>
          </div>

          {/* Redes Sociais */}
          <div>
            <h4 className="font-heading text-lg sm:text-xl mb-3 sm:mb-4">REDES</h4>
            <div className="flex gap-3 sm:gap-4">
              <a
                href="#"
                className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-card border border-border flex items-center justify-center hover:bg-primary hover:border-primary transition-all group"
              >
                <Instagram className="w-4 h-4 sm:w-5 sm:h-5 text-foreground group-hover:text-primary-foreground transition-colors" />
              </a>
              <a
                href="#"
                className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-card border border-border flex items-center justify-center hover:bg-primary hover:border-primary transition-all group"
              >
                <Facebook className="w-4 h-4 sm:w-5 sm:h-5 text-foreground group-hover:text-primary-foreground transition-colors" />
              </a>
            </div>
            <p className="font-body text-xs sm:text-sm text-muted-foreground mt-3 sm:mt-4">
              Siga-nos para dicas e novidades
            </p>
          </div>
        </div>

        <div className="border-t border-border mt-8 sm:mt-10 md:mt-12 pt-6 sm:pt-8 text-center">
          <p className="font-body text-xs sm:text-sm text-muted-foreground">
            © 2024 Barber Pro. Todos os direitos reservados.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
