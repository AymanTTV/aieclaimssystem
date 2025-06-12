// src/components/share/ShareTable.tsx

import React from 'react'
import { DataTable } from '../DataTable/DataTable'
import { ShareEntry } from '../../types/share'
import { Eye, Edit, Trash2, FileText } from 'lucide-react'
import { usePermissions } from '../../hooks/usePermissions'
import { format } from 'date-fns'
import { useFormattedDisplay } from '../../hooks/useFormattedDisplay'

interface Props {
  entries: ShareEntry[]
  onView: (e: ShareEntry) => void
  onEdit: (e: ShareEntry) => void
  onDelete: (e: ShareEntry) => void
  onGenerateDocument: (e: ShareEntry) => void
}

const ShareTable: React.FC<Props> = ({
  entries,
  onView,
  onEdit,
  onDelete,
  onGenerateDocument
}) => {
  const { can } = usePermissions()
  const { formatCurrency } = useFormattedDisplay()

  const columns = [
    {
      header: 'Client & Ref',
      cell: ({ row }) => (
        <div>
          <div className="font-medium">{row.original.clientName}</div>
          <div className="text-sm text-gray-500">
            Ref: {row.original.claimRef}
          </div>
        </div>
      )
    },
    {
      header: 'Date',
      cell: ({ row }) => format(new Date(row.original.date), 'dd/MM/yyyy')
    },
    {
      header: 'Type',
      accessorKey: 'type' // “income” or “expense”
    },
    {
      header: 'Amount',
      cell: ({ row }) => (
        <span className="font-medium">
          {formatCurrency(
            row.original.type === 'income'
              ? (row.original as any).amount
              : (row.original as any).totalCost
          )}
        </span>
      )
    },
    {
      header: 'Progress',
      accessorKey: 'progress'
    },
    {
      header: 'Actions',
      cell: ({ row }) => (
        <div className="flex space-x-2">
          {can('share', 'view') && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                onView(row.original)
              }}
              title="View"
              className="text-blue-600 hover:text-blue-800"
            >
              <Eye className="h-4 w-4" />
            </button>
          )}
          {can('share', 'update') && (
            <>
              
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  onEdit(row.original)
                }}
                title="Edit"
                className="text-blue-600 hover:text-blue-800"
              >
                <Edit className="h-4 w-4" />
              </button>
            </>
          )}
          {can('share', 'delete') && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                onDelete(row.original)
              }}
              title="Delete"
              className="text-red-600 hover:text-red-800"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}
          <button
                onClick={(e) => {
                  e.stopPropagation()
                  onGenerateDocument(row.original)
                }}
                title="Generate PDF"
                className="text-green-600 hover:text-green-800"
              >
                <FileText className="h-4 w-4" />
              </button>
        </div>
      )
    }
  ]

  return (
    <DataTable
      data={entries}
      columns={columns}
      onRowClick={(e) => can('share', 'view') && onView(e)}
    />
  )
}

export default ShareTable
