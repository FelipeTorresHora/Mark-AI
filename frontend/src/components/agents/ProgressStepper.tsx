import React from 'react';
import { cn } from '../../lib/utils';
import { Target, MessageSquare, Sparkles, CheckSquare } from 'lucide-react';
import { type AppPhase } from '../../types';

interface ProgressStepperProps {
    currentPhase: AppPhase;
}

const PHASES: { id: AppPhase, label: string, icon: React.ElementType }[] = [
    { id: 'BRIEFING', label: 'Briefing', icon: Target },
    { id: 'STRATEGY', label: 'Estratégia', icon: MessageSquare },
    { id: 'GENERATION', label: 'Geração', icon: Sparkles },
    { id: 'REVIEW', label: 'Aprovação', icon: CheckSquare },
];

export function ProgressStepper({ currentPhase }: ProgressStepperProps) {
    const currentIndex = PHASES.findIndex(p => p.id === currentPhase);

    return (
        <div className="flex items-center justify-between w-full relative">
            <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-slate-100 dark:bg-slate-700 -translate-y-1/2 z-0" />

            {PHASES.map((phase, index) => {
                const Icon = phase.icon;
                const isPast = index < currentIndex;
                const isActive = index === currentIndex;

                return (
                    <div key={phase.id} className="relative z-10 flex flex-col items-center gap-2">
                        <div className={cn(
                            "w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300",
                            isPast ? "bg-primary-600 text-white" :
                                isActive ? "bg-white dark:bg-slate-900 border-2 border-primary-600 text-primary-600 shadow-md" :
                                    "bg-slate-50 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-600 text-slate-400"
                        )}>
                            <Icon size={18} />
                        </div>
                        <span className={cn(
                            "text-xs font-semibold hidden md:block transition-colors",
                            isActive ? "text-primary-700 dark:text-primary-300" : isPast ? "text-slate-600 dark:text-slate-400" : "text-slate-400"
                        )}>
                            {phase.label}
                        </span>
                    </div>
                );
            })}
        </div>
    );
}
