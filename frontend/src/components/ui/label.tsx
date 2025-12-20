import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const labelVariants = cva(
  'text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70',
  {
    variants: {
      variant: {
        default: '',
        error: 'text-destructive',
        success: 'text-green-600 dark:text-green-400',
      },
      size: {
        default: 'text-sm',
        sm: 'text-xs',
        lg: 'text-base',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

export interface LabelProps
  extends React.LabelHTMLAttributes<HTMLLabelElement>,
    VariantProps<typeof labelVariants> {
  required?: boolean;
}

const Label = React.forwardRef<HTMLLabelElement, LabelProps>(
  ({ className, variant, size, required, children, ...props }, ref) => (
    <label
      ref={ref}
      className={cn(
        'flex items-center gap-1',
        labelVariants({ variant, size, className })
      )}
      {...props}
    >
      {children}
      {required && <span className="text-destructive">*</span>}
    </label>
  )
);
Label.displayName = 'Label';

export { Label };
