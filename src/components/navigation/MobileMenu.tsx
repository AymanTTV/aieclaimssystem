// src/components/navigation/MobileMenu.tsx

import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { X, ChevronDown, ChevronUp, MessageSquare, Share2 } from 'lucide-react';
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
  onOpenShare?: () => void;
}

const MobileMenu: React.FC<MobileMenuProps> = ({
  isOpen,
  onClose,
  navigation,
  currentPath,
  unreadChatCount,
  onOpenShare,
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
          {/* Share System Link action on mobile */}
          {onOpenShare && (
            <div className="mb-4 pb-3 border-b border-gray-100">
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenShare();
                }}
                className="w-full flex items-center justify-between px-4 py-2.5 text-sm rounded-full font-bold text-[#212049] bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 hover:border-[#423fbd] transition shadow-2xs"
              >
                <div className="flex items-center">
                  <Share2 className="w-4 h-4 mr-2.5 text-[#423fbd]" />
                  <span>Share System Link</span>
                </div>
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-blue-100 text-[#423fbd]">
                  Preview Card
                </span>
              </button>
            </div>
          )}

          {navigation.map(item => {
            const Icon = item.icon;
            const hasSubmenu = item.submenu && item.submenu.length > 0;
            const isActive = currentPath === item.href;
            const isSubmenuOpen = openSubmenu === item.name;
            const isSubmenuActive = item.submenu?.some(sub => currentPath === sub.href) ?? false;
            const isTodo = item.href === ROUTES.TODO || item.name.toLowerCase().includes('todo') || item.name.toLowerCase().includes('to-do');

            return (
              <div key={item.name} className="mb-2">
                {hasSubmenu ? (
                  <>
                    <button
                      onClick={() =>
                        setOpenSubmenu(isSubmenuOpen ? null : item.name)
                      }
                      className={`w-full flex items-center justify-between px-3.5 py-2.5 text-xs font-semibold rounded-lg transition-colors ${
                        isSubmenuActive
                          ? 'text-primary bg-primary/5'
                          : 'text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex items-center">
                        <Icon className="w-4 h-4 mr-2.5" />
                        {item.name}
                      </div>
                      {isSubmenuOpen ? (
                        <ChevronUp className="w-3.5 h-3.5" />
                      ) : (
                        <ChevronDown className="w-3.5 h-3.5" />
                      )}
                    </button>

                    {isSubmenuOpen && (
                      <div className="ml-5 mt-1.5 space-y-1">
                        {item.submenu!.map(subitem => (
                          <Link
                            key={subitem.href}
                            to={subitem.href}
                            onClick={onClose}
                            className={`block px-3.5 py-1.5 text-xs rounded-md ${
                              currentPath === subitem.href
                                ? 'text-primary bg-primary/5 font-semibold'
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
                    className={`flex items-center justify-between px-3.5 py-2.5 text-xs rounded-full transition-colors ${
                      isActive
                        ? 'bg-[#FEE2E2] text-[#991B1B] border border-[#FCA5A5] shadow-xs font-semibold'
                        : 'text-[#64748B] hover:text-[#0F172A] hover:bg-[#F1F5F9]'
                    }`}
                  >
                    <div className="flex items-center">
                      <Icon className={`w-4 h-4 mr-2.5 ${isActive ? 'text-[#991B1B]' : 'text-[#64748B]'}`} />
                      <span>{item.name}</span>
                    </div>
                    {item.href === ROUTES.CHAT && unreadChatCount > 0 && (
                      <span className="ml-2 inline-flex items-center justify-center px-1.5 py-0.5 text-[10px] font-bold text-white bg-[#EF4444] rounded-full">
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
