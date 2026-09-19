import type { PostTemplate } from '../../data/postTemplates';
import { formatPlatformLabel } from './templateUtils';
import { cn } from '../../lib/utils';

export function PlatformBadge({
    platform,
    className,
}: {
    platform: PostTemplate['platform'];
    className?: string;
}) {
    return (
        <span
            className={cn(
                'inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold',
                'bg-[#e2f6d5] text-[#054d28] dark:bg-primary-900/30 dark:text-primary-300',
                'ring-1 ring-[rgba(14,15,12,0.08)]',
                className,
            )}
        >
            {formatPlatformLabel(platform)}
        </span>
    );
}
