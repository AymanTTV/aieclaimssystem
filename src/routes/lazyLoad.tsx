// src/routes/lazyLoad.tsx

import React, { lazy, Suspense } from 'react';
import { ErrorBoundary } from '../components/ErrorBoundary';

// Tell Vite at build-time about every .tsx file under src/pages
const modules = import.meta.glob('../pages/**/*.tsx');

/**
 * Resilient dynamic importer that retries on network hiccups or chunk invalidation
 */
const retryImport = async (
  fn: () => Promise<{ default: React.ComponentType<any> }>,
  retriesLeft = 2,
  delayMs = 400
): Promise<{ default: React.ComponentType<any> }> => {
  try {
    return await fn();
  } catch (error: any) {
    const isFetchError =
      error?.message?.includes('Failed to fetch dynamically imported module') ||
      error?.message?.includes('error loading dynamically imported module') ||
      error?.name === 'ChunkLoadError';

    if (isFetchError && retriesLeft > 0) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
      return retryImport(fn, retriesLeft - 1, delayMs * 2);
    }

    if (isFetchError && typeof window !== 'undefined') {
      const reloadKey = `chunk_reload_${window.location.pathname}`;
      const lastReload = sessionStorage.getItem(reloadKey);
      const now = Date.now();
      if (!lastReload || now - parseInt(lastReload, 10) > 15000) {
        sessionStorage.setItem(reloadKey, String(now));
        window.location.reload();
        return new Promise(() => {});
      }
    }

    throw error;
  }
};

export const lazyLoad = (componentName: string) => {
  // Try both Foo.tsx and Foo/index.tsx
  const possiblePaths = [
    `../pages/${componentName}.tsx`,
    `../pages/${componentName}/index.tsx`,
  ];

  // Find the loader function that exists
  const loader = possiblePaths
    .map((p) => modules[p])
    .find((fn) => typeof fn === 'function');

  if (!loader) {
    throw new Error(
      `lazyLoad: could not find a page module for "${componentName}".`
    );
  }

  const LazyComponent = lazy(() =>
    retryImport(loader as () => Promise<{ default: React.ComponentType<any> }>)
  );

  return (props: any) => (
    <ErrorBoundary>
      <Suspense
        fallback={
          <div className="flex items-center justify-center min-h-screen">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        }
      >
        <LazyComponent {...props} />
      </Suspense>
    </ErrorBoundary>
  );
};

