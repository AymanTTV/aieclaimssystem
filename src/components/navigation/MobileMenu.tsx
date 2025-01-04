import React from 'react';
import { Link } from 'react-router-dom';
import { X } from 'lucide-react';

interface MobileMenuProps {
  isOpen: boolean;
  onClose: () => void;
  navigation: Array<{
    name: string;
    href: string;
    icon: React.ElementType;
  }>;
  currentPath: string;
}

const MobileMenu: React.FC<MobileMenuProps> = ({
  isOpen,
  onClose,
  navigation,
  currentPath,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 lg:hidden">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-gray-600 bg-opacity-75" onClick={onClose} />

      {/* Menu panel */}
      <div className="fixed inset-y-0 right-0 w-full max-w-xs bg-white shadow-xl">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="text-lg font-medium">Menu</h2>
          <button
            onClick={onClose}
            className="p-2 text-gray-500 hover:text-gray-700 focus:outline-none"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <nav className="px-4 py-6 space-y-2">
          {navigation.map((item) => {
            const Icon = item.icon;
            const isActive = currentPath === item.href;
            
            return (
              <Link
                key={item.name}
                to={item.href}
                onClick={onClose}
                className={`flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors ${
                  isActive
                    ? 'text-primary bg-primary/5'
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                <Icon className="w-5 h-5 mr-3" />
                {item.name}
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
};

export default MobileMenu;