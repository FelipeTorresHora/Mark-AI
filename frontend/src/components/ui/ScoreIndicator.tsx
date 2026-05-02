import { cn } from '../../lib/utils';

interface ScoreIndicatorProps {
    score: number;
    size?: number;
}

export function ScoreIndicator({ score, size = 48 }: ScoreIndicatorProps) {
    const color =
        score >= 90 ? "text-emerald-500" :
            score >= 70 ? "text-amber-500" :
                "text-rose-500";

    const radius = (size / 2) - 4;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (score / 100) * circumference;

    return (
        <div
            className="relative"
            style={{ width: size, height: size }}
            role="img"
            aria-label={`Score de qualidade: ${score} de 100`}
        >
            <svg className="-rotate-90 w-full h-full drop-shadow-sm dark:drop-shadow-[0_0_8px_currentColor]" viewBox={`0 0 ${size} ${size}`}>
                <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    fill="none"
                    className="stroke-slate-100 dark:stroke-slate-800"
                    strokeWidth="4"
                />
                <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    fill="none"
                    className={cn("transition-all duration-1000 ease-out", color)}
                    strokeWidth="4"
                    strokeDasharray={circumference}
                    strokeDashoffset={offset}
                    strokeLinecap="round"
                />
            </svg>
            <span className={cn("absolute inset-0 flex items-center justify-center font-extrabold text-xs drop-shadow-sm", color)}>
                {score}
            </span>
        </div>
    );
}
