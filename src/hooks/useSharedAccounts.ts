// src/hooks/useSharedAccounts.ts
import { useState, useEffect, useCallback } from 'react';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Account } from '../types/finance';
import toast from 'react-hot-toast';

// Shared module-level singleton in-memory cache to guarantee identical data array
let cachedAccounts: Account[] = [];
let isInitialized = false;
let activeListenersCount = 0;
let unsubscribeFirestore: (() => void) | null = null;
const subscribers = new Set<(accounts: Account[]) => void>();

// Standardize and normalize an account record from Firestore / API
export const normalizeAccount = (data: any, id: string): Account => {
  const name = data.name || data.accountName || 'Unnamed Account';
  const balance = typeof data.balance === 'number' ? data.balance : Number(data.balance || 0);
  
  let createdAt = new Date();
  if (data.createdAt) {
    if (typeof data.createdAt.toDate === 'function') createdAt = data.createdAt.toDate();
    else if (data.createdAt instanceof Date) createdAt = data.createdAt;
    else createdAt = new Date(data.createdAt);
  }

  let updatedAt = new Date();
  if (data.updatedAt) {
    if (typeof data.updatedAt.toDate === 'function') updatedAt = data.updatedAt.toDate();
    else if (data.updatedAt instanceof Date) updatedAt = data.updatedAt;
    else updatedAt = new Date(data.updatedAt);
  }

  return {
    id,
    name,
    accountName: name, // Standardized property for Invoice & Finance dropdowns
    accountType: data.accountType || 'general',
    balance,
    vehicleId: data.vehicleId || null,
    vehicleName: data.vehicleName || null,
    isSharedOwnership: Boolean(data.isSharedOwnership),
    sharedOwnership: data.sharedOwnership || null,
    createdAt,
    updatedAt,
  };
};

// Global broadcast to all active subscribers across pages
const notifySubscribers = (accounts: Account[]) => {
  cachedAccounts = accounts;
  subscribers.forEach((cb) => cb(accounts));
};

// Initialize the shared realtime subscription (single source of truth)
const initSharedAccountsSubscription = () => {
  if (unsubscribeFirestore) return;

  try {
    const q = query(collection(db, 'accounts'), orderBy('name'));
    unsubscribeFirestore = onSnapshot(
      q,
      (snapshot) => {
        const list: Account[] = snapshot.docs.map((docSnap) =>
          normalizeAccount(docSnap.data(), docSnap.id)
        );
        notifySubscribers(list);
        isInitialized = true;

        // Sync with backend /api/accounts cache asynchronously
        try {
          fetch('/api/accounts/sync', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ accounts: list }),
          }).catch(() => {});
        } catch {}
      },
      (err) => {
        console.error('Shared accounts snapshot error:', err);
        // Fallback: try fetching from backend /api/accounts
        fetch('/api/accounts')
          .then((res) => res.json())
          .then((json) => {
            if (json?.data && Array.isArray(json.data)) {
              const list = json.data.map((item: any) => normalizeAccount(item, item.id));
              notifySubscribers(list);
            }
          })
          .catch(() => {
            toast.error('Failed to load accounts');
          });
      }
    );
  } catch (err) {
    console.error('Failed to initialize shared accounts listener:', err);
  }
};

/**
 * useSharedAccounts()
 * Unified, globally shared Account list for Invoice and Finance pages.
 * Ensures single source of truth, instant cache invalidation, and synchronized state.
 */
export const useSharedAccounts = () => {
  const [accounts, setAccounts] = useState<Account[]>(cachedAccounts);
  const [loading, setLoading] = useState<boolean>(!isInitialized && cachedAccounts.length === 0);

  useEffect(() => {
    activeListenersCount++;
    initSharedAccountsSubscription();

    // Subscribe component to cache updates
    const handleUpdate = (updatedList: Account[]) => {
      setAccounts(updatedList);
      setLoading(false);
    };

    subscribers.add(handleUpdate);

    // If cache already has data, set it immediately
    if (cachedAccounts.length > 0) {
      setAccounts(cachedAccounts);
      setLoading(false);
    }

    // Listen to window-level custom events (e.g. accountsModified or accountsInvalidated)
    const handleAccountInvalidation = () => {
      // Re-trigger from backend or wait for Firestore onSnapshot
      fetch('/api/accounts')
        .then((res) => res.json())
        .then((json) => {
          if (json?.data && Array.isArray(json.data)) {
            const list = json.data.map((item: any) => normalizeAccount(item, item.id));
            notifySubscribers(list);
          }
        })
        .catch(() => {});
    };

    window.addEventListener('accountsInvalidated', handleAccountInvalidation);

    return () => {
      subscribers.delete(handleUpdate);
      window.removeEventListener('accountsInvalidated', handleAccountInvalidation);
      activeListenersCount--;
      if (activeListenersCount <= 0 && unsubscribeFirestore) {
        unsubscribeFirestore();
        unsubscribeFirestore = null;
      }
    };
  }, []);

  // Invalidate cache and broadcast to all pages
  const invalidateAccountsCache = useCallback(() => {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('accountsInvalidated'));
    }
  }, []);

  return {
    accounts,
    loading,
    invalidateAccountsCache,
  };
};

export default useSharedAccounts;
