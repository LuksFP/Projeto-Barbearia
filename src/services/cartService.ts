// Cart Service - Ready for backend integration
// TODO: Replace mock implementations with actual API calls

import { CartItem, Product } from '@/types/product';

// Mock data store - will be replaced by session/database
let cartItems: CartItem[] = [];

export const cartService = {
  // Get all cart items
  async getItems(): Promise<CartItem[]> {
    // TODO: Replace with API call or session storage
    // return await api.get('/cart');
    return cartItems;
  },

  // Add item to cart
  async addItem(product: Product): Promise<CartItem[]> {
    // TODO: Replace with API call
    // return await api.post('/cart', { productId: product.id });
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

  // Remove item from cart
  async removeItem(productId: string): Promise<CartItem[]> {
    // TODO: Replace with API call
    // return await api.delete(`/cart/${productId}`);
    cartItems = cartItems.filter(item => item.product.id !== productId);
    return cartItems;
  },

  // Update item quantity
  async updateQuantity(productId: string, quantity: number): Promise<CartItem[]> {
    // TODO: Replace with API call
    // return await api.patch(`/cart/${productId}`, { quantity });
    if (quantity <= 0) {
      return this.removeItem(productId);
    }
    cartItems = cartItems.map(item =>
      item.product.id === productId ? { ...item, quantity } : item
    );
    return cartItems;
  },

  // Clear cart
  async clear(): Promise<void> {
    // TODO: Replace with API call
    // return await api.delete('/cart');
    cartItems = [];
  },

  // Calculate totals
  calculateTotals(items: CartItem[], discountPercentage: number = 0) {
    const subtotal = items.reduce(
      (sum, item) => sum + item.product.price * item.quantity,
      0
    );
    const discountedSubtotal = subtotal * (1 - discountPercentage / 100);
    const discountAmount = subtotal - discountedSubtotal;
    const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);

    return {
      subtotal,
      discountedSubtotal,
      discountAmount,
      totalItems,
    };
  },
};
