// src/components/common/CommunicationHistoryTimeline.tsx

import React, { useState, useMemo } from 'react';
import {
  MessageCircle,
  Mail,
  Search,
  Filter,
  Calendar,
  User,
  Paperclip,
  CheckCircle2,
  AlertCircle,
  Clock,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  ExternalLink,
  Shield,
  FileText,
  Download,
} from 'lucide-react';
import { format, isToday, isYesterday, formatDistanceToNow, isAfter, isBefore, subDays } from 'date-fns';
import { useCommunicationLogs, UseCommunicationLogsOptions } from '../../hooks/useCommunicationLogs';
import { CommunicationLog } from '../../types/communicationLog';

interface CommunicationHistoryTimelineProps extends UseCommunicationLogsOptions {
  title?: string;
  description?: string;
  className?: string;
  emptyMessage?: string;
  compact?: boolean;
}

export const CommunicationHistoryTimeline: React.FC<CommunicationHistoryTimelineProps> = ({
  recordId,
  customerId,
  sourceModule,
  matchKeys,
  title = 'Communication Audit Trail',
  description = 'Complete chronological log of all outbound WhatsApp messages and emails.',
  className = '',
  emptyMessage = 'No communication history recorded for this entity yet.',
  compact = false,
}) => {
  const { logs, loading, error } = useCommunicationLogs({
    recordId,
    customerId,
    sourceModule,
    matchKeys,
  });

  // Filter & Search states
  const [searchTerm, setSearchTerm] = useState('');
  const [channelFilter, setChannelFilter] = useState<'all' | 'WhatsApp' | 'Email'>('all');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | '7days' | '30days'>('all');
  const [expandedLogIds, setExpandedLogIds] = useState<Record<string, boolean>>({});

  // Toggle individual message expand
  const toggleExpand = (id: string) => {
    setExpandedLogIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  // Expand / collapse all
  const toggleExpandAll = () => {
    const allExpanded = logs.every((l) => expandedLogIds[l.id]);
    if (allExpanded) {
      setExpandedLogIds({});
    } else {
      const next: Record<string, boolean> = {};
      logs.forEach((l) => {
        next[l.id] = true;
      });
      setExpandedLogIds(next);
    }
  };

  // Distinct roles found in current logs
  const availableRoles = useMemo(() => {
    const roles = new Set<string>();
    logs.forEach((l) => {
      if (l.recipient_role) roles.add(l.recipient_role);
    });
    return Array.from(roles);
  }, [logs]);

  // Filtered logs
  const filteredLogs = useMemo(() => {
    const now = new Date();
    return logs.filter((log) => {
      // Channel
      if (channelFilter !== 'all' && log.communication_channel !== channelFilter) {
        return false;
      }
      // Role
      if (roleFilter !== 'all' && log.recipient_role !== roleFilter) {
        return false;
      }
      // Date filter
      if (dateFilter === 'today' && !isToday(log.timestamp)) {
        return false;
      }
      if (dateFilter === '7days' && isBefore(log.timestamp, subDays(now, 7))) {
        return false;
      }
      if (dateFilter === '30days' && isBefore(log.timestamp, subDays(now, 30))) {
        return false;
      }
      // Search
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const match =
          log.recipient_name.toLowerCase().includes(q) ||
          log.recipient_contact.toLowerCase().includes(q) ||
          (log.subject && log.subject.toLowerCase().includes(q)) ||
          log.template_name.toLowerCase().includes(q) ||
          log.message_body.toLowerCase().includes(q) ||
          log.record_id.toLowerCase().includes(q) ||
          log.sender_user_id.toLowerCase().includes(q);
        if (!match) return false;
      }
      return true;
    });
  }, [logs, channelFilter, roleFilter, dateFilter, searchTerm]);

  // Statistics
  const stats = useMemo(() => {
    const total = logs.length;
    const whatsapp = logs.filter((l) => l.communication_channel === 'WhatsApp').length;
    const email = logs.filter((l) => l.communication_channel === 'Email').length;
    return { total, whatsapp, email };
  }, [logs]);

  const formatTimestamp = (date: Date) => {
    try {
      const formattedDate = format(date, 'dd/MM/yyyy HH:mm');
      const relative = formatDistanceToNow(date, { addSuffix: true });
      return { formattedDate, relative };
    } catch {
      return { formattedDate: 'N/A', relative: '' };
    }
  };

  const handleExportCSV = () => {
    if (filteredLogs.length === 0) return;
    const headers = [
      'Timestamp',
      'Channel',
      'Recipient Role',
      'Recipient Name',
      'Recipient Contact',
      'Module',
      'Record ID',
      'Template Name',
      'Sender',
      'Status',
      'Message Preview',
    ];
    const rows = filteredLogs.map((l) => [
      `"${format(l.timestamp, 'yyyy-MM-dd HH:mm:ss')}"`,
      `"${l.communication_channel}"`,
      `"${l.recipient_role}"`,
      `"${l.recipient_name.replace(/"/g, '""')}"`,
      `"${l.recipient_contact}"`,
      `"${l.source_module}"`,
      `"${l.record_id}"`,
      `"${l.template_name.replace(/"/g, '""')}"`,
      `"${l.sender_user_id}"`,
      `"${l.delivery_status}"`,
      `"${l.message_body.substring(0, 150).replace(/"/g, '""').replace(/\n/g, ' ')}"`,
    ]);
    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `communication_audit_${recordId || 'log'}_${format(new Date(), 'yyyyMMdd_HHmmss')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Header with Title and Quick Stats */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
        <div>
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-indigo-600" />
            <h3 className="text-base font-bold text-slate-900">{title}</h3>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
              {stats.total} {stats.total === 1 ? 'Entry' : 'Entries'}
            </span>
          </div>
          {description && <p className="text-xs text-slate-500 mt-0.5">{description}</p>}
        </div>

        {/* Quick Channel Stats Pills & Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-semibold">
            <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
            <span>{stats.whatsapp} WhatsApp</span>
          </div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-50 text-blue-800 border border-blue-200 text-xs font-semibold">
            <Mail className="w-3.5 h-3.5 text-blue-600" />
            <span>{stats.email} Emails</span>
          </div>
          {filteredLogs.length > 0 && (
            <button
              onClick={handleExportCSV}
              type="button"
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors"
              title="Export filtered logs to CSV"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export CSV</span>
            </button>
          )}
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-3">
        <div className="flex flex-col md:flex-row items-stretch md:items-center gap-2.5">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search recipient, phone, email, template, or message text..."
              className="w-full pl-9 pr-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            )}
          </div>

          {/* Channel Filter */}
          <div className="flex items-center gap-1 bg-white p-1 rounded-lg border border-slate-200 shrink-0">
            <button
              type="button"
              onClick={() => setChannelFilter('all')}
              className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-colors ${
                channelFilter === 'all'
                  ? 'bg-slate-800 text-white shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All
            </button>
            <button
              type="button"
              onClick={() => setChannelFilter('WhatsApp')}
              className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-md transition-colors ${
                channelFilter === 'WhatsApp'
                  ? 'bg-emerald-600 text-white shadow-2xs'
                  : 'text-emerald-700 hover:bg-emerald-50'
              }`}
            >
              <MessageCircle className="w-3 h-3" />
              <span>WhatsApp</span>
            </button>
            <button
              type="button"
              onClick={() => setChannelFilter('Email')}
              className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-md transition-colors ${
                channelFilter === 'Email'
                  ? 'bg-blue-600 text-white shadow-2xs'
                  : 'text-blue-700 hover:bg-blue-50'
              }`}
            >
              <Mail className="w-3 h-3" />
              <span>Email</span>
            </button>
          </div>

          {/* Role Filter */}
          {availableRoles.length > 0 && (
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-500 shrink-0"
            >
              <option value="all">All Roles</option>
              {availableRoles.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          )}

          {/* Date Quick Filter */}
          <select
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value as any)}
            className="bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-500 shrink-0"
          >
            <option value="all">All Dates</option>
            <option value="today">Today</option>
            <option value="7days">Last 7 Days</option>
            <option value="30days">Last 30 Days</option>
          </select>

          {/* Expand/Collapse All */}
          {filteredLogs.length > 0 && (
            <button
              type="button"
              onClick={toggleExpandAll}
              className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold px-2 py-1.5 bg-white border border-slate-200 rounded-lg hover:bg-slate-100 transition-colors shrink-0"
            >
              {logs.every((l) => expandedLogIds[l.id]) ? 'Collapse All' : 'Expand All'}
            </button>
          )}
        </div>
      </div>

      {/* Loading & Error States */}
      {loading && (
        <div className="py-8 text-center text-xs text-slate-500 flex items-center justify-center gap-2">
          <RefreshCw className="w-4 h-4 animate-spin text-indigo-600" />
          <span>Loading communication audit trail...</span>
        </div>
      )}

      {!loading && error && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>Error loading communication logs: {error.message}</span>
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && filteredLogs.length === 0 && (
        <div className="py-12 px-4 text-center bg-white rounded-xl border border-dashed border-slate-300">
          <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 mx-auto flex items-center justify-center mb-3">
            <MessageCircle className="w-6 h-6" />
          </div>
          <h4 className="text-sm font-bold text-slate-700">No Communications Found</h4>
          <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
            {searchTerm || channelFilter !== 'all' || roleFilter !== 'all' || dateFilter !== 'all'
              ? 'No communication records match your filter criteria. Try adjusting the search or filters.'
              : emptyMessage}
          </p>
        </div>
      )}

      {/* Chronological Timeline Feed */}
      {!loading && !error && filteredLogs.length > 0 && (
        <div className="space-y-3">
          {filteredLogs.map((log) => {
            const isWhatsApp = log.communication_channel === 'WhatsApp';
            const isExpanded = !!expandedLogIds[log.id];
            const { formattedDate, relative } = formatTimestamp(log.timestamp);
            const attachmentsCount = log.attachments?.length || 0;

            return (
              <div
                key={log.id}
                className="bg-white rounded-xl border border-slate-200 shadow-2xs hover:border-slate-300 transition-all overflow-hidden"
              >
                {/* Log Header Row */}
                <div className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 bg-slate-50/50 border-b border-slate-100">
                  <div className="flex items-center gap-2 flex-wrap">
                    {/* Channel Indicator Badge */}
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                        isWhatsApp
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                          : 'bg-blue-50 text-blue-700 border-blue-300'
                      }`}
                    >
                      {isWhatsApp ? <MessageCircle className="w-3.5 h-3.5" /> : <Mail className="w-3.5 h-3.5" />}
                      <span>{log.communication_channel}</span>
                    </span>

                    {/* Recipient Role & Name Badge */}
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-800 border border-slate-200">
                      <User className="w-3 h-3 text-slate-500" />
                      <span className="font-bold">{log.recipient_role}:</span>
                      <span>{log.recipient_name || 'Unnamed Recipient'}</span>
                    </span>

                    {/* Source Module & Record ID Pill */}
                    {log.source_module && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium bg-indigo-50 text-indigo-700 border border-indigo-200">
                        {log.source_module} {log.record_id ? `• #${log.record_id}` : ''}
                      </span>
                    )}

                    {/* Delivery Status */}
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold border ${
                        log.delivery_status === 'Delivered'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : log.delivery_status === 'Failed'
                          ? 'bg-rose-50 text-rose-700 border-rose-200'
                          : 'bg-teal-50 text-teal-700 border-teal-200'
                      }`}
                    >
                      <CheckCircle2 className="w-3 h-3" />
                      <span>{log.delivery_status || 'Sent'}</span>
                    </span>
                  </div>

                  {/* Timestamp Badge */}
                  <div className="flex items-center gap-2 text-xs text-slate-500 shrink-0">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    <span className="font-medium text-slate-700">{formattedDate}</span>
                    {relative && <span className="text-[11px] text-slate-400">({relative})</span>}
                  </div>
                </div>

                {/* Sub-header: Contact & Template info */}
                <div className="px-3.5 py-2 bg-white flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600 border-b border-slate-100">
                  <div className="flex items-center gap-4 flex-wrap">
                    <div>
                      <span className="text-slate-400 mr-1">To:</span>
                      <span className="font-semibold text-slate-800 font-mono text-[11px]">
                        {log.recipient_contact || 'N/A'}
                      </span>
                    </div>

                    <div>
                      <span className="text-slate-400 mr-1">Template:</span>
                      <span className="font-medium text-indigo-700 bg-indigo-50/70 px-1.5 py-0.5 rounded">
                        {log.template_name || 'Custom Message'}
                      </span>
                    </div>

                    {log.subject && (
                      <div>
                        <span className="text-slate-400 mr-1">Subject:</span>
                        <span className="font-medium text-slate-800">{log.subject}</span>
                      </div>
                    )}
                  </div>

                  <div className="text-[11px] text-slate-400">
                    <span>Sent by: </span>
                    <span className="font-medium text-slate-600">{log.sender_user_id || 'System'}</span>
                  </div>
                </div>

                {/* Message Body Content */}
                <div className="p-3.5 bg-slate-50/30">
                  <div
                    className={`text-xs text-slate-700 font-mono whitespace-pre-wrap leading-relaxed ${
                      !isExpanded ? 'max-h-24 overflow-hidden relative' : ''
                    }`}
                  >
                    {log.message_body || '(No text content)'}
                    {!isExpanded && log.message_body && log.message_body.length > 200 && (
                      <div className="absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-slate-50/90 to-transparent pointer-events-none" />
                    )}
                  </div>

                  {/* Expand / Collapse Button */}
                  {log.message_body && log.message_body.length > 200 && (
                    <button
                      type="button"
                      onClick={() => toggleExpand(log.id)}
                      className="mt-2 text-xs font-semibold text-indigo-600 hover:text-indigo-800 inline-flex items-center gap-1 transition-colors"
                    >
                      {isExpanded ? (
                        <>
                          <span>Show Less</span>
                          <ChevronUp className="w-3.5 h-3.5" />
                        </>
                      ) : (
                        <>
                          <span>Show Full Message</span>
                          <ChevronDown className="w-3.5 h-3.5" />
                        </>
                      )}
                    </button>
                  )}

                  {/* Attachments Section */}
                  {attachmentsCount > 0 && (
                    <div className="mt-3 pt-2.5 border-t border-slate-200">
                      <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                        <Paperclip className="w-3 h-3 text-slate-400" />
                        <span>Attached Documents ({attachmentsCount})</span>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {log.attachments.map((att, idx) => {
                          const isObj = typeof att === 'object' && att !== null;
                          const name = isObj ? att.name || `Document ${idx + 1}` : `Document ${idx + 1}`;
                          const url = isObj ? att.url : att;

                          return (
                            <a
                              key={idx}
                              href={url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white border border-slate-300 text-xs font-medium text-slate-700 hover:text-indigo-600 hover:border-indigo-300 hover:bg-indigo-50/50 shadow-2xs transition-all"
                            >
                              <FileText className="w-3.5 h-3.5 text-indigo-500" />
                              <span className="truncate max-w-[200px]">{name}</span>
                              <ExternalLink className="w-3 h-3 text-slate-400" />
                            </a>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default CommunicationHistoryTimeline;
