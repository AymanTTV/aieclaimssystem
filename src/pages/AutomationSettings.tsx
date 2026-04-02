import React, { useState, useEffect, useRef, useCallback } from 'react';
import { db } from '../lib/firebase';
import { collection, getDocs, doc, setDoc, writeBatch } from 'firebase/firestore';
import { Save, Tag, FileText, MessageSquare, Plus, Undo2, Redo2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { emailTemplates, EmailType } from '../constants/emailTemplates';

// Valid tags based on BulkEmail and Whatsapp context builders
const AVAILABLE_TAGS: Record<string, string[]> = {
  global: ['[Recipient Name]', '[Customer Name]', '[Driver Name]', '[DD/MM/YYYY]'],
  vehicle: ['[Vehicle Reg]', '[Make & Model]', '[Year]', '[Mileage]'],
  rental: ['[Start Date]', '[End Date]', '[Total Amount]', '[Amount Paid]', '[Outstanding Balance]', '[Subtotal]', '[VAT]'],
  finance: ['[Total Amount]', '[Amount Paid]', '[Outstanding Balance]', '[New Balance]', '[Amount Owed]', '[Due Date]', '[Reason]'],
  maintenance: ['[Maintenance Type]', '[Date & Time]', '[Location]', '[Garage Name]', '[Additional Notes]', '[Part(s) Required]'],
  invoice: ['[Invoice Number]', '[Invoice Date]', '[Due Date]', '[Amount]', '[Paid Balance]'],
  claim: ['[Claim Reference]', '[Claim Type]', '[Client Name]', '[Client Registration]', '[TP Registration]', '[Description]'],
};

const CATEGORIES: EmailType[] = ['custom', 'rental', 'maintenance', 'invoice', 'claim', 'finance'];

export default function AutomationSettings() {
  const [loading, setLoading] = useState(true);
  const [templates, setTemplates] = useState<any[]>([]);
  const [activeCategory, setActiveCategory] = useState<EmailType>('custom');
  
  // Editor State
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [editingTemplate, setEditingTemplate] = useState<any>(null);
  const [saving, setSaving] = useState(false);

  // Field Tracking for Cursor Insertion
  const [activeField, setActiveField] = useState<'subjectTemplate' | 'bodyTemplate'>('bodyTemplate');
  const subjectRef = useRef<HTMLInputElement>(null);
  const bodyRef = useRef<HTMLTextAreaElement>(null);

  // Undo / Redo History Stack
  const [history, setHistory] = useState<any[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const debounceTimer = useRef<NodeJS.Timeout | null>(null);

  // Load templates from Firestore
  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    setLoading(true);
    try {
      const snap = await getDocs(collection(db, 'messageTemplates'));
      if (snap.empty) {
        await seedDatabase();
      } else {
        const fetched = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setTemplates(fetched);
      }
    } catch (error) {
      console.error('Error fetching templates:', error);
      toast.error('Failed to load templates.');
    } finally {
      setLoading(false);
    }
  };

  const seedDatabase = async () => {
    toast.loading('Initializing database with default templates...');
    const batch = writeBatch(db);
    const seededTemplates: any[] = [];

    Object.entries(emailTemplates).forEach(([category, tpls]) => {
      tpls.forEach(tpl => {
        const docRef = doc(collection(db, 'messageTemplates'), tpl.id);
        const tplData = { ...tpl, category };
        batch.set(docRef, tplData);
        seededTemplates.push({ id: tpl.id, ...tplData });
      });
    });

    await batch.commit();
    setTemplates(seededTemplates);
    toast.dismiss();
    toast.success('Default templates loaded.');
  };

  // ─── HISTORY MANAGEMENT ─────────────────────────────────────────

  const pushToHistory = useCallback((tpl: any) => {
    setHistory(prev => {
      const newHistory = prev.slice(0, historyIndex + 1);
      newHistory.push(tpl);
      if (newHistory.length > 50) newHistory.shift(); // Keep last 50 states
      setHistoryIndex(newHistory.length - 1);
      return newHistory;
    });
  }, [historyIndex]);

  const handleSelectTemplate = (tpl: any) => {
    setSelectedTemplateId(tpl.id);
    setEditingTemplate({ ...tpl });
    setHistory([{ ...tpl }]);
    setHistoryIndex(0);
  };

  const undo = useCallback(() => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      setHistoryIndex(newIndex);
      setEditingTemplate(history[newIndex]);
    }
  }, [history, historyIndex]);

  const redo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1;
      setHistoryIndex(newIndex);
      setEditingTemplate(history[newIndex]);
    }
  }, [history, historyIndex]);

  const handleEditorChange = (field: 'subjectTemplate' | 'bodyTemplate' | 'name', value: string) => {
    const newTpl = { ...editingTemplate, [field]: value };
    setEditingTemplate(newTpl);

    // Debounce pushing to history so we don't save every single character typed
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
      pushToHistory(newTpl);
    }, 500);
  };

  // Keyboard shortcut listener
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
      e.preventDefault();
      if (e.shiftKey) redo();
      else undo();
    }
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
      e.preventDefault();
      redo();
    }
  };

  // ─── TEMPLATE ACTIONS ───────────────────────────────────────────

  const handleCreateNew = () => {
    const newId = `${activeCategory}_custom_${Date.now()}`;
    const newTpl = {
      id: newId,
      category: activeCategory,
      name: 'New Custom Template',
      subjectTemplate: '',
      bodyTemplate: '',
      requiredFields: []
    };
    
    setTemplates(prev => [...prev, newTpl]);
    handleSelectTemplate(newTpl);
    setTimeout(() => subjectRef.current?.focus(), 100);
  };

  const handleSave = async () => {
    if (!editingTemplate) return;
    setSaving(true);
    try {
      await setDoc(doc(db, 'messageTemplates', editingTemplate.id), editingTemplate, { merge: true });
      setTemplates(prev => prev.map(t => (t.id === editingTemplate.id ? editingTemplate : t)));
      toast.success('Template saved successfully!');
    } catch (error) {
      console.error(error);
      toast.error('Failed to save template.');
    } finally {
      setSaving(false);
    }
  };

  const insertTagAtCursor = (tag: string) => {
    if (!editingTemplate) return;
    const ref = activeField === 'subjectTemplate' ? subjectRef.current : bodyRef.current;
    
    if (ref) {
      const start = ref.selectionStart || 0;
      const end = ref.selectionEnd || 0;
      const text = editingTemplate[activeField];
      
      const newText = text.substring(0, start) + tag + text.substring(end);
      const newTpl = { ...editingTemplate, [activeField]: newText };
      
      setEditingTemplate(newTpl);
      pushToHistory(newTpl); // Immediate history save for explicit actions

      // Restore cursor position seamlessly
      setTimeout(() => {
        ref.focus();
        ref.setSelectionRange(start + tag.length, start + tag.length);
      }, 0);
    }
  };

  const activeTemplates = templates.filter(t => t.category === activeCategory);

  if (loading) return <div className="p-8 text-center text-gray-500">Loading Template Manager...</div>;

  return (
    <div className="max-w-7xl mx-auto pb-20 space-y-6" onKeyDown={handleKeyDown}>
      <div className="flex items-center gap-3 mb-6">
        <div className="bg-blue-100 p-3 rounded-lg">
          <MessageSquare className="w-8 h-8 text-blue-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Message Template Manager</h1>
          <p className="text-sm text-gray-500">Edit templates, drag-and-drop tags, and manage communications.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Left Column: Categories & Template List */}
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
             <div className="p-3 bg-gray-50 border-b border-gray-200 font-semibold text-gray-700">
               Categories
             </div>
             <div className="flex flex-col">
               {CATEGORIES.map(cat => (
                 <button
                   key={cat}
                   onClick={() => {
                     setActiveCategory(cat);
                     setSelectedTemplateId(null);
                     setEditingTemplate(null);
                   }}
                   className={`text-left px-4 py-3 text-sm font-medium transition-colors ${
                     activeCategory === cat ? 'bg-blue-50 text-blue-700 border-l-4 border-blue-600' : 'text-gray-600 hover:bg-gray-50 border-l-4 border-transparent'
                   }`}
                 >
                   {cat.charAt(0).toUpperCase() + cat.slice(1)}
                 </button>
               ))}
             </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col max-h-[500px]">
             <div className="p-3 bg-gray-50 border-b border-gray-200 font-semibold text-gray-700 flex justify-between items-center">
               <span>Templates</span>
             </div>
             <div className="overflow-y-auto flex-1 p-2 space-y-1">
                {activeTemplates.length === 0 && <p className="text-xs text-gray-500 p-2">No templates found.</p>}
                {activeTemplates.map(tpl => (
                  <button
                    key={tpl.id}
                    onClick={() => handleSelectTemplate(tpl)}
                    className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                      selectedTemplateId === tpl.id ? 'bg-blue-600 text-white' : 'hover:bg-gray-100 text-gray-700'
                    }`}
                  >
                    {tpl.name}
                  </button>
                ))}
             </div>
             <div className="p-3 border-t border-gray-200 bg-gray-50">
               <button 
                 onClick={handleCreateNew}
                 className="w-full flex items-center justify-center gap-2 bg-white border border-gray-300 text-gray-700 py-2 rounded-lg text-sm hover:bg-gray-100 transition"
               >
                 <Plus className="w-4 h-4" /> New Template
               </button>
             </div>
          </div>
        </div>

        {/* Middle Column: Editor */}
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-200 flex flex-col h-[750px]">
          {editingTemplate ? (
            <>
              <div className="p-4 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
                <h2 className="font-bold text-gray-800 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-gray-500" />
                  Editing: {editingTemplate.name}
                </h2>
                
                <div className="flex items-center gap-2">
                  <div className="flex items-center bg-white border border-gray-300 rounded-lg overflow-hidden mr-2">
                    <button 
                      onClick={undo} 
                      disabled={historyIndex <= 0}
                      className="p-2 text-gray-600 hover:bg-gray-100 disabled:opacity-30 transition"
                      title="Undo (Ctrl+Z)"
                    >
                      <Undo2 className="w-4 h-4" />
                    </button>
                    <div className="w-px h-5 bg-gray-300"></div>
                    <button 
                      onClick={redo} 
                      disabled={historyIndex >= history.length - 1}
                      className="p-2 text-gray-600 hover:bg-gray-100 disabled:opacity-30 transition"
                      title="Redo (Ctrl+Y)"
                    >
                      <Redo2 className="w-4 h-4" />
                    </button>
                  </div>

                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 disabled:opacity-50 transition"
                  >
                    <Save className="w-4 h-4" /> {saving ? 'Saving...' : 'Save Template'}
                  </button>
                </div>
              </div>
              <div className="p-6 flex-1 overflow-y-auto space-y-6">
                 <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Template Name (Internal)</label>
                    <input
                      type="text"
                      className="w-full border-gray-300 rounded-lg shadow-sm focus:border-blue-500 focus:ring-blue-500"
                      value={editingTemplate.name}
                      onChange={e => handleEditorChange('name', e.target.value)}
                    />
                 </div>
                 <div>
                    <label className="flex justify-between text-sm font-semibold text-gray-700 mb-1">
                      Subject Line
                    </label>
                    <input
                      ref={subjectRef}
                      type="text"
                      onFocus={() => setActiveField('subjectTemplate')}
                      className="w-full border-gray-300 rounded-lg shadow-sm focus:border-blue-500 focus:ring-blue-500"
                      value={editingTemplate.subjectTemplate}
                      onChange={e => handleEditorChange('subjectTemplate', e.target.value)}
                    />
                 </div>
                 <div className="flex-1 flex flex-col h-full">
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Message Body</label>
                    <textarea
                      ref={bodyRef}
                      onFocus={() => setActiveField('bodyTemplate')}
                      className="w-full flex-1 border-gray-300 rounded-lg shadow-sm focus:border-blue-500 focus:ring-blue-500 font-mono text-sm leading-relaxed min-h-[350px]"
                      value={editingTemplate.bodyTemplate}
                      onChange={e => handleEditorChange('bodyTemplate', e.target.value)}
                    />
                 </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-gray-400">
               <MessageSquare className="w-16 h-16 mb-4 text-gray-200" />
               <p>Select a template from the list to edit or create a new one.</p>
            </div>
          )}
        </div>

        {/* Right Column: Tags Reference */}
        <div className="lg:col-span-1 bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden h-[750px] flex flex-col">
           <div className="p-4 bg-gray-50 border-b border-gray-200 font-semibold text-gray-700 flex items-center gap-2">
             <Tag className="w-4 h-4" /> Available Tags
           </div>
           <div className="p-4 overflow-y-auto space-y-6">
             <p className="text-xs text-gray-500 leading-relaxed">
               <strong>Click</strong> a tag to insert it at your cursor, or <strong>drag and drop</strong> it directly into the text boxes.
             </p>
             
             {/* Global Tags */}
             <div>
               <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Global</h3>
               <div className="flex flex-wrap gap-2">
                 {AVAILABLE_TAGS.global.map(tag => (
                   <button 
                     key={tag} 
                     draggable 
                     onDragStart={(e) => e.dataTransfer.setData('text/plain', tag)}
                     onClick={() => insertTagAtCursor(tag)} 
                     className="text-xs px-2 py-1 bg-blue-50 text-blue-700 rounded border border-blue-100 hover:bg-blue-100 transition cursor-grab active:cursor-grabbing"
                   >
                     {tag}
                   </button>
                 ))}
               </div>
             </div>

             {/* Vehicle Tags */}
             <div>
               <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Vehicle</h3>
               <div className="flex flex-wrap gap-2">
                 {AVAILABLE_TAGS.vehicle.map(tag => (
                   <button 
                     key={tag} 
                     draggable 
                     onDragStart={(e) => e.dataTransfer.setData('text/plain', tag)}
                     onClick={() => insertTagAtCursor(tag)} 
                     className="text-xs px-2 py-1 bg-green-50 text-green-700 rounded border border-green-100 hover:bg-green-100 transition cursor-grab active:cursor-grabbing"
                   >
                     {tag}
                   </button>
                 ))}
               </div>
             </div>

             {/* Contextual Tags */}
             {(activeCategory === 'rental' || activeCategory === 'finance') && (
                <div>
                  <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Financial / Rental</h3>
                  <div className="flex flex-wrap gap-2">
                    {AVAILABLE_TAGS[activeCategory].map(tag => (
                      <button 
                        key={tag} 
                        draggable 
                        onDragStart={(e) => e.dataTransfer.setData('text/plain', tag)}
                        onClick={() => insertTagAtCursor(tag)} 
                        className="text-xs px-2 py-1 bg-purple-50 text-purple-700 rounded border border-purple-100 hover:bg-purple-100 transition cursor-grab active:cursor-grabbing"
                      >
                        {tag}
                      </button>
                    ))}
                  </div>
                </div>
             )}

             {activeCategory === 'maintenance' && (
                <div>
                  <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Maintenance</h3>
                  <div className="flex flex-wrap gap-2">
                    {AVAILABLE_TAGS.maintenance.map(tag => (
                      <button 
                        key={tag} 
                        draggable 
                        onDragStart={(e) => e.dataTransfer.setData('text/plain', tag)}
                        onClick={() => insertTagAtCursor(tag)} 
                        className="text-xs px-2 py-1 bg-orange-50 text-orange-700 rounded border border-orange-100 hover:bg-orange-100 transition cursor-grab active:cursor-grabbing"
                      >
                        {tag}
                      </button>
                    ))}
                  </div>
                </div>
             )}

             {activeCategory === 'invoice' && (
                <div>
                  <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Invoice</h3>
                  <div className="flex flex-wrap gap-2">
                    {AVAILABLE_TAGS.invoice.map(tag => (
                      <button 
                        key={tag} 
                        draggable 
                        onDragStart={(e) => e.dataTransfer.setData('text/plain', tag)}
                        onClick={() => insertTagAtCursor(tag)} 
                        className="text-xs px-2 py-1 bg-indigo-50 text-indigo-700 rounded border border-indigo-100 hover:bg-indigo-100 transition cursor-grab active:cursor-grabbing"
                      >
                        {tag}
                      </button>
                    ))}
                  </div>
                </div>
             )}

             {activeCategory === 'claim' && (
                <div>
                  <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Claims</h3>
                  <div className="flex flex-wrap gap-2">
                    {AVAILABLE_TAGS.claim.map(tag => (
                      <button 
                        key={tag} 
                        draggable 
                        onDragStart={(e) => e.dataTransfer.setData('text/plain', tag)}
                        onClick={() => insertTagAtCursor(tag)} 
                        className="text-xs px-2 py-1 bg-red-50 text-red-700 rounded border border-red-100 hover:bg-red-100 transition cursor-grab active:cursor-grabbing"
                      >
                        {tag}
                      </button>
                    ))}
                  </div>
                </div>
             )}

           </div>
        </div>
      </div>
    </div>
  );
}