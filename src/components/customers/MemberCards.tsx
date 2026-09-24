// src/components/customers/MemberCards.tsx
import React, { useState } from 'react';
import { Customer, isExpiringOrExpired } from '../../types/customer';
import { CustomerAvatar } from './CustomerAvatar';
import { formatDate } from '../../utils/dateHelpers';
import { usePermissions } from '../../hooks/usePermissions';
import { Eye, Edit, Trash2, FileText, File, Tag, Send, Inbox, Phone, Mail, MapPin, Calendar, CheckCircle2, ShieldAlert } from 'lucide-react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import toast from 'react-hot-toast';

interface MemberCardsProps {
  customers: Customer[];
  onView: (customer: Customer) => void;
  onEdit: (customer: Customer) => void;
  onDelete: (customer: Customer) => void;
  onGenerateDocument: (customer: Customer) => void;
  onViewDocument: (url: string) => void;
  onAssignType: (customer: Customer) => void;
  onUpdateBillCopy: (customer: Customer) => void;
  rowSelection: any;
  onRowSelectionChange: any;
}

export const MemberCards: React.FC<MemberCardsProps> = ({
  customers,
  onView,
  onEdit,
  onDelete,
  onGenerateDocument,
  onViewDocument,
  onAssignType,
  onUpdateBillCopy,
  rowSelection,
  onRowSelectionChange,
}) => {
  const { can } = usePermissions();
  const [selectedPhoto, setSelectedPhoto] = useState<{ url: string; name: string } | null>(null);

  const sendSignatureRequest = async (customer: Customer) => {
    if (!customer.mobile) {
      toast.error('This customer has no mobile number.');
      return;
    }
    const toastId = toast.loading('Generating secure link...');
    try {
      const token = Math.random().toString(36).substring(2) + Date.now().toString(36);
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 1);
      await updateDoc(doc(db, 'customers', customer.id), {
        signatureRequestToken: token,
        signatureRequestExpiresAt: expiresAt,
      });
      const signingLink = `${window.location.origin}/sign/${customer.id}?token=${token}`;
      const message = `Hello ${customer.name}, please click the link below to digitally sign your document for AIE Skyline. This link will expire in 1 hour:\n\n${signingLink}`;
      let phone = customer.mobile.replace(/\s+/g, '');
      if (phone.startsWith('0')) phone = '44' + phone.substring(1);
      toast.success('Link generated! Opening WhatsApp...', { id: toastId });
      window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, '_blank');
    } catch (error) {
      toast.error('Failed to generate link', { id: toastId });
    }
  };

  const toggleSelect = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onRowSelectionChange((prev: any) => {
      const next = { ...prev };
      if (next[id]) delete next[id];
      else next[id] = true;
      return next;
    });
  };

  if (customers.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-xs">
        <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto text-slate-400 mb-3">
          <Eye className="w-8 h-8" />
        </div>
        <h3 className="text-base font-bold text-slate-800">No Members Found</h3>
        <p className="text-sm text-slate-500 mt-1">Try adjusting your search query or active filter settings.</p>
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {customers.map((customer) => {
          const isSelected = Boolean(rowSelection[customer.id]);
          const status = customer.status || 'active';
          const isCompany = customer.type === 'company';
          const hasPhoto = Boolean(customer.profilePictureUrl);

          return (
            <div
              key={customer.id}
              onClick={() => can('customers', 'view') && onView(customer)}
              className={`group relative bg-white rounded-2xl border transition-all duration-200 shadow-xs hover:shadow-md cursor-pointer flex flex-col justify-between overflow-hidden ${
                isSelected
                  ? 'border-blue-500 ring-2 ring-blue-500/20 bg-blue-50/20'
                  : 'border-slate-200 hover:border-slate-300'
              }`}
            >
              {/* Card Header */}
              <div className="p-4 pb-3">
                <div className="flex items-start justify-between gap-2.5">
                  <div className="flex items-center gap-3 min-w-0">
                    {/* Checkbox */}
                    <div onClick={(e) => toggleSelect(customer.id, e)} className="shrink-0">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => {}}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 h-4 w-4 cursor-pointer"
                      />
                    </div>

                    {/* Profile Picture Avatar */}
                    <div
                      className="relative group/avatar shrink-0"
                      onClick={(e) => {
                        if (hasPhoto) {
                          e.stopPropagation();
                          setSelectedPhoto({ url: customer.profilePictureUrl!, name: customer.name });
                        }
                      }}
                    >
                      <CustomerAvatar
                        name={customer.name}
                        firstName={customer.firstName}
                        lastName={customer.lastName}
                        isCompany={isCompany}
                        profilePictureUrl={customer.profilePictureUrl}
                        size="lg"
                        status={status}
                        showStatusDot={true}
                        className={hasPhoto ? 'ring-2 ring-blue-100 hover:ring-blue-400' : ''}
                      />
                      {hasPhoto && (
                        <div className="absolute inset-0 bg-black/30 rounded-2xl opacity-0 group-hover/avatar:opacity-100 flex items-center justify-center transition-opacity text-white text-[10px] font-bold">
                          <Eye className="w-4 h-4" />
                        </div>
                      )}
                    </div>

                    {/* Name & Type */}
                    <div className="min-w-0">
                      <h4 className="text-sm font-bold text-slate-900 truncate group-hover:text-blue-600 transition-colors" title={customer.name}>
                        {customer.name}
                      </h4>
                      <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                          {customer.type || 'Member'}
                        </span>
                        <span
                          className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                            status === 'active'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : 'bg-slate-100 text-slate-600 border-slate-200'
                          }`}
                        >
                          {status}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Contact & Particulars */}
                <div className="mt-3.5 pt-3 border-t border-slate-100 space-y-1.5 text-xs text-slate-600">
                  {customer.mobile && (
                    <div className="flex items-center gap-2 truncate">
                      <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <a
                        href={`tel:${customer.mobile}`}
                        onClick={(e) => e.stopPropagation()}
                        className="text-blue-600 hover:underline font-mono truncate"
                      >
                        {customer.mobile}
                      </a>
                    </div>
                  )}

                  {customer.email && (
                    <div className="flex items-center gap-2 truncate" title={customer.email}>
                      <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="truncate">{customer.email}</span>
                    </div>
                  )}

                  {(customer.townCity || customer.postcode) && (
                    <div className="flex items-center gap-2 truncate text-slate-500">
                      <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="truncate">
                        {[customer.townCity, customer.postcode].filter(Boolean).join(', ')}
                      </span>
                    </div>
                  )}

                  {/* Expiry Indicators */}
                  {!isCompany && customer.licenseExpiry && (
                    <div className="flex items-center justify-between pt-1">
                      <span className="text-[11px] text-slate-500">License Expiry:</span>
                      <span
                        className={`text-[11px] font-semibold ${
                          isExpiringOrExpired(customer.licenseExpiry) ? 'text-red-600' : 'text-slate-700'
                        }`}
                      >
                        {formatDate(customer.licenseExpiry)}
                      </span>
                    </div>
                  )}

                  {/* Signature Thumbnail Indicator */}
                  {!isCompany && (
                    <div className="flex items-center justify-between pt-1">
                      <span className="text-[11px] text-slate-500">Signature:</span>
                      {customer.signature ? (
                        <div className="flex items-center gap-1.5 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          <span>Signed</span>
                        </div>
                      ) : (
                        <span className="text-[10px] text-slate-400 italic bg-slate-100 px-2 py-0.5 rounded">
                          Pending
                        </span>
                      )}
                    </div>
                  )}

                  {/* Office Bill Copy Status */}
                  {customer.billCopyStatus && (
                    <div className="flex items-center justify-between pt-0.5">
                      <span className="text-[11px] text-slate-500">Bill Copy:</span>
                      <span
                        className={`text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${
                          customer.billCopyStatus === 'available'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {customer.billCopyStatus}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Card Footer / Action Buttons */}
              <div
                className="px-4 py-2.5 bg-slate-50/80 border-t border-slate-100 flex items-center justify-between"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center gap-1 text-slate-500">
                  {can('customers', 'view') && (
                    <button
                      onClick={() => onView(customer)}
                      className="p-1.5 rounded-lg hover:bg-white hover:text-blue-600 hover:shadow-2xs transition"
                      title="View Member Details"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                  )}
                  {can('customers', 'update') && (
                    <>
                      <button
                        onClick={() => onEdit(customer)}
                        className="p-1.5 rounded-lg hover:bg-white hover:text-blue-600 hover:shadow-2xs transition"
                        title="Edit Profile"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => onAssignType(customer)}
                        className="p-1.5 rounded-lg hover:bg-white hover:text-emerald-600 hover:shadow-2xs transition"
                        title="Assign Customer Type"
                      >
                        <Tag className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => sendSignatureRequest(customer)}
                        className="p-1.5 rounded-lg hover:bg-white hover:text-emerald-600 hover:shadow-2xs transition"
                        title="Send Signature Request (WhatsApp)"
                      >
                        <Send className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => onUpdateBillCopy(customer)}
                        className={`p-1.5 rounded-lg hover:bg-white transition ${
                          customer.billCopyStatus === 'available' ? 'text-amber-600' : 'hover:text-amber-600'
                        }`}
                        title="Update Office Bill Copy"
                      >
                        <Inbox className="w-4 h-4" />
                      </button>
                    </>
                  )}
                  {can('customers', 'view') && (
                    <button
                      onClick={() => onGenerateDocument(customer)}
                      className="p-1.5 rounded-lg hover:bg-white hover:text-purple-600 hover:shadow-2xs transition"
                      title="Generate Document"
                    >
                      <FileText className="w-4 h-4" />
                    </button>
                  )}
                  {can('customers', 'view') && customer.documentUrl && (
                    <button
                      onClick={() => onViewDocument(customer.documentUrl!)}
                      className="p-1.5 rounded-lg hover:bg-white hover:text-indigo-600 hover:shadow-2xs transition"
                      title="View Document"
                    >
                      <File className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {can('customers', 'delete') && (
                  <button
                    onClick={() => onDelete(customer)}
                    className="p-1.5 rounded-lg text-slate-400 hover:bg-white hover:text-red-600 hover:shadow-2xs transition"
                    title="Delete Member"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Lightbox / Full Photo Modal */}
      {selectedPhoto && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setSelectedPhoto(null)}
        >
          <div
            className="relative max-w-lg w-full bg-white rounded-3xl p-5 shadow-2xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-slate-900">{selectedPhoto.name} - Profile Picture</h3>
              <button
                onClick={() => setSelectedPhoto(null)}
                className="text-slate-400 hover:text-slate-700 text-lg font-bold p-1"
              >
                ✕
              </button>
            </div>
            <div className="w-full h-80 rounded-2xl overflow-hidden bg-slate-100 flex items-center justify-center">
              <img
                src={selectedPhoto.url}
                alt={selectedPhoto.name}
                className="w-full h-full object-contain"
              />
            </div>
            <div className="flex justify-end pt-2">
              <button
                onClick={() => setSelectedPhoto(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-sm font-semibold rounded-xl transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default MemberCards;
