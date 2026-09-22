// src/pages/EmailHistory.tsx
import React, { useState, useEffect, useContext } from 'react';
import { collection, getDocs, query, orderBy, where } from 'firebase/firestore';
import { db } from '../lib/firebase';
import AuthContext from '../context/AuthContext';
import { format } from 'date-fns';

interface EmailHistoryRecord {
  id: string;
  toName: string;
  toEmail: string;
  emailType: string;
  template: string;
  subject: string;
  message: string;
  sentBy: string;
  recordId?: string;
  dateSent: { seconds: number; nanoseconds: number };
}

const EmailHistory: React.FC = () => {
  const { user } = useContext(AuthContext);
  const [history, setHistory] = useState<EmailHistoryRecord[]>([]);
  const [filterType, setFilterType] = useState<string>('all');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  useEffect(() => {
    const fetchHistory = async () => {
      let q = query(
        collection(db, 'emailHistory'),
        orderBy('dateSent', 'desc')
      );
      const snap = await getDocs(q);
      const data = snap.docs.map(d => ({ id: d.id, ...(d.data() as any) }));
      setHistory(data);
    };
    fetchHistory();
  }, []);

  const filtered = history.filter(rec => {
    if (filterType !== 'all' && rec.emailType !== filterType) return false;
    const sent = rec.dateSent.seconds * 1000;
    if (startDate && sent < new Date(startDate).getTime()) return false;
    if (endDate && sent > new Date(endDate).getTime() + 86400000) return false;
    return true;
  });

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Email History</h1>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4 bg-white p-4 rounded-2xl border border-[#E2E8F0] shadow-xs">
        <div>
          <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">Type</label>
          <select
            value={filterType}
            onChange={e => setFilterType(e.target.value)}
            className="bg-white border-[1.5px] border-[#CBD5E1] text-[#0F172A] rounded-xl px-3 py-2 text-sm focus:ring-1 focus:ring-blue-500 focus:outline-none"
          >
            <option value="all">All Types</option>
            <option value="custom">Custom</option>
            <option value="rental">Rental</option>
            <option value="maintenance">Maintenance</option>
            <option value="invoice">Invoice</option>
            <option value="claim">Claim</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">From:</label>
          <input
            type="date"
            value={startDate}
            onChange={e => setStartDate(e.target.value)}
            className="bg-white border-[1.5px] border-[#CBD5E1] text-[#0F172A] rounded-xl px-3 py-2 text-sm focus:ring-1 focus:ring-blue-500 focus:outline-none"
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">To:</label>
          <input
            type="date"
            value={endDate}
            onChange={e => setEndDate(e.target.value)}
            className="bg-white border-[1.5px] border-[#CBD5E1] text-[#0F172A] rounded-xl px-3 py-2 text-sm focus:ring-1 focus:ring-blue-500 focus:outline-none"
          />
        </div>
      </div>

      {/* Table */}
      <div className="rounded-2xl border border-[#E2E8F0] shadow-xs overflow-hidden bg-white">
        <div className="overflow-x-auto">
          <table className="min-w-full border-collapse">
            <thead className="bg-[#F8FAFC] text-[#334155] border-b-2 border-[#E2E8F0]">
              <tr className="border-b-2 border-[#E2E8F0]">
                <th className="px-5 py-4 text-xs font-semibold text-[#334155] uppercase tracking-wider text-left select-none whitespace-nowrap">Date Sent</th>
                <th className="px-5 py-4 text-xs font-semibold text-[#334155] uppercase tracking-wider text-left select-none whitespace-nowrap">Type</th>
                <th className="px-5 py-4 text-xs font-semibold text-[#334155] uppercase tracking-wider text-left select-none whitespace-nowrap">Template</th>
                <th className="px-5 py-4 text-xs font-semibold text-[#334155] uppercase tracking-wider text-left select-none whitespace-nowrap">Recipient</th>
                <th className="px-5 py-4 text-xs font-semibold text-[#334155] uppercase tracking-wider text-left select-none whitespace-nowrap">Subject</th>
                <th className="px-5 py-4 text-xs font-semibold text-[#334155] uppercase tracking-wider text-left select-none whitespace-nowrap">Sent By</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((rec, idx) => {
                const date = new Date(rec.dateSent.seconds * 1000);
                const isEven = idx % 2 === 1;
                const rowBg = isEven ? 'bg-[#EEF5FD]' : 'bg-white';
                return (
                  <tr key={rec.id} className={`group border-b border-[#E2E8F0] ${rowBg} hover:bg-[#DCEBFA] transition-all duration-150 ease-in-out`}>
                    <td className="px-5 py-3.5 whitespace-nowrap text-sm text-slate-800 font-medium">{format(date, 'dd/MM/yyyy HH:mm')}</td>
                    <td className="px-5 py-3.5 whitespace-nowrap text-sm text-slate-800 font-medium">{rec.emailType}</td>
                    <td className="px-5 py-3.5 whitespace-nowrap text-sm text-slate-800 font-medium">{rec.template}</td>
                    <td className="px-5 py-3.5 whitespace-nowrap text-sm text-slate-800 font-medium">{rec.toName} ({rec.toEmail})</td>
                    <td className="px-5 py-3.5 text-sm font-semibold text-slate-900">{rec.subject}</td>
                    <td className="px-5 py-3.5 whitespace-nowrap text-sm text-slate-700 font-medium">{rec.sentBy}</td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-sm text-slate-500 font-medium">
                    No records found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Consistent Light Footer */}
        <div className="bg-[#F8FAFC] border-t border-[#E2E8F0] px-5 py-3.5 flex items-center justify-between text-xs text-slate-600">
          <div>
            Showing <span className="font-bold text-slate-900">{filtered.length}</span> log{filtered.length === 1 ? '' : 's'}
          </div>
          <div className="text-slate-500">
            Email Delivery Log
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmailHistory;
