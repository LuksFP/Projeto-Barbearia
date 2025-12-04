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
          className="absolute top-2 right-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity"
          onClick={() => onOpenModal(product)}
        >
          <Eye className="w-4 h-4" />
        </Button>
      </div>
      <div className="p-3 sm:p-4">
        <span className="text-xs font-body text-muted-foreground uppercase tracking-wider">
          {product.category}
        </span>
        <h3 className="font-heading text-lg sm:text-xl mt-1 text-foreground line-clamp-1">
          {product.name}
        </h3>
        <p className="text-xs sm:text-sm text-muted-foreground mt-1 sm:mt-2 font-body line-clamp-2">
          {product.description}
        </p>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mt-3 sm:mt-4 gap-2 sm:gap-0">
          <span className="text-xl sm:text-2xl font-heading text-primary">
            R$ {product.price.toFixed(2)}
          </span>
          <Button
            onClick={() => addItem(product)}
            className="gap-2 w-full sm:w-auto"
            size="sm"
            disabled={!product.inStock}
          >
            <ShoppingCart className="w-4 h-4" />
            <span className="sm:hidden">Adicionar</span>
            <span className="hidden sm:inline">Adicionar</span>
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ProductCard;
