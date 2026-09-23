// src/components/common/TemplateGuideModal.tsx
import React from 'react';
import { 
  X, 
  HelpCircle, 
  Sparkles, 
  Edit3, 
  Trash2, 
  Plus, 
  Tag, 
  CheckCircle2, 
  ArrowRight,
  MessageCircle,
  Mail,
  Info
} from 'lucide-react';
import Modal from '../ui/Modal';
import { TEMPLATE_AVAILABLE_TAGS } from '../../utils/templateManager';

interface TemplateGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  channel?: 'whatsapp' | 'email' | 'all';
}

export const TemplateGuideModal: React.FC<TemplateGuideModalProps> = ({
  isOpen,
  onClose,
  channel = 'all',
}) => {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="How WhatsApp & Email Templates Work"
      size="2xl"
      contentClassName="p-5 overflow-y-auto max-h-[85vh] text-slate-800"
    >
      <div className="space-y-6">
        {/* Intro Banner */}
        <div className="bg-gradient-to-r from-emerald-50 via-teal-50 to-blue-50 border border-emerald-200 rounded-2xl p-4 flex items-start gap-3.5">
          <div className="p-2.5 bg-emerald-600 text-white rounded-xl shadow-xs shrink-0 mt-0.5">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-slate-900 text-sm">
              Smart Dynamic Templates for {channel === 'whatsapp' ? 'WhatsApp' : channel === 'email' ? 'Email' : 'WhatsApp & Email'}
            </h3>
            <p className="text-xs text-slate-600 mt-1 leading-relaxed">
              Templates save time by automating repetitive messages. With dynamic tags (placeholders), real customer names, vehicle plates, outstanding balances, and dates are inserted automatically when you send.
            </p>
          </div>
        </div>

        {/* 4 Core Features / How to Work */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {/* 1. Dynamic Tags */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
            <div className="flex items-center gap-2 text-slate-900 font-bold text-sm">
              <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-black">1</span>
              <span>Dynamic Placeholders</span>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Enclose variables in brackets like <code className="bg-blue-50 text-blue-800 px-1 py-0.5 rounded font-mono font-bold text-[11px] border border-blue-200">[Recipient Name]</code> or <code className="bg-blue-50 text-blue-800 px-1 py-0.5 rounded font-mono font-bold text-[11px] border border-blue-200">[Vehicle Reg]</code>. When you pick a recipient, the system fills them in automatically.
            </p>
          </div>

          {/* 2. Editable */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
            <div className="flex items-center gap-2 text-slate-900 font-bold text-sm">
              <span className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-xs font-black">2</span>
              <span>100% Editable</span>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Click <strong className="text-emerald-700">Edit Template</strong> on any selected template to modify subject lines, change company wording, or add custom tags. Your changes are saved permanently for future use.
            </p>
          </div>

          {/* 3. Deletable */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
            <div className="flex items-center gap-2 text-slate-900 font-bold text-sm">
              <span className="w-6 h-6 rounded-full bg-rose-100 text-rose-700 flex items-center justify-center text-xs font-black">3</span>
              <span>Permanent Deletion</span>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Don't need a template? Click <strong className="text-rose-700">Delete Template</strong>. The template is removed permanently from your list and will never reappear or get restored accidentally.
            </p>
          </div>

          {/* 4. Creating New Templates */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
            <div className="flex items-center gap-2 text-slate-900 font-bold text-sm">
              <span className="w-6 h-6 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center text-xs font-black">4</span>
              <span>Create New Templates</span>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Click <strong className="text-purple-700">+ New Template</strong> anytime to create fresh templates for any category (Rental, Maintenance, Finance, Invoices, Claims, or General News).
            </p>
          </div>
        </div>

        {/* Live Example Simulation */}
        <div className="bg-slate-900 text-slate-100 p-4 rounded-xl border border-slate-800 space-y-3 font-mono text-xs">
          <div className="flex items-center justify-between text-slate-400 font-sans text-xs pb-2 border-b border-slate-800">
            <span className="font-bold text-slate-200 flex items-center gap-1.5">
              <Info className="w-4 h-4 text-emerald-400" /> Example Substitution
            </span>
            <span className="text-[11px] text-slate-400">Template $\rightarrow$ Delivered Message</span>
          </div>

          <div className="space-y-1">
            <span className="text-slate-400 font-sans text-[11px] uppercase tracking-wider block">Raw Template Code:</span>
            <div className="bg-slate-950 p-2.5 rounded border border-slate-800 text-amber-300">
              Dear <span className="text-emerald-400 font-bold">[Recipient Name]</span>, your vehicle <span className="text-emerald-400 font-bold">[Vehicle Reg]</span> is due for maintenance. Balance owing: <span className="text-emerald-400 font-bold">[Amount]</span>.
            </div>
          </div>

          <div className="flex items-center justify-center text-slate-500 py-0.5">
            <ArrowRight className="w-4 h-4 rotate-90 sm:rotate-0" />
          </div>

          <div className="space-y-1">
            <span className="text-slate-400 font-sans text-[11px] uppercase tracking-wider block">Delivered To Customer:</span>
            <div className="bg-emerald-950/40 p-2.5 rounded border border-emerald-700/50 text-emerald-200">
              Dear <span className="text-white font-bold">John Doe</span>, your vehicle <span className="text-white font-bold">BD18 XYZ</span> is due for maintenance. Balance owing: <span className="text-white font-bold">£150.00</span>.
            </div>
          </div>
        </div>

        {/* Available Tags Quick Reference */}
        <div className="space-y-3 pt-2 border-t border-slate-200">
          <div className="flex items-center justify-between">
            <h4 className="font-bold text-xs uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
              <Tag className="w-3.5 h-3.5 text-blue-600" /> Popular Dynamic Tags You Can Use
            </h4>
            <span className="text-[11px] text-slate-400 font-medium">Click tags inside the editor to insert</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {TEMPLATE_AVAILABLE_TAGS.slice(0, 12).map((t) => (
              <div key={t.tag} className="p-2 bg-white border border-slate-200 rounded-lg text-xs hover:border-blue-400 transition">
                <span className="font-mono font-bold text-blue-700 block truncate">{t.tag}</span>
                <span className="text-[10px] text-slate-500 truncate block mt-0.5">{t.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Close Button */}
        <div className="pt-3 border-t border-slate-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold transition shadow-xs cursor-pointer"
          >
            Got It, Close Guide
          </button>
        </div>
      </div>
    </Modal>
  );
};
