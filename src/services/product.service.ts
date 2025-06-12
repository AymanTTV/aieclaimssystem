import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  doc,
  deleteDoc,
} from 'firebase/firestore';
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../lib/firebase';
import { Product } from '../types/product';

const COL = 'products';
const IMG_PATH = 'products';

export async function getAll(): Promise<Product[]> {
  const snap = await getDocs(collection(db, COL));
  return snap.docs.map((d) => {
    const data = d.data() as Omit<Product, 'id'>;
    return { id: d.id, ...data };
  });
}

interface CreateProductPayload {
  name: string;
  price: number;
  category?: string;
  image?: File;
}

async function uploadImage(file: File): Promise<string> {
  const path = `${IMG_PATH}/${Date.now()}_${file.name}`;
  const ref = storageRef(storage, path);
  await uploadBytes(ref, file);
  return getDownloadURL(ref);
}

export async function create(payload: CreateProductPayload): Promise<Product> {
  let imageUrl: string | undefined;
  if (payload.image) {
    imageUrl = await uploadImage(payload.image);
  }
  const data = {
    name: payload.name,
    price: payload.price,
    category: payload.category || null,
    imageUrl: imageUrl || null,
  };
  const ref = await addDoc(collection(db, COL), data);
  return { id: ref.id, ...data };
}

export async function update(
  id: string,
  payload: CreateProductPayload
): Promise<void> {
  const refDoc = doc(db, COL, id);
  const updates: any = {};
  if (payload.name !== undefined) updates.name = payload.name;
  if (payload.price !== undefined) updates.price = payload.price;
  if (payload.category !== undefined) updates.category = payload.category;
  if (payload.image) {
    updates.imageUrl = await uploadImage(payload.image);
  }
  await updateDoc(refDoc, updates);
}

export async function remove(id: string): Promise<void> {
  const refDoc = doc(db, COL, id);
  await deleteDoc(refDoc);
}

export default {
  getAll,
  create,
  update,
  delete: remove,
};
