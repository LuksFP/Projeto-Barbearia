// Carrinho de compras — funciona por sessão (a loja de produtos está desabilitada nesta versão).

import { CartItem, Product } from '@/types/product';

let cartItems: CartItem[] = [];

export const cartService = {
  async getItems(): Promise<CartItem[]> {
    return cartItems;
  },

  async addItem(product: Product): Promise<CartItem[]> {
    const existing = cartItems.find(item => item.product.id === product.id);
    if (existing) {
      cartItems = cartItems.map(item =>
        item.product.id === product.id
          ? { ...item, quantity: item.quantity + 1 }
          : item
      );
    } else {
      cartItems = [...cartItems, { product, quantity: 1 }];
    }
    return cartItems;
  },

  async removeItem(productId: string): Promise<CartItem[]> {
    cartItems = cartItems.filter(item => item.product.id !== productId);
    return cartItems;
  },

  async updateQuantity(productId: string, quantity: number): Promise<CartItem[]> {
    if (quantity <= 0) {
      return this.removeItem(productId);
    }
    cartItems = cartItems.map(item =>
      item.product.id === productId ? { ...item, quantity } : item
    );
    return cartItems;
  },

  async clear(): Promise<void> {
    cartItems = [];
  },

  calculateTotals(items: CartItem[], discountPercentage: number = 0) {
    const subtotal = items.reduce(
      (sum, item) => sum + item.product.price * item.quantity,
      0
    );
    const discountedSubtotal = subtotal * (1 - discountPercentage / 100);
    const discountAmount = subtotal - discountedSubtotal;
    const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);
    return { subtotal, discountedSubtotal, discountAmount, totalItems };
  },
};
