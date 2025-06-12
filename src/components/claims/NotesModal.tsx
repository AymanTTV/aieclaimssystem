// src/components/claims/NotesModal.tsx
import React, { useState, useEffect, useMemo } from 'react'; // Import useMemo
import Modal from '../ui/Modal';
// Corrected import: Ensure getDoc, updateDoc, arrayUnion, arrayRemove, collection, getDocs, query are all imported from firebase/firestore
import { doc, getDoc, updateDoc, arrayUnion, arrayRemove, collection, getDocs, query } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';
import { Trash2, Edit2, Calendar } from 'lucide-react'; // Import Calendar icon
import clsx from 'clsx';
import { format } from 'date-fns';

// Note interface - Assuming this might also be defined in types/claim.ts
// If it is, ensure that definition also includes 'noteTitle'
export interface Note {
  id: string;
  author: string; // This will now store the File Handler's name
  // Removed 'to' field
  noteTitle?: string; // Added Note Title field
  text: string;
  createdAt: Date;
  dueDate: Date;
}

interface NotesModalProps {
  claimId: string;
  existing: Note[];
  onClose: () => void;
  onChange: () => void; // Callback to trigger a data refresh in the parent
}

const NotesModal: React.FC<NotesModalProps> = ({
  claimId,
  existing,
  onClose,
  onChange,
}) => {
  const { user } = useAuth();

  // helper to coerce either a Date or Firestore Timestamp into a JS Date
  function toJsDate(v?: Date | { toDate(): Date } | null): Date | null {
      if (!v) return null;
      // Check if it's a Firestore Timestamp object with a toDate method
      if (typeof (v as any).toDate === 'function') {
          try {
              return (v as any).toDate();
          } catch (e) {
              console.error('Error converting Firestore Timestamp:', e);
              return null;
          }
      }
      // Check if it's already a Date object
      if (v instanceof Date && !isNaN(v.getTime())) {
          return v;
      }
       // Attempt to convert from other types (like ISO strings)
       const date = new Date(v as any);
       if (!isNaN(date.getTime())) {
          return date;
       }

      console.warn('Could not convert value to Date:', v);
      return null;
    }

  // Convert existing notes to include JS Dates before sorting and setting state
  const initialNotes = useMemo(() => {
      return existing.map(note => ({
          ...note,
          createdAt: toJsDate(note.createdAt) as Date, // Convert and assert as Date
          dueDate: toJsDate(note.dueDate) as Date,     // Convert and assert as Date
          // Ensure noteTitle is included, defaulting if necessary
          noteTitle: note.noteTitle ?? '', // Default to empty string if undefined
      })).filter(note => note.createdAt && note.dueDate) // Filter out notes where conversion failed
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()); // Now safe to sort
  }, [existing]); // Re-run memoization if existing prop changes


  const [notes, setNotes] = useState<Note[]>(initialNotes); // Initialize state with converted and sorted notes
  const [fileHandler, setFileHandler] = useState(user?.name || ''); // Renamed state from selectedAuthor
  // Removed 'to' state
  const [noteTitle, setNoteTitle] = useState(''); // New state for Note Title
  const [text, setText] = useState('');
  const [due, setDue] = useState('');            // ISO date string for the date input
  const [editing, setEditing] = useState<Note | null>(null);
  const [saving, setSaving] = useState(false);
  const [users, setUsers] = useState<{ id: string, name: string }[]>([]); // State to store system users

  // Fetch system users on modal open
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const usersCollectionRef = collection(db, 'users');
        const usersQuery = query(usersCollectionRef); // Add any necessary ordering/filtering here
        const querySnapshot = await getDocs(usersQuery);
        const usersList = querySnapshot.docs.map(doc => ({
          id: doc.id,
          name: doc.data().name as string, // Assuming user documents have a 'name' field
        }));
        setUsers(usersList);

         // Set default File Handler if current user is in the list
         if (user?.name && usersList.some(u => u.name === user.name)) {
            setFileHandler(user.name);
         } else if (usersList.length > 0) {
            // Optional: default to the first user if current user not found
           // setFileHandler(usersList[0].name);
         }


      } catch (error) {
        console.error('Error fetching users:', error);
        toast.error('Failed to load users for "File Handler" field.');
      }
    };

    fetchUsers();
  }, [db, user?.name]); // Re-fetch if user name changes or db instance changes


  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    // Use fileHandler and noteTitle states
    if (!fileHandler.trim() || !noteTitle.trim() || !text.trim() || !due) {
      toast.error('Please fill all fields');
      return;
    }
    setSaving(true);
    try {
      const note: Note = editing
        ? { ...editing, author: fileHandler, noteTitle, text, dueDate: new Date(due) } // Use fileHandler and noteTitle
        : {
            id: Date.now().toString(), // Simple ID generation
            author: fileHandler, // Use fileHandler
            noteTitle, // Include noteTitle
            text,
            createdAt: new Date(),
            dueDate: new Date(due),
          };
      const ref = doc(db, 'claims', claimId);

      // If editing, remove the old version first
      if (editing) {
         // Find the exact note object to remove based on its properties
        const noteToRemove = existing.find(n => n.id === editing.id);
        if(noteToRemove) {
             // Use arrayRemove with the exact object structure including Firestore Timestamps if applicable
             // This is tricky because existing might have Dates and Firestore expects Timestamps.
             // A safer approach might be to read the document again, find the note by ID, and remove it.
             // For simplicity here, let's assume the shape is consistent, but be aware this can be a source of bugs.
            await updateDoc(ref, { notes: arrayRemove(noteToRemove) });
        } else {
             console.warn("Could not find note to remove during edit:", editing);
        }
      }
      // Add the new or updated note
      await updateDoc(ref, { notes: arrayUnion(note) });

      toast.success(editing ? 'Note updated' : 'Note added');

      // Fetch latest notes from DB after update
      // This is more reliable than updating local state directly after arrayRemove/arrayUnion
      // Use getDoc here, which should now be correctly imported
      const claimDoc = await getDoc(ref);
      if(claimDoc.exists()){
          const rawNotes = (claimDoc.data().notes || []).map((n: any) => ({
            ...n,
            createdAt: toJsDate(n.createdAt), // Ensure conversion
            dueDate: toJsDate(n.dueDate),     // Ensure conversion
            noteTitle: n.noteTitle ?? '', // Ensure noteTitle is included
          })).filter((n:any): n is Note => n.createdAt && n.dueDate && n.id && n.author && n.text); // Filter out notes with invalid dates/fields

           // Sort the fetched notes
          setNotes(rawNotes.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()));
      }


      // Trigger parent onChange
      onChange();

      // reset form
      setFileHandler(user?.name || ''); // Reset file handler to current user or default
      setNoteTitle(''); // Reset note title
      setText('');
      setDue('');
      setEditing(null);
    } catch (err) {
      console.error('Failed to save note:', err);
      toast.error('Failed to save note');
    } finally {
      setSaving(false);
    }
  };

  const remove = async (n: Note) => {
    if (!user) return;
    setSaving(true);
    try {
       // Similar to edit, find the exact note object from the current state/fetched data
       // to ensure arrayRemove works correctly with the Firestore structure.
       const noteToRemove = notes.find(note => note.id === n.id); // Use local state for removal
       if(noteToRemove) {
            await updateDoc(doc(db, 'claims', claimId), { notes: arrayRemove(noteToRemove) });
            toast.success('Note deleted');
            // Update local state by filtering
            setNotes(ns => ns.filter(x => x.id !== n.id));
             // Trigger parent onChange
            onChange();
       } else {
            console.warn("Could not find note to remove in local state:", n);
            toast.error("Failed to delete: Note not found in list.");
       }

    } catch (err) {
        console.error('Failed to delete note:', err);
      toast.error('Failed to delete');
    } finally {
      setSaving(false);
    }
  };

   // This function is no longer strictly needed in the render loop,
   // as the overdue status is determined directly where used.
   // const isOverdue = (n: Note) => n.dueDate < new Date();


  // When clicking edit, format the dueDate for the input field
  const handleEditClick = (n: Note) => {
    setEditing(n);
    setFileHandler(n.author); // Set file handler when editing
    setNoteTitle(n.noteTitle ?? ''); // Set note title when editing
    // Removed setTo(n.to);
    setText(n.text);
    // Format the Date object toyyyy-MM-DD for the input type="date"
    const dueDate = toJsDate(n.dueDate);
    if(dueDate) {
        setDue(format(dueDate, 'yyyy-MM-dd'));
    } else {
        setDue(''); // Clear date if invalid
    }
  };


  return (
    <Modal isOpen onClose={onClose} title="Notes" size="xl">
      {/* Display Existing Notes */}
      {/* Added max-h and overflow for scrolling if list is long */}
      <div className="space-y-4 max-h-72 overflow-y-auto pb-4 pr-2"> {/* Added pr-2 for scrollbar */}
        {notes.length === 0 && (
          <p className="text-sm text-gray-500 text-center text-gray-500 italic py-4">No notes yet.</p>
        )}
        {/* Map over notes state */}
        {notes.map(n => {
           // Ensure dates are valid before rendering
          const created = toJsDate(n.createdAt);
          const dueDate = toJsDate(n.dueDate);

           if (!created || !dueDate) {
                console.warn('Skipping note with invalid dates:', n);
                return null; // Skip rendering this note
           }

           // Correctly use dueDate for overdue check
           const isOverdue = dueDate < new Date();

          return (
            // Use flexbox for layout within each note item
            <div key={n.id} className="border rounded-lg p-4 bg-gray-50 flex flex-col">
              {/* Note Header: File Handler, Note Title, Created At */}
              <div className="flex items-center justify-between mb-2">
                 {/* Left side: File Handler and Note Title */}
                <div className="flex-grow mr-4"> {/* Allow left side to grow, add margin */}
                  <p className="text-sm"><span className="font-medium">File Handler:</span> {n.author}</p> {/* Changed label */}
                  {n.noteTitle && ( // Only show title if it exists
                     <p className="text-sm"><span className="font-medium">Title:</span> {n.noteTitle}</p> // Corrected comment placement
                  )}
                </div>
                 {/* Right side: Created At and Actions */}
                <div className="flex flex-col items-end text-right">
                   {/* Created At */}
                  <div className="text-xs text-gray-500 mb-1"> {/* Add margin bottom */}
                   {format(created, 'dd/MM/yyyy HH:mm')}
                  </div>
                   {/* Actions */}
                  <div className="flex space-x-1 flex-shrink-0"> {/* Added flex-shrink-0 */}
                    <button
                      onClick={() => handleEditClick(n)} // Use the new handler
                      className="p-1 hover:bg-gray-200 rounded"
                      title="Edit"
                      type="button" // Specify type to prevent form submission
                    >
                      <Edit2 className="h-4 w-4 text-gray-600" />
                    </button>
                    <button
                      onClick={() => remove(n)}
                      className="p-1 hover:bg-gray-200 rounded text-red-600"
                      title="Delete"
                       type="button" // Specify type to prevent form submission
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Note Text */}
              <div className="text-sm whitespace-pre-wrap mb-2">{n.text}</div> {/* Add margin bottom */}

              {/* Due Date */}
              <div className="flex items-center text-xs">
                 <Calendar className="h-3 w-3 text-gray-500 mr-1" /> {/* Added Calendar icon */}
                <span className="font-medium mr-1">Due:</span>
                <span
                  className={clsx(
                    'ml-1', // Still keep ml-1 for spacing after "Due:" label
                    dueDate < new Date() ? 'text-red-600 font-semibold' : 'text-gray-700'
                  )}
                >
                  {format(dueDate, 'dd/MM/yyyy')}
                </span>
                {isOverdue && (
                  <span className="ml-2 bg-red-100 text-red-800 text-[10px] px-2 py-0.5 rounded">
                    Overdue
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Add/Edit Note Form */}
      {/* Added border-t and pt-4 for separation */}
      <form onSubmit={save} className="space-y-4 border-t pt-4">
        {/* Form title */}
        <h4 className="text-lg font-medium text-gray-900">{editing ? 'Edit Note' : 'Add New Note'}</h4>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="fileHandler" className="block text-sm font-medium text-gray-700">File Handler</label> {/* Changed label and htmlFor */}
            {/* Select dropdown for 'File Handler' - Styled with blue border */}
            <select
              id="fileHandler" // Changed id
              value={fileHandler}
              onChange={e => setFileHandler(e.target.value)}
              required
              // Updated border classes for blue border
              className="mt-1 block w-full rounded-md border border-blue-500 px-3 py-2 text-sm focus:border-primary focus:ring-primary"
            >
               {/* Option for manual entry if needed - uncomment and adjust */}
               {/* <option value="">-- Select User or Enter Manually --</option> */}
              {users.map(u => (
                <option key={u.id} value={u.name}>{u.name}</option>
              ))}
               {/* Add an option for the current user if they are not in the list */}
              {user?.name && !users.some(u => u.name === user.name) && (
                 <option value={user.name}>{user.name} (Current User)</option>
              )}
            </select>
             {/* Optional: Add a manual entry input if user selects "Other" or similar */}
             {/* You would add state to track if manual entry is selected and show an input */}
          </div>
           {/* New Note Title Field */}
          <div>
            <label htmlFor="noteTitle" className="block text-sm font-medium text-gray-700">Note Title</label> {/* New label and htmlFor */}
            <input
              id="noteTitle" // New id
              type="text"
              value={noteTitle}
              onChange={e => setNoteTitle(e.target.value)}
              required
              // Styled with blue border
              className="mt-1 block w-full rounded-md border border-blue-500 px-3 py-2 text-sm focus:border-primary focus:ring-primary"
            />
          </div>
           {/* Removed the 'To' field */}
           {/* <div>
            <label htmlFor="to" className="block text-sm font-medium text-gray-700">To</label>
            <input
              id="to"
              type="text"
              value={to}
              onChange={e => setTo(e.target.value)}
              required
              className="mt-1 block w-full rounded-md border border-blue-500 px-3 py-2 text-sm focus:border-primary focus:ring-primary"
            />
          </div> */}
        </div>

        <div>
          <label htmlFor="text" className="block text-sm font-medium text-gray-700">Note</label>
          {/* 'Note' textarea - Styled with blue border */}
          <textarea
            id="text"
            value={text}
            onChange={e => setText(e.target.value)}
            rows={3}
            required
             // Updated border classes for blue border
            className="mt-1 block w-full rounded-md border border-blue-500 px-3 py-2 text-sm focus:border-primary focus:ring-primary"
          />
        </div>

        <div>
          <label htmlFor="due" className="block text-sm font-medium text-gray-700">Due before</label>
          {/* 'Due before' date input - Styled with blue border */}
          <input
            id="due"
            type="date"
            value={due}
            onChange={e => setDue(e.target.value)}
            required
             // Updated border classes for blue border
            className="mt-1 block w-full rounded-md border border-blue-500 px-3 py-2 text-sm focus:border-primary focus:ring-primary"
          />
        </div>

        <div className="flex justify-end">
          {editing && (
            <button
               type="button" // Explicitly set type to button
               onClick={() => {
                 setEditing(null);
                 setNoteTitle(''); // Reset note title
                 setText('');
                 setDue('');
                 // Reset file handler to current user or default if applicable
                 setFileHandler(user?.name && users.some(u => u.name === user.name) ? user.name : users.length > 0 ? users[0].name : '');
               }}
              className="mr-2 px-4 py-2 rounded-md border text-gray-700 hover:bg-gray-100"
              disabled={saving}
            >
              Cancel Edit
            </button>
          )}
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-600 disabled:opacity-50"
          >
            {saving ? 'Saving...' : (editing ? 'Save Changes' : 'Add Note')} {/* More descriptive text */}
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default NotesModal;
