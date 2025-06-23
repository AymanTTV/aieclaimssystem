import { useState, useEffect } from 'react';
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  addDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  doc,
  Timestamp
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';
import { usePermissions } from '../hooks/usePermissions';

export interface TodoItem {
  id: string;
  text: string;
  completed: boolean;
  createdAt: Timestamp;
}

export function useTodos(targetUserId?: string) {
  const { user } = useAuth();
  const { isManager } = usePermissions();

  // use `user.id` (your User type uses `id`, not `uid`)
  const ownerId = isManager && targetUserId
    ? targetUserId
    : user?.id;

  const [todos, setTodos] = useState<TodoItem[]>([]);

  useEffect(() => {
    if (!ownerId) return;
    const itemsRef = collection(db, 'todos', ownerId, 'items');
    const q = query(itemsRef, orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, snapshot => {
      setTodos(
        snapshot.docs.map(d => ({
          id: d.id,
          ...(d.data() as Omit<TodoItem, 'id'>)
        }))
      );
    });
    return unsubscribe;
  }, [ownerId]);

  const addTodo = async (text: string) => {
    if (!ownerId) return;
    await addDoc(
      collection(db, 'todos', ownerId, 'items'),
      { text, completed: false, createdAt: serverTimestamp() }
    );
  };

  const toggleTodo = async (todoId: string, completed: boolean) => {
    if (!ownerId) return;
    await updateDoc(
      doc(db, 'todos', ownerId, 'items', todoId),
      { completed: !completed }
    );
  };

  const removeTodo = async (todoId: string) => {
    if (!ownerId) return;
    await deleteDoc(doc(db, 'todos', ownerId, 'items', todoId));
  };

  const canEdit = ownerId === user?.id;

  return { todos, addTodo, toggleTodo, removeTodo, canEdit };
}
