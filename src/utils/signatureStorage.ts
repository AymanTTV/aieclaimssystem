// src/utils/signatureStorage.ts
import { doc, getDoc, updateDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { getHireCommencementDate, formatExecutionDateTime } from './legalDocumentUtils';

const DB_NAME = 'SkylineSignaturesDB';
const DB_VERSION = 1;
const STORE_NAME = 'signatures';

// In-memory cache for ultra-fast lookup
const memorySignatureCache = new Map<string, string>();

/**
 * Opens or initializes the SkylineSignaturesDB IndexedDB instance.
 */
function openSignatureDB(): Promise<IDBDatabase | null> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      resolve(null);
      return;
    }

    try {
      const request = window.indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
          store.createIndex('customerId', 'customerId', { unique: false });
          store.createIndex('customerName', 'customerName', { unique: false });
          store.createIndex('userId', 'userId', { unique: false });
        }
      };

      request.onsuccess = () => {
        resolve(request.result);
      };

      request.onerror = (err) => {
        console.warn('[SignatureStorage] IndexedDB open error:', err);
        resolve(null);
      };
    } catch (e) {
      console.warn('[SignatureStorage] IndexedDB initialization failed:', e);
      resolve(null);
    }
  });
}

/**
 * Saves a signature image into IndexedDB and LocalStorage fallback.
 */
export async function saveSignatureToIndexedDB(
  id: string,
  signature: string,
  meta?: { customerId?: string; customerName?: string; userId?: string }
): Promise<void> {
  if (!id || !signature) return;

  // Cache in memory
  memorySignatureCache.set(id, signature);
  if (meta?.customerId) memorySignatureCache.set(meta.customerId, signature);
  if (meta?.customerName) memorySignatureCache.set(meta.customerName.toLowerCase().trim(), signature);

  // Cache in localStorage
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(`skyline_sig_${id}`, signature);
      if (meta?.customerId) {
        window.localStorage.setItem(`skyline_sig_${meta.customerId}`, signature);
      }
      if (meta?.customerName) {
        window.localStorage.setItem(`skyline_sig_name_${meta.customerName.toLowerCase().trim()}`, signature);
      }
    }
  } catch (lsErr) {
    console.warn('[SignatureStorage] LocalStorage cache error:', lsErr);
  }

  // Persist to IndexedDB
  const idb = await openSignatureDB();
  if (!idb) return;

  try {
    const tx = idb.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    store.put({
      id,
      signature,
      customerId: meta?.customerId || (id.startsWith('cust_') ? id : undefined),
      customerName: meta?.customerName,
      userId: meta?.userId,
      updatedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.warn('[SignatureStorage] Error saving to IndexedDB:', err);
  }
}

/**
 * Retrieves a saved signature from IndexedDB or LocalStorage.
 */
export async function getSignatureFromIndexedDB(id: string): Promise<string | null> {
  if (!id) return null;

  // 1. Check in-memory cache
  if (memorySignatureCache.has(id)) {
    return memorySignatureCache.get(id)!;
  }

  // 2. Check localStorage
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const fromLs = window.localStorage.getItem(`skyline_sig_${id}`);
      if (fromLs) {
        memorySignatureCache.set(id, fromLs);
        return fromLs;
      }
    }
  } catch {}

  // 3. Check IndexedDB
  const idb = await openSignatureDB();
  if (!idb) return null;

  return new Promise((resolve) => {
    try {
      const tx = idb.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const request = store.get(id);

      request.onsuccess = () => {
        if (request.result && request.result.signature) {
          memorySignatureCache.set(id, request.result.signature);
          resolve(request.result.signature);
        } else {
          resolve(null);
        }
      };

      request.onerror = () => {
        resolve(null);
      };
    } catch {
      resolve(null);
    }
  });
}

/**
 * Saves a customer or user signature across all persistent tiers:
 * Memory + LocalStorage + IndexedDB + Firestore (if customerId provided).
 */
export async function saveSignatureEverywhere(
  id: string,
  signature: string,
  meta?: { customerId?: string; customerName?: string; userId?: string; autoUpdateFirestore?: boolean }
): Promise<void> {
  if (!id || !signature) return;

  await saveSignatureToIndexedDB(id, signature, meta);

  if (meta?.customerId && meta.customerId !== id) {
    await saveSignatureToIndexedDB(meta.customerId, signature, meta);
  }

  // Synchronize to Firestore customer document if available
  if (meta?.autoUpdateFirestore !== false && (meta?.customerId || id)) {
    const custId = meta?.customerId || id;
    try {
      const custRef = doc(db, 'customers', custId);
      const snap = await getDoc(custRef);
      if (snap.exists()) {
        await updateDoc(custRef, {
          signature,
          documentStatus: 'Legally Signed & Verified',
          signedAt: snap.data()?.signedAt || new Date(),
          updatedAt: new Date(),
        });
      }
    } catch (e) {
      console.warn('[SignatureStorage] Firestore customer update skipped:', e);
    }
  }
}

/**
 * Resolves a saved signature automatically for any customer, rental, or claim.
 * Searches across:
 * 1. Explicit object properties (rental.signature, customer.signature, claim.clientInfo.signature)
 * 2. In-memory cache
 * 3. LocalStorage
 * 4. IndexedDB
 * 5. Firestore Customer & User documents
 */
export async function resolveCustomerOrUserSignature(options: {
  customerId?: string;
  customer?: any;
  customerName?: string;
  rental?: any;
  claim?: any;
  userId?: string;
  user?: any;
}): Promise<string | null> {
  const { customerId, customer, customerName, rental, claim, userId, user } = options;

  // 1. Direct rental signature
  if (rental?.signature && typeof rental.signature === 'string' && rental.signature.startsWith('data:image')) {
    return rental.signature;
  }
  if (rental?.customerSignature && typeof rental.customerSignature === 'string' && rental.customerSignature.startsWith('data:image')) {
    return rental.customerSignature;
  }

  // 2. Direct claim signature
  if (claim?.clientInfo?.signature && typeof claim.clientInfo.signature === 'string' && claim.clientInfo.signature.startsWith('data:image')) {
    return claim.clientInfo.signature;
  }
  if (claim?.registerKeeper?.signature && typeof claim.registerKeeper.signature === 'string' && claim.registerKeeper.signature.startsWith('data:image')) {
    return claim.registerKeeper.signature;
  }

  // 3. Direct customer profile signature
  if (customer?.signature && typeof customer.signature === 'string' && customer.signature.startsWith('data:image')) {
    // Cache for future instant reuse
    if (customer.id) {
      saveSignatureToIndexedDB(customer.id, customer.signature, {
        customerId: customer.id,
        customerName: customer.name,
      }).catch(() => {});
    }
    return customer.signature;
  }

  // 4. Look up by Customer ID in IndexedDB / LocalStorage
  const targetCustId = customerId || customer?.id || rental?.customerId || claim?.customerId;
  if (targetCustId) {
    const fromIdb = await getSignatureFromIndexedDB(targetCustId);
    if (fromIdb) return fromIdb;
  }

  // 5. Look up by Customer Name in LocalStorage / Memory
  const targetName = (customerName || customer?.name || rental?.customerName || claim?.clientInfo?.name || '').toLowerCase().trim();
  if (targetName) {
    if (memorySignatureCache.has(targetName)) {
      return memorySignatureCache.get(targetName)!;
    }
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const fromNameLs = window.localStorage.getItem(`skyline_sig_name_${targetName}`);
        if (fromNameLs) return fromNameLs;
      }
    } catch {}
  }

  // 6. Look up Active User signature
  const targetUserId = userId || user?.id;
  if (targetUserId) {
    const userSig = await getSignatureFromIndexedDB(targetUserId);
    if (userSig) return userSig;
  }

  // 7. Check Active User generic key
  const activeUserSig = await getSignatureFromIndexedDB('active_user');
  if (activeUserSig) return activeUserSig;

  // 8. Fetch from Firestore Customer document if not already loaded in memory
  if (targetCustId) {
    try {
      const snap = await getDoc(doc(db, 'customers', targetCustId));
      if (snap.exists()) {
        const data = snap.data();
        if (data?.signature && typeof data.signature === 'string' && data.signature.startsWith('data:image')) {
          saveSignatureToIndexedDB(targetCustId, data.signature, {
            customerId: targetCustId,
            customerName: data.name,
          }).catch(() => {});
          return data.signature;
        }
      }
    } catch (e) {
      console.warn('[SignatureStorage] Firestore customer fetch notice:', e);
    }
  }

  // 9. Fetch from Firestore User document if active user
  if (targetUserId) {
    try {
      const uSnap = await getDoc(doc(db, 'users', targetUserId));
      if (uSnap.exists()) {
        const uData = uSnap.data();
        if (uData?.signature && typeof uData.signature === 'string' && uData.signature.startsWith('data:image')) {
          saveSignatureToIndexedDB(targetUserId, uData.signature, { userId: targetUserId }).catch(() => {});
          return uData.signature;
        }
      }
    } catch (e) {
      console.warn('[SignatureStorage] Firestore user fetch notice:', e);
    }
  }

  return null;
}

/**
 * Propagates an updated customer signature across all active rental agreements
 * and claim packs for that customer, and triggers background PDF re-generation.
 */
export async function propagateCustomerSignatureToRentalsAndClaims(
  customerId: string,
  signature: string,
  options?: {
    timestampText?: string;
    customerData?: any;
    signedDate?: Date;
  }
): Promise<{ updatedRentalsCount: number; updatedClaimsCount: number }> {
  if (!customerId || !signature) {
    return { updatedRentalsCount: 0, updatedClaimsCount: 0 };
  }

  let updatedRentalsCount = 0;
  let updatedClaimsCount = 0;

  try {
    // 1. Fetch customer data if not passed
    let customer = options?.customerData;
    if (!customer) {
      try {
        const custSnap = await getDoc(doc(db, 'customers', customerId));
        if (custSnap.exists()) {
          customer = { id: custSnap.id, ...custSnap.data() };
        }
      } catch (cErr) {
        console.warn('[SignaturePropagation] Customer lookup note:', cErr);
      }
    }

    // Dynamic import to prevent circular dependency
    let generateDocsFn: any = null;
    let uploadDocsFn: any = null;
    try {
      const genMod = await import('./generateRentalDocuments');
      generateDocsFn = genMod.generateRentalDocuments;
      const upMod = await import('./uploadRentalDocuments');
      uploadDocsFn = upMod.uploadRentalDocuments;
    } catch (importErr) {
      console.warn('[SignaturePropagation] Document module import note:', importErr);
    }

    // 2. Query and update all rentals for this customer
    try {
      const qRentals = query(collection(db, 'rentals'), where('customerId', '==', customerId));
      const rentalSnaps = await getDocs(qRentals);

      for (const rentDoc of rentalSnaps.docs) {
        const rental = { id: rentDoc.id, ...rentDoc.data() } as any;
        const s = rental.startDate?.toDate ? rental.startDate.toDate() : new Date(rental.startDate || Date.now());
        const backdatedTs = options?.timestampText || formatExecutionDateTime(s, 'dd/MM/yyyy HH:mm');
        const signedDt = options?.signedDate || rental.signedAt || s;

        await updateDoc(doc(db, 'rentals', rentDoc.id), {
          signature,
          customerSignature: signature,
          isSigned: true,
          documentStatus: 'Legally Signed & Verified',
          signedAt: signedDt,
          customerSignatureDate: signedDt,
          signatureTimestamp: backdatedTs,
          updatedAt: new Date(),
        });
        updatedRentalsCount++;

        // Trigger background re-generation
        if (generateDocsFn && uploadDocsFn) {
          setTimeout(async () => {
            try {
              let vehicle = rental.vehicle;
              if (!vehicle && rental.vehicleId) {
                const vSnap = await getDoc(doc(db, 'vehicles', rental.vehicleId));
                if (vSnap.exists()) vehicle = { id: vSnap.id, ...vSnap.data() };
              }

              const updatedRecord = {
                ...rental,
                signature,
                customerSignature: signature,
                isSigned: true,
                documentStatus: 'Legally Signed & Verified',
                signatureTimestamp: backdatedTs,
              };

              const docs = await generateDocsFn(updatedRecord, vehicle || {}, customer || {});
              const osd = (rental.originalStartDate ?? rental.startDate) as any;
              const agreementKey = `agreement_${new Date(osd || Date.now()).getTime()}`;

              await uploadDocsFn(rental.id, {
                agreements: { [agreementKey]: docs.agreement },
                invoice: docs.invoice,
                permit: docs.permit,
                claimDocuments: docs.claimDocuments,
              });
            } catch (rGenErr) {
              console.warn('[SignaturePropagation] PDF re-compilation note for rental', rental.id, rGenErr);
            }
          }, 150);
        }
      }
    } catch (rentErr) {
      console.warn('[SignaturePropagation] Rentals update query note:', rentErr);
    }

    // 3. Query and update all claims for this customer
    try {
      const qClaims1 = query(collection(db, 'claims'), where('clientId', '==', customerId));
      const claimSnaps1 = await getDocs(qClaims1);
      for (const claimDoc of claimSnaps1.docs) {
        await updateDoc(doc(db, 'claims', claimDoc.id), {
          'clientInfo.signature': signature,
          documentStatus: 'Legally Signed & Verified',
          updatedAt: new Date(),
        });
        updatedClaimsCount++;
      }

      const qClaims2 = query(collection(db, 'claims'), where('customerId', '==', customerId));
      const claimSnaps2 = await getDocs(qClaims2);
      for (const claimDoc of claimSnaps2.docs) {
        if (!claimSnaps1.docs.some((d) => d.id === claimDoc.id)) {
          await updateDoc(doc(db, 'claims', claimDoc.id), {
            'clientInfo.signature': signature,
            documentStatus: 'Legally Signed & Verified',
            updatedAt: new Date(),
          });
          updatedClaimsCount++;
        }
      }
    } catch (claimErr) {
      console.warn('[SignaturePropagation] Claims update query note:', claimErr);
    }
  } catch (err) {
    console.error('[SignaturePropagation] Error propagating signature:', err);
  }

  return { updatedRentalsCount, updatedClaimsCount };
}

