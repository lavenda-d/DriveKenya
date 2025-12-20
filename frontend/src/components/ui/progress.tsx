import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const progressVariants = cva(
  'relative w-full overflow-hidden rounded-full bg-muted',
  {
    variants: {
      size: {
        sm: 'h-1.5',
        md: 'h-2.5',
        lg: 'h-4',
      },
    },
    defaultVariants: {
      size: 'md',
    },
  }
);

const progressIndicatorVariants = cva('h-full w-full flex-1 transition-all', {
  variants: {
    variant: {
      default: 'bg-primary',
      success: 'bg-green-500',
      warning: 'bg-amber-500',
      destructive: 'bg-destructive',
    },
  },
  defaultVariants: {
    variant: 'default',
  },
});

export interface ProgressProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof progressVariants> {
  value: number;
  max?: number;
  indicatorVariant?: VariantProps<typeof progressIndicatorVariants>['variant'];
  showValue?: boolean;
  valuePosition?: 'inside' | 'outside';
}

const Progress = React.forwardRef<HTMLDivElement, ProgressProps>(
  (
    {
      className,
      value,
      max = 100,
      size,
      indicatorVariant,
      showValue = false,
      valuePosition = 'outside',
      ...props
    },
    ref
  ) => {
    const percentage = Math.min(Math.max(0, value), max);
    const percentageValue = Math.round((percentage / max) * 100);

    return (
      <div className={cn('w-full', className)}>
        <div className="flex w-full items-center gap-2">
          {(showValue && valuePosition === 'outside') && (
            <span className="text-xs font-medium text-muted-foreground min-w-[2.5rem] text-right">
              {percentageValue}%
            </span>
          )}
          <div className="flex-1">
            <div
              ref={ref}
              className={progressVariants({ size, className: 'relative' })}
              role="progressbar"
              aria-valuenow={percentage}
              aria-valuemin={0}
              aria-valuemax={max}
              {...props}
            >
              <div
                className={cn(
                  progressIndicatorVariants({ variant: indicatorVariant }),
                  'flex items-center justify-end',
                  showValue && valuePosition === 'inside' && 'px-2',
                  percentageValue === 0 && 'opacity-0'
                )}
                style={{ width: `${percentageValue}%` }}
              >
                {showValue && valuePosition === 'inside' && (
                  <span className="text-xs font-medium text-primary-foreground">
                    {percentageValue}%
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }
);
Progress.displayName = 'Progress';

export { Progress };
