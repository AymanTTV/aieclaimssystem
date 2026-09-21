// src/components/claims/ClaimTable.tsx
import React, { useState, useRef, useEffect } from 'react';
import { DataTable } from '../DataTable/DataTable';
import { Claim } from '../../types';
import { Eye, Edit, Trash2, Clock, FileText, MessageSquare, MessageCircle, Mail, User, Scale, ChevronDown } from 'lucide-react';
import StatusBadge from '../ui/StatusBadge';
import { usePermissions } from '../../hooks/usePermissions';
import { format, differenceInDays } from 'date-fns';
import { deriveDisplayStatus } from '../../utils/claimProgress'; 
import { resolveLegalHandlerDetails } from '../../utils/claimCommunication';

interface ClaimTableProps {
  claims: Claim[];
  onView: (claim: Claim) => void;
  onEdit: (claim: Claim) => void;
  onDelete: (claim: Claim) => void;
  onUpdateProgress: (claim: Claim) => void;
  onGeneratePdf: (claim: Claim) => void;
  onNotes: (claim: Claim) => void;
  onWhatsApp?: (claim: Claim, recipient?: 'client' | 'legalHandler') => void;
  onEmail?: (claim: Claim, recipient?: 'client' | 'legalHandler') => void;
  selectedIds: Set<string>;
  onToggleOne: (id: string) => void;
  onToggleAll: (checked: boolean, allIds: string[]) => void;
}

const ClaimTable: React.FC<ClaimTableProps> = ({
  claims, onView, onEdit, onDelete, onUpdateProgress, onGeneratePdf, onNotes,
  onWhatsApp, onEmail,
  selectedIds, onToggleOne, onToggleAll
}) => {
  const { can } = usePermissions();

  const columns = [
    {
      id: 'selection',
      header: () => (
        <input
          type="checkbox"
          checked={claims.length > 0 && claims.every(c => selectedIds.has(c.id))}
          onChange={(e) => onToggleAll(e.target.checked, claims.map(c => c.id))}
          className="rounded border-gray-300 text-primary focus:ring-primary h-4 w-4 cursor-pointer"
          aria-label="Select all claims"
        />
      ),
      cell: ({ row }: any) => (
        <div onClick={(e) => e.stopPropagation()}>
          <input
            type="checkbox"
            checked={selectedIds.has(row.original.id)}
            onChange={() => onToggleOne(row.original.id)}
            className="rounded border-gray-300 text-primary focus:ring-primary h-4 w-4 cursor-pointer"
            aria-label={`Select claim ${row.original.id}`}
          />
        </div>
      ),
    },
    {
      header: 'Client Details',
      cell: ({ row }: any) => (
        <div>
          {row.original.clientRef && <div className="text-sm text-gray-500">Ref: {row.original.clientRef}</div>}
          <div className="font-medium">{row.original.clientInfo.name}</div>
          <div className="text-sm text-gray-500">
            {row.original.clientInfo.phone && <a href={`tel:${row.original.clientInfo.phone}`} className="text-blue-600 hover:underline" onClick={e => e.stopPropagation()}>{row.original.clientInfo.phone}</a>}
          </div>
          <div className="text-sm text-gray-500">
            {row.original.clientInfo.email && <a href={`mailto:${row.original.clientInfo.email}`} className="text-blue-600 hover:underline" onClick={e => e.stopPropagation()}>{row.original.clientInfo.email}</a>}
          </div>
          <div className="mt-1 flex flex-wrap gap-1">
            {row.original.groupName && (
              <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-indigo-100 text-indigo-800">
                Grp: {row.original.groupName}
              </span>
            )}
            {row.original.departmentName && (
              <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-teal-100 text-teal-800">
                Dept: {row.original.departmentName}
              </span>
            )}
          </div>
        </div>
      ),
    },
    {
      header: 'Vehicle',
      cell: ({ row }: any) => (
        <div>
          <div className="font-medium">{row.original.clientVehicle?.registration}</div>
        </div>
      ),
    },
    {
      header: 'Vehicle Expiry',
      cell: ({ row }: any) => {
        const claim = row.original;
        const mot = claim.clientVehicle?.motExpiry;
        const tax = claim.clientVehicle?.roadTaxExpiry;
        const nsl = claim.clientVehicle?.nslExpiry; 
        const ins = claim.clientVehicle?.insuranceExpiry;
        
        const checks = [
          { name: 'MOT', date: mot },
          { name: 'Tax', date: tax },
          { name: 'NSL', date: nsl },
          { name: 'Ins', date: ins },
        ];
        
        const now = new Date();
        now.setHours(0,0,0,0);

        const items = checks.map(c => {
          let d: Date | null = null;
          if (c.date) d = c.date?.toDate ? c.date.toDate() : new Date(c.date);
          if (!d || isNaN(d.getTime())) return null;
          
          d.setHours(0,0,0,0);
          const diff = differenceInDays(d, now);
          const formattedDate = format(d, 'dd/MM/yyyy');
          
          const isRed = diff <= 60;
          let displayStatus = formattedDate;
          if (diff < 0) {
            displayStatus = `${formattedDate} (Expired)`;
          } else if (diff <= 60) {
            displayStatus = `${formattedDate} (In ${diff}d)`;
          }
          
          return { name: c.name, status: displayStatus, isRed };
        }).filter(Boolean);
        
        if (items.length === 0) return <span className="text-gray-400 text-xs">-</span>;
        
        return (
          <div className="flex flex-col gap-1 max-w-[150px]">
            {items.map((a: any, i) => (
               <div 
                 key={i} 
                 className={`text-[11px] font-semibold px-1.5 py-0.5 rounded border leading-tight whitespace-nowrap overflow-hidden text-ellipsis ${
                   a.isRed 
                    ? 'bg-red-50 text-red-700 border-red-200' 
                    : 'bg-gray-50 text-gray-700 border-gray-200'
                 }`}
               >
                 {a.name}: {a.status}
               </div>
            ))}
          </div>
        );
      }
    },
    {
      header: 'Incident Details',
      cell: ({ row }: any) => (
        <div>
          <div className="text-sm font-medium"> 
            {format(new Date(row.original.incidentDetails.date), 'dd/MM/yyyy')}
          </div>
          <div className="text-sm text-gray-500">{row.original.incidentDetails.time}</div>
        </div>
      ),
    },
    {
      header: 'Third Party',
      cell: ({ row }: any) => (
        <div>
          <div className="font-medium">{row.original.thirdParty.name}</div>
          <div className="text-sm text-gray-500">{row.original.thirdParty.registration}</div>
          <div className="text-sm text-gray-500">
            {row.original.thirdParty.phone && <a href={`tel:${row.original.thirdParty.phone}`} className="text-blue-600 hover:underline" onClick={e => e.stopPropagation()}>{row.original.thirdParty.phone}</a>}
          </div>
        </div>
      ),
    },
    {
      header: 'Type & Progress',
      cell: ({ row }: any) => {
        const claim = row.original;
        const { updatedAt } = claim;
        const displayStatus = deriveDisplayStatus(claim);
        const daysSinceUpdate = differenceInDays(new Date(), new Date(updatedAt));
        const showWarning = displayStatus !== 'Claim Completed - Record Archived';
        const isYellow = showWarning && daysSinceUpdate > 0 && daysSinceUpdate < 7;
        const isRed = showWarning && daysSinceUpdate >= 7;

        return (
          <div className={['p-2 rounded max-w-xs', isYellow ? 'bg-yellow-50' : '', isRed ? 'bg-red-50' : ''].join(' ')}>
            <div className="flex flex-wrap gap-1">
              <StatusBadge status={claim.claimType} />
              <StatusBadge status={claim.claimReason} />
              <StatusBadge status={claim.caseProgress} />
              <StatusBadge status={displayStatus} />
            </div>

            {showWarning && daysSinceUpdate > 0 && (
              <div className={`mt-1 text-xs font-medium ${isRed ? 'text-red-800' : 'text-yellow-800'}`}>
                {daysSinceUpdate} day{daysSinceUpdate !== 1 ? 's' : ''} ago
              </div>
            )}
          </div>
        );
      },
    },
    {
      header: 'Actions',
      cell: ({ row }: any) => {
        const claim = row.original;
        const legalDetails = resolveLegalHandlerDetails(claim);
        const hasLegalHandler = !!(legalDetails.legal_handler_name || legalDetails.legal_handler_firm || legalDetails.legal_handler_email || legalDetails.legal_handler_phone);

        return (
          <ClaimRowActions
            claim={claim}
            hasLegalHandler={hasLegalHandler}
            legalDetails={legalDetails}
            onWhatsApp={onWhatsApp}
            onEmail={onEmail}
            onNotes={onNotes}
            onUpdateProgress={onUpdateProgress}
            onView={onView}
            onEdit={onEdit}
            onDelete={onDelete}
            onGeneratePdf={onGeneratePdf}
            can={can}
          />
        );
      },
    },
  ];

  return <DataTable data={claims} columns={columns} onRowClick={claim => can('claims', 'view') && onView(claim)} />;
};

interface ClaimRowActionsProps {
  claim: Claim;
  hasLegalHandler: boolean;
  legalDetails: ReturnType<typeof resolveLegalHandlerDetails>;
  onWhatsApp?: (claim: Claim, recipient?: 'client' | 'legalHandler') => void;
  onEmail?: (claim: Claim, recipient?: 'client' | 'legalHandler') => void;
  onNotes: (claim: Claim) => void;
  onUpdateProgress: (claim: Claim) => void;
  onView: (claim: Claim) => void;
  onEdit: (claim: Claim) => void;
  onDelete: (claim: Claim) => void;
  onGeneratePdf: (claim: Claim) => void;
  can: (resource: any, action: any) => boolean;
}

const ClaimRowActions: React.FC<ClaimRowActionsProps> = ({
  claim,
  hasLegalHandler,
  legalDetails,
  onWhatsApp,
  onEmail,
  onNotes,
  onUpdateProgress,
  onView,
  onEdit,
  onDelete,
  onGeneratePdf,
  can,
}) => {
  const [activeMenu, setActiveMenu] = useState<'whatsapp' | 'email' | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setActiveMenu(null);
      }
    };
    if (activeMenu) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, [activeMenu]);

  return (
    <div className="flex items-center space-x-2 relative" ref={menuRef}>
      {/* WhatsApp Action with Recipient Selector */}
      {onWhatsApp && can('claims', 'whatsapp') && (
        <div className="relative inline-block text-left">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setActiveMenu(activeMenu === 'whatsapp' ? null : 'whatsapp');
            }}
            className="text-emerald-600 hover:text-emerald-800 transition-colors p-1 rounded hover:bg-emerald-50 flex items-center gap-0.5"
            title="Send WhatsApp Message"
            aria-label="Send WhatsApp message"
          >
            <MessageCircle className="h-4 w-4" />
            <ChevronDown className="h-2.5 w-2.5 text-emerald-500" />
          </button>

          {activeMenu === 'whatsapp' && (
            <div
              onClick={(e) => e.stopPropagation()}
              className="absolute left-0 mt-1 w-56 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-50 py-1 text-xs divide-y divide-gray-100"
            >
              <div className="px-3 py-1.5 text-[11px] font-semibold text-gray-500 uppercase tracking-wider bg-gray-50">
                Send WhatsApp To:
              </div>
              <button
                type="button"
                onClick={() => {
                  setActiveMenu(null);
                  onWhatsApp(claim, 'client');
                }}
                className="w-full text-left px-3 py-2 flex items-start gap-2 hover:bg-emerald-50 transition-colors text-gray-800"
              >
                <User className="h-4 w-4 text-emerald-600 mt-0.5 flex-shrink-0" />
                <div className="truncate">
                  <div className="font-semibold text-gray-900">Send to Client</div>
                  <div className="text-[11px] text-gray-500 truncate">
                    {claim.clientInfo?.name || 'Client'} ({claim.clientInfo?.phone || 'No phone'})
                  </div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => {
                  setActiveMenu(null);
                  onWhatsApp(claim, 'legalHandler');
                }}
                className="w-full text-left px-3 py-2 flex items-start gap-2 hover:bg-purple-50 transition-colors text-gray-800"
              >
                <Scale className="h-4 w-4 text-purple-600 mt-0.5 flex-shrink-0" />
                <div className="truncate">
                  <div className="font-semibold text-purple-900">Send to Legal Handler</div>
                  <div className="text-[11px] text-gray-500 truncate">
                    {legalDetails.legal_handler_name || legalDetails.legal_handler_firm || 'Legal Handler'}{' '}
                    {legalDetails.legal_handler_phone ? `(${legalDetails.legal_handler_phone})` : '(Directory / Manual)'}
                  </div>
                </div>
              </button>
            </div>
          )}
        </div>
      )}

      {/* Email Action with Recipient Selector */}
      {onEmail && can('claims', 'email') && (
        <div className="relative inline-block text-left">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setActiveMenu(activeMenu === 'email' ? null : 'email');
            }}
            className="text-indigo-600 hover:text-indigo-800 transition-colors p-1 rounded hover:bg-indigo-50 flex items-center gap-0.5"
            title="Send Email"
            aria-label="Send email"
          >
            <Mail className="h-4 w-4" />
            <ChevronDown className="h-2.5 w-2.5 text-indigo-500" />
          </button>

          {activeMenu === 'email' && (
            <div
              onClick={(e) => e.stopPropagation()}
              className="absolute left-0 mt-1 w-64 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-50 py-1 text-xs divide-y divide-gray-100"
            >
              <div className="px-3 py-1.5 text-[11px] font-semibold text-gray-500 uppercase tracking-wider bg-gray-50">
                Send Email To:
              </div>
              <button
                type="button"
                onClick={() => {
                  setActiveMenu(null);
                  onEmail(claim, 'client');
                }}
                className="w-full text-left px-3 py-2 flex items-start gap-2 hover:bg-indigo-50 transition-colors text-gray-800"
              >
                <User className="h-4 w-4 text-indigo-600 mt-0.5 flex-shrink-0" />
                <div className="truncate">
                  <div className="font-semibold text-gray-900">Send to Client</div>
                  <div className="text-[11px] text-gray-500 truncate">
                    {claim.clientInfo?.name || 'Client'} ({claim.clientInfo?.email || 'No email'})
                  </div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => {
                  setActiveMenu(null);
                  onEmail(claim, 'legalHandler');
                }}
                className="w-full text-left px-3 py-2 flex items-start gap-2 hover:bg-purple-50 transition-colors text-gray-800"
              >
                <Scale className="h-4 w-4 text-purple-600 mt-0.5 flex-shrink-0" />
                <div className="truncate">
                  <div className="flex items-center gap-1 font-semibold text-purple-900">
                    <span>Send to Legal Handler</span>
                    <span className="text-[10px] bg-emerald-100 text-emerald-800 px-1.5 py-0.2 rounded font-normal">
                      + Claim Card
                    </span>
                  </div>
                  <div className="text-[11px] text-gray-500 truncate">
                    {legalDetails.legal_handler_name || legalDetails.legal_handler_firm || 'Legal Handler'}{' '}
                    {legalDetails.legal_handler_email ? `(${legalDetails.legal_handler_email})` : '(Directory / Manual)'}
                  </div>
                </div>
              </button>
            </div>
          )}
        </div>
      )}

      {can('claims', 'note') && <button onClick={e => { e.stopPropagation(); onNotes(claim); }} className="text-gray-600 hover:text-gray-800" title="Notes"><MessageSquare className="h-4 w-4" /></button>}
      {can('claims', 'state') && <button onClick={e => { e.stopPropagation(); onUpdateProgress(claim); }} className="text-blue-600 hover:text-blue-800" title="Update Progress"><Clock className="h-4 w-4" /></button>}
      {can('claims', 'view') && <button onClick={e => { e.stopPropagation(); onView(claim); }} className="text-blue-600 hover:text-blue-800" title="View Details"><Eye className="h-4 w-4" /></button>}
      {can('claims', 'update') && <button onClick={e => { e.stopPropagation(); onEdit(claim); }} className="text-blue-600 hover:text-blue-800" title="Edit Claim"><Edit className="h-4 w-4" /></button>}
      {can('claims', 'delete') && <button onClick={e => { e.stopPropagation(); onDelete(claim); }} className="text-red-600 hover:text-red-800" title="Delete Claim"><Trash2 className="h-4 w-4" /></button>}
      {can('claims', 'singleDoc') && <button onClick={e => { e.stopPropagation(); onGeneratePdf(claim); }} className="text-green-600 hover:text-green-800" title="Generate PDF"><FileText className="h-4 w-4" /></button>}
    </div>
  );
};

export default ClaimTable;