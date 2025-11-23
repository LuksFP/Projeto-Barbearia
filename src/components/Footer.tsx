import { Scissors, Instagram, Facebook, Phone, Mail, MapPin } from 'lucide-react';
import { Link } from 'react-router-dom';

const Footer = () => {
  return (
    <footer className="bg-secondary/30 border-t border-border">
      <div className="container mx-auto px-4 py-12">
        <div className="grid md:grid-cols-4 gap-8">
          {/* Logo e Descrição */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <Scissors className="w-8 h-8 text-primary" />
              <span className="font-heading text-2xl tracking-wider text-foreground">
                BARBER <span className="text-primary">PRO</span>
              </span>
            </div>
            <p className="font-body text-sm text-muted-foreground">
              Experiência premium em cortes masculinos desde 2008. Excelência em cada detalhe.
            </p>
          </div>

          {/* Links Rápidos */}
          <div>
            <h4 className="font-heading text-xl mb-4">LINKS</h4>
            <ul className="space-y-2">
              {[
                { to: '/', label: 'Home' },
                { to: '/sobre', label: 'Sobre' },
                { to: '/cortes', label: 'Cortes' },
                { to: '/tipos-cabelo', label: 'Tipos de Cabelo' },
                { to: '/loja', label: 'Loja' },
              ].map((link) => (
                <li key={link.to}>
                  <Link
                    to={link.to}
                    className="font-body text-sm text-muted-foreground hover:text-primary transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contato */}
          <div>
            <h4 className="font-heading text-xl mb-4">CONTATO</h4>
            <ul className="space-y-3">
              <li className="flex items-center gap-2 font-body text-sm text-muted-foreground">
                <Phone className="w-4 h-4 text-primary" />
                (11) 98765-4321
              </li>
              <li className="flex items-center gap-2 font-body text-sm text-muted-foreground">
                <Mail className="w-4 h-4 text-primary" />
                contato@barberpro.com
              </li>
              <li className="flex items-start gap-2 font-body text-sm text-muted-foreground">
                <MapPin className="w-4 h-4 text-primary mt-1" />
                Rua dos Barbeiros, 123<br />São Paulo - SP
              </li>
            </ul>
          </div>

          {/* Redes Sociais */}
          <div>
            <h4 className="font-heading text-xl mb-4">REDES</h4>
            <div className="flex gap-4">
              <a
                href="#"
                className="w-10 h-10 rounded-full bg-card border border-border flex items-center justify-center hover:bg-primary hover:border-primary transition-all group"
              >
                <Instagram className="w-5 h-5 text-foreground group-hover:text-primary-foreground transition-colors" />
              </a>
              <a
                href="#"
                className="w-10 h-10 rounded-full bg-card border border-border flex items-center justify-center hover:bg-primary hover:border-primary transition-all group"
              >
                <Facebook className="w-5 h-5 text-foreground group-hover:text-primary-foreground transition-colors" />
              </a>
            </div>
            <p className="font-body text-sm text-muted-foreground mt-4">
              Siga-nos para dicas e novidades
            </p>
          </div>
        </div>

        <div className="border-t border-border mt-12 pt-8 text-center">
          <p className="font-body text-sm text-muted-foreground">
            © 2024 Barber Pro. Todos os direitos reservados.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
