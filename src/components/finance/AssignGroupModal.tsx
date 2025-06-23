// src/components/finance/AssignGroupModal.tsx
import React, { useState, useEffect } from 'react';
import Modal from '../ui/Modal';
import { FinanceGroup } from '../../services/financeGroup.service';
import { Transaction } from '../../types/finance';
import financeService from '../../services/finance.service';

interface AssignGroupModalProps {
  open: boolean;
  txn: Transaction;
  groups: FinanceGroup[];
  onClose: () => void;
  onAssigned: () => void;
}

export default function AssignGroupModal({
  open,
  txn,
  groups,
  onClose,
  onAssigned
}: AssignGroupModalProps) {
  const [selected, setSelected] = useState<string>(txn.groupId || '');

  useEffect(() => {
    setSelected(txn.groupId || '');
  }, [txn]);

  const handleAssign = async () => {
    await financeService.updateTransaction(txn.id, {
      groupId: selected || null
    });
    onAssigned();
  };

  if (!open) return null;

  return (
    <Modal isOpen={open} onClose={onClose} title="Assign to Group" size="sm">
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Select Group
          </label>
          <select
            value={selected}
            onChange={e => setSelected(e.target.value)}
            className="w-full p-2 border rounded"
          >
            <option value="">None</option>
            {groups.map(g => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </select>
        </div>
        <div className="flex justify-end space-x-2">
          <button
            onClick={onClose}
            className="bg-gray-200 hover:bg-gray-300 px-4 py-2 rounded"
          >
            Cancel
          </button>
          <button
            onClick={handleAssign}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded"
          >
            Assign
          </button>
        </div>
      </div>
    </Modal>
  );
}
