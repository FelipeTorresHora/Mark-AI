import { useState } from 'react';
import { ChatPanel } from '../components/cmo/ChatPanel';
import { cn } from '../lib/utils';
import { Lightbulb, Menu, PanelLeft, Sparkles } from 'lucide-react';

function CmoSidebar({ collapsed }: { collapsed: boolean }) {
    return (
        <aside
            className={cn(
                'flex h-full flex-col transition-all duration-200',
                collapsed ? 'w-0 overflow-hidden opacity-0' : 'w-56 opacity-100',
            )}
        >
            <div className="flex h-full w-56 shrink-0 flex-col">
                <div className="flex h-14 shrink-0 items-center gap-2 border-b app-divider px-4">
                    <div className="flex size-7 items-center justify-center rounded-lg bg-gradient-to-br from-primary-500 to-primary-700">
                        <Sparkles size={14} className="text-white" />
                    </div>
                    <span className="text-sm font-semibold app-text">CMO IA</span>
                </div>
                <div className="flex-1 overflow-y-auto p-3">
                    <p className="px-2 py-6 text-center text-xs app-text-soft">
                        Suas conversas aparecerão aqui.
                    </p>
                </div>
            </div>
        </aside>
    );
}

function MobileSidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
    return (
        <>
            {open && (
                <div
                    className="fixed inset-0 z-30 bg-black/30 md:hidden"
                    onClick={onClose}
                />
            )}
            <aside
                className={cn(
                    'fixed left-0 top-0 z-40 flex h-full w-56 flex-col app-panel transition-transform duration-300 md:hidden',
                    open ? 'translate-x-0' : '-translate-x-full',
                )}
            >
                <div className="flex h-14 shrink-0 items-center gap-2 border-b app-divider px-4">
                    <div className="flex size-7 items-center justify-center rounded-lg bg-gradient-to-br from-primary-500 to-primary-700">
                        <Sparkles size={14} className="text-white" />
                    </div>
                    <span className="text-sm font-semibold app-text">CMO IA</span>
                </div>
                <div className="flex-1 p-3">
                    <p className="px-2 py-6 text-center text-xs app-text-soft">
                        Suas conversas aparecerão aqui.
                    </p>
                </div>
            </aside>
        </>
    );
}

export function CmoPage() {
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
    const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

    return (
        <div className="flex h-full w-full">
            {/* Desktop sidebar */}
            <div className="hidden md:block">
                <CmoSidebar collapsed={sidebarCollapsed} />
            </div>

            {/* Mobile sidebar */}
            <MobileSidebar
                open={mobileSidebarOpen}
                onClose={() => setMobileSidebarOpen(false)}
            />

            {/* Main content area */}
            <div
                className={cn(
                    'flex flex-1 flex-col overflow-hidden transition-[padding] duration-200',
                    !sidebarCollapsed && 'md:pl-0',
                )}
            >
                {/* Content card */}
                <div className="flex flex-1 flex-col overflow-hidden rounded-[28px] app-panel">
                    {/* Header */}
                    <header className="flex h-14 shrink-0 items-center gap-2 border-b app-divider px-4">
                        {/* Mobile menu button */}
                        <button
                            onClick={() => setMobileSidebarOpen(true)}
                            className="flex size-9 items-center justify-center rounded-lg app-text-muted transition-colors hover:bg-[var(--app-hover)] hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-300 md:hidden"
                            aria-label="Abrir menu"
                        >
                            <Menu size={18} />
                        </button>

                        {/* Desktop sidebar toggle */}
                        <button
                            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                            className="hidden size-9 items-center justify-center rounded-lg app-text-muted transition-colors hover:bg-[var(--app-hover)] hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-300 md:flex"
                            aria-label={sidebarCollapsed ? 'Mostrar sidebar' : 'Ocultar sidebar'}
                        >
                            <PanelLeft size={18} />
                        </button>

                        {/* Title */}
                        <div className="flex items-center gap-2 ml-1">
                            <Sparkles size={15} className="text-primary-500" />
                            <span className="text-sm font-semibold app-text">CMO IA</span>
                            <span className="hidden text-xs app-text-soft sm:inline">· estratégia, ideias e brainstorming</span>
                        </div>
                    </header>

                    <div className="border-b app-divider app-panel-subtle px-4 py-3">
                        <div className="flex items-start gap-3">
                            <div className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300">
                                <Lightbulb size={16} />
                            </div>
                            <div>
                                <p className="text-sm font-semibold app-text-secondary">
                                    Espaço para discutir direção estratégica
                                </p>
                                <p className="text-xs app-text-muted">
                                    Use esta tela para explorar ideias, posicionamento e briefing. A criação operacional de campanhas acontece em Campanhas e Templates.
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-1 overflow-hidden">
                        <main className="flex-1 overflow-hidden">
                            <ChatPanel />
                        </main>
                    </div>
                </div>
            </div>
        </div>
    );
}
