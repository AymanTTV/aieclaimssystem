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
      <div className="flex space-x-4">
        <select
          value={filterType}
          onChange={e => setFilterType(e.target.value)}
          className="border rounded p-2"
        >
          <option value="all">All Types</option>
          <option value="custom">Custom</option>
          <option value="rental">Rental</option>
          <option value="maintenance">Maintenance</option>
          <option value="invoice">Invoice</option>
          <option value="claim">Claim</option>
        </select>

        <div>
          <label className="block text-sm">From:</label>
          <input
            type="date"
            value={startDate}
            onChange={e => setStartDate(e.target.value)}
            className="border rounded p-2"
          />
        </div>

        <div>
          <label className="block text-sm">To:</label>
          <input
            type="date"
            value={endDate}
            onChange={e => setEndDate(e.target.value)}
            className="border rounded p-2"
          />
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="min-w-full bg-white border">
          <thead>
            <tr className="bg-gray-100">
              <th className="px-4 py-2 border">Date Sent</th>
              <th className="px-4 py-2 border">Type</th>
              <th className="px-4 py-2 border">Template</th>
              <th className="px-4 py-2 border">Recipient</th>
              <th className="px-4 py-2 border">Subject</th>
              <th className="px-4 py-2 border">Sent By</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(rec => {
              const date = new Date(rec.dateSent.seconds * 1000);
              return (
                <tr key={rec.id} className="hover:bg-gray-50">
                  <td className="px-4 py-2 border">{format(date, 'dd/MM/yyyy HH:mm')}</td>
                  <td className="px-4 py-2 border">{rec.emailType}</td>
                  <td className="px-4 py-2 border">{rec.template}</td>
                  <td className="px-4 py-2 border">{rec.toName} ({rec.toEmail})</td>
                  <td className="px-4 py-2 border">{rec.subject}</td>
                  <td className="px-4 py-2 border">{rec.sentBy}</td>
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="text-center py-4">
                  No records found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default EmailHistory;
