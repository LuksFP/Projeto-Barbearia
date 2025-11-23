interface SectionTitleProps {
  children: React.ReactNode;
  subtitle?: string;
  className?: string;
}

const SectionTitle = ({ children, subtitle, className = '' }: SectionTitleProps) => {
  return (
    <div className={`text-center mb-16 ${className}`}>
      <h2 className="font-heading text-5xl md:text-6xl mb-4 tracking-wider">
        {children}
      </h2>
      {subtitle && (
        <p className="font-body text-lg text-muted-foreground max-w-2xl mx-auto">
          {subtitle}
        </p>
      )}
    </div>
  );
};

export default SectionTitle;
