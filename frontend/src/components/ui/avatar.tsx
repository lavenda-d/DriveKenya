import * as React from 'react';
import { cn } from '@/lib/utils';

const AvatarContext = React.createContext<{
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl';
}>({});

const Avatar = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl';
  }
>(({ className, size = 'md', ...props }, ref) => (
  <AvatarContext.Provider value={{ size }}>
    <div
      ref={ref}
      className={cn(
        'relative flex h-10 w-10 shrink-0 overflow-hidden rounded-full',
        {
          'h-8 w-8': size === 'sm',
          'h-10 w-10': size === 'md',
          'h-12 w-12': size === 'lg',
          'h-14 w-14': size === 'xl',
          'h-16 w-16': size === '2xl',
          'h-20 w-20': size === '3xl',
          'h-24 w-24': size === '4xl',
        },
        className
      )}
      {...props}
    />
  </AvatarContext.Provider>
));
Avatar.displayName = 'Avatar';

const AvatarImage = React.forwardRef<
  HTMLImageElement,
  React.ImgHTMLAttributes<HTMLImageElement>
>(({ className, ...props }, ref) => {
  const { size } = React.useContext(AvatarContext);
  
  return (
    <img
      ref={ref}
      className={cn(
        'aspect-square h-full w-full object-cover',
        className
      )}
      {...props}
    />
  );
});
AvatarImage.displayName = 'AvatarImage';

const AvatarFallback = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => {
  const { size } = React.useContext(AvatarContext);
  
  return (
    <div
      ref={ref}
      className={cn(
        'flex h-full w-full items-center justify-center rounded-full bg-muted',
        {
          'text-xs': size === 'sm',
          'text-sm': size === 'md',
          'text-base': size === 'lg',
          'text-lg': size === 'xl',
          'text-xl': size === '2xl',
          'text-2xl': size === '3xl',
          'text-3xl': size === '4xl',
        },
        className
      )}
      {...props}
    />
  );
});
AvatarFallback.displayName = 'AvatarFallback';

export { Avatar, AvatarImage, AvatarFallback };
