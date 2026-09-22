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

      <div className="flex gap-4 flex-wrap mb-4">
        <div>
          <label>Email Type</label>
          <select
            value={typeFilter}
            onChange={e => setTypeFilter(e.target.value)}
            className="border p-2 w-full"
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
          <label>From</label>
          <input
            type="date"
            value={dateFrom}
            onChange={e => setDateFrom(e.target.value)}
            className="border p-2 w-full"
          />
        </div>

        <div>
          <label>To</label>
          <input
            type="date"
            value={dateTo}
            onChange={e => setDateTo(e.target.value)}
            className="border p-2 w-full"
          />
        </div>
      </div>

      <div className="rounded-2xl border border-[#2B314E] shadow-xl overflow-hidden bg-white">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-[#16192B] text-white">
              <tr className="border-b border-[#2B314E]">
                <th className="px-5 py-4 text-xs font-bold text-white uppercase tracking-wider select-none whitespace-nowrap">Date</th>
                <th className="px-5 py-4 text-xs font-bold text-white uppercase tracking-wider select-none whitespace-nowrap">Email Type</th>
                <th className="px-5 py-4 text-xs font-bold text-white uppercase tracking-wider select-none whitespace-nowrap">Recipient</th>
                <th className="px-5 py-4 text-xs font-bold text-white uppercase tracking-wider select-none whitespace-nowrap">Subject</th>
                <th className="px-5 py-4 text-xs font-bold text-white uppercase tracking-wider select-none whitespace-nowrap">Sent By</th>
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

        {/* Consistent Dark Navy Footer */}
        <div className="bg-[#16192B] border-t border-[#2B314E] px-5 py-3.5 flex items-center justify-between text-xs text-slate-300">
          <div>
            Showing <span className="font-bold text-white">{filteredLogs.length}</span> log{filteredLogs.length === 1 ? '' : 's'}
          </div>
          <div className="text-slate-400">
            Email System Records
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmailHistory;
