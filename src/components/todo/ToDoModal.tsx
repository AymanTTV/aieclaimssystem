// src/components/todo/ToDoModal.tsx
import React, { useState, useEffect, ChangeEvent } from 'react'
import Modal from '../ui/Modal'
import { useTodos, TodoItem } from '../../hooks/useTodos'
import { useAuth } from '../../context/AuthContext'
import { usePermissions } from '../../hooks/usePermissions'
import { collection, onSnapshot, Timestamp } from 'firebase/firestore'
import { db } from '../../lib/firebase'
import { Priority } from '../../types/todo'

const priorityOptions: Priority[] = ['high', 'medium', 'low']

interface UserRecord {
  uid: string
  displayName: string
}

interface ToDoModalProps {
  open: boolean
  onClose: () => void
}

export const ToDoModal: React.FC<ToDoModalProps> = ({ open, onClose }) => {
  const { user } = useAuth()
  const { can, isManager } = usePermissions()
  const [selectedUser, setSelectedUser] = useState<string>(user?.id || '')
  const [userList, setUserList] = useState<UserRecord[]>([])
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)

  // load users for manager dropdown & collaborator selects
  useEffect(() => {
    if (!isManager) return
    const unsub = onSnapshot(collection(db, 'users'), snap => {
      const list = snap.docs.map(d => {
        const data = d.data() as { name?: string; email?: string }
        return {
          uid: d.id,
          displayName: data.name || data.email || d.id,
        }
      })
      setUserList(list)
    })
    return () => unsub()
  }, [isManager])

  // helpers
  const collaboratorNames = (ids: string[]) =>
    ids.map(id => userList.find(u => u.uid === id)?.displayName || id).join(', ')

  // enforce owner for non-managers and reset selection on user change
  useEffect(() => {
    if (user) {
      setSelectedUser(user.id)
    }
  }, [user])

  const { todos, addTodo, updateTodo, toggleTodo, removeTodo } = useTodos(
    isManager ? selectedUser : undefined
  )
  const isOwner = user?.id === selectedUser

  // form states (for both new and editing tasks)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [newText, setNewText] = useState('')
  const [newDescription, setNewDescription] = useState('')
  const [newDueDate, setNewDueDate] = useState<string>('')
  const [newPriority, setNewPriority] = useState<Priority>('medium')
  const [newTags, setNewTags] = useState<string>('')
  const [newCategory, setNewCategory] = useState<string>('')
  const [newCollaborators, setNewCollaborators] = useState<string[]>([])

  // filters
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] =
    useState<'all' | 'completed' | 'pending'>('all')
  const [filterPriority, setFilterPriority] = useState<Priority | ''>('')
  const [filterCategory, setFilterCategory] = useState<string>('')

  if (!open || !user) return null

  // clear form and exit edit mode
  const resetForm = () => {
    setEditingId(null)
    setNewText('')
    setNewDescription('')
    setNewDueDate('')
    setNewPriority('medium')
    setNewTags('')
    setNewCategory('')
    setNewCollaborators([])
  }

  const handleFormSubmit = () => {
    if (!newText.trim()) return

    const taskData: Partial<TodoItem> = {
      description: newDescription.trim(),
      dueDate: newDueDate ? new Date(newDueDate) : undefined,
      priority: newPriority,
      tags: newTags
        .split(',')
        .map(t => t.trim())
        .filter(Boolean),
      category: newCategory.trim(),
      collaborators: newCollaborators,
      text: newText.trim(),
    }

    if (editingId) {
      updateTodo(editingId, taskData)
    } else {
      addTodo(newText.trim(), taskData)
    }
    resetForm()
  }
  
  const handleEditClick = (todo: TodoItem) => {
    setEditingId(todo.id);
    setNewText(todo.text);
    setNewDescription(todo.description || '');
    setNewDueDate(todo.dueDate ? todo.dueDate.toDate().toISOString().slice(0, 10) : '');
    setNewPriority(todo.priority || 'medium');
    setNewTags((todo.tags || []).join(', '));
    setNewCategory(todo.category || '');
    setNewCollaborators(todo.collaborators || []);
  };


  // filtered list
  const filtered = todos.filter(todo => {
    if (filterStatus !== 'all') {
      if (filterStatus === 'completed' && !todo.completed) return false
      if (filterStatus === 'pending' && todo.completed) return false
    }
    if (filterPriority && todo.priority !== filterPriority) return false
    if (filterCategory && todo.category !== filterCategory) return false
    if (
      searchTerm &&
      !todo.text.toLowerCase().includes(searchTerm.toLowerCase())
    )
      return false
    return true
  })

  // due-date color helper
  const getColor = (due?: Timestamp) => {
    if (!due) return 'text-gray-800'
    const now = Date.now()
    const diff = due.toDate().getTime() - now
    const day = 24 * 60 * 60 * 1000
    if (diff < 0) return 'text-red-600'
    if (diff <= day) return 'text-red-500'
    if (diff <= 3 * day) return 'text-yellow-600'
    return 'text-green-600'
  }

  return (
    <>
      {/* Main To-Do Modal */}
      <Modal isOpen={open} onClose={onClose} title="To-Do List" size="xl">
        <div className="space-y-4">
          
          {/* 1. New/Edit Task Form */}
          {isOwner && can('share', 'create') && (
            <div className="p-4 border rounded-md bg-gray-50 space-y-2">
              <h3 className="font-semibold">{editingId ? 'Edit Task' : 'New Task'}</h3>
              <input
                type="text"
                placeholder="Title"
                value={newText}
                onChange={e => setNewText(e.target.value)}
                className="w-full p-2 border rounded"
              />
              <textarea
                placeholder="Description"
                value={newDescription}
                onChange={e => setNewDescription(e.target.value)}
                rows={2}
                className="w-full p-2 border rounded"
              />
              <div className="flex space-x-2">
                <input
                  type="date"
                  value={newDueDate}
                  onChange={e => setNewDueDate(e.target.value)}
                  className="p-2 border rounded"
                />
                <select
                  value={newPriority}
                  onChange={e =>
                    setNewPriority(e.target.value as Priority)
                  }
                  className="p-2 border rounded"
                >
                  {priorityOptions.map(p => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
                <input
                  type="text"
                  placeholder="Tags (comma separated)"
                  value={newTags}
                  onChange={e => setNewTags(e.target.value)}
                  className="flex-1 p-2 border rounded"
                />
                <input
                  type="text"
                  placeholder="Category"
                  value={newCategory}
                  onChange={e => setNewCategory(e.target.value)}
                  className="p-2 border rounded"
                />
              </div>
              <div>
                <label className="block text-sm">Collaborators</label>
                <select
                  multiple
                  value={newCollaborators}
                  onChange={(e: ChangeEvent<HTMLSelectElement>) =>
                    setNewCollaborators(
                      Array.from(e.target.selectedOptions).map(o => o.value)
                    )
                  }
                  className="w-full p-2 border rounded h-24"
                >
                  {userList.map(u => (
                    <option key={u.uid} value={u.uid}>
                      {u.displayName}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={handleFormSubmit}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded"
                >
                  {editingId ? 'Update Task' : 'Add Task'}
                </button>
                {editingId && (
                  <button
                    onClick={resetForm}
                    className="bg-gray-300 hover:bg-gray-400 text-black px-4 py-2 rounded"
                  >
                    Cancel
                  </button>
                )}
              </div>
            </div>
          )}

          {/* 2. Manager user selector */}
          {isManager && (
            <div>
              <label className="block text-sm font-medium mb-1">
                View tasks for user
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

          {/* 3. Filters */}
          <div className="flex space-x-2">
            <input
              type="text"
              placeholder="Search tasks…"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="flex-1 p-2 border rounded"
            />
            <select
              value={filterStatus}
              onChange={e =>
                setFilterStatus(e.target.value as 'all' | 'completed' | 'pending')
              }
              className="p-2 border rounded"
            >
              <option value="all">All Status</option>
              <option value="completed">Completed</option>
              <option value="pending">Pending</option>
            </select>
            <select
              value={filterPriority}
              onChange={e => setFilterPriority(e.target.value as Priority | '')}
              className="p-2 border rounded"
            >
              <option value="">Any Priority</option>
              {priorityOptions.map(p => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
            <input
              type="text"
              placeholder="Category"
              value={filterCategory}
              onChange={e => setFilterCategory(e.target.value)}
              className="p-2 border rounded"
            />
          </div>

          {/* 4. Task List */}
          <ul className="max-h-96 overflow-y-auto divide-y">
            {filtered.map(todo => (
              <li key={todo.id} className="py-2">
                <div className="flex items-start justify-between">
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={todo.completed}
                        onChange={() =>
                          isOwner &&
                          can('share', 'update') &&
                          toggleTodo(todo.id, todo.completed)
                        }
                        className="mt-1"
                      />
                      <span
                        className={`font-medium ${todo.completed
                          ? 'line-through text-gray-500'
                          : ''}`}
                      >
                        {todo.text}
                      </span>
                    </div>
                    {todo.description && (
                      <p className="text-sm text-gray-600 pl-6">{todo.description}</p>
                    )}
                     <div className="pl-6 text-xs text-gray-500 flex items-center space-x-3">
                        {todo.dueDate && (
                          <span className={getColor(todo.dueDate)}>
                            Due: {todo.dueDate.toDate().toLocaleDateString()}
                          </span>
                        )}
                        {todo.category && (
                          <span>📂 {todo.category}</span>
                        )}
                        {todo.tags?.length > 0 && (
                          <span>🏷 {todo.tags.join(', ')}</span>
                        )}
                        {todo.collaborators?.length > 0 && (
                          <span>
                            👥 {collaboratorNames(todo.collaborators)}
                          </span>
                        )}
                      </div>
                  </div>
                  <div className="flex items-center space-x-2 text-sm text-gray-600 flex-shrink-0 ml-4">
                    {/* Edit */}
                    {isOwner && can('share', 'update') && (
                      <button
                        onClick={() => handleEditClick(todo)}
                        className="text-blue-500 hover:text-blue-700 p-1"
                        title="Edit Task"
                      >
                        ✎
                      </button>
                    )}
                    {/* Delete */}
                    {isOwner && can('share', 'delete') && (
                      <button
                        onClick={() =>
                          setConfirmDeleteId(todo.id)
                        }
                        className="text-red-500 hover:text-red-700 p-1"
                        title="Delete Task"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </Modal>

      {/* Confirmation Delete Modal */}
      <Modal
        isOpen={!!confirmDeleteId}
        onClose={() => setConfirmDeleteId(null)}
        title="Confirm Delete"
      >
        <div className="p-4 text-center">
          <p className="mb-4">Are you sure you want to delete this task?</p>
          <div className="flex justify-center space-x-4">
            <button
              onClick={() => setConfirmDeleteId(null)}
              className="px-4 py-2 bg-gray-200 rounded"
            >
              Cancel
            </button>
            <button
              onClick={() => {
                removeTodo(confirmDeleteId!)
                setConfirmDeleteId(null)
              }}
              className="px-4 py-2 bg-red-600 text-white rounded"
            >
              Delete
            </button>
          </div>
        </div>
      </Modal>
    </>
  )
}