import React, { createContext, useContext, useState, useEffect } from 'react';
import { CartItem, Product } from '@/types/product';
import { toast } from '@/hooks/use-toast';
import { useSubscription } from './SubscriptionContext';
import { cartService } from '@/services/cartService';

interface CartContextType {
  items: CartItem[];
  addItem: (product: Product) => void;
  removeItem: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  totalItems: number;
  subtotal: number;
  discountedSubtotal: number;
  discountAmount: number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [items, setItems] = useState<CartItem[]>([]);
  const { isSubscribed, discountPercentage, getDiscountedPrice } = useSubscription();

  useEffect(() => {
    // Load cart on mount
    const loadCart = async () => {
      try {
        const cartItems = await cartService.getItems();
        setItems(cartItems);
      } catch (error) {
        console.error('Failed to load cart:', error);
      }
    };
    loadCart();
  }, []);

  const addItem = async (product: Product) => {
    try {
      const existing = items.find((item) => item.product.id === product.id);
      const updatedItems = await cartService.addItem(product);
      setItems(updatedItems);
      
      if (existing) {
        toast({
          title: 'Quantidade atualizada',
          description: `${product.name} adicionado ao carrinho`,
        });
      } else {
        toast({
          title: 'Produto adicionado',
          description: `${product.name} foi adicionado ao carrinho${isSubscribed ? ' com desconto VIP!' : ''}`,
        });
      }
    } catch (error) {
      console.error('Failed to add item:', error);
    }
  };

  const removeItem = async (productId: string) => {
    try {
      const updatedItems = await cartService.removeItem(productId);
      setItems(updatedItems);
      toast({
        title: 'Produto removido',
        description: 'Item removido do carrinho',
      });
    } catch (error) {
      console.error('Failed to remove item:', error);
    }
  };

  const updateQuantity = async (productId: string, quantity: number) => {
    try {
      if (quantity <= 0) {
        await removeItem(productId);
        return;
      }
      const updatedItems = await cartService.updateQuantity(productId, quantity);
      setItems(updatedItems);
    } catch (error) {
      console.error('Failed to update quantity:', error);
    }
  };

  const clearCart = async () => {
    try {
      await cartService.clear();
      setItems([]);
    } catch (error) {
      console.error('Failed to clear cart:', error);
    }
  };

  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);
  const subtotal = items.reduce(
    (sum, item) => sum + item.product.price * item.quantity,
    0
  );
  const discountedSubtotal = items.reduce(
    (sum, item) => sum + getDiscountedPrice(item.product.price) * item.quantity,
    0
  );
  const discountAmount = subtotal - discountedSubtotal;

  return (
    <CartContext.Provider
      value={{
        items,
        addItem,
        removeItem,
        updateQuantity,
        clearCart,
        totalItems,
        subtotal,
        discountedSubtotal,
        discountAmount,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within CartProvider');
  }
  return context;
};
