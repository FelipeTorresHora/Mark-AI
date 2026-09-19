function formatDatetimeLocal(d: Date): string {
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** Compare datetime-local input strings without calling Date.now() during render. */
export function isDatetimeLocalPast(value: string): boolean {
    if (!value) return false;
    return value < formatDatetimeLocal(new Date());
}
