import React, { lazy, Suspense } from 'react';

export const lazyLoad = (componentName: string) => {
  // Create the lazy component with dynamic import
  const LazyComponent = lazy(() => {
    // Remove .tsx extension if present in componentName
    const cleanName = componentName.replace('.tsx', '');
    
    return import(`../pages/${cleanName}.tsx`)
      .catch((error) => {
        console.error(`Error loading component ${componentName}:`, error);
        throw new Error(`Failed to load ${componentName}`);
      });
  });
  
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