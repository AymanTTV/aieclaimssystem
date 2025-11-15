// src/types/todo.ts
import { Timestamp } from 'firebase/firestore';

export type TodoStatus = 'not_started' | 'in_progress' | 'completed' | 'on_hold';
export type TodoPriority = 'low' | 'medium' | 'high';

export interface Todo {
  id: string;
  title: string;
  description?: string;
  status: TodoStatus;
  priority: TodoPriority;
  category?: string;
  group?: string;
  dueDate?: Timestamp | null;
  assignedTo?: string | null;
  createdBy: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}