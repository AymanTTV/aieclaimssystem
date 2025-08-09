// src/routes/lazyLoad.tsx

import React, { lazy, Suspense } from 'react';

// Tell Vite at build-time about every .tsx file under src/pages
const modules = import.meta.glob('../pages/**/*.tsx');

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

  const LazyComponent = lazy(loader as () => Promise<{ default: React.ComponentType<any> }>);

  return (props: any) => (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      }
    >
      <LazyComponent {...props} />
    </Suspense>
  );
};
