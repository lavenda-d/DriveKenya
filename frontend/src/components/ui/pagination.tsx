import * as React from 'react';
import { ChevronLeft, ChevronRight, MoreHorizontal } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button, ButtonProps } from './button';

interface PaginationProps extends React.HTMLAttributes<HTMLDivElement> {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  maxVisiblePages?: number;
}

const Pagination = React.forwardRef<HTMLDivElement, PaginationProps>(
  ({ className, page, totalPages, onPageChange, maxVisiblePages = 5, ...props }, ref) => {
    const getPageNumbers = () => {
      const pages = [];
      const half = Math.floor(maxVisiblePages / 2);
      let startPage = Math.max(1, page - half);
      const endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

      if (endPage - startPage + 1 < maxVisiblePages) {
        startPage = Math.max(1, endPage - maxVisiblePages + 1);
      }

      for (let i = startPage; i <= endPage; i++) {
        pages.push(i);
      }

      return pages;
    };

    const pages = getPageNumbers();

    return (
      <div
        ref={ref}
        className={cn('flex items-center justify-between', className)}
        {...props}
      >
        <div className="flex items-center space-x-1">
          <PaginationButton
            variant="outline"
            size="sm"
            onClick={() => onPageChange(page - 1)}
            disabled={page <= 1}
          >
            <ChevronLeft className="h-4 w-4" />
            <span className="sr-only">Previous</span>
          </PaginationButton>

          {!pages.includes(1) && (
            <>
              <PaginationButton
                variant={page === 1 ? 'default' : 'ghost'}
                size="sm"
                onClick={() => onPageChange(1)}
              >
                1
              </PaginationButton>
              {!pages.includes(2) && (
                <span className="flex items-center px-2 text-muted-foreground">
                  <MoreHorizontal className="h-4 w-4" />
                </span>
              )}
            </>
          )}

          {pages.map((p) => (
            <PaginationButton
              key={p}
              variant={p === page ? 'default' : 'ghost'}
              size="sm"
              onClick={() => onPageChange(p)}
            >
              {p}
            </PaginationButton>
          ))}

          {!pages.includes(totalPages) && (
            <>
              {!pages.includes(totalPages - 1) && (
                <span className="flex items-center px-2 text-muted-foreground">
                  <MoreHorizontal className="h-4 w-4" />
                </span>
              )}
              <PaginationButton
                variant={page === totalPages ? 'default' : 'ghost'}
                size="sm"
                onClick={() => onPageChange(totalPages)}
              >
                {totalPages}
              </PaginationButton>
            </>
          )}

          <PaginationButton
            variant="outline"
            size="sm"
            onClick={() => onPageChange(page + 1)}
            disabled={page >= totalPages}
          >
            <ChevronRight className="h-4 w-4" />
            <span className="sr-only">Next</span>
          </PaginationButton>
        </div>
      </div>
    );
  }
);
Pagination.displayName = 'Pagination';

const PaginationButton = ({ className, ...props }: ButtonProps) => {
  return (
    <Button
      variant="ghost"
      size="icon"
      className={cn('h-9 w-9 p-0', className)}
      {...props}
    />
  );
};

export { Pagination };
