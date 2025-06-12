export function toDateInputValue(d: Date | string | null | undefined): string {
    if (!d) return '';
    const date = d instanceof Date ? d : new Date(d);
    if (isNaN(date.getTime())) return '';      // ← bail on invalid
    // Shift to local midnight
    const tzOffset = date.getTimezoneOffset() * 60000;
    const local = new Date(date.getTime() - tzOffset);
    return local.toISOString().slice(0, 10);
  }
  