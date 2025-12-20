import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const skeletonVariants = cva(
  'animate-pulse rounded-md bg-muted',
  {
    variants: {
      variant: {
        default: '',
        circle: 'rounded-full',
        text: 'h-4',
        title: 'h-6 w-3/4',
        paragraph: 'h-4 w-full',
        button: 'h-10 w-24',
        avatar: 'rounded-full',
        input: 'h-10 w-full',
      },
      size: {
        sm: 'h-4',
        md: 'h-6',
        lg: 'h-8',
        xl: 'h-12',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

export interface SkeletonProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof skeletonVariants> {
  /**
   * Number of skeleton items to render
   * @default 1
   */
  count?: number;
  /**
   * Custom class name for the container
   */
  containerClassName?: string;
  /**
   * Whether to show a shimmer effect
   * @default false
   */
  shimmer?: boolean;
}

const Skeleton = React.forwardRef<HTMLDivElement, SkeletonProps>(
  (
    {
      className,
      variant,
      size,
      count = 1,
      containerClassName,
      shimmer = false,
      ...props
    },
    ref
  ) => {
    const skeletons = Array.from({ length: count }).map((_, i) => (
      <div
        key={i}
        ref={i === 0 ? ref : undefined}
        className={cn(
          'relative overflow-hidden',
          skeletonVariants({ variant, size, className }),
          shimmer && 'after:absolute after:inset-0 after:-translate-x-full after:bg-gradient-to-r after:from-transparent after:via-white/20 after:to-transparent after:animate-shimmer'
        )}
        {...props}
      />
    ));

    return count > 1 ? (
      <div className={cn('space-y-2', containerClassName)}>{skeletons}</div>
    ) : (
      skeletons[0]
    );
  }
);
Skeleton.displayName = 'Skeleton';

export { Skeleton };
