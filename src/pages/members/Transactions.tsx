// src/pages/members/Transactions.tsx

import React, { useState, useEffect } from 'react';
import TransactionList from '../../components/finance/TransactionList';
import { useAuth } from '../../context/AuthContext';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { Loader } from 'lucide-react';
import { Transaction } from '../../types';

const Transactions: React.FC = () => {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading]           = useState(true);
  const [search, setSearch]             = useState('');

  useEffect(() => {
    // don’t fire the query until we know we have a valid user ID
    if (!user?.uid) {
      setLoading(false);
      return;
    }

    setLoading(true);
    const q = query(
      collection(db, 'transactions'),
      where('userId', '==', user.uid)
    );

    const unsubscribe = onSnapshot(
      q,
      snap => {
        const docs = snap.docs.map(d => ({
          id: d.id,
          ...(d.data() as Omit<Transaction, 'id'>)
        }));
        setTransactions(docs);
        setLoading(false);
      },
      err => {
        console.error('Error fetching transactions:', err);
        setLoading(false);
      }
    );

    return unsubscribe;
  }, [user]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader className="animate-spin h-8 w-8 text-primary" />
      </div>
    );
  }

  const filtered = transactions.filter(tx =>
    (tx.reference ?? '').toLowerCase().includes(search.toLowerCase()) ||
    (tx.category  ?? '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">My Transactions</h1>
        <input
          type="text"
          placeholder="Search…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="max-w-sm w-full px-3 py-2 border border-gray-300 rounded-md placeholder-gray-500 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
        />
      </div>

      <TransactionList
        transactions={filtered}
        title="My Transactions"
      />
    </div>
  );
};

export default Transactions;
