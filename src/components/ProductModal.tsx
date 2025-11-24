import { useState } from 'react';
import { Product } from '@/types/product';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ShoppingCart, Star, ZoomIn } from 'lucide-react';
import { useCart } from '@/contexts/CartContext';
import { products } from '@/data/products';

interface ProductModalProps {
  product: Product;
  isOpen: boolean;
  onClose: () => void;
}

const ProductModal = ({ product, isOpen, onClose }: ProductModalProps) => {
  const { addItem } = useCart();
  const [selectedImage, setSelectedImage] = useState(0);
  const [isZoomed, setIsZoomed] = useState(false);

  // Simular múltiplas imagens (na prática, seria um array real)
  const images = [product.image, product.image, product.image];

  // Avaliações simuladas
  const reviews = [
    { id: 1, author: 'Carlos Silva', rating: 5, comment: 'Produto excelente! Fixação perfeita o dia todo.', date: '15/01/2024' },
    { id: 2, author: 'João Santos', rating: 5, comment: 'Melhor pomada que já usei. Vale cada centavo!', date: '10/01/2024' },
    { id: 3, author: 'Pedro Lima', rating: 4, comment: 'Muito bom, mas o cheiro poderia ser mais suave.', date: '05/01/2024' },
  ];

  // Produtos relacionados
  const relatedProducts = products
    .filter(p => p.category === product.category && p.id !== product.id)
    .slice(0, 3);

  const handleAddToCart = () => {
    addItem(product);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-heading text-3xl text-primary">{product.name}</DialogTitle>
        </DialogHeader>

        <div className="grid md:grid-cols-2 gap-8">
          {/* Galeria de imagens */}
          <div className="space-y-4">
            <div className="relative aspect-square bg-background rounded-lg overflow-hidden group">
              <img
                src={images[selectedImage]}
                alt={product.name}
                className={`w-full h-full object-cover transition-transform duration-300 ${
                  isZoomed ? 'scale-150 cursor-zoom-out' : 'cursor-zoom-in'
                }`}
                onClick={() => setIsZoomed(!isZoomed)}
              />
              <Button
                variant="secondary"
                size="icon"
                className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={() => setIsZoomed(!isZoomed)}
              >
                <ZoomIn className="w-4 h-4" />
              </Button>
            </div>
            <div className="flex gap-2">
              {images.map((img, idx) => (
                <button
                  key={idx}
                  onClick={() => setSelectedImage(idx)}
                  className={`w-20 h-20 rounded-lg overflow-hidden border-2 transition-all ${
                    selectedImage === idx ? 'border-primary' : 'border-border'
                  }`}
                >
                  <img src={img} alt={`${product.name} ${idx + 1}`} className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          </div>

          {/* Informações do produto */}
          <div className="space-y-6">
            <div>
              <span className="text-xs font-body text-muted-foreground uppercase tracking-wider">
                {product.category}
              </span>
              <p className="text-muted-foreground font-body mt-2">{product.description}</p>
              <p className="text-muted-foreground font-body mt-4 text-sm leading-relaxed">
                Produto premium desenvolvido especialmente para profissionais e entusiastas que buscam 
                resultados excepcionais. Fórmula exclusiva com ingredientes de alta qualidade que garantem 
                performance superior e acabamento impecável.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <div className="flex">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-5 h-5 fill-primary text-primary" />
                ))}
              </div>
              <span className="text-sm text-muted-foreground">({reviews.length} avaliações)</span>
            </div>

            <div className="flex items-center justify-between py-4 border-t border-b border-border">
              <span className="text-3xl font-heading text-primary">
                R$ {product.price.toFixed(2)}
              </span>
              <Button onClick={handleAddToCart} className="gap-2" disabled={!product.inStock}>
                <ShoppingCart className="w-4 h-4" />
                Adicionar ao Carrinho
              </Button>
            </div>

            {/* Avaliações */}
            <div>
              <h3 className="font-heading text-xl mb-4">Avaliações</h3>
              <div className="space-y-4">
                {reviews.map((review) => (
                  <div key={review.id} className="border-b border-border pb-4 last:border-0">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-body font-semibold">{review.author}</span>
                      <span className="text-xs text-muted-foreground">{review.date}</span>
                    </div>
                    <div className="flex mb-2">
                      {[...Array(review.rating)].map((_, i) => (
                        <Star key={i} className="w-4 h-4 fill-primary text-primary" />
                      ))}
                    </div>
                    <p className="text-sm text-muted-foreground font-body">{review.comment}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Produtos relacionados */}
        {relatedProducts.length > 0 && (
          <div className="mt-8 pt-8 border-t border-border">
            <h3 className="font-heading text-2xl mb-4">Produtos Relacionados</h3>
            <div className="grid grid-cols-3 gap-4">
              {relatedProducts.map((relatedProduct) => (
                <div
                  key={relatedProduct.id}
                  className="border border-border rounded-lg overflow-hidden hover:border-primary transition-colors cursor-pointer"
                  onClick={() => {
                    onClose();
                    setTimeout(() => {
                      const event = new CustomEvent('openProductModal', { detail: relatedProduct });
                      window.dispatchEvent(event);
                    }, 100);
                  }}
                >
                  <div className="aspect-square bg-background">
                    <img
                      src={relatedProduct.image}
                      alt={relatedProduct.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="p-3">
                    <h4 className="font-heading text-sm">{relatedProduct.name}</h4>
                    <p className="text-primary font-heading">R$ {relatedProduct.price.toFixed(2)}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default ProductModal;
