// src/utils/templateUtils.ts

/**
 * Replace [Placeholders] and {placeholders} in a template string with actual values.
 * Supports case-insensitive and snake_case / Title Case aliases seamlessly.
 */
export function fillPlaceholders(
  template: string,
  context: Record<string, string>
): string {
  if (!template) return '';
  let result = template;

  // Build a normalized lookup map
  const normalizedContext: Record<string, string> = {};
  for (const [key, val] of Object.entries(context)) {
    const cleanVal = val ?? '';
    normalizedContext[key] = cleanVal;
    
    // Also index normalized variants: lowercase, snake_case, spaces removed
    const lower = key.toLowerCase();
    const snake = lower.replace(/\s+/g, '_');
    const noSpace = lower.replace(/\s+/g, '');
    normalizedContext[lower] = cleanVal;
    normalizedContext[snake] = cleanVal;
    normalizedContext[noSpace] = cleanVal;
  }

  // 1. Direct replacement of all provided keys for both [...] and {...}
  for (const key of Object.keys(context)) {
    const val = context[key] ?? '';
    // Escape regex special chars in key
    const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    result = result.replace(new RegExp(`\\[${escaped}\\]`, 'gi'), val);
    result = result.replace(new RegExp(`\\{${escaped}\\}`, 'gi'), val);
  }

  // 2. Generic pass for any remaining {placeholder_name} or [Placeholder Name]
  result = result.replace(/\{([a-zA-Z0-9_ -]+)\}/g, (match, p1) => {
    const pLower = p1.toLowerCase().trim();
    const pSnake = pLower.replace(/\s+/g, '_');
    const pNoSpace = pLower.replace(/\s+/g, '');
    if (normalizedContext[pSnake] !== undefined) return normalizedContext[pSnake];
    if (normalizedContext[pLower] !== undefined) return normalizedContext[pLower];
    if (normalizedContext[pNoSpace] !== undefined) return normalizedContext[pNoSpace];
    return match;
  });

  result = result.replace(/\[([a-zA-Z0-9_ -]+)\]/g, (match, p1) => {
    const pLower = p1.toLowerCase().trim();
    const pSnake = pLower.replace(/\s+/g, '_');
    const pNoSpace = pLower.replace(/\s+/g, '');
    if (normalizedContext[pSnake] !== undefined) return normalizedContext[pSnake];
    if (normalizedContext[pLower] !== undefined) return normalizedContext[pLower];
    if (normalizedContext[pNoSpace] !== undefined) return normalizedContext[pNoSpace];
    return match;
  });

  return result;
}

