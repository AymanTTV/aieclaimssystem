export function isE164(phone: string): boolean {
  return /^\+?[1-9]\d{1,14}$/.test((phone || '').trim());
}
