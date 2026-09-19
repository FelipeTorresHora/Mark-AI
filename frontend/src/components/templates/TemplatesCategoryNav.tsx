import type { LucideIcon } from 'lucide-react';
import { LayoutGrid } from 'lucide-react';
import { TEMPLATE_CATEGORIES, type TemplateCategory } from '../../data/postTemplates';
import { cn } from '../../lib/utils';

export type TemplatesCategoryFilter = TemplateCategory | 'all';

interface TemplatesCategoryNavProps {
    active: TemplatesCategoryFilter;
    onChange: (cat: TemplatesCategoryFilter) => void;
    counts: Record<TemplatesCategoryFilter, number>;
}

function NavButton({
    active,
    onClick,
    icon: Icon,
    label,
    description,
    count,
}: {
    active: boolean;
    onClick: () => void;
    icon: LucideIcon;
    label: string;
    description?: string;
    count: number;
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            className={cn(
                'w-full text-left rounded-[20px] px-4 py-3 transition-all duration-200',
                active
                    ? 'bg-primary-400 text-primary-900 ring-1 ring-[rgba(22,51,0,0.12)]'
                    : 'app-panel-subtle app-text-secondary hover:bg-[var(--app-hover-strong)] dark:hover:bg-white/8',
            )}
        >
            <div className="flex items-center gap-2.5">
                <Icon size={17} className={active ? 'text-primary-900' : 'app-text-soft'} />
                <span className="font-semibold text-sm flex-1">{label}</span>
                <span
                    className={cn(
                        'text-xs font-bold tabular-nums px-2 py-0.5 rounded-full',
                        active ? 'bg-[rgba(22,51,0,0.12)]' : 'bg-[rgba(14,15,12,0.06)] dark:bg-white/10',
                    )}
                >
                    {count}
                </span>
            </div>
            {description && active && (
                <p className="text-xs mt-2 leading-relaxed opacity-90 pl-[27px]">{description}</p>
            )}
        </button>
    );
}

export function TemplatesCategoryNav({ active, onChange, counts }: TemplatesCategoryNavProps) {
    return (
        <nav className="space-y-2" aria-label="Categorias de templates">
            <NavButton
                active={active === 'all'}
                onClick={() => onChange('all')}
                icon={LayoutGrid}
                label="Todos os templates"
                count={counts.all}
            />
            {TEMPLATE_CATEGORIES.map((cat) => (
                <NavButton
                    key={cat.id}
                    active={active === cat.id}
                    onClick={() => onChange(cat.id)}
                    icon={cat.icon}
                    label={cat.label}
                    description={cat.description}
                    count={counts[cat.id]}
                />
            ))}
        </nav>
    );
}
