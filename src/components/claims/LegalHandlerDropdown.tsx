// src/components/claims/LegalHandlerDropdown.tsx

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ChevronDown, Plus, Search, Edit, Trash2 } from 'lucide-react';
import clsx from 'clsx';
import { LegalHandler } from '../../types/legalHandler'; // Ensure this path is correct
import toast from 'react-hot-toast';
import { fetchLegalHandlers, searchLegalHandlers, deleteLegalHandler } from '../../utils/legalHandlers'; // Ensure this path is correct
import Modal from '../ui/Modal'; // Ensure this path is correct
import LegalHandlerForm from './LegalHandlerForm'; // Ensure this path is correct

interface LegalHandlerDropdownProps {
  value: LegalHandler | null; // Value is now the LegalHandler object or null
  onChange: (handler: LegalHandler | null) => void;
  name?: string; // name is optional now as useController provides it
  error?: string;
  disabled?: boolean;
}

const LegalHandlerDropdown: React.FC<LegalHandlerDropdownProps> = ({
  value,
  onChange,
  name,
  error,
  disabled,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [searchResults, setSearchResults] = useState<LegalHandler[]>([]);
  const [loading, setLoading] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingHandler, setEditingHandler] = useState<LegalHandler | null>(null);
  const [deletingHandler, setDeletingHandler] = useState<LegalHandler | null>(null);

  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const loadHandlers = useCallback(async (queryText = '') => {
    setLoading(true);
    try {
      const handlers = queryText
        ? await searchLegalHandlers(queryText)
        : await fetchLegalHandlers();
      setSearchResults(handlers);
    } catch (err) {
      console.error('Failed to fetch legal handlers:', err);
      toast.error('Failed to load legal handlers.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Load handlers initially
    loadHandlers();
  }, [loadHandlers]);

  // NEW useEffect to set inputValue when 'value' prop changes
  useEffect(() => {
    if (value) {
      setInputValue(value.name);
    } else {
      setInputValue('');
    }
  }, [value]); // Depend on 'value' prop

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const text = e.target.value;
    setInputValue(text);
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    searchTimeoutRef.current = setTimeout(() => {
      loadHandlers(text);
    }, 300);
  };

  const handleSelectHandler = (handler: LegalHandler) => {
    onChange(handler);
    setInputValue(handler.name);
    setIsOpen(false);
  };

  const handleClearSelection = () => {
    onChange(null);
    setInputValue('');
    setIsOpen(false);
    loadHandlers(); // Reload all handlers after clearing
  };

  const handleCreateSuccess = (newHandler: LegalHandler) => {
    setShowCreateForm(false);
    loadHandlers(); // Reload list to include new handler
    onChange(newHandler); // Select the newly created handler
    setInputValue(newHandler.name);
  };

  const handleEditSuccess = (updatedHandler: LegalHandler) => {
    setEditingHandler(null);
    loadHandlers(); // Reload list to reflect changes
    if (value && value.id === updatedHandler.id) {
      onChange(updatedHandler); // Update the selected value if it was the one edited
      setInputValue(updatedHandler.name);
    } else if (!value) { // If nothing was selected previously, select the updated one.
      onChange(updatedHandler);
      setInputValue(updatedHandler.name);
    }
  };


  const handleDelete = async () => {
    if (!deletingHandler) return;
    try {
      await deleteLegalHandler(deletingHandler.id);
      toast.success(`${deletingHandler.name} deleted successfully.`);
      setDeletingHandler(null);
      loadHandlers(); // Reload list after deletion
      if (value && value.id === deletingHandler.id) {
        onChange(null); // Clear selection if the deleted handler was selected
        setInputValue('');
      }
    } catch (err) {
      console.error('Failed to delete legal handler:', err);
      toast.error('Failed to delete legal handler.');
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <div className="relative">
        <input
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onFocus={() => setIsOpen(true)}
          placeholder="Select or search legal handler"
          className={clsx(
            'block w-full pl-10 pr-10 py-2 border rounded-md shadow-sm focus:ring-primary focus:border-primary sm:text-sm',
            { 'border-red-500': error, 'opacity-70 cursor-not-allowed': disabled }
          )}
          disabled={disabled}
          aria-invalid={error ? 'true' : 'false'}
          aria-haspopup="listbox"
          aria-expanded={isOpen}
          autoComplete="off" // Prevent browser autocomplete
        />
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
        {value && inputValue && (
          <button
            type="button" // Explicitly set to "button"
            onClick={handleClearSelection}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
            disabled={disabled}
          >
            &times;
          </button>
        )}
      </div>

      {error && <p className="mt-1 text-sm text-red-600">{error}</p>}

      {isOpen && (
        <div className="absolute z-10 mt-1 w-full bg-white shadow-lg max-h-60 rounded-md py-1 text-base ring-1 ring-black ring-opacity-5 overflow-auto focus:outline-none sm:text-sm">
          {loading ? (
            <div className="py-2 px-3 text-gray-500">Loading...</div>
          ) : searchResults.length === 0 && inputValue ? (
            <div className="py-2 px-3 text-gray-500">No results found.</div>
          ) : (
            searchResults.map((handler) => (
              <div
                key={handler.id}
                onClick={() => handleSelectHandler(handler)}
                className={clsx(
                  'cursor-pointer select-none relative py-2 pl-3 pr-9',
                  value?.id === handler.id ? 'text-white bg-primary' : 'text-gray-900',
                  'hover:bg-primary hover:text-white'
                )}
              >
                <div className="flex items-center justify-between">
                  <span className="block truncate">{handler.name}</span>
                  <div className="flex items-center space-x-2">
                    <button
                      type="button" // Explicitly set to "button"
                      onClick={(e) => {
                        e.stopPropagation(); // Prevent dropdown from closing
                        setEditingHandler(handler);
                        setIsOpen(false); // Close dropdown when opening edit modal
                      }}
                      className={clsx(
                        'text-gray-400 hover:text-gray-600',
                        value?.id === handler.id ? 'text-white hover:text-gray-200' : ''
                      )}
                      title="Edit"
                    >
                      <Edit size={16} />
                    </button>
                    <button
                      type="button" // Explicitly set to "button"
                      onClick={(e) => {
                        e.stopPropagation(); // Prevent dropdown from closing
                        setDeletingHandler(handler);
                        setIsOpen(false); // Close dropdown when opening delete modal
                      }}
                      className={clsx(
                        'text-red-400 hover:text-red-600',
                        value?.id === handler.id ? 'text-red-200 hover:text-red-100' : ''
                      )}
                      title="Delete"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
          <div className="border-t border-gray-200 mt-1 pt-1">
            <button
              type="button" // Explicitly set to "button"
              onClick={() => {
                setShowCreateForm(true);
                setIsOpen(false); // Close dropdown when opening create modal
              }}
              className="flex items-center w-full px-3 py-2 text-primary hover:bg-gray-50 text-sm font-medium rounded-b-md"
            >
              <Plus size={16} className="mr-2" /> Add New Legal Handler
            </button>
          </div>
        </div>
      )}

      {/* Create New Legal Handler Modal */}
      {showCreateForm && (
        <Modal
          isOpen={showCreateForm}
          onClose={() => setShowCreateForm(false)}
          title="Add New Legal Handler"
        >
          <LegalHandlerForm
            onClose={() => setShowCreateForm(false)}
            onSuccess={handleCreateSuccess}
          />
        </Modal>
      )}

      {/* Edit Legal Handler Modal */}
      {editingHandler && (
        <Modal
          isOpen={!!editingHandler}
          onClose={() => setEditingHandler(null)}
          title="Edit Legal Handler"
        >
          <LegalHandlerForm
            legalHandler={editingHandler}
            onClose={() => setEditingHandler(null)}
            onSuccess={handleEditSuccess}
          />
        </Modal>
      )}

      {/* Delete Confirmation Modal */}
      {deletingHandler && (
        <Modal
          isOpen={!!deletingHandler}
          onClose={() => setDeletingHandler(null)}
          title="Delete Legal Handler"
          size="sm"
        >
          <div className="p-4">
            <p className="text-gray-700 mb-4">
              Are you sure you want to delete <span className="font-semibold">{deletingHandler.name}</span>? This action cannot be undone.
            </p>
            <div className="flex justify-end space-x-3">
              <button
                type="button" // Explicitly set to "button"
                onClick={() => setDeletingHandler(null)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="button" // Explicitly set to "button"
                onClick={handleDelete}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700"
              >
                Delete
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default LegalHandlerDropdown;
