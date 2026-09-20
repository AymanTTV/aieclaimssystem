// src/components/rentals/BulkEmailTemplateSearchableSelect.tsx
import React, { useState, useRef, useEffect, useLayoutEffect, useCallback } from 'react';
import ReactDOM from 'react-dom';
import {
  Search,
  ChevronDown,
  Check,
  X,
  Mail,
  Edit3,
  Plus,
  Sparkles,
  Calendar,
  Clock,
  FileText
} from 'lucide-react';
import { BulkEmailTemplate } from '../../jobs/mondayAutoEmailJob';

export interface BulkEmailTemplateSearchableSelectProps {
  templates: BulkEmailTemplate[];
  selectedTemplateId: string;
  onSelectTemplate: (template: BulkEmailTemplate) => void;
  onEditTemplate?: (template: BulkEmailTemplate) => void;
  onCreateNewTemplate?: () => void;
  label?: string;
  sublabel?: string;
  typeBadge?: 'Weekly' | 'Daily' | 'Bulk';
  disabled?: boolean;
}

interface DropdownPosition {
  top: number;
  left: number;
  width: number;
  openUpwards: boolean;
}

export const BulkEmailTemplateSearchableSelect: React.FC<BulkEmailTemplateSearchableSelectProps> = ({
  templates,
  selectedTemplateId,
  onSelectTemplate,
  onEditTemplate,
  onCreateNewTemplate,
  label,
  sublabel,
  typeBadge,
  disabled = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [dropdownPosition, setDropdownPosition] = useState<DropdownPosition | null>(null);

  const triggerRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Selected template object
  const selectedTemplate = templates.find(t => t.id === selectedTemplateId) || templates[0];

  // Update positioning for the portal dropdown
  const updatePosition = useCallback(() => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const dropdownHeight = 340;
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
      const handleScrollOrResize = () => updatePosition();
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

    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        triggerRef.current &&
        !triggerRef.current.contains(target) &&
        dropdownRef.current &&
        !dropdownRef.current.contains(target)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  // Focus search input on open
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
    } else {
      setSearchTerm('');
    }
  }, [isOpen]);

  // Filter templates based on search term
  const filteredTemplates = templates.filter(t => {
    if (!searchTerm.trim()) return true;
    const q = searchTerm.toLowerCase();
    const nameMatch = (t.name || '').toLowerCase().includes(q);
    const subjectMatch = (t.subjectTemplate || '').toLowerCase().includes(q);
    const bodyMatch = (t.bodyTemplate || '').toLowerCase().includes(q);
    return nameMatch || subjectMatch || bodyMatch;
  });

  const getBadgeIcon = () => {
    if (typeBadge === 'Weekly') return <Calendar className="w-3.5 h-3.5 text-indigo-600" />;
    if (typeBadge === 'Daily') return <Clock className="w-3.5 h-3.5 text-blue-600" />;
    return <Mail className="w-3.5 h-3.5 text-violet-600" />;
  };

  return (
    <div className="w-full">
      {/* Header Label Row */}
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-1.5">
          {getBadgeIcon()}
          {label && <span className="text-xs font-bold text-slate-200">{label}</span>}
          {sublabel && <span className="text-[10px] text-slate-400 font-medium">({sublabel})</span>}
        </div>

        {selectedTemplate && onEditTemplate && (
          <button
            type="button"
            onClick={() => onEditTemplate(selectedTemplate)}
            className="text-[11px] font-bold text-indigo-300 hover:text-white flex items-center gap-1 py-0.5 px-2 rounded-md hover:bg-indigo-500/20 transition cursor-pointer"
            title="Edit this template layout and subject"
          >
            <Edit3 className="w-3 h-3" />
            Edit Template
          </button>
        )}
      </div>

      {/* Trigger Box */}
      <div
        ref={triggerRef}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className={`w-full min-h-[44px] px-3 py-2 bg-[#131427] border rounded-xl flex items-center justify-between gap-2 transition select-none ${
          disabled
            ? 'opacity-50 bg-[#0f1020] cursor-not-allowed border-white/10'
            : isOpen
            ? 'border-indigo-500 ring-2 ring-indigo-500/30 shadow-md cursor-pointer'
            : 'border-white/15 hover:border-indigo-400/50 hover:bg-[#181a33] cursor-pointer shadow-sm'
        }`}
      >
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          <div className="p-1.5 bg-indigo-500/20 text-indigo-300 rounded-lg shrink-0">
            <Mail className="w-4 h-4" />
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-white truncate">
                {selectedTemplate ? selectedTemplate.name : 'Choose template...'}
              </span>
              <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-md bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 shrink-0">
                Bulk Email
              </span>
            </div>
            {selectedTemplate && selectedTemplate.subjectTemplate && (
              <p className="text-[11px] text-slate-300 truncate mt-0.5">
                <span className="font-semibold text-indigo-300">Subj:</span> {selectedTemplate.subjectTemplate}
              </p>
            )}
          </div>
        </div>

        <ChevronDown
          className={`w-4 h-4 text-slate-400 shrink-0 transition-transform duration-200 ${
            isOpen ? 'rotate-180 text-indigo-400' : ''
          }`}
        />
      </div>

      {/* Portal Dropdown Menu */}
      {isOpen &&
        dropdownPosition &&
        ReactDOM.createPortal(
          <div
            ref={dropdownRef}
            style={{
              position: 'fixed',
              top: dropdownPosition.openUpwards ? 'auto' : `${dropdownPosition.top}px`,
              bottom: dropdownPosition.openUpwards
                ? `${window.innerHeight - dropdownPosition.top}px`
                : 'auto',
              left: `${dropdownPosition.left}px`,
              width: `${dropdownPosition.width}px`,
              zIndex: 99999,
            }}
            className="bg-[#171836] border border-white/20 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[380px] animate-in fade-in zoom-in-95 duration-100 text-white"
          >
            {/* Search Input Box */}
            <div className="p-2.5 border-b border-white/10 bg-[#121326]">
              <div className="relative flex items-center">
                <Search className="w-3.5 h-3.5 absolute left-3 text-slate-400 pointer-events-none" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  placeholder="Search template by name or subject..."
                  className="w-full pl-8.5 pr-8 py-1.5 text-xs bg-[#0b0c1a] border border-white/20 text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-400 font-medium placeholder-slate-400"
                />
                {searchTerm && (
                  <button
                    type="button"
                    onClick={() => setSearchTerm('')}
                    className="absolute right-2.5 text-slate-400 hover:text-white p-0.5 cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
              <div className="flex items-center justify-between mt-1.5 px-1">
                <span className="text-[10px] text-slate-400 font-medium">
                  Showing {filteredTemplates.length} of {templates.length} Bulk Email templates
                </span>
                <span className="text-[10px] text-indigo-300 font-bold flex items-center gap-1">
                  <Sparkles className="w-2.5 h-2.5" /> Search-as-you-type
                </span>
              </div>
            </div>

            {/* List of Templates */}
            <div className="overflow-y-auto flex-1 p-1 divide-y divide-white/5">
              {filteredTemplates.length === 0 ? (
                <div className="p-6 text-center">
                  <FileText className="w-8 h-8 text-slate-500 mx-auto mb-2" />
                  <p className="text-xs font-bold text-slate-200">No templates found</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    No Bulk Email templates match &ldquo;{searchTerm}&rdquo;
                  </p>
                </div>
              ) : (
                filteredTemplates.map(t => {
                  const isSelected = t.id === selectedTemplateId;
                  return (
                    <div
                      key={t.id}
                      onClick={() => {
                        onSelectTemplate(t);
                        setIsOpen(false);
                      }}
                      className={`group p-2.5 rounded-xl cursor-pointer transition flex items-start justify-between gap-3 ${
                        isSelected
                          ? 'bg-indigo-600/30 border border-indigo-500/50 text-white'
                          : 'hover:bg-white/5 text-slate-200'
                      }`}
                    >
                      <div className="flex items-start gap-2.5 min-w-0 flex-1">
                        <div
                          className={`p-1.5 rounded-lg shrink-0 mt-0.5 ${
                            isSelected
                              ? 'bg-indigo-600 text-white'
                              : 'bg-white/10 text-slate-300 group-hover:bg-indigo-600 group-hover:text-white'
                          }`}
                        >
                          <Mail className="w-3.5 h-3.5" />
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span
                              className={`text-xs font-bold truncate ${
                                isSelected ? 'text-white' : 'text-slate-100'
                              }`}
                            >
                              {t.name}
                            </span>
                            <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 shrink-0">
                              Bulk Email
                            </span>
                          </div>

                          <p className="text-[11px] text-slate-300 truncate mt-0.5">
                            <span className="font-semibold text-indigo-300">Subject:</span>{' '}
                            {t.subjectTemplate || '(No subject)'}
                          </p>

                          <p className="text-[10px] text-slate-400 line-clamp-1 mt-0.5">
                            {t.bodyTemplate ? t.bodyTemplate.slice(0, 100) : '(Empty body)'}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 shrink-0 self-center">
                        {isSelected && (
                          <div className="p-1 bg-indigo-600 text-white rounded-full">
                            <Check className="w-3 h-3" />
                          </div>
                        )}
                        {onEditTemplate && (
                          <button
                            type="button"
                            onClick={e => {
                              e.stopPropagation();
                              onEditTemplate(t);
                              setIsOpen(false);
                            }}
                            className="opacity-0 group-hover:opacity-100 p-1.5 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition cursor-pointer"
                            title="Edit this template"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Footer / Create New Option */}
            {onCreateNewTemplate && (
              <div className="p-2 border-t border-white/10 bg-[#121326] flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => {
                    onCreateNewTemplate();
                    setIsOpen(false);
                  }}
                  className="w-full flex items-center justify-center gap-1.5 py-2 px-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl shadow-sm transition cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Create New Bulk Email Template
                </button>
              </div>
            )}
          </div>,
          document.body
        )}
    </div>
  );
};
