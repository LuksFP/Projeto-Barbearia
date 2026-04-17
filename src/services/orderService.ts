// Pedidos — funciona por sessão (a loja de produtos está desabilitada nesta versão).

import type { Order, OrderTracking } from '@/types/product';

const orders: Order[] = [];
let lastOrder: Order | null = null;

export const orderService = {
  async getAll(): Promise<Order[]> {
    return orders;
  },

  async getByUserId(userId: string): Promise<Order[]> {
    return orders.filter(o => o.userId === userId);
  },

  async getById(id: string): Promise<Order | null> {
    return orders.find(o => o.id === id) || null;
  },

  async getLastOrder(): Promise<Order | null> {
    return lastOrder;
  },

  async create(order: Omit<Order, 'id' | 'date' | 'status'>): Promise<Order> {
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

  async updateStatus(id: string, status: Order['status']): Promise<Order | null> {
    const index = orders.findIndex(o => o.id === id);
    if (index !== -1) {
      orders[index] = { ...orders[index], status };
      return orders[index];
    }
    return null;
  },

  async track(code: string): Promise<OrderTracking | null> {
    const order = orders.find(o => o.id === code);
    if (order) {
      return {
        code: order.id,
        status: order.status,
        steps: [
          { status: 'Pedido recebido',  date: new Date(order.date).toLocaleDateString('pt-BR'), completed: true },
          { status: 'Em separação',     date: '-', completed: order.status !== 'pending' },
          { status: 'A caminho',        date: '-', completed: order.status === 'shipped' || order.status === 'delivered' },
          { status: 'Saiu para entrega', date: '-', completed: order.status === 'delivered' },
          { status: 'Entregue',         date: '-', completed: order.status === 'delivered' },
        ],
      };
    }
    return null;
  },
};
