import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { products } from '@/data/products';
import lowFade from '@/assets/low-fade.jpg';
import taperFade from '@/assets/taper-fade.jpg';
import americano from '@/assets/americano.jpg';
import midFade from '@/assets/mid-fade.jpg';

interface MegaMenuProps {
  label: string;
  to: string;
}

const MegaMenu = ({ label, to }: MegaMenuProps) => {
  const [isOpen, setIsOpen] = useState(false);

  const isLojaMenu = to === '/loja';
  const isCortesMenu = to === '/cortes';

  if (!isLojaMenu && !isCortesMenu) {
    return null;
  }

  const productCategories = [
    {
      name: 'Pomadas & Ceras',
      items: products.filter((p) => p.category === 'pomada').slice(0, 3),
    },
    {
      name: 'Cuidados com Barba',
      items: products.filter((p) => p.category === 'barba').slice(0, 3),
    },
    {
      name: 'Camisetas',
      items: products.filter((p) => p.category === 'camiseta').slice(0, 3),
    },
  ];

  const haircutStyles = [
    { image: lowFade, title: 'LOW FADE', to: '/cortes' },
    { image: taperFade, title: 'TAPER FADE', to: '/cortes' },
    { image: americano, title: 'AMERICANO', to: '/cortes' },
    { image: midFade, title: 'MID FADE', to: '/cortes' },
  ];

  return (
    <div
      onMouseEnter={() => setIsOpen(true)}
      onMouseLeave={() => setIsOpen(false)}
      className="relative"
    >
      <Link
        to={to}
        className="px-4 py-2 font-body font-medium text-sm tracking-wide transition-all duration-300 rounded-lg relative group text-foreground hover:text-primary"
      >
        {label}
        <span
          className={`absolute bottom-0 left-1/2 -translate-x-1/2 h-0.5 bg-primary transition-all duration-300 ${
            isOpen ? 'w-full' : 'w-0 group-hover:w-full'
          }`}
        />
      </Link>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            transition={{ duration: 0.2 }}
            className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-[800px] bg-background border border-border rounded-lg shadow-2xl z-50 overflow-hidden"
          >
            {isLojaMenu && (
              <div className="grid grid-cols-3 gap-6 p-6">
                {productCategories.map((category, idx) => (
                  <motion.div
                    key={category.name}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.1 }}
                    className="space-y-4"
                  >
                    <h3 className="font-heading text-sm uppercase tracking-wider text-primary border-b border-border pb-2">
                      {category.name}
                    </h3>
                    <div className="space-y-3">
                      {category.items.map((product) => (
                        <Link
                          key={product.id}
                          to="/loja"
                          className="flex items-center gap-3 p-2 rounded-lg hover:bg-secondary/50 transition-colors group"
                        >
                          <img
                            src={product.image}
                            alt={product.name}
                            className="w-12 h-12 object-cover rounded group-hover:scale-110 transition-transform"
                          />
                          <div className="flex-1 min-w-0">
                            <p className="font-body text-sm font-semibold text-foreground truncate group-hover:text-primary transition-colors">
                              {product.name}
                            </p>
                            <p className="font-body text-xs text-primary font-bold">
                              R$ {product.price.toFixed(2)}
                            </p>
                          </div>
                        </Link>
                      ))}
                    </div>
                    <Link
                      to="/loja"
                      className="inline-block text-sm font-body font-semibold text-primary hover:underline"
                    >
                      Ver todos →
                    </Link>
                  </motion.div>
                ))}
              </div>
            )}

            {isCortesMenu && (
              <div className="grid grid-cols-4 gap-4 p-6">
                {haircutStyles.map((style, idx) => (
                  <motion.div
                    key={style.title}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: idx * 0.1 }}
                  >
                    <Link
                      to={style.to}
                      className="block group space-y-2"
                    >
                      <div className="relative overflow-hidden rounded-lg aspect-square">
                        <img
                          src={style.image}
                          alt={style.title}
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                      <p className="font-heading text-xs uppercase tracking-wider text-center text-foreground group-hover:text-primary transition-colors">
                        {style.title}
                      </p>
                    </Link>
                  </motion.div>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default MegaMenu;
