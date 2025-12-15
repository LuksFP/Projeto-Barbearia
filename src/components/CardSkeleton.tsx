import { Skeleton } from '@/components/ui/skeleton';
import { Card } from '@/components/ui/card';

interface CardSkeletonProps {
  variant?: 'haircut' | 'product' | 'testimonial' | 'info';
}

const CardSkeleton = ({ variant = 'haircut' }: CardSkeletonProps) => {
  if (variant === 'haircut') {
    return (
      <Card className="overflow-hidden border-border">
        <div className="relative aspect-square">
          <Skeleton className="w-full h-full" />
          <div className="absolute inset-0 shimmer" />
        </div>
      </Card>
    );
  }

  if (variant === 'product') {
    return (
      <Card className="overflow-hidden border-border p-4">
        <Skeleton className="aspect-square w-full rounded-lg mb-4" />
        <Skeleton className="h-5 w-3/4 mb-2" />
        <Skeleton className="h-4 w-1/2 mb-4" />
        <div className="flex justify-between items-center">
          <Skeleton className="h-6 w-20" />
          <Skeleton className="h-9 w-24 rounded-lg" />
        </div>
      </Card>
    );
  }

  if (variant === 'testimonial') {
    return (
      <Card className="p-6 border-border">
        <div className="flex items-center gap-4 mb-4">
          <Skeleton className="w-14 h-14 rounded-full" />
          <div className="flex-1">
            <Skeleton className="h-5 w-32 mb-2" />
            <Skeleton className="h-4 w-24" />
          </div>
        </div>
        <Skeleton className="h-4 w-full mb-2" />
        <Skeleton className="h-4 w-full mb-2" />
        <Skeleton className="h-4 w-3/4" />
      </Card>
    );
  }

  // Info card skeleton
  return (
    <Card className="p-6 md:p-8 border-border">
      <Skeleton className="w-14 h-14 rounded-xl mb-5" />
      <Skeleton className="h-8 w-32 mb-3" />
      <Skeleton className="h-4 w-full mb-2" />
      <Skeleton className="h-4 w-3/4" />
    </Card>
  );
};

export default CardSkeleton;
