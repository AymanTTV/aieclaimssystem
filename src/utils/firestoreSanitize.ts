// src/utils/firestoreSanitize.ts

/**
 * Recursively removes all `undefined` values from objects and arrays
 * so they can be safely written to Firebase Firestore without throwing:
 * "Function setDoc() called with invalid data. Unsupported field value: undefined"
 */
export function removeUndefined<T = any>(obj: T): T {
  if (obj === undefined) {
    return null as unknown as T;
  }

  if (Array.isArray(obj)) {
    return obj
      .filter((item) => item !== undefined)
      .map((item) => removeUndefined(item)) as unknown as T;
  }

  if (
    obj !== null &&
    typeof obj === 'object' &&
    !(obj instanceof Date) &&
    typeof (obj as any).toDate !== 'function'
  ) {
    const cleaned: Record<string, any> = {};
    for (const [key, value] of Object.entries(obj as Record<string, any>)) {
      if (value !== undefined) {
        cleaned[key] = removeUndefined(value);
      }
    }
    return cleaned as T;
  }

  return obj;
}
