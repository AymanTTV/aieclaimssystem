import React, { lazy, Suspense } from 'react';

export const lazyLoad = (path: string) => {
  const LazyComponent = lazy(() => import(path));
  
  return (props: any) => (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    }>
      <LazyComponent {...props} />
    </Suspense>
  );
};