// src/types/todo.ts
import { Timestamp } from 'firebase/firestore';

export interface TodoItem {
  id: string;
  text: string;
  completed: boolean;
  createdAt: Timestamp;
}