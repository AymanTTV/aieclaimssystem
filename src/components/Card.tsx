import React from 'react';

interface CardProps {
  title: string;
  children: React.ReactNode;
  className?: string;
}

const Card: React.FC<CardProps> = ({ title, children, className = '' }) => {
  return (
    <div className={`bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden ${className}`}>
      <div className="px-6 py-6 sm:p-8">
        <h3 className="text-lg font-bold text-gray-800 mb-6 font-display">{title}</h3>
        {children}
      </div>
    </div>
  );
};

export default Card;