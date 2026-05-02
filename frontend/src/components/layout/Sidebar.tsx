import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, MessageSquare, Building2, FileText, CalendarDays, LayoutTemplate, LogOut, Sun, Moon } from 'lucide-react';
import { cn } from '../../lib/utils';
import { useAppStore } from '../../store/useAppStore';
import { useAuth } from '../../hooks/useAuth';

const primaryNavItems = [
    { to: '/campanhas', label: 'Campanhas', icon: LayoutDashboard, end: false },
    { to: '/posts', label: 'Posts', icon: FileText, end: false },
    { to: '/templates', label: 'Templates', icon: LayoutTemplate, end: false },
    { to: '/calendario', label: 'Calendário', icon: CalendarDays, end: false },
];

const secondaryNavItems = [
    { to: '/empresa', label: 'Empresa', icon: Building2, end: false },
    { to: '/cmo', label: 'CMO IA', icon: MessageSquare, end: false },
];

export const Sidebar: React.FC = () => {
    const user = useAppStore((s) => s.user);
    const theme = useAppStore((s) => s.theme);
    const toggleTheme = useAppStore((s) => s.toggleTheme);
    const { logout } = useAuth();

    return (
        <aside
            className="w-64 app-panel-elevated border-r app-divider h-screen flex flex-col shrink-0 transition-colors duration-300 relative z-20"
            role="navigation"
            aria-label="Menu principal"
        >
            <div className="p-6">
                <h1 className="text-3xl font-black tracking-tight app-text" style={{ lineHeight: 0.9 }}>
                    MarkAI
                </h1>
                <p className="text-xs app-text-soft mt-1 font-semibold">Marketing com IA</p>
            </div>

            <nav className="flex-1 px-4 space-y-1">
                {primaryNavItems.map(({ to, label, icon: Icon, end }) => (
                    <NavLink
                        key={to}
                        to={to}
                        end={end}
                        className={({ isActive }) =>
                            cn(
                                'flex items-center gap-3 px-4 py-3 rounded-full font-semibold text-sm transition-all duration-200',
                                isActive
                                    ? 'bg-primary-100 text-primary-900 shadow-[rgba(14,15,12,0.08)_0px_6px_20px_-16px] dark:bg-primary-900/40 dark:text-primary-300'
                                    : 'app-text-secondary hover:bg-primary-50 dark:hover:bg-white/5 hover:text-[#0e0f0c] dark:hover:text-[#e8ebe6]',
                            )
                        }
                    >
                        <Icon size={18} /> {label}
                    </NavLink>
                ))}

                <div className="px-4 py-3 mt-4">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] app-text-soft">
                        Estratégia
                    </p>
                </div>

                {secondaryNavItems.map(({ to, label, icon: Icon, end }) => (
                    <NavLink
                        key={to}
                        to={to}
                        end={end}
                        className={({ isActive }) =>
                            cn(
                                'flex items-center gap-3 px-4 py-3 rounded-full font-semibold text-sm transition-all duration-200',
                                isActive
                                    ? 'bg-primary-100 text-primary-900 shadow-[rgba(14,15,12,0.08)_0px_6px_20px_-16px] dark:bg-primary-900/40 dark:text-primary-300'
                                    : 'app-text-secondary hover:bg-primary-50 dark:hover:bg-white/5 hover:text-[#0e0f0c] dark:hover:text-[#e8ebe6]',
                            )
                        }
                    >
                        <Icon size={18} /> {label}
                    </NavLink>
                ))}
            </nav>

            <div className="p-4 border-t app-divider space-y-1">
                {user && (
                    <div className="px-4 py-2">
                        <p className="text-xs font-mono app-text-soft truncate">{user.email}</p>
                    </div>
                )}

                <button
                    onClick={toggleTheme}
                    className="w-full flex items-center gap-3 px-4 py-2 rounded-full text-sm font-semibold app-text-secondary hover:text-[#0e0f0c] dark:hover:text-[#e8ebe6] hover:bg-primary-50 dark:hover:bg-white/5 transition-all duration-200"
                    aria-label={theme === 'dark' ? 'Mudar para modo claro' : 'Mudar para modo escuro'}
                >
                    {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
                    {theme === 'dark' ? 'Modo claro' : 'Modo escuro'}
                </button>

                <button
                    onClick={logout}
                    className="w-full flex items-center gap-3 px-4 py-2 rounded-full text-sm font-semibold app-text-secondary hover:text-rose-600 hover:bg-rose-50 dark:hover:text-rose-400 dark:hover:bg-rose-500/10 transition-all duration-200"
                    aria-label="Sair da conta"
                >
                    <LogOut size={18} /> Sair
                </button>
            </div>
        </aside>
    );
};
