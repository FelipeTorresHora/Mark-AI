import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

/** Extrai mensagem de erro de qualquer valor — substitui `err: any`. */
export function getErrorMessage(err: unknown, fallback = 'Erro desconhecido'): string {
    if (typeof err === 'string') return err;
    if (err && typeof err === 'object') {
        if ('message' in err) return String((err as { message: unknown }).message);
        if ('response' in err) {
            const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
            if (detail) return detail;
        }
    }
    return fallback;
}

/** Verifica se erro é 404 (recurso não existe). */
export function isNotFoundError(err: unknown): boolean {
    return (err as { response?: { status?: number } })?.response?.status === 404;
}

export function formatScheduledAt(iso: string): string {
    const date = new Date(iso);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const tomorrow = new Date(today.getTime() + 86400000);
    const dateOnly = new Date(date.getFullYear(), date.getMonth(), date.getDate());

    const time = date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

    if (dateOnly.getTime() === today.getTime()) return `Hoje, ${time}`;
    if (dateOnly.getTime() === tomorrow.getTime()) return `Amanhã, ${time}`;
    return date.toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' }) + `, ${time}`;
}
