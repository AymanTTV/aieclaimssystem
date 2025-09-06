// src/components/ui/PageSection.tsx
import React from 'react';

interface PageSectionProps {
  title?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

const PageSection: React.FC<PageSectionProps> = ({ title, actions, children, className }) => {
  return (
    <section className={className}>
      <div className="bg-white rounded-xl shadow-sm p-6">
        {title && (
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
            {actions}
          </div>
        )}
        <div>{children}</div>
      </div>
    </section>
  );
};

export default PageSection;
