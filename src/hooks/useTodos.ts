// src/hooks/useTodos.ts
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
import { TodoItem, Priority } from '../types/todo';

export function useTodos(targetUserId?: string) {
  const { user } = useAuth();
  const { isManager } = usePermissions();

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

  const addTodo = async (
    text: string,
    options?: {
      description?: string;
      dueDate?: Date;
      priority?: Priority;
      tags?: string[];
      category?: string;
    }
  ) => {
    if (!ownerId) return;
    await addDoc(
      collection(db, 'todos', ownerId, 'items'),
      {
        text,
        completed: false,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        description: options?.description || null,
        dueDate: options?.dueDate ? Timestamp.fromDate(options.dueDate) : null,
        priority: options?.priority || null,
        tags: options?.tags || [],
        category: options?.category || null
      }
    );
  };

  const updateTodo = async (
    todoId: string,
    updates: Partial<{
      text: string;
      description: string;
      dueDate: Date | null;
      priority: Priority | null;
      tags: string[];
      category: string | null;
    }>
  ) => {
    if (!ownerId) return;
    const docRef = doc(db, 'todos', ownerId, 'items', todoId);
    const payload: any = { updatedAt: serverTimestamp() };
    if (updates.text !== undefined) payload.text = updates.text;
    if (updates.description !== undefined) payload.description = updates.description;
    if (updates.dueDate !== undefined) payload.dueDate = updates.dueDate ? Timestamp.fromDate(updates.dueDate) : null;
    if (updates.priority !== undefined) payload.priority = updates.priority;
    if (updates.tags !== undefined) payload.tags = updates.tags;
    if (updates.category !== undefined) payload.category = updates.category;
    await updateDoc(docRef, payload);
  };

  const toggleTodo = async (todoId: string, completed: boolean) => {
    if (!ownerId) return;
    await updateDoc(
      doc(db, 'todos', ownerId, 'items', todoId),
      { completed: !completed, updatedAt: serverTimestamp() }
    );
  };

  const removeTodo = async (todoId: string) => {
    if (!ownerId) return;
    await deleteDoc(doc(db, 'todos', ownerId, 'items', todoId));
  };

  const canEdit = ownerId === user?.id;

  return { todos, addTodo, updateTodo, toggleTodo, removeTodo, canEdit };
}