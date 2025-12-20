import * as React from 'react';
import { cn } from '@/lib/utils';
import { Button, ButtonProps } from './button';
import { PanelLeftClose, PanelLeftOpen } from 'lucide-react';

interface SidebarProps extends React.HTMLAttributes<HTMLDivElement> {
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  collapsedWidth?: string;
  expandedWidth?: string;
}

const Sidebar = React.forwardRef<HTMLDivElement, SidebarProps>(
  (
    {
      className,
      isCollapsed,
      onToggleCollapse,
      collapsedWidth = '4rem',
      expandedWidth = '16rem',
      children,
      ...props
    },
    ref
  ) => {
    return (
      <div
        ref={ref}
        className={cn(
          'relative flex h-screen flex-col border-r border-border bg-background transition-all duration-300 ease-in-out',
          className
        )}
        style={{
          width: isCollapsed ? collapsedWidth : expandedWidth,
          minWidth: isCollapsed ? collapsedWidth : expandedWidth,
        }}
        {...props}
      >
        <div className="flex-1 overflow-y-auto overflow-x-hidden py-4">
          {children}
        </div>
        <div className="border-t border-border p-2">
          <Button
            variant="ghost"
            size="icon"
            className="ml-auto h-8 w-8"
            onClick={onToggleCollapse}
            aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {isCollapsed ? (
              <PanelLeftOpen className="h-4 w-4" />
            ) : (
              <PanelLeftClose className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>
    );
  }
);
Sidebar.displayName = 'Sidebar';

interface SidebarHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

const SidebarHeader = React.forwardRef<HTMLDivElement, SidebarHeaderProps>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn('flex h-16 items-center px-4', className)}
      {...props}
    />
  )
);
SidebarHeader.displayName = 'SidebarHeader';

interface SidebarContentProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

const SidebarContent = React.forwardRef<HTMLDivElement, SidebarContentProps>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn('flex-1 overflow-y-auto overflow-x-hidden', className)}
      {...props}
    />
  )
);
SidebarContent.displayName = 'SidebarContent';

interface SidebarFooterProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

const SidebarFooter = React.forwardRef<HTMLDivElement, SidebarFooterProps>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn('border-t border-border p-4', className)}
      {...props}
    />
  )
);
SidebarFooter.displayName = 'SidebarFooter';

interface SidebarItemProps extends ButtonProps {
  isActive?: boolean;
  icon: React.ReactNode;
  label: string;
  isCollapsed?: boolean;
}

const SidebarItem = React.forwardRef<HTMLButtonElement, SidebarItemProps>(
  ({ className, isActive, icon, label, isCollapsed, ...props }, ref) => {
    return (
      <Button
        ref={ref}
        variant={isActive ? 'secondary' : 'ghost'}
        className={cn(
          'w-full justify-start gap-3',
          isCollapsed && 'justify-center px-0 [&>span]:hidden',
          className
        )}
        {...props}
      >
        <span className="flex-shrink-0">{icon}</span>
        {!isCollapsed && <span>{label}</span>}
      </Button>
    );
  }
);
SidebarItem.displayName = 'SidebarItem';

export {
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarItem,
};
