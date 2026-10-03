// src/components/company/TcEditorSelector.tsx
// ============================================================================
// PART 3: UI SELECTOR COMPONENT & RESOLUTION ENGINE
// ============================================================================

import React from 'react';
import { SYSTEM_PAGES, normalizeScopeId, normalizeSubDocId } from '../../utils/systemPagesConfig';

export interface ScopeAndDocumentSelectorProps {
  selectedScope: string;
  onScopeChange: (scope: string) => void;
  selectedSubDoc: string;
  onSubDocChange: (subDoc: string) => void;
  className?: string;
}

export const ScopeAndDocumentSelector: React.FC<ScopeAndDocumentSelectorProps> = ({
  selectedScope,
  onScopeChange,
  selectedSubDoc,
  onSubDocChange,
  className = '',
}) => {
  const normalizedScope = normalizeScopeId(selectedScope);
  const currentPageConfig =
    SYSTEM_PAGES.find((page) => page.id === normalizedScope) ||
    SYSTEM_PAGES[0];
  const availableSubDocs = currentPageConfig?.subDocuments || [];

  const handleScopeSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newScopeId = e.target.value;
    onScopeChange(newScopeId);
    onSubDocChange('ALL');
  };

  return (
    <div className={`tc-scope-selector space-y-4 p-4 bg-white border border-gray-200 rounded-lg shadow-sm ${className}`}>
      {/* Scope Dropdown #1 */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-1">
          1. Document / Page Scope
        </label>
        <select
          value={normalizedScope}
          onChange={handleScopeSelect}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm bg-white"
        >
          {SYSTEM_PAGES.map((page) => (
            <option key={page.id} value={page.id}>
              {page.label}
            </option>
          ))}
        </select>
        {currentPageConfig && (
          <p className="mt-1 text-xs text-gray-500">{currentPageConfig.description}</p>
        )}
      </div>

      {/* Sub-Document Dropdown #2 (Conditional) */}
      {availableSubDocs.length > 0 && (
        <div className="pt-3 border-t border-gray-100">
          <label className="block text-sm font-semibold text-gray-700 mb-1">
            2. Specific Document Type (Optional)
          </label>
          <select
            value={normalizeSubDocId(selectedSubDoc)}
            onChange={(e) => onSubDocChange(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm bg-white"
          >
            <option value="ALL">All Documents on Page (Default)</option>
            {availableSubDocs.map((subDoc) => (
              <option key={subDoc.id} value={subDoc.id}>
                {subDoc.label}
              </option>
            ))}
          </select>
          <p className="mt-1 text-xs text-gray-500">
            {normalizeSubDocId(selectedSubDoc) === 'ALL'
              ? `Applies this T&C rule to every document generated under ${currentPageConfig.label}.`
              : `Applies strictly when generating the selected document type.`}
          </p>
        </div>
      )}
    </div>
  );
};

export default ScopeAndDocumentSelector;
