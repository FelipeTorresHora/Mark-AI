import { Card } from '../common/Card';
import { type LucideIcon } from 'lucide-react';

interface KPICardProps {
    title: string;
    value: number | string;
    trend?: number;
    icon: LucideIcon;
    loading?: boolean;
}

export function KPICard({ title, value, trend, icon: Icon, loading }: KPICardProps) {
    return (
        <Card className="p-5 flex flex-col md:flex-row items-start justify-between gap-4 border-slate-200 dark:border-slate-700/50">
            <div>
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-1">{title}</p>
                {loading ? (
                    <div className="h-8 w-16 bg-slate-100 dark:bg-slate-800 rounded animate-pulse" />
                ) : (
                    <div className="flex items-baseline gap-2">
                        <h3 className="text-2xl font-extrabold text-slate-800 dark:text-white drop-shadow-sm">{value}</h3>
                        {trend !== undefined && (
                            <span className={`text-xs font-bold ${trend >= 0 ? 'text-emerald-500 dark:text-emerald-400 drop-shadow-[0_0_5px_rgba(52,211,153,0.4)]' : 'text-rose-500 dark:text-rose-400 drop-shadow-[0_0_5px_rgba(251,113,133,0.4)]'}`}>
                                {trend >= 0 ? '+' : ''}{trend}%
                            </span>
                        )}
                    </div>
                )}
            </div>
            <div className="p-3 bg-primary-100 dark:bg-primary-950 border border-transparent dark:border-primary-500/30 text-primary-600 dark:text-primary-400 rounded-xl shadow-sm dark:shadow-neon">
                <Icon size={20} />
            </div>
        </Card>
    );
}
