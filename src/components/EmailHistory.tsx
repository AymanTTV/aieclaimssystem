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

      <div className="overflow-x-auto">
        <table className="w-full table-auto border">
          <thead>
            <tr className="bg-gray-100">
              <th className="border px-2 py-1">Date</th>
              <th className="border px-2 py-1">Email Type</th>
              <th className="border px-2 py-1">Recipient</th>
              <th className="border px-2 py-1">Subject</th>
              <th className="border px-2 py-1">Sent By</th>
            </tr>
          </thead>
          <tbody>
            {filteredLogs.map(log => (
              <tr key={log.id}>
                <td className="border px-2 py-1">
                  {format(log.sentAt?.toDate?.() || new Date(), 'yyyy-MM-dd HH:mm')}
                </td>
                <td className="border px-2 py-1 capitalize">{log.emailType}</td>
                <td className="border px-2 py-1">{log.recipientEmail}</td>
                <td className="border px-2 py-1">{log.subject}</td>
                <td className="border px-2 py-1">{log.sentBy || 'system'}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {filteredLogs.length === 0 && <p className="mt-4 text-gray-600">No email logs found.</p>}
      </div>
    </div>
  );
};

export default EmailHistory;
