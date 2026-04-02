// src/components/share/ShareTable.tsx

import React from 'react'
import { DataTable } from '../DataTable/DataTable'
import { ShareEntry, SplitRecord } from '../../types/share'
import { Eye, Edit, Trash2, FileText, MessageSquare, Car, RefreshCw, Clock } from 'lucide-react'
import { usePermissions } from '../../hooks/usePermissions'
import { format, isFuture, parseISO, isValid } from 'date-fns'
import { useFormattedDisplay } from '../../hooks/useFormattedDisplay'

interface Props {
  entries: ShareEntry[]
  splits: SplitRecord[]
  isSplitted?: (record: ShareEntry) => boolean 
  onView: (e: ShareEntry) => void
  onEdit: (e: ShareEntry) => void
  onDelete: (e: ShareEntry) => void
  onGenerateDocument: (e: ShareEntry) => void
}

const ShareTable: React.FC<Props> = ({
  entries,
  splits,
  isSplitted,
  onView,
  onEdit,
  onDelete,
  onGenerateDocument
}) => {
  const { can } = usePermissions()
  const { formatCurrency } = useFormattedDisplay()

  const defaultIsSplitted = (record: ShareEntry) => {
    return splits.some(sp => 
       sp.startDate && sp.endDate && 
       record.date >= sp.startDate && record.date <= sp.endDate
    )
  }

  const checkSplit = isSplitted || defaultIsSplitted;

  const columns = [
    {
      header: 'Client / Ref',
      cell: ({ row }) => {
        const covered = checkSplit(row.original);
        return (
          <div className="relative">
            <div className="font-medium text-gray-900 flex items-center gap-2">
              {row.original.clientName}
              {covered && (
                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-purple-100 text-purple-800 border border-purple-200" title="This record is included in a split">
                  Splitted
                </span>
              )}
            </div>
            <div className="text-xs text-gray-500">
              Ref: <span className="font-mono text-gray-600">{row.original.claimRef}</span>
            </div>
          </div>
        )
      }
    },
    {
      header: 'Vehicle / Date',
      cell: ({ row }) => (
        <div>
           {row.original.vehicleName ? (
               <div className="text-xs font-medium text-gray-700 flex items-center mb-1" title={row.original.vehicleName}>
                   <Car className="w-3 h-3 mr-1 text-gray-400"/> 
                   <span className="truncate max-w-[150px]">{row.original.vehicleName.split('(')[1]?.replace(')','') || 'Vehicle'}</span>
               </div>
           ) : (
               <div className="text-xs text-gray-400 mb-1">No Vehicle</div>
           )}
           <div className="text-xs text-gray-500">
             {format(new Date(row.original.date), 'dd/MM/yyyy HH:mm')}
           </div>
        </div>
      )
    },
    {
      header: 'Type',
      accessorKey: 'type',
      cell: ({ row }) => {
        // Strict check: It's only "Active" if nextRecurringDate exists AND is in the future
        let nextDate: Date | null = null;
        if (row.original.nextRecurringDate) {
             if ((row.original.nextRecurringDate as any).toDate) {
                 nextDate = (row.original.nextRecurringDate as any).toDate();
             } else {
                 nextDate = new Date(row.original.nextRecurringDate as string);
             }
        }

        const isActiveTrigger = row.original.isRecurring && nextDate && isValid(nextDate) && isFuture(nextDate);
        
        return (
          <div className="flex flex-col items-start gap-1">
            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium capitalize ${
                row.original.type === 'income' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
            }`}>
                {row.original.type}
            </span>

            {row.original.isRecurring && (
               <div className={`flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded border whitespace-nowrap ${
                 isActiveTrigger 
                   ? 'text-indigo-700 bg-indigo-50 border-indigo-200' // Active Future Trigger
                   : 'text-gray-400 bg-gray-50 border-gray-200'     // Past / Done
               }`}>
                 <RefreshCw className="h-3 w-3" />
                 <span className="capitalize">
                    {row.original.recurringFrequency}
                 </span>
                 {isActiveTrigger && (
                    <Clock className="h-3 w-3 ml-1 text-indigo-500" />
                 )}
               </div>
            )}
          </div>
        )
      }
    },
    {
      header: 'Amount',
      cell: ({ row }) => (
        <span className={`font-semibold ${row.original.type === 'income' ? 'text-green-700' : 'text-red-700'}`}>
          {formatCurrency(
            row.original.type === 'income'
              ? (row.original as any).amount
              : (row.original as any).totalCost
          )}
        </span>
      )
    },
    {
      header: 'Status',
      accessorKey: 'progress',
      cell: ({ row }) => (
        <span className={`text-xs px-2 py-1 rounded-full ${
            row.original.progress === 'completed' ? 'bg-green-100 text-green-800' : 'bg-blue-50 text-blue-600'
        }`}>
            {row.original.progress === 'completed' ? 'Completed' : 'In Progress'}
        </span>
      )
    },
    {
      header: 'Actions',
      cell: ({ row }) => (
        <div className="flex items-center space-x-2">
          {row.original.notes && (
              <div title="Has Notes" className="text-yellow-500 cursor-help">
                  <MessageSquare className="h-3 w-3" />
              </div>
          )}

          {can('share', 'view') && (
            <button
              onClick={(e) => { e.stopPropagation(); onView(row.original) }}
              title="View Details"
              className="text-gray-400 hover:text-blue-600 transition-colors"
            >
              <Eye className="h-4 w-4" />
            </button>
          )}
          {can('share', 'update') && (
            <button
              onClick={(e) => { e.stopPropagation(); onEdit(row.original) }}
              title="Edit"
              className="text-gray-400 hover:text-orange-600 transition-colors"
            >
              <Edit className="h-4 w-4" />
            </button>
          )}
          {can('share', 'singleDoc') && (
          <button
            onClick={(e) => { e.stopPropagation(); onGenerateDocument(row.original) }}
            title="Generate PDF"
            className="text-gray-400 hover:text-green-600 transition-colors"
          >
            <FileText className="h-4 w-4" />
          </button>
          )}
          {can('share', 'delete') && (
            <button
              onClick={(e) => { e.stopPropagation(); onDelete(row.original) }}
              title="Delete"
              className="text-gray-400 hover:text-red-600 transition-colors"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}
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