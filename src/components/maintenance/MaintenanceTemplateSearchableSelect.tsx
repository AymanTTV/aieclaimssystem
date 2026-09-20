// src/components/maintenance/MaintenanceTemplateSearchableSelect.tsx
import React, { useState, useRef, useEffect, useLayoutEffect, useCallback } from 'react';
import ReactDOM from 'react-dom';
import { 
  Search, 
  ChevronDown, 
  Check, 
  X, 
  MessageCircle, 
  Mail, 
  User, 
  Wrench,
  FileText
} from 'lucide-react';
import { 
  MaintenanceTemplateOption, 
  MaintenanceChannelMode, 
  MaintenanceRecipientType 
} from '../../utils/maintenanceCommunication';

export interface MaintenanceTemplateSearchableSelectProps {
  templates: MaintenanceTemplateOption[];
  selectedTemplateId: string;
  onSelectTemplate: (template: MaintenanceTemplateOption) => void;
  currentChannel?: MaintenanceChannelMode;
  currentRecipientType?: MaintenanceRecipientType;
  label?: string;
  placeholder?: string;
  disabled?: boolean;
}

interface DropdownPosition {
  top: number;
  left: number;
  width: number;
  openUpwards: boolean;
}

export const MaintenanceTemplateSearchableSelect: React.FC<
  MaintenanceTemplateSearchableSelectProps
> = ({
  templates,
  selectedTemplateId,
  onSelectTemplate,
  currentChannel,
  currentRecipientType,
  label = 'Select Active Template:',
  placeholder = 'Search templates by keyword, channel, or recipient...',
  disabled = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [channelFilter, setChannelFilter] = useState<'all' | 'whatsapp' | 'email'>('all');
  const [recipientFilter, setRecipientFilter] = useState<'all' | 'driver' | 'garage'>('all');
  const [dropdownPosition, setDropdownPosition] = useState<DropdownPosition | null>(null);

  const triggerRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Selected template object
  const selectedTemplate = templates.find((t) => t.id === selectedTemplateId);

  // Update positioning for the portal dropdown
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

  // Handle outside clicks
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

  // Focus search input on open
  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
      return () => clearTimeout(timer);
    } else {
      setSearchTerm('');
      setChannelFilter('all');
      setRecipientFilter('all');
    }
  }, [isOpen]);

  // Keyboard navigation & escape key
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

  // Search & Filter algorithm
  const filteredTemplates = templates.filter((t) => {
    // Strict Maintenance Category Defense:
    // Only category = "Maintenance" is permitted in the Maintenance dropdown list
    const categoryLower = (t.category || '').toLowerCase().trim();
    if (categoryLower !== 'maintenance') {
      return false;
    }
    const lowerName = t.name.toLowerCase();
    if (
      lowerName.startsWith('[finance]') ||
      lowerName.startsWith('[rental]') ||
      lowerName.startsWith('[claim]') ||
      lowerName.startsWith('[invoice]') ||
      lowerName.startsWith('[custom]') ||
      lowerName.startsWith('[bulk email]')
    ) {
      return false;
    }

    // Channel filter
    if (channelFilter !== 'all' && t.channel !== channelFilter) {
      return false;
    }
    // Recipient filter
    if (recipientFilter !== 'all' && t.recipientType !== recipientFilter) {
      return false;
    }

    if (!searchTerm.trim()) return true;

    const queryTerms = searchTerm.toLowerCase().trim().split(/\s+/);
    const searchableText = [
      t.name,
      t.channel,
      t.recipientType,
      t.category || 'maintenance',
      t.recipientType === 'driver' ? 'driver customer client' : 'garage supplier service center vendor',
      t.subjectTemplate || '',
      t.bodyTemplate || '',
    ]
      .join(' ')
      .toLowerCase();

    return queryTerms.every((term) => searchableText.includes(term));
  });

  const handleSelect = (tmpl: MaintenanceTemplateOption) => {
    onSelectTemplate(tmpl);
    setIsOpen(false);
  };

  // Helper badge renderers
  const renderChannelBadge = (channel: MaintenanceChannelMode, compact = false) => {
    if (channel === 'whatsapp') {
      return (
        <span
          className={`inline-flex items-center gap-1 font-semibold rounded-md border text-emerald-800 bg-emerald-50 border-emerald-200 ${
            compact ? 'px-1.5 py-0.5 text-[10px]' : 'px-2 py-0.5 text-[11px]'
          }`}
        >
          <MessageCircle className="w-3 h-3 text-emerald-600 shrink-0" />
          WhatsApp
        </span>
      );
    }
    return (
      <span
        className={`inline-flex items-center gap-1 font-semibold rounded-md border text-sky-800 bg-sky-50 border-sky-200 ${
          compact ? 'px-1.5 py-0.5 text-[10px]' : 'px-2 py-0.5 text-[11px]'
        }`}
      >
        <Mail className="w-3 h-3 text-sky-600 shrink-0" />
        Email
      </span>
    );
  };

  const renderRecipientBadge = (recipient: MaintenanceRecipientType, compact = false) => {
    if (recipient === 'driver') {
      return (
        <span
          className={`inline-flex items-center gap-1 font-medium rounded-md border text-blue-800 bg-blue-50 border-blue-200 ${
            compact ? 'px-1.5 py-0.5 text-[10px]' : 'px-2 py-0.5 text-[11px]'
          }`}
        >
          <User className="w-3 h-3 text-blue-600 shrink-0" />
          Driver
        </span>
      );
    }
    return (
      <span
        className={`inline-flex items-center gap-1 font-medium rounded-md border text-amber-800 bg-amber-50 border-amber-200 ${
          compact ? 'px-1.5 py-0.5 text-[10px]' : 'px-2 py-0.5 text-[11px]'
        }`}
      >
        <Wrench className="w-3 h-3 text-amber-600 shrink-0" />
        Garage
      </span>
    );
  };

  return (
    <div className="space-y-1.5 w-full">
      {label && (
        <div className="flex items-center justify-between">
          <label className="block text-xs font-semibold text-gray-700">
            {label}
          </label>
          <span className="text-[11px] text-gray-500">
            {templates.length} template{templates.length === 1 ? '' : 's'} available
          </span>
        </div>
      )}

      {/* Trigger Control */}
      <div
        ref={triggerRef}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className={`w-full min-h-[42px] bg-white border rounded-xl px-3 py-2 text-xs flex items-center justify-between gap-2 transition-all select-none cursor-pointer ${
          disabled
            ? 'bg-gray-100 border-gray-200 text-gray-400 cursor-not-allowed'
            : isOpen
            ? 'border-indigo-500 ring-2 ring-indigo-500/20 shadow-xs'
            : 'border-gray-300 hover:border-indigo-400 hover:bg-gray-50/50'
        }`}
      >
        {selectedTemplate ? (
          <div className="flex items-center gap-2 min-w-0 flex-1 overflow-hidden">
            <div className="shrink-0 flex items-center gap-1.5">
              {renderChannelBadge(selectedTemplate.channel, true)}
              {renderRecipientBadge(selectedTemplate.recipientType, true)}
            </div>
            <span className="font-semibold text-gray-900 truncate">
              {selectedTemplate.name}
            </span>
          </div>
        ) : (
          <span className="text-gray-400 font-normal truncate">{placeholder}</span>
        )}

        <div className="flex items-center gap-1.5 shrink-0 text-gray-400">
          <ChevronDown
            className={`w-4 h-4 transition-transform duration-200 ${
              isOpen ? 'rotate-180 text-indigo-600' : ''
            }`}
          />
        </div>
      </div>

      {/* Dropdown Portal */}
      {isOpen &&
        dropdownPosition &&
        ReactDOM.createPortal(
          <div
            ref={dropdownRef}
            style={{
              position: 'fixed',
              top: dropdownPosition.openUpwards ? undefined : dropdownPosition.top,
              bottom: dropdownPosition.openUpwards
                ? window.innerHeight - dropdownPosition.top
                : undefined,
              left: dropdownPosition.left,
              width: dropdownPosition.width,
              zIndex: 99999,
            }}
            className="bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden flex flex-col max-h-[440px] animate-in fade-in zoom-in-95 duration-150"
          >
            {/* SEARCH INPUT BAR */}
            <div className="p-2.5 bg-gray-50 border-b border-gray-200 space-y-2">
              <div className="relative">
                <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Type to filter templates (e.g. reminder, booking, garage)..."
                  className="w-full bg-white border border-gray-300 rounded-xl pl-9 pr-8 py-2 text-xs text-gray-900 placeholder:text-gray-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 font-medium"
                />
                {searchTerm && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchTerm('');
                      searchInputRef.current?.focus();
                    }}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-0.5 rounded-full hover:bg-gray-100 cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* QUICK FILTER PILLS */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 scrollbar-none text-[11px]">
                <button
                  type="button"
                  onClick={() => {
                    setChannelFilter('all');
                    setRecipientFilter('all');
                  }}
                  className={`px-2 py-0.5 rounded-lg font-medium transition-colors shrink-0 cursor-pointer ${
                    channelFilter === 'all' && recipientFilter === 'all'
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-100'
                  }`}
                >
                  All ({templates.length})
                </button>

                <button
                  type="button"
                  onClick={() => setChannelFilter((prev) => (prev === 'whatsapp' ? 'all' : 'whatsapp'))}
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg font-medium transition-colors shrink-0 cursor-pointer ${
                    channelFilter === 'whatsapp'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'bg-white text-emerald-800 border border-emerald-200 hover:bg-emerald-50'
                  }`}
                >
                  <MessageCircle className="w-3 h-3" />
                  WhatsApp ({templates.filter((t) => t.channel === 'whatsapp').length})
                </button>

                <button
                  type="button"
                  onClick={() => setChannelFilter((prev) => (prev === 'email' ? 'all' : 'email'))}
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg font-medium transition-colors shrink-0 cursor-pointer ${
                    channelFilter === 'email'
                      ? 'bg-sky-600 text-white shadow-xs'
                      : 'bg-white text-sky-800 border border-sky-200 hover:bg-sky-50'
                  }`}
                >
                  <Mail className="w-3 h-3" />
                  Email ({templates.filter((t) => t.channel === 'email').length})
                </button>

                <div className="w-px h-3.5 bg-gray-300 mx-0.5 shrink-0" />

                <button
                  type="button"
                  onClick={() => setRecipientFilter((prev) => (prev === 'driver' ? 'all' : 'driver'))}
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg font-medium transition-colors shrink-0 cursor-pointer ${
                    recipientFilter === 'driver'
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'bg-white text-blue-800 border border-blue-200 hover:bg-blue-50'
                  }`}
                >
                  <User className="w-3 h-3" />
                  Driver ({templates.filter((t) => t.recipientType === 'driver').length})
                </button>

                <button
                  type="button"
                  onClick={() => setRecipientFilter((prev) => (prev === 'garage' ? 'all' : 'garage'))}
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg font-medium transition-colors shrink-0 cursor-pointer ${
                    recipientFilter === 'garage'
                      ? 'bg-amber-600 text-white shadow-xs'
                      : 'bg-white text-amber-800 border border-amber-200 hover:bg-amber-50'
                  }`}
                >
                  <Wrench className="w-3 h-3" />
                  Garage ({templates.filter((t) => t.recipientType === 'garage').length})
                </button>
              </div>
            </div>

            {/* TEMPLATES LIST */}
            <div className="overflow-y-auto flex-1 p-1.5 divide-y divide-gray-100">
              {filteredTemplates.length > 0 ? (
                filteredTemplates.map((template) => {
                  const isSelected = template.id === selectedTemplateId;
                  const isContextMatch =
                    (currentRecipientType ? template.recipientType === currentRecipientType : true) &&
                    (currentChannel ? template.channel === currentChannel : true);

                  return (
                    <div
                      key={template.id}
                      onClick={() => handleSelect(template)}
                      className={`p-2.5 rounded-xl transition-all cursor-pointer flex items-start justify-between gap-3 ${
                        isSelected
                          ? 'bg-indigo-50/90 text-indigo-950 border border-indigo-200 shadow-xs'
                          : 'hover:bg-gray-50 text-gray-800 border border-transparent'
                      }`}
                    >
                      <div className="space-y-1 min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-xs text-gray-900 leading-snug">
                            {template.name}
                          </span>
                          <span className="text-[10px] font-semibold text-amber-700 bg-amber-50 border border-amber-200/70 px-1.5 py-0.2 rounded">
                            Maintenance
                          </span>
                          {renderChannelBadge(template.channel, true)}
                          {renderRecipientBadge(template.recipientType, true)}
                          {isContextMatch && !isSelected && (
                            <span className="text-[10px] font-semibold text-indigo-600 bg-indigo-50 border border-indigo-200/60 px-1.5 py-0.2 rounded">
                              Matches Selection
                            </span>
                          )}
                        </div>

                        {template.subjectTemplate && (
                          <p className="text-[11px] text-gray-600 truncate font-mono">
                            <span className="font-semibold text-gray-500">Subject:</span>{' '}
                            {template.subjectTemplate}
                          </p>
                        )}

                        <p className="text-[11px] text-gray-500 line-clamp-2 leading-relaxed">
                          {template.bodyTemplate.replace(/[\n\r]+/g, ' ').slice(0, 140)}...
                        </p>
                      </div>

                      <div className="shrink-0 pt-0.5">
                        {isSelected ? (
                          <div className="w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center shadow-xs">
                            <Check className="w-3 h-3 stroke-[3]" />
                          </div>
                        ) : (
                          <div className="w-5 h-5 rounded-full border border-gray-300 hover:border-indigo-400 flex items-center justify-center text-transparent hover:text-indigo-400">
                            <FileText className="w-3 h-3" />
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="py-8 px-4 text-center space-y-2">
                  <Search className="w-6 h-6 text-gray-300 mx-auto" />
                  <p className="text-xs font-semibold text-gray-700">
                    No communication templates found
                  </p>
                  <p className="text-[11px] text-gray-400 max-w-xs mx-auto">
                    No templates match "{searchTerm}". Try clearing your search keyword or selecting a different filter.
                  </p>
                  {(searchTerm || channelFilter !== 'all' || recipientFilter !== 'all') && (
                    <button
                      type="button"
                      onClick={() => {
                        setSearchTerm('');
                        setChannelFilter('all');
                        setRecipientFilter('all');
                      }}
                      className="mt-2 text-xs font-semibold text-indigo-600 hover:text-indigo-800 underline cursor-pointer"
                    >
                      Clear filters
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* FOOTER SUMMARY */}
            <div className="px-3 py-2 bg-gray-50 border-t border-gray-200 flex items-center justify-between text-[11px] text-gray-500">
              <span>
                Showing {filteredTemplates.length} of {templates.length} templates
              </span>
              <span className="text-[10px] text-gray-400">
                Selecting a template immediately refreshes message preview
              </span>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
};

export default MaintenanceTemplateSearchableSelect;
