// src/components/navigation/MobileMenu.tsx

import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { X, ChevronDown, ChevronUp, MessageSquare } from 'lucide-react'; // Import MessageSquare
import { ROUTES, ROUTE_METADATA } from '../../routes'; // Import ROUTES and ROUTE_METADATA

interface NavItem {
  name: string;
  href: string;
  icon: React.ElementType;
  permission?: string; // Add permission property
  submenu?: { name: string; href: string; permission?: string }[]; // Add permission to submenu
}

interface MobileMenuProps {
  isOpen: boolean;
  onClose: () => void;
  navigation: NavItem[];
  currentPath: string;
  unreadChatCount: number; // Add unreadChatCount prop
}

const MobileMenu: React.FC<MobileMenuProps> = ({
  isOpen,
  onClose,
  navigation,
  currentPath,
  unreadChatCount, // Destructure unreadChatCount
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
          {navigation.map((item) => {
            const Icon = item.icon;
            const isActive = currentPath === item.href;
            const hasSubmenu = item.submenu && item.submenu.length > 0;
            const isSubmenuOpen = openSubmenu === item.name;
            // Check if any submenu item is active
            const isSubmenuActive = item.submenu?.some(subitem => currentPath === subitem.href);

            // Determine if the main item itself is active (excluding submenu matches)
            const isSelfActive = currentPath === item.href && !isSubmenuActive;


            return (
              <div key={item.name} className="mb-2">
                {hasSubmenu ? (
                  <div>
                    <button
                      onClick={() => setOpenSubmenu(isSubmenuOpen ? null : item.name)}
                      className={`w-full flex items-center justify-between px-4 py-3 text-sm font-medium rounded-lg transition-colors ${
                        isSubmenuActive // Highlight if any submenu item is active
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
                        {item.submenu.map((subitem) => (
                           // Assuming can() function is available in this scope or passed as prop if needed
                           // For now, rendering all submenu items as the filtering is done in Layout.tsx
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
                  </div>
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

                    {/* Display unread count next to Chat link in mobile menu */}
                    {item.href === ROUTES.CHAT && unreadChatCount > 0 && (
                      <span className="ml-2 inline-flex items-center justify-center px-2 py-0.5 text-xs font-bold leading-none text-red-100 bg-red-600 rounded-full">
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
