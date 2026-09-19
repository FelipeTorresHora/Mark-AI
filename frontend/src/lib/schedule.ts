/** Used in event handlers / state initializers — not during render. */
export function isDatetimeLocalInPast(value: string): boolean {
    if (!value) return false;
    return new Date(value).getTime() <= Date.now();
}
