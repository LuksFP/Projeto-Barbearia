import { useRef, ReactNode } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import { cn } from '@/lib/utils';

interface ParallaxSectionProps {
  children: ReactNode;
  className?: string;
  backgroundClassName?: string;
  speed?: number; // -1 to 1, negative = slower, positive = faster
  direction?: 'up' | 'down';
  fadeIn?: boolean;
  scaleEffect?: boolean;
}

const ParallaxSection = ({
  children,
  className = '',
  backgroundClassName = '',
  speed = 0.2,
  direction = 'up',
  fadeIn = true,
  scaleEffect = false,
}: ParallaxSectionProps) => {
  const ref = useRef<HTMLDivElement>(null);

  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start end', 'end start'],
  });

  const multiplier = direction === 'up' ? -1 : 1;
  const y = useTransform(scrollYProgress, [0, 1], [0, 100 * speed * multiplier]);
  const opacity = useTransform(scrollYProgress, [0, 0.3, 0.7, 1], [0.6, 1, 1, 0.6]);
  const scale = useTransform(scrollYProgress, [0, 0.5, 1], [0.95, 1, 0.95]);

  return (
    <motion.section
      ref={ref}
      className={cn('relative overflow-hidden', className)}
      style={{
        opacity: fadeIn ? opacity : 1,
      }}
    >
      {/* Parallax background layer */}
      <motion.div
        className={cn('absolute inset-0', backgroundClassName)}
        style={{ y }}
      />

      {/* Content layer */}
      <motion.div
        className="relative z-10"
        style={{
          scale: scaleEffect ? scale : 1,
        }}
      >
        {children}
      </motion.div>
    </motion.section>
  );
};

export default ParallaxSection;
