import lowFade from '@/assets/low-fade.jpg';
import taperFade from '@/assets/taper-fade.jpg';
import americano from '@/assets/americano.jpg';
import corteJaca from '@/assets/corte-jaca.jpg';
import midFade from '@/assets/mid-fade.jpg';

export interface HaircutItem {
  image: string;
  title: string;
  description: string;
  detail: string;
  framingLabel: string;
  imageClassName?: string;
}

export const featuredHaircuts: HaircutItem[] = [
  {
    image: lowFade,
    title: 'LOW FADE',
    description: 'Degrade baixo com transicao suave e acabamento limpo.',
    detail: 'Perfil lateral com peso no topo e linha baixa nas laterais.',
    framingLabel: 'degrade baixo',
    imageClassName: 'object-[30%_34%]',
  },
  {
    image: taperFade,
    title: 'TAPER FADE',
    description: 'Transicao gradual nas temporas e nuca, com visual natural.',
    detail: 'Laterais leves, topo alinhado e acabamento mais discreto.',
    framingLabel: 'acabamento natural',
    imageClassName: 'object-[38%_28%]',
  },
  {
    image: americano,
    title: 'AMERICANO',
    description: 'Social classico com topo estruturado e laterais curtas.',
    detail: 'Leitura frontal que destaca volume controlado e desenho limpo.',
    framingLabel: 'classico social',
    imageClassName: 'object-[50%_22%]',
  },
  {
    image: corteJaca,
    title: 'CORTE JACA',
    description: 'Topete marcado com laterais baixas e presenca forte.',
    detail: 'Perfil mais ousado, com contraste claro entre topo e lateral.',
    framingLabel: 'topete marcado',
    imageClassName: 'object-[66%_32%]',
  },
];

export const allHaircuts: HaircutItem[] = [
  ...featuredHaircuts,
  {
    image: midFade,
    title: 'MID FADE',
    description: 'Degrade medio versatil, equilibrando definicao e mobilidade.',
    detail: 'Corte limpo para quem quer contraste sem subir demais o fade.',
    framingLabel: 'degrade medio',
    imageClassName: 'object-[42%_30%]',
  },
];
