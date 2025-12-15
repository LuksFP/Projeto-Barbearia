import { motion } from 'framer-motion';

interface SectionTitleProps {
  children: React.ReactNode;
  subtitle?: string;
  className?: string;
  align?: 'left' | 'center' | 'right';
}

const SectionTitle = ({ children, subtitle, className = '', align = 'center' }: SectionTitleProps) => {
  const alignmentClasses = {
    left: 'text-left',
    center: 'text-center',
    right: 'text-right',
  };

  const subtitleAlignment = {
    left: 'ml-0',
    center: 'mx-auto',
    right: 'ml-auto',
  };

  return (
    <motion.div 
      className={`mb-12 md:mb-16 ${alignmentClasses[align]} ${className}`}
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{ duration: 0.5, ease: "easeOut" }}
    >
      {/* Decorative element */}
      <motion.div 
        className={`flex items-center gap-3 mb-4 ${align === 'center' ? 'justify-center' : align === 'right' ? 'justify-end' : ''}`}
        initial={{ opacity: 0, scale: 0.8 }}
        whileInView={{ opacity: 1, scale: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.4, delay: 0.1 }}
      >
        <span className="h-px w-8 bg-primary/60" />
        <span className="h-1.5 w-1.5 rounded-full bg-primary" />
        <span className="h-px w-8 bg-primary/60" />
      </motion.div>

      <motion.h2 
        className="font-heading text-4xl sm:text-5xl md:text-6xl tracking-wider leading-tight"
        initial={{ opacity: 0, y: 10 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5, delay: 0.2 }}
      >
        {children}
      </motion.h2>

      {subtitle && (
        <motion.p 
          className={`font-body text-base md:text-lg text-muted-foreground max-w-2xl mt-4 ${subtitleAlignment[align]}`}
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          {subtitle}
        </motion.p>
      )}
    </motion.div>
  );
};

export default SectionTitle;
