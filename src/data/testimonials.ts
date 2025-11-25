import { Testimonial } from '@/types/appointment';
import before1 from '@/assets/testimonials/before-1.jpg';
import after1 from '@/assets/testimonials/after-1.jpg';
import before2 from '@/assets/testimonials/before-2.jpg';
import after2 from '@/assets/testimonials/after-2.jpg';
import before3 from '@/assets/testimonials/before-3.jpg';
import after3 from '@/assets/testimonials/after-3.jpg';

export const testimonials: Testimonial[] = [
  {
    id: '1',
    name: 'Carlos Silva',
    service: 'corte',
    rating: 5,
    comment: 'Melhor corte que já fiz! O barbeiro entende exatamente o que você quer e entrega com perfeição. Ambiente top e atendimento impecável.',
    beforeImage: before1,
    afterImage: after1,
    date: '2024-01-15',
  },
  {
    id: '2',
    name: 'Rafael Santos',
    service: 'barba',
    rating: 5,
    comment: 'Fiz barba e corte, ficou sensacional! A atenção aos detalhes é impressionante. Saí de lá me sentindo outra pessoa. Super recomendo!',
    beforeImage: before2,
    afterImage: after2,
    date: '2024-01-18',
  },
  {
    id: '3',
    name: 'Thiago Alves',
    service: 'combo',
    rating: 5,
    comment: 'Cabelo crespo não é fácil de trabalhar, mas o profissional arrasou! Fade perfeito, transições suaves. Virei cliente fiel!',
    beforeImage: before3,
    afterImage: after3,
    date: '2024-01-22',
  },
  {
    id: '4',
    name: 'Bruno Costa',
    service: 'corte',
    rating: 5,
    comment: 'Serviço impecável do início ao fim. Ambiente agradável, conversa boa e resultado excepcional. Vale cada centavo!',
    beforeImage: before1,
    afterImage: after1,
    date: '2024-01-25',
  },
  {
    id: '5',
    name: 'Marcelo Lima',
    service: 'tratamento',
    rating: 5,
    comment: 'Fiz o tratamento de barba completo e foi incrível. Produtos de qualidade, técnica impecável. Minha barba nunca esteve tão bonita!',
    beforeImage: before2,
    afterImage: after2,
    date: '2024-01-28',
  },
  {
    id: '6',
    name: 'Lucas Fernandes',
    service: 'combo',
    rating: 5,
    comment: 'Melhor custo benefício da região! Corte e barba perfeitos, ambiente profissional. Já indiquei para vários amigos.',
    beforeImage: before3,
    afterImage: after3,
    date: '2024-02-01',
  },
];
