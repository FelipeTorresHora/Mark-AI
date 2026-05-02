import { cn } from '../../lib/utils';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface PaginationProps {
    page: number;
    total: number;
    limit: number;
    onPageChange: (page: number) => void;
}

export function Pagination({ page, total, limit, onPageChange }: PaginationProps) {
    const totalPages = Math.max(1, Math.ceil(total / limit));

    if (totalPages <= 1) return null;

    const pages: number[] = [];
    const windowStart = Math.max(0, Math.min(page - 2, totalPages - 5));
    for (let i = windowStart; i < Math.min(windowStart + 5, totalPages); i++) {
        pages.push(i);
    }

    return (
        <div className="flex flex-col items-center gap-3 py-6">
            <div className="app-panel-subtle inline-flex items-center gap-1 p-1 rounded-full">
                <button
                    onClick={() => onPageChange(page - 1)}
                    disabled={page === 0}
                    className="w-9 h-9 flex items-center justify-center rounded-full app-text-soft hover:text-[#0e0f0c] dark:hover:text-[#e8ebe6] hover:bg-primary-50 dark:hover:bg-white/8 disabled:opacity-30 disabled:cursor-not-allowed transition-all hover:scale-105 active:scale-95"
                    aria-label="Página anterior"
                >
                    <ChevronLeft size={16} />
                </button>

                {pages.map((p) => (
                    <button
                        key={p}
                        onClick={() => onPageChange(p)}
                        className={cn(
                            'w-9 h-9 rounded-full text-sm font-semibold transition-all hover:scale-105 active:scale-95',
                            p === page
                                ? 'bg-primary-400 text-primary-900 shadow-[rgba(14,15,12,0.10)_0px_8px_22px_-18px]'
                                : 'app-text-secondary hover:bg-primary-50 dark:hover:bg-white/8 hover:text-[#0e0f0c] dark:hover:text-[#e8ebe6]',
                        )}
                    >
                        {p + 1}
                    </button>
                ))}

                <button
                    onClick={() => onPageChange(page + 1)}
                    disabled={page >= totalPages - 1}
                    className="w-9 h-9 flex items-center justify-center rounded-full app-text-soft hover:text-[#0e0f0c] dark:hover:text-[#e8ebe6] hover:bg-primary-50 dark:hover:bg-white/8 disabled:opacity-30 disabled:cursor-not-allowed transition-all hover:scale-105 active:scale-95"
                    aria-label="Próxima página"
                >
                    <ChevronRight size={16} />
                </button>
            </div>

        </div>
    );
}
