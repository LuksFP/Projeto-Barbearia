import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
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

  const isCortesMenu = to === '/cortes';

  if (!isCortesMenu) {
    return null;
  }

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
        className="px-4 py-2.5 font-body font-medium text-sm tracking-wide transition-all duration-300 rounded-full relative group text-foreground hover:text-primary hover:bg-background/45"
      >
        {label}
        <span
          className={`absolute bottom-1 left-1/2 -translate-x-1/2 h-0.5 bg-primary transition-all duration-300 ${
            isOpen ? 'w-8' : 'w-0 group-hover:w-full'
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
            className="absolute top-full left-1/2 -translate-x-1/2 mt-3 w-[800px] overflow-hidden rounded-[1.6rem] border border-border/50 bg-background/85 backdrop-blur-xl shadow-2xl z-50"
          >
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
