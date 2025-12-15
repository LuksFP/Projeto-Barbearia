import { useScroll, useTransform, MotionValue } from 'framer-motion';
import { RefObject } from 'react';

interface ParallaxOptions {
  offset?: ['start end' | 'end start' | 'center center' | 'start start' | 'end end', 'start end' | 'end start' | 'center center' | 'start start' | 'end end'];
  inputRange?: number[];
  outputRange?: number[];
}

export function useParallax(
  ref: RefObject<HTMLElement>,
  options: ParallaxOptions = {}
): MotionValue<number> {
  const {
    offset = ['start end', 'end start'],
    inputRange = [0, 1],
    outputRange = [0, -100],
  } = options;

  const { scrollYProgress } = useScroll({
    target: ref,
    offset: offset,
  });

  const y = useTransform(scrollYProgress, inputRange, outputRange);

  return y;
}

export function useParallaxScale(
  ref: RefObject<HTMLElement>,
  options: { minScale?: number; maxScale?: number } = {}
): MotionValue<number> {
  const { minScale = 1, maxScale = 1.1 } = options;

  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start end', 'end start'],
  });

  const scale = useTransform(scrollYProgress, [0, 0.5, 1], [minScale, maxScale, minScale]);

  return scale;
}

export function useParallaxOpacity(
  ref: RefObject<HTMLElement>
): MotionValue<number> {
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start end', 'center center'],
  });

  const opacity = useTransform(scrollYProgress, [0, 1], [0.3, 1]);

  return opacity;
}
