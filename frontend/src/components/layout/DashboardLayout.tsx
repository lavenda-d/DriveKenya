import React, { useState } from 'react';
import { FaBars, FaHome, FaCar, FaHistory, FaCog, FaSignOutAlt, FaUser } from 'react-icons/fa';

interface DashboardLayoutProps {
    children: React.ReactNode;
    user: any;
    onLogout: () => void;
    activeTab?: string;
    onTabChange?: (tab: string) => void;
    navItems?: { id: string; label: string; icon: React.ReactNode }[];
}

const DashboardLayout: React.FC<DashboardLayoutProps> = ({
    children,
    user,
    onLogout,
    activeTab,
    onTabChange,
    navItems
}) => {
    const [sidebarOpen, setSidebarOpen] = useState(false);

    const toggleSidebar = () => setSidebarOpen(!sidebarOpen);

    const defaultMenuItems = [
        { id: 'overview', label: 'Overview', icon: <FaHome /> },
        { id: 'cars', label: 'My Cars', icon: <FaCar /> },
        { id: 'bookings', label: 'Bookings', icon: <FaHistory /> },
        { id: 'profile', label: 'Profile', icon: <FaUser /> },
        { id: 'settings', label: 'Settings', icon: <FaCog /> },
    ];

    const menuItems = navItems || defaultMenuItems;

    return (
        <div className="min-h-screen bg-background text-foreground flex">
            {/* Mobile Sidebar Overlay */}
            {sidebarOpen && (
                <div
                    className="fixed inset-0 bg-black/50 z-40 lg:hidden backdrop-blur-sm"
                    onClick={() => setSidebarOpen(false)}
                />
            )}

            {/* Sidebar */}
            <aside
                className={`
          fixed inset-y-0 left-0 z-40 h-screen h-[100dvh] w-80 bg-card/95 backdrop-blur-xl dark:bg-zinc-950/95 border-r border-border transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:block pt-20
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
            >
                <div className="h-full flex flex-col">
                    {/* User Info */}
                    <div className="p-6 border-b border-border bg-muted/10">
                        <div className="flex items-center space-x-3">
                            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-lg border-2 border-primary/20">
                                {user?.name?.charAt(0).toUpperCase() || <FaUser />}
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold text-foreground truncate">
                                    {user?.name || 'Guest User'}
                                </p>
                                <p className="text-xs text-foreground/70 uppercase tracking-wider font-medium">
                                    {user?.role?.toLowerCase() === 'host' ? 'Owner' : user?.role || 'Visitor'}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Navigation */}
                    <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
                        {menuItems.map((item) => (
                            <button
                                key={item.id}
                                onClick={() => {
                                    if (onTabChange) onTabChange(item.id);
                                    setSidebarOpen(false);
                                }}
                                className={`
                  w-full flex items-center px-4 py-3 text-sm font-medium rounded-xl transition-all duration-200 group
                  ${activeTab === item.id
                                        ? 'bg-primary text-primary-foreground shadow-md shadow-primary/20 translate-x-1'
                                        : 'text-muted-foreground hover:bg-muted hover:text-foreground hover:translate-x-1'
                                    }
                `}
                            >
                                <span className={`mr-3 text-lg transition-transform group-hover:scale-110 ${activeTab === item.id ? '' : 'text-muted-foreground group-hover:text-primary'}`}>{item.icon}</span>
                                {item.label}
                            </button>
                        ))}
                    </nav>

                    {/* Sidebar Footer */}
                    <div className="p-4 border-t border-border mt-auto">
                        <button
                            onClick={onLogout}
                            className="w-full flex items-center px-4 py-3 text-sm font-medium text-destructive hover:bg-destructive/10 hover:translate-x-1 rounded-xl transition-all duration-200"
                        >
                            <FaSignOutAlt className="mr-3" />
                            Sign Out
                        </button>
                    </div>
                </div>
            </aside>

            {/* Main Content */}
            <div className="flex-1 flex flex-col min-w-0 overflow-hidden pt-24">
                {/* Mobile Header */}
                <header className="lg:hidden flex items-center justify-between h-16 px-4 border-b border-border bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-30">
                    <button
                        onClick={toggleSidebar}
                        className="p-2 -ml-2 text-foreground hover:bg-accent rounded-md"
                    >
                        <FaBars className="h-6 w-6" />
                    </button>
                    <h1 className="text-lg font-bold">DriveKenya</h1>
                    <div className="w-6" /> {/* Spacer for centering */}
                </header>

                {/* Page Content */}
                <main className="flex-1 overflow-y-auto p-4 md:p-8 bg-muted/20">
                    <div className="max-w-7xl mx-auto w-full">
                        {children}
                    </div>
                </main>
            </div>
        </div>
    );
};

export default DashboardLayout;
