import { toast as sonnerToast } from "sonner";
import { type Platform } from '../types';

export const showSuccess = (msg: string) => sonnerToast.success(msg, { duration: 3000 });
export const showError = (msg: string) => sonnerToast.error(msg, { duration: 5000 });

export const toast = {
    success: (msg: string) => sonnerToast.success(msg, { duration: 3000 }),
    error: (msg: string) => sonnerToast.error(msg, { duration: 5000 }),
    info: (msg: string) => sonnerToast.info(msg, { duration: 3000 }),
    warning: (msg: string) => sonnerToast.warning(msg, { duration: 4000 }),

    scoreAchieved: (score: number, platform: Platform) =>
        sonnerToast.success(`🎉 Score ${score}/100 no ${platform}!`, {
            position: "top-center",
            className: "bg-emerald-50 text-emerald-800 border-emerald-200",
        }),

    maxIterations: (platform: Platform) =>
        sonnerToast.warning(`⚠️ Max iterações no ${platform}. Revise o contexto.`, {
            position: "top-center",
            className: "bg-amber-50 text-amber-800 border-amber-200",
        }),
};
