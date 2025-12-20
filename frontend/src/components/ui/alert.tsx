import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { AlertCircle, CheckCircle2, Info, AlertTriangle, X } from 'lucide-react';
import { cn } from '@/lib/utils';

const alertVariants = cva(
  'relative w-full rounded-lg border p-4 [&>svg~*]:pl-7 [&>svg+div]:translate-y-[-3px] [&>svg]:absolute [&>svg]:left-4 [&>svg]:top-4 [&>svg]:text-foreground',
  {
    variants: {
      variant: {
        default: 'bg-background text-foreground',
        destructive:
          'border-destructive/50 text-destructive dark:border-destructive [&>svg]:text-destructive',
        success:
          'border-green-500/50 text-green-700 dark:text-green-400 dark:border-green-900 [&>svg]:text-green-500',
        warning:
          'border-amber-500/50 text-amber-700 dark:text-amber-400 dark:border-amber-900 [&>svg]:text-amber-500',
        info: 'border-blue-500/50 text-blue-700 dark:text-blue-400 dark:border-blue-900 [&>svg]:text-blue-500',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

const Alert = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & VariantProps<typeof alertVariants> & {
    dismissible?: boolean;
    onDismiss?: () => void;
  }
>(({ className, variant, dismissible = false, onDismiss, children, ...props }, ref) => {
  const [isDismissed, setIsDismissed] = React.useState(false);

  const handleDismiss = () => {
    setIsDismissed(true);
    onDismiss?.();
  };

  if (isDismissed) return null;

  return (
    <div
      ref={ref}
      role="alert"
      className={cn(alertVariants({ variant }), className, 'relative')}
      {...props}
    >
      {variant === 'destructive' && <AlertCircle className="h-5 w-5" />}
      {variant === 'success' && <CheckCircle2 className="h-5 w-5" />}
      {variant === 'warning' && <AlertTriangle className="h-5 w-5" />}
      {variant === 'info' && <Info className="h-5 w-5" />}
      {variant === 'default' && <Info className="h-5 w-5" />}
      
      <div className="[&_p]:leading-relaxed">
        {children}
      </div>
      
      {dismissible && (
        <button
          type="button"
          onClick={handleDismiss}
          className="absolute right-2 top-2 rounded-md p-1 text-foreground/50 opacity-70 transition-opacity hover:text-foreground focus:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring"
          aria-label="Dismiss"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
});
Alert.displayName = 'Alert';

const AlertTitle = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h5
    ref={ref}
    className={cn('mb-1 font-medium leading-none tracking-tight', className)}
    {...props}
  />
));
AlertTitle.displayName = 'AlertTitle';

const AlertDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn('text-sm [&_p]:leading-relaxed', className)}
    {...props}
  />
));
AlertDescription.displayName = 'AlertDescription';

export { Alert, AlertTitle, AlertDescription };
