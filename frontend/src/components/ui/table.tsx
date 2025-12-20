import * as React from 'react';
import { cn } from '@/lib/utils';

const Table = React.forwardRef<
  HTMLTableElement,
  React.HTMLAttributes<HTMLTableElement>
>(({ className, ...props }, ref) => (
  <div className="relative w-full overflow-auto">
    <table
      ref={ref}
      className={cn('w-full caption-bottom text-sm', className)}
      {...props}
    />
  </div>
));
Table.displayName = 'Table';

const TableHeader = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <thead ref={ref} className={cn('[&_tr]:border-b', className)} {...props} />
));
TableHeader.displayName = 'TableHeader';

const TableBody = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <tbody
    ref={ref}
    className={cn('[&_tr:last-child]:border-0', className)}
    {...props}
  />
));
TableBody.displayName = 'TableBody';

const TableFooter = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <tfoot
    ref={ref}
    className={cn(
      'border-t bg-muted/50 font-medium [&>tr]:last:border-b-0',
      className
    )}
    {...props}
  />
));
TableFooter.displayName = 'TableFooter';

const TableRow = React.forwardRef<
  HTMLTableRowElement,
  React.HTMLAttributes<HTMLTableRowElement> & {
    hover?: boolean;
    active?: boolean;
  }
>(({ className, hover = true, active = false, ...props }, ref) => (
  <tr
    ref={ref}
    className={cn(
      'border-b transition-colors',
      hover && 'hover:bg-muted/50',
      active && 'bg-muted/50',
      className
    )}
    {...props}
  />
));
TableRow.displayName = 'TableRow';

const TableHead = React.forwardRef<
  HTMLTableCellElement,
  React.ThHTMLAttributes<HTMLTableCellElement> & {
    sortable?: boolean;
    sortDirection?: 'asc' | 'desc' | false;
    onSort?: () => void;
  }
>(({ className, sortable = false, sortDirection, onSort, ...props }, ref) => {
  const handleClick = () => {
    if (sortable && onSort) {
      onSort();
    }
  };

  return (
    <th
      ref={ref}
      className={cn(
        'h-12 px-4 text-left align-middle font-medium text-muted-foreground [&:has([role=checkbox])]:pr-0',
        sortable && 'cursor-pointer select-none',
        className
      )}
      onClick={handleClick}
      {...props}
    >
      <div className="flex items-center space-x-2">
        {props.children}
        {sortable && (
          <span className="flex flex-col">
            <span
              className={cn(
                'h-2 w-3',
                sortDirection === 'asc' ? 'text-foreground' : 'text-muted-foreground/50'
              )}
            >
              ▲
            </span>
            <span
              className={cn(
                'h-2 w-3 -mt-1',
                sortDirection === 'desc' ? 'text-foreground' : 'text-muted-foreground/50'
              )}
            >
              ▼
            </span>
          </span>
        )}
      </div>
    </th>
  );
});
TableHead.displayName = 'TableHead';

const TableCell = React.forwardRef<
  HTMLTableCellElement,
  React.TdHTMLAttributes<HTMLTableCellElement>
>(({ className, ...props }, ref) => (
  <td
    ref={ref}
    className={cn('p-4 align-middle [&:has([role=checkbox])]:pr-0', className)}
    {...props}
  />
));
TableCell.displayName = 'TableCell';

const TableCaption = React.forwardRef<
  HTMLTableCaptionElement,
  React.HTMLAttributes<HTMLTableCaptionElement>
>(({ className, ...props }, ref) => (
  <caption
    ref={ref}
    className={cn('mt-4 text-sm text-muted-foreground', className)}
    {...props}
  />
));
TableCaption.displayName = 'TableCaption';

const TableEmpty = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    icon?: React.ReactNode;
    title?: string;
    description?: string;
  }
>(({ className, icon, title = 'No results', description, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      'flex min-h-[200px] flex-col items-center justify-center py-6 text-center',
      className
    )}
    {...props}
  >
    {icon && <div className="mb-4 text-muted-foreground">{icon}</div>}
    <h3 className="mb-1 text-lg font-medium">{title}</h3>
    {description && (
      <p className="text-sm text-muted-foreground">{description}</p>
    )}
  </div>
));
TableEmpty.displayName = 'TableEmpty';

export {
  Table,
  TableHeader,
  TableBody,
  TableFooter,
  TableHead,
  TableRow,
  TableCell,
  TableCaption,
  TableEmpty,
};
