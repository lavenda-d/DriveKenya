import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
  {
    variants: {
      variant: {
        default:
          'border-transparent bg-primary text-primary-foreground hover:bg-primary/80',
        secondary:
          'border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80',
        destructive:
          'border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80',
        outline: 'text-foreground',
        success:
          'border-transparent bg-green-100 text-green-700 hover:bg-green-100/80 dark:bg-green-900/30 dark:text-green-400 dark:hover:bg-green-900/40',
        warning:
          'border-transparent bg-amber-100 text-amber-700 hover:bg-amber-100/80 dark:bg-amber-900/30 dark:text-amber-400 dark:hover:bg-amber-900/40',
        info: 'border-transparent bg-blue-100 text-blue-700 hover:bg-blue-100/80 dark:bg-blue-900/30 dark:text-blue-400 dark:hover:bg-blue-900/40',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {
  /**
   * Optional icon to display before the badge content
   */
  icon?: React.ReactNode;
  /**
   * Optional click handler
   */
  onClick?: () => void;
}

function Badge({ className, variant, icon, onClick, children, ...props }: BadgeProps) {
  const Component = onClick ? 'button' : 'div';
  
  return (
    <Component
      className={cn(
        badgeVariants({ variant }),
        onClick && 'cursor-pointer',
        className
      )}
      onClick={onClick}
      {...props}
    >
      {icon && <span className="mr-1.5">{icon}</span>}
      {children}
    </Component>
  );
}

export { Badge, badgeVariants };
