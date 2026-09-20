// src/components/claims/ClaimTemplateSearchableSelect.tsx
import React, { useState, useRef, useEffect, useLayoutEffect, useCallback } from 'react';
import ReactDOM from 'react-dom';
import {
  Search,
  ChevronDown,
  Check,
  X,
  MessageCircle,
  Mail,
  FileText,
  Clock,
  Scale,
  Sparkles,
  Layers,
} from 'lucide-react';
import { ClaimTemplateOption, ClaimTemplateCategory } from '../../utils/claimCommunication';

export interface ClaimTemplateSearchableSelectProps {
  templates: ClaimTemplateOption[];
  selectedTemplateId: string;
  onSelectTemplate: (templateId: string) => void;
  channel?: 'whatsapp' | 'email';
  activeCategory?: ClaimTemplateCategory;
  disabled?: boolean;
}

interface DropdownPosition {
  top: number;
  left: number;
  width: number;
  openUpwards: boolean;
}

export const ClaimTemplateSearchableSelect: React.FC<ClaimTemplateSearchableSelectProps> = ({
  templates,
  selectedTemplateId,
  onSelectTemplate,
  channel,
  disabled = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [dropdownPosition, setDropdownPosition] = useState<DropdownPosition | null>(null);

  const triggerRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const selectedTemplate = templates.find((t) => t.id === selectedTemplateId);

  // Position the portal dropdown
  const updatePosition = useCallback(() => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const dropdownHeight = 360;
    const spaceBelow = window.innerHeight - rect.bottom;
    const openUpwards = spaceBelow < dropdownHeight && rect.top > spaceBelow;

    setDropdownPosition({
      top: openUpwards ? rect.top - 6 : rect.bottom + 6,
      left: Math.max(12, rect.left),
      width: Math.min(rect.width, window.innerWidth - 24),
      openUpwards,
    });
  }, []);

  useLayoutEffect(() => {
    if (isOpen) {
      updatePosition();
      const handleScrollOrResize = () => {
        updatePosition();
      };
      window.addEventListener('scroll', handleScrollOrResize, true);
      window.addEventListener('resize', handleScrollOrResize);
      return () => {
        window.removeEventListener('scroll', handleScrollOrResize, true);
        window.removeEventListener('resize', handleScrollOrResize);
      };
    } else {
      setDropdownPosition(null);
    }
  }, [isOpen, updatePosition]);

  // Click outside listener
  useEffect(() => {
    if (!isOpen) return;

    const handlePointerDown = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node;
      if (
        triggerRef.current?.contains(target) ||
        dropdownRef.current?.contains(target)
      ) {
        return;
      }
      setIsOpen(false);
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('touchstart', handlePointerDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('touchstart', handlePointerDown);
    };
  }, [isOpen]);

  // Focus search input when opened
  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
      return () => clearTimeout(timer);
    } else {
      setSearchTerm('');
    }
  }, [isOpen]);

  // Escape key handler
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  // Filter templates based on search term
  const filteredTemplates = templates.filter((t) => {
    if (!searchTerm.trim()) return true;
    const query = searchTerm.toLowerCase().trim();
    const nameMatch = t.name.toLowerCase().includes(query);
    const subjectMatch = t.subjectTemplate?.toLowerCase().includes(query);
    const bodyMatch = t.bodyTemplate?.toLowerCase().includes(query);
    const catMatch = t.category?.toLowerCase().includes(query);
    const channelMatch = t.channel?.toLowerCase().includes(query);
    return nameMatch || subjectMatch || bodyMatch || catMatch || channelMatch;
  });

  const getCategoryBadge = (cat: ClaimTemplateCategory, isCustom?: boolean) => {
    if (isCustom) {
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-500 border border-amber-500/20">
          <Sparkles className="w-2.5 h-2.5" />
          Custom
        </span>
      );
    }
    switch (cat) {
      case 'legal_handler':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/20">
            <Scale className="w-2.5 h-2.5" />
            Legal Handler
          </span>
        );
      case 'progress':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-teal-500/10 text-teal-400 border border-teal-500/20">
            <Clock className="w-2.5 h-2.5" />
            Progress
          </span>
        );
      case 'general':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">
            <FileText className="w-2.5 h-2.5" />
            General
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-gray-500/10 text-gray-400 border border-gray-500/20">
            <Layers className="w-2.5 h-2.5" />
            {cat}
          </span>
        );
    }
  };

  const handleSelect = (tplId: string) => {
    onSelectTemplate(tplId);
    setIsOpen(false);
  };

  return (
    <div className="relative w-full">
      {/* Trigger Button */}
      <div
        ref={triggerRef}
        onClick={() => !disabled && setIsOpen((prev) => !prev)}
        className={`w-full min-h-[44px] px-3.5 py-2.5 rounded-xl border flex items-center justify-between cursor-pointer transition-all duration-150 select-none shadow-xs ${
          disabled
            ? 'opacity-60 cursor-not-allowed bg-gray-100 border-gray-200 dark:bg-[#1A1A26] dark:border-[#2B2B40]'
            : isOpen
            ? 'border-primary ring-2 ring-primary/20 bg-white dark:bg-[#1E1E2D] dark:border-primary'
            : 'border-gray-300 bg-white hover:border-gray-400 dark:bg-[#1E1E2D] dark:border-[#2B2B40] dark:hover:border-[#3E3E5B]'
        }`}
        role="button"
        tabIndex={disabled ? -1 : 0}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          {channel === 'whatsapp' ? (
            <MessageCircle className="w-4 h-4 text-emerald-500 flex-shrink-0" />
          ) : (
            <Mail className="w-4 h-4 text-indigo-500 flex-shrink-0" />
          )}

          {selectedTemplate ? (
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <span className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                {selectedTemplate.name}
              </span>
              {getCategoryBadge(selectedTemplate.category, selectedTemplate.isCustom)}
            </div>
          ) : (
            <span className="text-sm text-gray-400 italic truncate">
              Search or select a claim template...
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5 ml-2 flex-shrink-0">
          <span className="text-xs text-gray-400 font-normal">
            ({templates.length})
          </span>
          <ChevronDown
            className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${
              isOpen ? 'transform rotate-180 text-primary' : ''
            }`}
          />
        </div>
      </div>

      {/* Portal Dropdown Menu */}
      {isOpen &&
        dropdownPosition &&
        ReactDOM.createPortal(
          <div
            ref={dropdownRef}
            style={{
              position: 'fixed',
              top: `${dropdownPosition.top}px`,
              left: `${dropdownPosition.left}px`,
              width: `${dropdownPosition.width}px`,
              zIndex: 9999,
            }}
            className="rounded-xl border border-gray-200 dark:border-[#2B2B40] bg-white dark:bg-[#1E1E2D] shadow-2xl overflow-hidden flex flex-col max-h-[380px] animate-in fade-in-50 zoom-in-95 duration-100"
          >
            {/* Search Input Bar (search-as-you-type) */}
            <div className="p-2.5 border-b border-gray-100 dark:border-[#2B2B40] bg-gray-50/80 dark:bg-[#161622]/90 sticky top-0 z-10">
              <div className="relative flex items-center">
                <Search className="w-4 h-4 text-gray-400 absolute left-3 pointer-events-none" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Type to filter templates instantly..."
                  className="w-full pl-9 pr-8 py-2 text-sm rounded-lg border border-gray-200 dark:border-[#2B2B40] bg-white dark:bg-[#13131A] text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors"
                />
                {searchTerm && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchTerm('');
                      searchInputRef.current?.focus();
                    }}
                    className="absolute right-2.5 p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-full hover:bg-gray-100 dark:hover:bg-[#252538]"
                    title="Clear search"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
              <div className="flex items-center justify-between mt-1.5 px-1 text-[11px] text-gray-500 dark:text-gray-400">
                <span>
                  {filteredTemplates.length}{' '}
                  {filteredTemplates.length === 1 ? 'template' : 'templates'} found
                </span>
                {searchTerm && (
                  <span className="text-primary font-medium">
                    Filtering by &ldquo;{searchTerm}&rdquo;
                  </span>
                )}
              </div>
            </div>

            {/* Template List */}
            <div className="overflow-y-auto flex-1 p-1.5 divide-y divide-gray-50 dark:divide-[#2B2B40]/40">
              {filteredTemplates.length > 0 ? (
                filteredTemplates.map((tpl) => {
                  const isSelected = tpl.id === selectedTemplateId;
                  return (
                    <div
                      key={tpl.id}
                      onClick={() => handleSelect(tpl.id)}
                      className={`p-2.5 rounded-lg cursor-pointer transition-all flex flex-col gap-1.5 select-none ${
                        isSelected
                          ? 'bg-primary/10 border border-primary/30 dark:bg-primary/20 dark:border-primary/40'
                          : 'hover:bg-gray-50 dark:hover:bg-[#252538] border border-transparent'
                      }`}
                      role="option"
                      aria-selected={isSelected}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          {isSelected ? (
                            <div className="w-4 h-4 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
                              <Check className="w-2.5 h-2.5 text-white stroke-[3]" />
                            </div>
                          ) : (
                            <div className="w-4 h-4 rounded-full border border-gray-300 dark:border-gray-600 flex-shrink-0" />
                          )}
                          <span
                            className={`text-sm font-semibold truncate ${
                              isSelected
                                ? 'text-primary dark:text-primary-300'
                                : 'text-gray-800 dark:text-gray-200'
                            }`}
                          >
                            {tpl.name}
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          {getCategoryBadge(tpl.category, tpl.isCustom)}
                          {tpl.channel && tpl.channel !== 'all' && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 dark:bg-[#13131A] text-gray-500 uppercase tracking-wide">
                              {tpl.channel}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Subject or snippet preview */}
                      {tpl.subjectTemplate && (
                        <p className="text-xs text-gray-500 dark:text-gray-400 truncate pl-6">
                          <span className="font-medium text-gray-600 dark:text-gray-300">Subject: </span>
                          {tpl.subjectTemplate}
                        </p>
                      )}
                      {tpl.bodyTemplate && (
                        <p className="text-[11px] text-gray-400 dark:text-gray-500 truncate pl-6">
                          {tpl.bodyTemplate.replace(/\n+/g, ' ')}
                        </p>
                      )}
                    </div>
                  );
                })
              ) : (
                <div className="py-8 px-4 text-center">
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-300">
                    No matching templates found
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    Try searching with a different keyword or select another category above.
                  </p>
                </div>
              )}
            </div>
          </div>,
          document.body
        )}
    </div>
  );
};

export default ClaimTemplateSearchableSelect;
