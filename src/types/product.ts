export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  category: 'pomada' | 'barba' | 'camiseta';
  image: string;
  inStock: boolean;
}

export interface CartItem {
  product: Product;
  quantity: number;
}

export interface ShippingInfo {
  name: string;
  email: string;
  phone: string;
  cep: string;
  address: string;
  number: string;
  complement?: string;
  city: string;
  state: string;
}

export interface Order {
  id: string;
  items: CartItem[];
  shipping: ShippingInfo;
  subtotal: number;
  shippingCost: number;
  total: number;
  paymentMethod: string;
  date: string;
  status: 'pending' | 'processing' | 'shipped' | 'delivered';
  deliveryMethod?: 'delivery' | 'pickup';
}
