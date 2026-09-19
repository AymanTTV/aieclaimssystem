// src/utils/safeJson.ts

/**
 * Safely serializes an object to a JSON string without throwing circular structure errors.
 * Circular references are replaced with '[Circular]' and internal Firestore properties are safely stripped.
 */
export function safeStringify(value: any, replacer?: ((key: string, value: any) => any) | null, space?: string | number): string {
  const seen = new WeakSet();

  return JSON.stringify(
    value,
    (key, val) => {
      // Omit internal Firestore / transport properties
      if (key.startsWith('_') || key === 'firestore' || key === '_firestore') {
        return undefined;
      }

      if (typeof val === 'object' && val !== null) {
        // Check for Firestore DocumentReference
        if (val.constructor?.name === 'DocumentReference' || val._firestore) {
          return val.path || '[DocumentReference]';
        }

        if (seen.has(val)) {
          return '[Circular]';
        }
        seen.add(val);
      }

      if (typeof replacer === 'function') {
        return replacer(key, val);
      }

      return val;
    },
    space
  );
}

/**
 * Global patch for JSON.stringify to prevent uncaught circular structure errors from crashing the application.
 */
export function installSafeJsonStringify(): void {
  if (typeof window === 'undefined') return;

  const originalStringify = JSON.stringify;
  (window as any).__originalJsonStringify = originalStringify;

  JSON.stringify = function (value: any, replacer?: any, space?: any): string {
    try {
      return originalStringify(value, replacer, space);
    } catch (err: any) {
      if (
        err instanceof TypeError &&
        (err.message?.includes('circular') || err.message?.includes('Converting circular structure'))
      ) {
        return safeStringify(value, replacer, space);
      }
      throw err;
    }
  };
}
