import * as React from 'react';
import { ChevronRight, Home } from 'lucide-react';
import { cn } from '@/lib/utils';

interface BreadcrumbItem {
  label: string;
  href?: string;
  active?: boolean;
}

interface BreadcrumbsProps extends React.HTMLAttributes<HTMLElement> {
  items: BreadcrumbItem[];
  separator?: React.ReactNode;
  homeHref?: string;
  className?: string;
}

const Breadcrumbs = React.forwardRef<HTMLElement, BreadcrumbsProps>(
  ({ items, separator = <ChevronRight className="h-4 w-4" />, homeHref = '/', className, ...props }, ref) => {
    return (
      <nav
        ref={ref}
        aria-label="Breadcrumb"
        className={cn('flex items-center text-sm', className)}
        {...props}
      >
        <ol className="flex items-center space-x-2">
          <li>
            <a
              href={homeHref}
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              <Home className="h-4 w-4" />
              <span className="sr-only">Home</span>
            </a>
          </li>
          {items.map((item, index) => (
            <li key={index} className="flex items-center">
              {separator}
              {item.href ? (
                <a
                  href={item.href}
                  className={cn(
                    'ml-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors',
                    item.active && 'text-foreground'
                  )}
                  aria-current={item.active ? 'page' : undefined}
                >
                  {item.label}
                </a>
              ) : (
                <span
                  className={cn(
                    'ml-2 text-sm font-medium',
                    item.active ? 'text-foreground' : 'text-muted-foreground'
                  )}
                  aria-current={item.active ? 'page' : undefined}
                >
                  {item.label}
                </span>
              )}
            </li>
          ))}
        </ol>
      </nav>
    );
  }
);
Breadcrumbs.displayName = 'Breadcrumbs';

export { Breadcrumbs, type BreadcrumbItem };
