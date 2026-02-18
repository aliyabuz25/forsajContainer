import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
    Layout,
    Home,
    Menu,
    Maximize,
    Type,
    Star,
    Anchor,
    Info,
    FileText,
    List,
    Calendar,
    Clock,
    Trophy,
    Award,
    Image,
    Video,
    BookOpen,
    Phone,
    Users,
    Monitor,
    Inbox,
    Settings,
    Globe,
    Circle,
    Hexagon,
    LogOut
} from 'lucide-react';
import type { SidebarItem } from '../types/navigation';
import './Sidebar.css';

interface SidebarProps {
    menuItems: SidebarItem[];
    user: any;
    onLogout: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ menuItems, user, onLogout }) => {
    const userRole = user?.role || 'secondary';
    const location = useLocation();

    const iconMap: Record<string, React.ComponentType<{ className?: string; size?: number }>> = {
        Layout,
        Home,
        Menu,
        Maximize,
        Type,
        Star,
        Anchor,
        Info,
        FileText,
        List,
        Calendar,
        Clock,
        Trophy,
        Award,
        Image,
        Video,
        BookOpen,
        Phone,
        Users,
        Monitor,
        Inbox,
        Settings,
        Globe
    };

    const IconComponent = ({ name, className }: { name: string; className?: string }) => {
        const Icon = iconMap[name];
        if (!Icon) return <Circle className={className} size={18} />;
        return <Icon className={className} size={18} />;
    };

    // Better active check including query params
    const isCurrentActive = (path?: string) => {
        if (!path) return false;
        if (path.includes('?')) {
            return (location.pathname + location.search) === path;
        }
        return location.pathname === path;
    };

    const renderLinkItem = (item: SidebarItem, parentIcon?: string) => (
        <li key={item.title} className="sidebar-item">
            <NavLink
                to={item.path || '#'}
                className={() => `sidebar-link ${isCurrentActive(item.path) ? 'active' : ''}`}
            >
                {(item.icon || parentIcon) && <IconComponent name={item.icon || parentIcon || ''} className="sidebar-icon" />}
                <span className="sidebar-text">{item.title}</span>
                {item.badge && (
                    <span className={`badge ${item.badge.color} sidebar-badge`}>
                        {item.badge.text}
                    </span>
                )}
            </NavLink>
        </li>
    );

    const filterByRole = (items: SidebarItem[]): SidebarItem[] => {
        const restrictedPaths = ['/frontend-settings', '/users-management'];

        const filtered = items
            .map((item) => {
                const children = item.children ? filterByRole(item.children) : undefined;

                if (userRole === 'secondary') {
                    const isRestricted = restrictedPaths.some(p => item.path?.toLowerCase() === p);
                    if (isRestricted) return null;
                }

                // If parent has no direct path and all children are filtered out, hide it.
                if (!item.path && (!children || children.length === 0)) return null;

                return { ...item, children };
            })
            .filter(Boolean) as SidebarItem[];

        return filtered;
    };

    return (
        <aside className="sidebar">
            <div className="sidebar-header">
                <div className="brand-logo">
                    <Hexagon className="logo-icon" size={24} fill="currentColor" />
                    <span className="brand-name">FORSAJ<span>PANEL</span></span>
                </div>
            </div>

            <div className="sidebar-content">
                <div className="sidebar-section-label">ƏSAS NAVİQASİYA</div>
                <ul className="sidebar-menu">
                    {filterByRole(menuItems).flatMap(item => {
                        if (item.children && item.children.length > 0) {
                            return item.children.map(child => renderLinkItem(child, item.icon));
                        }
                        return renderLinkItem(item);
                    })}
                    {menuItems.length === 0 && (
                        <div className="empty-sidebar-msg">
                            <p>Menyu boşdur</p>
                        </div>
                    )}
                </ul>
            </div>

            <div className="sidebar-footer">
                <button className="logout-btn" onClick={onLogout}>
                    <LogOut size={18} />
                    <span>Çıxış</span>
                </button>
            </div>
        </aside>
    );
};

export default Sidebar;
