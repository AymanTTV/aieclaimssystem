// src/routes/lazyLoad.tsx

import React, { lazy, Suspense } from 'react';

export const lazyLoad = (componentName: string) => {
  // Create the lazy component with dynamic import
  const LazyComponent = lazy(() => 
    import(`../pages/${componentName}.tsx`).catch(() => 
      import(`../pages/${componentName}/index.tsx`)
    )
  );
  
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
