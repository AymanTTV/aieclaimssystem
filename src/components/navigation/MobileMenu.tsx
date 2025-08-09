// src/components/navigation/MobileMenu.tsx

import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { X, ChevronDown, ChevronUp, MessageSquare } from 'lucide-react';
import { ROUTES, ROUTE_METADATA } from '../../routes';

interface NavItem {
  name: string;
  href: string;
  icon: React.ElementType;
  permission?: string;
  submenu?: { name: string; href: string; permission?: string }[];
}

interface MobileMenuProps {
  isOpen: boolean;
  onClose: () => void;
  navigation: NavItem[];
  currentPath: string;
  unreadChatCount: number;
}

const MobileMenu: React.FC<MobileMenuProps> = ({
  isOpen,
  onClose,
  navigation,
  currentPath,
  unreadChatCount,
}) => {
  const [openSubmenu, setOpenSubmenu] = useState<string | null>(null);
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

        <nav className="px-4 py-6">
          {navigation.map(item => {
            const Icon = item.icon;
            const hasSubmenu = item.submenu && item.submenu.length > 0;
            const isActive = currentPath === item.href;
            const isSubmenuOpen = openSubmenu === item.name;
            const isSubmenuActive = item.submenu?.some(sub => currentPath === sub.href) ?? false;

            return (
              <div key={item.name} className="mb-2">
                {hasSubmenu ? (
                  <>
                    <button
                      onClick={() =>
                        setOpenSubmenu(isSubmenuOpen ? null : item.name)
                      }
                      className={`w-full flex items-center justify-between px-4 py-3 text-sm font-medium rounded-lg transition-colors ${
                        isSubmenuActive
                          ? 'text-primary bg-primary/5'
                          : 'text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex items-center">
                        <Icon className="w-5 h-5 mr-3" />
                        {item.name}
                      </div>
                      {isSubmenuOpen ? (
                        <ChevronUp className="w-4 h-4" />
                      ) : (
                        <ChevronDown className="w-4 h-4" />
                      )}
                    </button>

                    {isSubmenuOpen && (
                      <div className="ml-6 mt-2 space-y-1">
                        {item.submenu!.map(subitem => (
                          <Link
                            key={subitem.href}
                            to={subitem.href}
                            onClick={onClose}
                            className={`block px-4 py-2 text-sm rounded-md ${
                              currentPath === subitem.href
                                ? 'text-primary bg-primary/5'
                                : 'text-gray-600 hover:bg-gray-50'
                            }`}
                          >
                            {subitem.name}
                          </Link>
                        ))}
                      </div>
                    )}
                  </>
                ) : (
                  <Link
                    to={item.href}
                    onClick={onClose}
                    className={`flex items-center justify-between px-4 py-3 text-sm font-medium rounded-lg transition-colors ${
                      isActive
                        ? 'text-primary bg-primary/5'
                        : 'text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center">
                      <Icon className="w-5 h-5 mr-3" />
                      <span>{item.name}</span>
                    </div>
                    {item.href === ROUTES.CHAT && unreadChatCount > 0 && (
                      <span className="ml-2 inline-flex items-center justify-center px-2 py-0.5 text-xs font-bold text-red-100 bg-red-600 rounded-full">
                        {unreadChatCount}
                      </span>
                    )}
                  </Link>
                )}
              </div>
            );
          })}
        </nav>
      </div>
    </div>
  );
};

export default MobileMenu;
