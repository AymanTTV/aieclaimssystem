// src/components/rentals/RentalNotesModal.tsx
import React, { useState } from 'react';
import { Rental, RentalNote } from '../../types';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../../context/AuthContext';
import { format, isValid } from 'date-fns';
import { StickyNote, Plus, Pencil, Save, X, Clock, User, Trash2 } from 'lucide-react'; //
import toast from 'react-hot-toast';

interface Props {
  rental: Rental;
  onClose: () => void;
}

const RentalNotesModal: React.FC<Props> = ({ rental, onClose }) => {
  const { user } = useAuth();
  const [newNote, setNewNote] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const safeFormat = (date: any) => {
    try {
      const d = date?.toDate ? date.toDate() : new Date(date);
      return isValid(d) ? format(d, 'dd/MM/yyyy HH:mm') : 'N/A';
    } catch {
      return 'N/A';
    }
  };

  const handleAddNote = async () => {
    if (!newNote.trim() || isSubmitting) return;
    setIsSubmitting(true);
    
    const note: RentalNote = {
      id: `note_${Date.now()}`,
      text: newNote.trim(),
      createdAt: new Date(),
      createdBy: user?.id || 'unknown',
      createdByName: (user as any)?.name || 'Staff'
    };

    try {
      const updatedNotes = [note, ...(rental.notes || [])];
      await updateDoc(doc(db, 'rentals', rental.id), { notes: updatedNotes });
      setNewNote('');
      toast.success('Note saved successfully');
    } catch (error) {
      console.error(error);
      toast.error('Failed to save note');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateNote = async (id: string) => {
    if (!editText.trim()) return;
    
    const updatedNotes = (rental.notes || []).map(n => 
      n.id === id ? { ...n, text: editText.trim(), updatedAt: new Date() } : n
    );
    
    try {
      await updateDoc(doc(db, 'rentals', rental.id), { notes: updatedNotes });
      setEditingId(null);
      toast.success('Note updated');
    } catch (error) {
      toast.error('Failed to update note');
    }
  };

  // ✅ NEW: Handle Delete with Confirmation
  const handleDeleteNote = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this note? This action cannot be undone.')) {
      return;
    }

    try {
      const updatedNotes = (rental.notes || []).filter(n => n.id !== id);
      await updateDoc(doc(db, 'rentals', rental.id), { notes: updatedNotes });
      toast.success('Note deleted successfully');
    } catch (error) {
      console.error(error);
      toast.error('Failed to delete note');
    }
  };

  return (
    <div className="flex flex-col h-full max-h-[80vh]">
      {/* Input Area */}
      <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 mb-6">
        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
          New Internal Note
        </label>
        <textarea
          value={newNote}
          onChange={(e) => setNewNote(e.target.value)}
          placeholder="Add important information about this rental..."
          className="w-full p-3 text-sm border-2 border-gray-200 rounded-lg focus:ring-primary focus:border-primary min-h-[100px] resize-none"
        />
        <div className="flex justify-end mt-2">
          <button
            onClick={handleAddNote}
            disabled={!newNote.trim() || isSubmitting}
            className="flex items-center gap-2 bg-primary text-white px-6 py-2 rounded-lg font-semibold hover:bg-primary-dark disabled:opacity-50 transition-all shadow-sm"
          >
            <Plus className="w-4 h-4" /> 
            {isSubmitting ? 'Saving...' : 'Post Note'}
          </button>
        </div>
      </div>

      {/* History Area */}
      <div className="flex-1 overflow-y-auto pr-2 space-y-4">
        <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest px-1">Note History</h4>
        
        {(rental.notes || []).length === 0 ? (
          <div className="text-center py-12 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
            <StickyNote className="w-12 h-12 text-gray-300 mx-auto mb-2" />
            <p className="text-gray-500 text-sm">No notes have been recorded for this rental.</p>
          </div>
        ) : (
          rental.notes.map((note) => (
            <div key={note.id} className="group bg-white border border-gray-200 rounded-xl p-4 shadow-sm hover:border-primary/30 transition-all">
              <div className="flex justify-between items-start mb-3">
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-2 text-[11px] font-bold text-gray-600">
                    <User className="w-3 h-3 text-primary" />
                    <span>{note.createdByName}</span>
                  </div>
                  <div className="flex items-center gap-2 text-[10px] text-gray-400 font-medium">
                    <Clock className="w-3 h-3" />
                    <span>{safeFormat(note.createdAt)}</span>
                    {note.updatedAt && (
                      <span className="text-primary-600 italic">(Edited)</span>
                    )}
                  </div>
                </div>
                
                {editingId !== note.id && (
                  <div className="flex gap-2">
                    <button 
                      onClick={() => { setEditingId(note.id); setEditText(note.text); }}
                      className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                      title="Edit Note"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    {/* ✅ DELETE BUTTON ADDED HERE */}
                    <button 
                      onClick={() => handleDeleteNote(note.id)}
                      className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                      title="Delete Note"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
              
              {editingId === note.id ? (
                <div className="space-y-3">
                  <textarea
                    value={editText}
                    onChange={(e) => setEditText(e.target.value)}
                    className="w-full p-3 text-sm border-2 border-primary/20 rounded-lg bg-blue-50/30 focus:outline-none"
                    rows={3}
                  />
                  <div className="flex gap-2">
                    <button 
                      onClick={() => handleUpdateNote(note.id)} 
                      className="flex items-center gap-1 text-xs bg-green-600 text-white px-3 py-1.5 rounded-md font-bold"
                    >
                      <Save className="w-3 h-3" /> Save Changes
                    </button>
                    <button 
                      onClick={() => setEditingId(null)} 
                      className="text-xs bg-gray-100 text-gray-600 px-3 py-1.5 rounded-md font-bold hover:bg-gray-200"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
                  {note.text}
                </p>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default RentalNotesModal;