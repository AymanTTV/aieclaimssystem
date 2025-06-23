import React, { useState, useEffect } from 'react';
import Modal from '../ui/Modal';                    // default export, no braces
import { useTodos, TodoItem } from '../../hooks/useTodos';
import { useAuth } from '../../context/AuthContext';
import { usePermissions } from '../../hooks/usePermissions';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../../lib/firebase';

interface UserRecord {
  uid: string;
  displayName: string;
}

interface ToDoModalProps {
  open: boolean;
  onClose: () => void;
}

export const ToDoModal: React.FC<ToDoModalProps> = ({ open, onClose }) => {
  // ─── Hooks (always at top-level) ────────────────────────────────
  const { user } = useAuth();
  const { isManager } = usePermissions();

  const [selectedUser, setSelectedUser] = useState<string>(user?.id || '');
  const [userList, setUserList] = useState<UserRecord[]>([]);

  // Fetch /users for manager dropdown
  useEffect(() => {
    if (!isManager) return;
    const usersRef = collection(db, 'users');
    const unsub = onSnapshot(usersRef, snap => {
      const list = snap.docs.map(d => {
        const data = d.data() as { name?: string; email?: string };
        return {
          uid: d.id,
          displayName: data.name || data.email || d.id,
        };
      });
      setUserList(list);
      // default to first user if nothing selected
      if (list.length && !selectedUser) {
        setSelectedUser(list[0].uid);
      }
    });
    return () => unsub();
  }, [isManager, selectedUser]);

  // Non-managers always view their own list
  useEffect(() => {
    if (user && !isManager) {
      setSelectedUser(user.id);
    }
  }, [user, isManager]);

  // Always call this hook in same order
  const { todos, addTodo, toggleTodo, removeTodo, canEdit } = useTodos(
    isManager ? selectedUser : undefined
  );
  const [newText, setNewText] = useState<string>('');

  // ─── Render guard ───────────────────────────────────────────────
  if (!open || !user) return null;

  // ─── JSX ────────────────────────────────────────────────────────
  return (
    <Modal isOpen={open} onClose={onClose} title="To-Do List">
      <div className="space-y-4">
        {isManager && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              View for user
            </label>
            <select
              value={selectedUser}
              onChange={e => setSelectedUser(e.target.value)}
              className="w-full p-2 border rounded"
            >
              {userList.map(u => (
                <option key={u.uid} value={u.uid}>
                  {u.displayName}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="flex space-x-2">
          <input
            type="text"
            value={newText}
            onChange={e => setNewText(e.target.value)}
            placeholder="Add a task"
            className="flex-1 p-2 border rounded"
            disabled={!canEdit}
          />
          <button
            onClick={() => {
              const text = newText.trim();
              if (!text) return;
              addTodo(text);
              setNewText('');
            }}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 rounded"
            disabled={!canEdit}
          >
            Add
          </button>
        </div>

        <ul className="max-h-64 overflow-y-auto divide-y">
          {todos.map((todo: TodoItem) => (
            <li
              key={todo.id}
              className="flex items-center justify-between py-2"
            >
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={todo.completed}
                  onChange={() =>
                    canEdit && toggleTodo(todo.id, todo.completed)
                  }
                  disabled={!canEdit}
                />
                <span
                  className={
                    todo.completed ? 'line-through text-gray-500' : ''
                  }
                >
                  {todo.text}
                </span>
              </label>
              {canEdit && (
                <button
                  onClick={() => removeTodo(todo.id)}
                  className="text-red-500"
                >
                  ✕
                </button>
              )}
            </li>
          ))}
        </ul>
      </div>
    </Modal>
  );
};
