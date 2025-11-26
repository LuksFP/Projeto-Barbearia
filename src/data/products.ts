import { Product } from '@/types/product';
import pomadaStrong from '@/assets/products/pomada-strong.jpg';
import pomadaMatte from '@/assets/products/pomada-matte.jpg';
import ceraCabelo from '@/assets/products/cera-cabelo.jpg';
import clayCabelo from '@/assets/products/clay-cabelo.jpg';
import gelCabelo from '@/assets/products/gel-cabelo.jpg';
import oleoBarba from '@/assets/products/oleo-barba.jpg';
import balmBarba from '@/assets/products/balm-barba.jpg';
import shampooBarba from '@/assets/products/shampoo-barba.jpg';
import serumBarba from '@/assets/products/serum-barba.jpg';
import camisetaClassic from '@/assets/products/camiseta-classic.jpg';
import camisetaPremium from '@/assets/products/camiseta-premium.jpg';
import camisetaVintage from '@/assets/products/camiseta-vintage.jpg';

export const products: Product[] = [
  {
    id: '1',
    name: 'Pomada Strong Hold',
    description: 'Fixação forte para penteados que duram o dia todo',
    price: 49.90,
    category: 'pomada',
    image: pomadaStrong,
    inStock: true,
  },
  {
    id: '2',
    name: 'Pomada Matte Finish',
    description: 'Acabamento fosco e natural, fixação média',
    price: 45.90,
    category: 'pomada',
    image: pomadaMatte,
    inStock: true,
  },
  {
    id: '3',
    name: 'Cera Modeladora',
    description: 'Textura e definição para estilos modernos',
    price: 42.90,
    category: 'pomada',
    image: ceraCabelo,
    inStock: true,
  },
  {
    id: '4',
    name: 'Clay Premium',
    description: 'Argila modeladora com fixação extra forte',
    price: 52.90,
    category: 'pomada',
    image: clayCabelo,
    inStock: true,
  },
  {
    id: '5',
    name: 'Gel Ultra Fix',
    description: 'Gel profissional com brilho intenso',
    price: 38.90,
    category: 'pomada',
    image: gelCabelo,
    inStock: true,
  },
  {
    id: '6',
    name: 'Óleo para Barba',
    description: 'Hidratação e brilho natural para sua barba',
    price: 55.90,
    category: 'barba',
    image: oleoBarba,
    inStock: true,
  },
  {
    id: '7',
    name: 'Balm para Barba',
    description: 'Nutrição profunda e controle de frizz',
    price: 48.90,
    category: 'barba',
    image: balmBarba,
    inStock: true,
  },
  {
    id: '8',
    name: 'Shampoo para Barba',
    description: 'Limpeza suave e hidratação intensa',
    price: 39.90,
    category: 'barba',
    image: shampooBarba,
    inStock: true,
  },
  {
    id: '9',
    name: 'Sérum Crescimento',
    description: 'Estimula o crescimento e fortalece os fios',
    price: 89.90,
    category: 'barba',
    image: serumBarba,
    inStock: true,
  },
  {
    id: '10',
    name: 'Camiseta Classic',
    description: 'T-shirt preta com logo dourado bordado',
    price: 79.90,
    category: 'camiseta',
    image: camisetaClassic,
    inStock: true,
  },
  {
    id: '11',
    name: 'Camiseta Premium',
    description: 'Algodão premium com estampa exclusiva',
    price: 99.90,
    category: 'camiseta',
    image: camisetaPremium,
    inStock: true,
  },
  {
    id: '12',
    name: 'Camiseta Vintage',
    description: 'Design retrô em algodão de alta qualidade',
    price: 89.90,
    category: 'camiseta',
    image: camisetaVintage,
    inStock: true,
  },
];