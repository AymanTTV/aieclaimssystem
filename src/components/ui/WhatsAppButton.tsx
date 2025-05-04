import React from 'react';
import { MessageCircle } from 'lucide-react';

interface WhatsAppButtonProps {
  onClick: () => void;
  className?: string;
}

const WhatsAppButton: React.FC<WhatsAppButtonProps> = ({ onClick, className }) => {
  return (
    <button
      onClick={onClick}
      className={`fixed bottom-4 left-4 bg-green-500 hover:bg-green-600 text-white rounded-full p-3 shadow-lg transition-all duration-300 hover:scale-110 focus:outline-none focus:ring-2 focus:ring-green-400 focus:ring-offset-2 ${className}`}
      title="Contact via WhatsApp"
    >
      <MessageCircle className="h-6 w-6" />
    </button>
  );
};

export default WhatsAppButton;