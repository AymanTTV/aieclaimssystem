import React, { useEffect, useState } from 'react';
import { collection, getDocs, query, where, orderBy } from 'firebase/firestore';
import { format } from 'date-fns';
import { db } from '../lib/firebase';

const EmailHistory = () => {
  const [logs, setLogs] = useState<any[]>([]);
  const [typeFilter, setTypeFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        const q = query(collection(db, 'emailLogs'), orderBy('sentAt', 'desc'));
        const snapshot = await getDocs(q);
        const emails = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        }));
        setLogs(emails);
      } catch (err) {
        console.error('Error fetching email logs:', err);
      }
    };

    fetchLogs();
  }, []);

  const filteredLogs = logs.filter(log => {
    const sentAt = log.sentAt?.toDate?.() || new Date();

    const afterFrom = dateFrom ? sentAt >= new Date(dateFrom) : true;
    const beforeTo = dateTo ? sentAt <= new Date(dateTo) : true;
    const matchesType = typeFilter ? log.emailType === typeFilter : true;

    return afterFrom && beforeTo && matchesType;
  });

  return (
    <div className="mt-10">
      <h2 className="text-xl font-bold mb-4">Email Send History</h2>

      <div className="flex gap-4 flex-wrap mb-4 bg-white p-4 rounded-2xl border border-[#E2E8F0] shadow-xs">
        <div>
          <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">Email Type</label>
          <select
            value={typeFilter}
            onChange={e => setTypeFilter(e.target.value)}
            className="bg-white border-[1.5px] border-[#CBD5E1] text-[#0F172A] rounded-xl px-3 py-2 text-sm focus:ring-1 focus:ring-blue-500 focus:outline-none"
          >
            <option value="">All</option>
            <option value="custom">Custom</option>
            <option value="rental">Rental</option>
            <option value="maintenance">Maintenance</option>
            <option value="invoice">Invoice</option>
            <option value="claim">Claim</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">From</label>
          <input
            type="date"
            value={dateFrom}
            onChange={e => setDateFrom(e.target.value)}
            className="bg-white border-[1.5px] border-[#CBD5E1] text-[#0F172A] rounded-xl px-3 py-2 text-sm focus:ring-1 focus:ring-blue-500 focus:outline-none"
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">To</label>
          <input
            type="date"
            value={dateTo}
            onChange={e => setDateTo(e.target.value)}
            className="bg-white border-[1.5px] border-[#CBD5E1] text-[#0F172A] rounded-xl px-3 py-2 text-sm focus:ring-1 focus:ring-blue-500 focus:outline-none"
          />
        </div>
      </div>

      <div className="rounded-2xl border border-[#E2E8F0] shadow-xs overflow-hidden bg-white">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-[#F8FAFC] text-[#334155] border-b-2 border-[#E2E8F0]">
              <tr className="border-b-2 border-[#E2E8F0]">
                <th className="px-5 py-4 text-xs font-semibold text-[#334155] uppercase tracking-wider select-none whitespace-nowrap">Date</th>
                <th className="px-5 py-4 text-xs font-semibold text-[#334155] uppercase tracking-wider select-none whitespace-nowrap">Email Type</th>
                <th className="px-5 py-4 text-xs font-semibold text-[#334155] uppercase tracking-wider select-none whitespace-nowrap">Recipient</th>
                <th className="px-5 py-4 text-xs font-semibold text-[#334155] uppercase tracking-wider select-none whitespace-nowrap">Subject</th>
                <th className="px-5 py-4 text-xs font-semibold text-[#334155] uppercase tracking-wider select-none whitespace-nowrap">Sent By</th>
              </tr>
            </thead>
            <tbody>
              {filteredLogs.map((log, idx) => {
                const isEven = idx % 2 === 1;
                const rowBg = isEven ? 'bg-[#EEF5FD]' : 'bg-white';
                return (
                  <tr key={log.id} className={`group border-b border-[#E2E8F0] ${rowBg} hover:bg-[#DCEBFA] transition-all duration-150 ease-in-out`}>
                    <td className="px-5 py-3.5 whitespace-nowrap text-sm text-slate-800 font-medium">
                      {format(log.sentAt?.toDate?.() || new Date(), 'yyyy-MM-dd HH:mm')}
                    </td>
                    <td className="px-5 py-3.5 whitespace-nowrap text-sm text-slate-800 font-medium capitalize">{log.emailType}</td>
                    <td className="px-5 py-3.5 whitespace-nowrap text-sm text-slate-800 font-medium">{log.recipientEmail}</td>
                    <td className="px-5 py-3.5 text-sm font-semibold text-slate-900">{log.subject}</td>
                    <td className="px-5 py-3.5 whitespace-nowrap text-sm text-slate-700 font-medium">{log.sentBy || 'system'}</td>
                  </tr>
                );
              })}
              {filteredLogs.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-5 py-12 text-center text-sm text-slate-500 font-medium">
                    No email logs found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Consistent Light Footer */}
        <div className="bg-[#F8FAFC] border-t border-[#E2E8F0] px-5 py-3.5 flex items-center justify-between text-xs text-slate-600">
          <div>
            Showing <span className="font-bold text-slate-900">{filteredLogs.length}</span> log{filteredLogs.length === 1 ? '' : 's'}
          </div>
          <div className="text-slate-500">
            Email System Records
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmailHistory;
