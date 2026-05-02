import { motion } from 'framer-motion';

export function TypingIndicator() {
    return (
        <div className="rounded-2xl bg-slate-100 dark:bg-slate-800 inline-flex px-4 py-3">
            <div className="flex items-center gap-1 h-5">
                {[0, 1, 2].map(i => (
                    <motion.span
                        key={i}
                        animate={{ y: [0, -4, 0] }}
                        transition={{ duration: 0.6, delay: i * 0.15, repeat: Infinity }}
                        className="w-2 h-2 rounded-full bg-slate-400 dark:bg-slate-500"
                    />
                ))}
            </div>
        </div>
    );
}
