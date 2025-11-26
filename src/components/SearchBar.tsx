import { useState, useEffect, useRef } from 'react';
import { Search, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { products } from '@/data/products';
import { motion, AnimatePresence } from 'framer-motion';

const SearchBar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<typeof products>([]);
  const searchRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (query.trim()) {
      const filtered = products.filter(
        (product) =>
          product.name.toLowerCase().includes(query.toLowerCase()) ||
          product.description.toLowerCase().includes(query.toLowerCase()) ||
          product.category.toLowerCase().includes(query.toLowerCase())
      );
      setResults(filtered);
    } else {
      setResults([]);
    }
  }, [query]);

  const handleProductClick = (productId: string) => {
    navigate('/loja');
    setIsOpen(false);
    setQuery('');
    setTimeout(() => {
      const element = document.getElementById(`product-${productId}`);
      element?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 100);
  };

  return (
    <div ref={searchRef} className="relative">
      {/* Search Button/Input */}
      <div className="relative">
        <motion.button
          onClick={() => setIsOpen(true)}
          className="flex items-center gap-2 px-4 py-2 text-foreground hover:text-primary transition-colors"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <Search className="w-5 h-5" />
          <span className="hidden xl:inline font-body text-sm">Buscar produtos...</span>
        </motion.button>

        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="absolute top-full right-0 mt-2 w-[90vw] max-w-md bg-background border border-border rounded-lg shadow-xl z-50"
            >
              {/* Search Input */}
              <div className="p-4 border-b border-border">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Buscar produtos..."
                    className="w-full pl-10 pr-10 py-2 bg-secondary/50 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary font-body"
                    autoFocus
                  />
                  {query && (
                    <button
                      onClick={() => setQuery('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>

              {/* Results */}
              <div className="max-h-[400px] overflow-y-auto">
                {query && results.length > 0 ? (
                  <div className="p-2">
                    {results.map((product) => (
                      <motion.button
                        key={product.id}
                        onClick={() => handleProductClick(product.id)}
                        className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-secondary/50 transition-colors text-left"
                        whileHover={{ x: 4 }}
                      >
                        <img
                          src={product.image}
                          alt={product.name}
                          className="w-12 h-12 object-cover rounded"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="font-body font-semibold text-foreground truncate">
                            {product.name}
                          </p>
                          <p className="font-body text-sm text-muted-foreground truncate">
                            {product.description}
                          </p>
                        </div>
                        <span className="font-body font-bold text-primary whitespace-nowrap">
                          R$ {product.price.toFixed(2)}
                        </span>
                      </motion.button>
                    ))}
                  </div>
                ) : query ? (
                  <div className="p-8 text-center">
                    <p className="font-body text-muted-foreground">
                      Nenhum produto encontrado
                    </p>
                  </div>
                ) : (
                  <div className="p-8 text-center">
                    <p className="font-body text-muted-foreground">
                      Digite para buscar produtos
                    </p>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default SearchBar;
