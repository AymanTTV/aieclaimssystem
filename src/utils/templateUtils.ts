// src/utils/templateUtils.ts

/**
 * Replace [Placeholders] in a template string with actual values.
 */
export function fillPlaceholders(
  template: string,
  context: Record<string, string>
): string {
  let result = template;
  for (const key of Object.keys(context)) {
    const re = new RegExp(`\\[${key}\\]`, 'g');
    result = result.replace(re, context[key] ?? '');
  }
  return result;
}
