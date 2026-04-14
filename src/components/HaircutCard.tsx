import { Card } from '@/components/ui/card';
import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import ImageWithSkeleton from './ImageWithSkeleton';
import { cn } from '@/lib/utils';

interface HaircutCardProps {
  image: string;
  title: string;
  description: string;
  detail?: string;
  framingLabel?: string;
  imageClassName?: string;
  delay?: number;
  variant?: 'default' | 'showcase';
  wrapperClassName?: string;
}

const HaircutCard = ({
  image,
  title,
  description,
  detail,
  framingLabel,
  imageClassName,
  delay = 0,
  variant = 'default',
  wrapperClassName,
}: HaircutCardProps) => {
  const isShowcase = variant === 'showcase';

  if (isShowcase) {
    return (
      <motion.div
        className={wrapperClassName}
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-50px" }}
        transition={{ duration: 0.5, delay: delay / 1000 }}
      >
        <Card className="group h-full overflow-hidden rounded-[1.9rem] border-white/8 bg-[linear-gradient(180deg,rgba(19,19,19,0.98)_0%,rgba(10,10,10,1)_100%)] shadow-[0_26px_90px_rgba(0,0,0,0.34)] transition-all duration-500 hover:-translate-y-1.5 hover:border-primary/35 hover:shadow-[0_34px_120px_rgba(0,0,0,0.42)]">
          <div className="relative aspect-[4/3] overflow-hidden">
            <ImageWithSkeleton
              src={image}
              alt={title}
              className={cn(
                "transition-transform duration-700 ease-out group-hover:scale-105",
                imageClassName
              )}
              aspectRatio="4/3"
            />

            <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(8,8,8,0.08)_0%,rgba(8,8,8,0.14)_42%,rgba(8,8,8,0.44)_100%)] pointer-events-none" />
            <div className="absolute inset-x-5 top-0 h-px bg-gradient-to-r from-transparent via-primary/35 to-transparent pointer-events-none" />

            <div className="absolute inset-x-4 top-4 flex items-start justify-between md:inset-x-5 md:top-5 pointer-events-none">
              {framingLabel ? (
                <div className="rounded-full border border-white/8 bg-black/48 px-3 py-1.5 backdrop-blur-sm shadow-[0_10px_30px_rgba(0,0,0,0.18)]">
                  <span className="font-body text-[9px] uppercase tracking-[0.28em] text-primary/90">
                    {framingLabel}
                  </span>
                </div>
              ) : <div />}

              <div className="rounded-full border border-white/8 bg-black/36 px-3 py-1.5 backdrop-blur-sm shadow-[0_10px_30px_rgba(0,0,0,0.18)]">
                <span className="font-body text-[9px] uppercase tracking-[0.26em] text-white/56">
                  destaque
                </span>
              </div>
            </div>
          </div>

          <div className="relative border-t border-white/8 bg-[linear-gradient(180deg,rgba(13,13,13,0.98)_0%,rgba(8,8,8,1)_100%)] px-5 pb-5 pt-4 md:px-6 md:pb-6">
            <div className="inline-flex items-center gap-1.5 rounded-full border border-primary/18 bg-primary/10 px-3 py-1.5 backdrop-blur-sm">
              <span className="font-body text-[10px] font-semibold uppercase tracking-[0.2em] text-primary">
                edicao em destaque
              </span>
              <ArrowRight className="h-3 w-3 text-primary" />
            </div>

            <h3 className="mt-4 font-heading text-[2rem] leading-[0.92] text-white drop-shadow-lg md:text-[2.2rem]">
              {title}
            </h3>
            <p className="mt-3 max-w-[24ch] font-body text-[15px] leading-7 text-white/82">
              {description}
            </p>

            {detail ? (
              <div className="mt-5 border-t border-white/8 pt-4">
                <p className="font-body text-[11px] uppercase tracking-[0.24em] text-white/28">
                  leitura
                </p>
                <p className="mt-2 max-w-[24ch] font-body text-sm leading-6 text-white/64">
                  {detail}
                </p>
              </div>
            ) : null}
          </div>
        </Card>
      </motion.div>
    );
  }

  return (
    <motion.div
      className={wrapperClassName}
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{ duration: 0.5, delay: delay / 1000 }}
    >
      <Card
        className={cn(
          "group overflow-hidden cursor-pointer transition-all duration-500",
          isShowcase
            ? "rounded-[1.9rem] border-white/8 bg-[linear-gradient(180deg,rgba(19,19,19,0.98)_0%,rgba(10,10,10,1)_100%)] shadow-[0_26px_90px_rgba(0,0,0,0.34)] hover:-translate-y-1.5 hover:border-primary/35 hover:shadow-[0_34px_120px_rgba(0,0,0,0.42)]"
            : "border-border bg-card hover-lift hover:border-primary/50 hover:shadow-xl hover:shadow-primary/10"
        )}
      >
        <div className={cn("relative overflow-hidden", isShowcase ? "aspect-[4/5]" : "aspect-square")}>
          <ImageWithSkeleton
            src={image}
            alt={title}
            className={cn(
              'transition-transform duration-700 ease-out group-hover:scale-110',
              imageClassName
            )}
            aspectRatio={isShowcase ? "4/5" : "square"}
          />

          <div
            className={cn(
              "absolute inset-0 pointer-events-none transition-opacity duration-500",
              isShowcase
                ? "bg-[linear-gradient(180deg,rgba(6,6,6,0.04)_0%,rgba(6,6,6,0.16)_26%,rgba(6,6,6,0.62)_62%,rgba(6,6,6,0.96)_100%)] opacity-95 group-hover:opacity-100"
                : "bg-gradient-to-t from-barber-black via-barber-black/50 to-transparent opacity-75 group-hover:opacity-90"
            )}
          />
          <div
            className={cn(
              "absolute inset-x-4 top-4 flex items-start justify-between pointer-events-none",
              isShowcase ? "md:inset-x-5 md:top-5" : ""
            )}
          >
            {framingLabel ? (
              <div
                className={cn(
                  "rounded-full border px-3 py-1.5 backdrop-blur-sm",
                  isShowcase
                    ? "border-white/8 bg-black/42 shadow-[0_10px_30px_rgba(0,0,0,0.18)]"
                    : "border-white/10 bg-barber-black/55"
                )}
              >
                <span
                  className={cn(
                    "font-body uppercase text-primary/90",
                    isShowcase ? "text-[9px] tracking-[0.28em]" : "text-[10px] tracking-[0.25em]"
                  )}
                >
                  {framingLabel}
                </span>
              </div>
            ) : <div />}

            <div
              className={cn(
                "transition-colors duration-500",
                isShowcase
                  ? "h-14 w-14 rounded-full border border-white/8 bg-black/24 shadow-[0_12px_30px_rgba(0,0,0,0.2)]"
                  : "h-12 w-12 border-t-2 border-r-2 border-primary/0 group-hover:border-primary"
              )}
            />
          </div>
          <div
            className={cn(
              "absolute pointer-events-none transition-colors duration-500",
              isShowcase
                ? "inset-x-5 top-0 h-px bg-gradient-to-r from-transparent via-primary/35 to-transparent"
                : "bottom-4 left-4 h-12 w-12 border-b-2 border-l-2 border-primary/0 group-hover:border-primary"
            )}
          />

          <div className={cn("absolute inset-0 flex flex-col justify-end pointer-events-none", isShowcase ? "p-5 md:p-6" : "p-5 md:p-6")}>
            <div className="transform transition-all duration-500 group-hover:-translate-y-2">
              <div
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full transition-all duration-300",
                  isShowcase
                    ? "mb-4 border border-primary/22 bg-primary/12 px-3 py-1.5 opacity-100 backdrop-blur-sm"
                    : "mb-3 bg-primary/90 px-3 py-1 opacity-0 backdrop-blur-sm group-hover:opacity-100"
                )}
              >
                <span
                  className={cn(
                    "font-body font-semibold uppercase",
                    isShowcase
                      ? "text-[10px] tracking-[0.2em] text-primary"
                      : "text-xs tracking-wide text-primary-foreground"
                  )}
                >
                  {isShowcase ? 'edicao em destaque' : 'Ver detalhes'}
                </span>
                <ArrowRight className={cn("h-3 w-3", isShowcase ? "text-primary" : "text-primary-foreground")} />
              </div>

              <h3
                className={cn(
                  "font-heading text-white drop-shadow-lg",
                  isShowcase ? "mb-2 text-[2rem] leading-[0.92] md:text-[2.35rem]" : "mb-1.5 text-2xl md:text-3xl"
                )}
              >
                {title}
              </h3>
              <p className={cn("font-body text-white/80", isShowcase ? "max-w-[20ch] text-[15px] leading-6" : "text-sm md:text-base")}>
                {description}
              </p>
              {detail ? (
                isShowcase ? (
                  <div className="mt-4 border-t border-white/8 pt-4">
                    <p className="max-w-[24ch] font-body text-[12px] uppercase tracking-[0.24em] text-white/28">
                      leitura
                    </p>
                    <p className="mt-2 max-w-[24ch] font-body text-sm leading-6 text-white/62">
                      {detail}
                    </p>
                  </div>
                ) : (
                  <p className="mt-3 max-w-[26ch] font-body text-xs md:text-sm leading-5 text-white/60">
                    {detail}
                  </p>
                )
              ) : null}
            </div>
          </div>
        </div>
      </Card>
    </motion.div>
  );
};

export default HaircutCard;
