import React from 'react';
import { List } from 'lucide-react';

export const ToDoIcon: React.FC<{ onClick: () => void }> = ({ onClick }) => (
  <div
    onClick={onClick}
    className="fixed bottom-4 left-4 z-50 bg-blue-600 hover:bg-blue-700 p-3 rounded-full shadow-lg cursor-pointer"
    title="Your To-Do List"
  >
    <List className="text-white" size={24} />
  </div>
);
