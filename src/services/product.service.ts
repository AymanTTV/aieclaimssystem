// src/services/product.service.ts
import {
  collection, getDocs, addDoc, updateDoc, doc, deleteDoc, getDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../lib/firebase';
import { Product } from '../types/product';

const COL = 'products';
const IMG_PATH = 'products';

function computeTotalValue(p: Partial<Product>): number {
  const qty   = Number(p.quantity ?? 0);
  const price = Number(p.retailPrice ?? 0);
  const disc  = Number(p.discount ?? 0); // £ absolute
  const total = qty * price - disc;
  return +(Math.max(total, 0)).toFixed(2);
}

async function uploadImageIfAny(file?: File | Blob | null): Promise<string | undefined> {
  if (!file) return undefined;
  const ref = storageRef(storage, `${IMG_PATH}/${Date.now()}-${Math.random().toString(36).slice(2)}`);
  await uploadBytes(ref, file);
  return await getDownloadURL(ref);
}

export async function getAll(): Promise<Product[]> {
  const snap = await getDocs(collection(db, COL));
  return snap.docs.map((d) => {
    const data = d.data() as any;

    // Backward-compat: if old docs have `price`, prefer it for retailPrice.
    const retailPrice =
      data.retailPrice != null ? Number(data.retailPrice) :
      data.price != null       ? Number(data.price)       : 0;

    const product: Product = {
      id: d.id,
      partNumber: data.partNumber ?? '',
      name: data.name ?? '',
      category: data.category ?? '',
      binLocation: data.binLocation ?? '',
      quantity: Number(data.quantity ?? 0),
      retailPrice,                               // ← normalized
      discount: Number(data.discount ?? 0),      // now absolute £
      totalValue:
        data.totalValue !== undefined
          ? Number(data.totalValue)
          : computeTotalValue({ ...data, retailPrice }),
      imageUrl: data.imageUrl ?? '',
      description: data.description ?? '',
      createdAt: data.createdAt?.toMillis ? data.createdAt.toMillis() : data.createdAt,
      updatedAt: data.updatedAt?.toMillis ? data.updatedAt.toMillis() : data.updatedAt,
    };
    return product;
  });
}

// --- NEW FUNCTION ADDED HERE ---
export async function getById(id: string): Promise<Product | null> {
  const snap = await getDoc(doc(db, COL, id));
  if (!snap.exists()) return null;

  const data = snap.data() as any;

  // Apply same backward-compat logic as getAll
  const retailPrice =
    data.retailPrice != null ? Number(data.retailPrice) :
    data.price != null       ? Number(data.price)       : 0;

  return {
    id: snap.id,
    partNumber: data.partNumber ?? '',
    name: data.name ?? '',
    category: data.category ?? '',
    binLocation: data.binLocation ?? '',
    quantity: Number(data.quantity ?? 0),
    retailPrice,
    discount: Number(data.discount ?? 0),
    totalValue:
      data.totalValue !== undefined
        ? Number(data.totalValue)
        : computeTotalValue({ ...data, retailPrice }),
    imageUrl: data.imageUrl ?? '',
    description: data.description ?? '',
    createdAt: data.createdAt?.toMillis ? data.createdAt.toMillis() : data.createdAt,
    updatedAt: data.updatedAt?.toMillis ? data.updatedAt.toMillis() : data.updatedAt,
  };
}

export async function create(payload: Partial<Product> & { image?: File | Blob | null }): Promise<string> {
  const imageUrl = await uploadImageIfAny(payload.image);

  const toSave: any = {
    partNumber: payload.partNumber ?? '',
    name: payload.name ?? '',
    category: payload.category ?? '',
    binLocation: payload.binLocation ?? '',
    quantity: Number(payload.quantity ?? 0),
    retailPrice: Number(payload.retailPrice ?? 0), // store canonical field
    discount: Number(payload.discount ?? 0),       // £ absolute
    totalValue: computeTotalValue(payload),
    imageUrl: imageUrl ?? payload.imageUrl ?? '',
    description: payload.description ?? '',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  // Optional: also write legacy `price` for pages still reading it
  toSave.price = toSave.retailPrice;

  const ref = await addDoc(collection(db, COL), toSave);
  return ref.id;
}

export async function update(id: string, payload: Partial<Product> & { image?: File | Blob | null }): Promise<void> {
  const refDoc = doc(db, COL, id);

  const updates: any = {
    ...(payload.partNumber !== undefined && { partNumber: payload.partNumber }),
    ...(payload.name !== undefined && { name: payload.name }),
    ...(payload.category !== undefined && { category: payload.category }),
    ...(payload.binLocation !== undefined && { binLocation: payload.binLocation }),
    ...(payload.quantity !== undefined && { quantity: Number(payload.quantity) }),
    ...(payload.retailPrice !== undefined && { retailPrice: Number(payload.retailPrice) }),
    ...(payload.discount !== undefined && { discount: Number(payload.discount) }),
    ...(payload.description !== undefined && { description: payload.description }),
    updatedAt: serverTimestamp(),
  };

  // keep legacy `price` in sync to avoid breaking older pages
  if ('retailPrice' in updates) updates.price = updates.retailPrice;

  if (payload.image) {
    const imageUrl = await uploadImageIfAny(payload.image);
    if (imageUrl) updates.imageUrl = imageUrl;
  }

  // recompute total if drivers changed
  if ('quantity' in updates || 'retailPrice' in updates || 'discount' in updates) {
    const snap = await getDoc(refDoc);
    const existing = snap.exists() ? snap.data() : {};
    const merged = { ...existing, ...updates };
    updates.totalValue = computeTotalValue({
      quantity: merged.quantity,
      retailPrice: merged.retailPrice ?? merged.price,
      discount: merged.discount,
    });
  }

  await updateDoc(refDoc, updates);
}

export async function remove(id: string): Promise<void> {
  await deleteDoc(doc(db, COL, id));
}

// Updated export to include getById
export default { getAll, getById, create, update, delete: remove };