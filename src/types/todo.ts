// src/types/todo.ts
import { Timestamp } from 'firebase/firestore';

export type Priority = 'high' | 'medium' | 'low';

export interface TodoItem {
  id: string;
  text: string;
  description?: string;
  completed: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  dueDate?: Timestamp;
  priority?: Priority;
  tags?: string[];
  category?: string;
}