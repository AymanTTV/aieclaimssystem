import React from 'react';
import { MessageCircle } from 'lucide-react';

interface WhatsAppTableButtonProps {
  onClick: () => void;
  className?: string;
}

const WhatsAppTableButton: React.FC<WhatsAppTableButtonProps> = ({ onClick, className }) => {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center justify-center p-2 text-green-600 hover:text-green-700 rounded-full hover:bg-green-50 transition-colors ${className}`}
      title="Contact via WhatsApp"
    >
      <MessageCircle className="h-5 w-5" />
    </button>
  );
};

export default WhatsAppTableButton;