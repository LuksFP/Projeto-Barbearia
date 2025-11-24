import { useState, useEffect } from 'react';
import ProductCard from '@/components/ProductCard';
import ProductModal from '@/components/ProductModal';
import { products } from '@/data/products';
import { Product } from '@/types/product';
import { Button } from '@/components/ui/button';

const Loja = () => {
  const [filter, setFilter] = useState<'all' | 'pomada' | 'barba' | 'camiseta'>('all');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    const handleOpenModal = (e: Event) => {
      const customEvent = e as CustomEvent<Product>;
      setSelectedProduct(customEvent.detail);
      setIsModalOpen(true);
    };

    window.addEventListener('openProductModal', handleOpenModal);
    return () => window.removeEventListener('openProductModal', handleOpenModal);
  }, []);

  const handleOpenModal = (product: Product) => {
    setSelectedProduct(product);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setTimeout(() => setSelectedProduct(null), 200);
  };

  const filteredProducts = filter === 'all' 
    ? products 
    : products.filter(p => p.category === filter);

  return (
    <div className="min-h-screen pt-20 pb-16">
      <div className="container mx-auto px-4 py-12">
        <h1 className="font-heading text-5xl text-center mb-4">
          <span className="text-primary">NOSSA</span> LOJA
        </h1>
        <p className="text-center text-muted-foreground font-body mb-12 max-w-2xl mx-auto">
          Produtos premium para cuidados com cabelo e barba
        </p>

        <div className="flex justify-center gap-4 mb-12 flex-wrap">
          <Button
            variant={filter === 'all' ? 'default' : 'outline'}
            onClick={() => setFilter('all')}
          >
            Todos
          </Button>
          <Button
            variant={filter === 'pomada' ? 'default' : 'outline'}
            onClick={() => setFilter('pomada')}
          >
            Pomadas
          </Button>
          <Button
            variant={filter === 'barba' ? 'default' : 'outline'}
            onClick={() => setFilter('barba')}
          >
            Barba
          </Button>
          <Button
            variant={filter === 'camiseta' ? 'default' : 'outline'}
            onClick={() => setFilter('camiseta')}
          >
            Camisetas
          </Button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredProducts.map((product) => (
            <ProductCard key={product.id} product={product} onOpenModal={handleOpenModal} />
          ))}
        </div>
      </div>

      {selectedProduct && (
        <ProductModal
          product={selectedProduct}
          isOpen={isModalOpen}
          onClose={handleCloseModal}
        />
      )}
    </div>
  );
};

export default Loja;
