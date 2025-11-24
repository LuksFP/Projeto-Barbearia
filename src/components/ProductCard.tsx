import { Product } from '@/types/product';
import { Button } from './ui/button';
import { ShoppingCart, Eye } from 'lucide-react';
import { useCart } from '@/contexts/CartContext';

interface ProductCardProps {
  product: Product;
  onOpenModal: (product: Product) => void;
}

const ProductCard = ({ product, onOpenModal }: ProductCardProps) => {
  const { addItem } = useCart();

  return (
    <div className="group bg-card border border-border rounded-lg overflow-hidden hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
      <div className="relative aspect-square overflow-hidden bg-background">
        <img
          src={product.image}
          alt={product.name}
          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
        />
        <Button
          variant="secondary"
          size="icon"
          className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={() => onOpenModal(product)}
        >
          <Eye className="w-4 h-4" />
        </Button>
      </div>
      <div className="aspect-square overflow-hidden bg-background">
        <img
          src={product.image}
          alt={product.name}
          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
        />
      </div>
      <div className="p-4">
        <span className="text-xs font-body text-muted-foreground uppercase tracking-wider">
          {product.category}
        </span>
        <h3 className="font-heading text-xl mt-1 text-foreground">
          {product.name}
        </h3>
        <p className="text-sm text-muted-foreground mt-2 font-body">
          {product.description}
        </p>
        <div className="flex items-center justify-between mt-4">
          <span className="text-2xl font-heading text-primary">
            R$ {product.price.toFixed(2)}
          </span>
          <Button
            onClick={() => addItem(product)}
            className="gap-2"
            disabled={!product.inStock}
          >
            <ShoppingCart className="w-4 h-4" />
            Adicionar
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ProductCard;
