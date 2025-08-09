// src/components/todo/ToDoModal.tsx
import React, { useState, useEffect, ChangeEvent } from 'react'
import Modal from '../ui/Modal'
import { useTodos, TodoItem } from '../../hooks/useTodos'
import { useAuth } from '../../context/AuthContext'
import { usePermissions } from '../../hooks/usePermissions'
import { collection, onSnapshot } from 'firebase/firestore'
import { db } from '../../lib/firebase'
import { Priority } from '../../types/todo'
import { format } from 'date-fns'

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
      if (list.length && !selectedUser) {
        setSelectedUser(list[0].uid)
      }
    })
    return () => unsub()
  }, [isManager, selectedUser])

  // helpers
  const normalizeDate = (d?: TodoItem['dueDate']) => {
    if (!d) return undefined
    if ((d as any).toDate) return (d as any).toDate() as Date
    return d as Date
  }
  const collaboratorNames = (ids: string[]) =>
    ids.map(id => userList.find(u => u.uid === id)?.displayName || id).join(', ')

  // enforce owner for non-managers
  useEffect(() => {
    if (user && !isManager) setSelectedUser(user.id)
  }, [user, isManager])

  const { todos, addTodo, updateTodo, toggleTodo, removeTodo } = useTodos(
    isManager ? selectedUser : undefined
  )
  const isOwner = user?.id === selectedUser

  // new task form
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

  // inline edit
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editFields, setEditFields] = useState<Partial<TodoItem>>({})

  if (!open || !user) return null

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
  const getColor = (due?: TodoItem['dueDate']) => {
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
          {/* Manager user selector */}
          {isManager && (
            <div>
              <label className="block text-sm font-medium mb-1">
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

          {/* Filters */}
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
              <option value="all">All</option>
              <option value="completed">Completed</option>
              <option value="pending">Pending</option>
            </select>
            <select
              value={filterPriority}
              onChange={e => setFilterPriority(e.target.value as Priority)}
              className="p-2 border rounded"
            >
              <option value="">Any priority</option>
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

          {/* New Task Form */}
          {isOwner && can('share', 'create') && (
            <div className="p-4 border rounded-md bg-gray-50 space-y-2">
              <h3 className="font-semibold">New Task</h3>
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
              <button
                onClick={() => {
                  if (!newText.trim()) return
                  addTodo(newText.trim(), {
                    description: newDescription.trim(),
                    dueDate: newDueDate ? new Date(newDueDate) : undefined,
                    priority: newPriority,
                    tags: newTags
                      .split(',')
                      .map(t => t.trim())
                      .filter(Boolean),
                    category: newCategory.trim(),
                    collaborators: newCollaborators,
                  })
                  setNewText('')
                  setNewDescription('')
                  setNewDueDate('')
                  setNewPriority('medium')
                  setNewTags('')
                  setNewCategory('')
                  setNewCollaborators([])
                }}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded"
              >
                Add Task
              </button>
            </div>
          )}

          {/* Task List */}
          <ul className="max-h-96 overflow-y-auto divide-y">
            {filtered.map(todo => (
              <li key={todo.id} className="py-2">
                {editingId === todo.id ? (
                  <div className="p-2 bg-yellow-50 rounded space-y-2">
                    {/* Inline edit (owner) */}
                    <input
                      type="text"
                      value={editFields.text as string}
                      onChange={e =>
                        setEditFields({
                          ...editFields,
                          text: e.target.value,
                        })
                      }
                      className="w-full p-2 border rounded"
                    />
                    <textarea
                      value={editFields.description as string}
                      onChange={e =>
                        setEditFields({
                          ...editFields,
                          description: e.target.value,
                        })
                      }
                      rows={2}
                      className="w-full p-2 border rounded"
                    />
                    <div className="flex space-x-2">
                      <input
                        type="date"
                        value={
                          (() => {
                            const dt = normalizeDate(
                              editFields.dueDate
                            )
                            return dt ? dt.toISOString().slice(0, 10) : ''
                          })()
                        }
                        onChange={e =>
                          setEditFields({
                            ...editFields,
                            dueDate: new Date(e.target.value),
                          })
                        }
                        className="p-2 border rounded"
                      />
                      <select
                        value={editFields.priority as Priority}
                        onChange={e =>
                          setEditFields({
                            ...editFields,
                            priority: e.target
                              .value as Priority,
                          })
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
                        placeholder="Tags"
                        value={(
                          editFields.tags as string[]
                        )?.join(', ')}
                        onChange={e =>
                          setEditFields({
                            ...editFields,
                            tags: e.target.value
                              .split(',')
                              .map(t => t.trim())
                              .filter(Boolean),
                          })
                        }
                        className="flex-1 p-2 border rounded"
                      />
                      <input
                        type="text"
                        placeholder="Category"
                        value={editFields.category as string}
                        onChange={e =>
                          setEditFields({
                            ...editFields,
                            category: e.target.value,
                          })
                        }
                        className="p-2 border rounded"
                      />
                    </div>
                    <div>
                      <label className="block text-sm">
                        Collaborators
                      </label>
                      <select
                        multiple
                        value={
                          (editFields.collaborators as string[]) || []
                        }
                        onChange={(e: ChangeEvent<HTMLSelectElement>) =>
                          setEditFields({
                            ...editFields,
                            collaborators: Array.from(
                              e.target.selectedOptions
                            ).map(o => o.value),
                          })
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
                        onClick={() => {
                          updateTodo(todo.id, editFields as TodoItem)
                          setEditingId(null)
                        }}
                        className="px-3 py-1 bg-green-600 text-white rounded"
                      >
                        Save
                      </button>
                      <button
                        onClick={() => setEditingId(null)}
                        className="px-3 py-1 bg-gray-300 rounded"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={todo.completed}
                        onChange={() =>
                          isOwner &&
                          can('share', 'update') &&
                          toggleTodo(todo.id, todo.completed)
                        }
                      />
                      <span
                        className={`${todo.completed
                          ? 'line-through text-gray-500'
                          : ''} ${getColor(todo.dueDate)}`}
                      >
                        {todo.text}
                      </span>
                    </label>
                    <div className="flex items-center space-x-4 text-sm text-gray-600">
                      <span>
                        {todo.completed
                          ? '✓ Completed'
                          : 'Pending'}
                      </span>
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
                      {/* Delete */}
                      {isOwner && can('share', 'delete') && (
                        <button
                          onClick={() =>
                            setConfirmDeleteId(todo.id)
                          }
                          className="text-red-500"
                        >
                          ✕
                        </button>
                      )}
                      {/* Edit */}
                      {isOwner && can('share', 'update') && (
                        <button
                          onClick={() => {
                            setEditingId(todo.id)
                            setEditFields({ ...todo })
                          }}
                          className="text-blue-500"
                        >
                          ✎
                        </button>
                      )}
                    </div>
                  </div>
                )}
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
