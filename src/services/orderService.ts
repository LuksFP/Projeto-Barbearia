// Order Service - Ready for backend integration
// TODO: Replace mock implementations with actual API calls

import { Order } from '@/types/product';

// Mock data store - will be replaced by database
let orders: Order[] = [];
let lastOrder: Order | null = null;

export const orderService = {
  // Get all orders
  async getAll(): Promise<Order[]> {
    // TODO: Replace with API call
    // return await api.get('/orders');
    return orders;
  },

  // Get orders by user ID
  async getByUserId(userId: string): Promise<Order[]> {
    // TODO: Replace with API call
    // return await api.get(`/orders/user/${userId}`);
    return orders.filter(o => o.userId === userId);
  },

  // Get order by ID
  async getById(id: string): Promise<Order | null> {
    // TODO: Replace with API call
    // return await api.get(`/orders/${id}`);
    return orders.find(o => o.id === id) || null;
  },

  // Get last order (for confirmation page)
  async getLastOrder(): Promise<Order | null> {
    // TODO: Replace with API call or session storage
    // return await api.get('/orders/last');
    return lastOrder;
  },

  // Create a new order
  async create(order: Omit<Order, 'id' | 'date' | 'status'>): Promise<Order> {
    // TODO: Replace with API call
    // return await api.post('/orders', order);
    const newOrder: Order = {
      ...order,
      id: `PED-${Date.now()}`,
      date: new Date().toISOString(),
      status: 'pending',
    };
    orders.push(newOrder);
    lastOrder = newOrder;
    return newOrder;
  },

  // Update order status
  async updateStatus(id: string, status: Order['status']): Promise<Order | null> {
    // TODO: Replace with API call
    // return await api.patch(`/orders/${id}`, { status });
    const index = orders.findIndex(o => o.id === id);
    if (index !== -1) {
      orders[index] = { ...orders[index], status };
      return orders[index];
    }
    return null;
  },

  // Track order
  async track(code: string): Promise<{ code: string; status: string; steps: any[] } | null> {
    // TODO: Replace with API call
    // return await api.get(`/orders/track/${code}`);
    const order = orders.find(o => o.id === code);
    if (order) {
      return {
        code: order.id,
        status: order.status,
        steps: [
          { status: 'Pedido recebido', date: new Date(order.date).toLocaleDateString('pt-BR'), completed: true },
          { status: 'Em separação', date: '-', completed: order.status !== 'pending' },
          { status: 'A caminho', date: '-', completed: order.status === 'shipped' || order.status === 'delivered' },
          { status: 'Saiu para entrega', date: '-', completed: order.status === 'delivered' },
          { status: 'Entregue', date: '-', completed: order.status === 'delivered' },
        ],
      };
    }
    return null;
  },
};
