// src/components/finance/ManageAccountsModal.tsx
import React, { useState, useMemo } from 'react';
import { Account, SharedOwnerShare, Transaction, Vehicle } from '../../types';
import { collection, addDoc, doc, updateDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import toast from 'react-hot-toast';
import FormField from '../ui/FormField';
import { useFormattedDisplay } from '../../hooks/useFormattedDisplay';
import {
  AlertTriangle,
  Plus,
  Trash2,
  Users,
  CheckCircle2,
  PieChart,
  Car,
  Building2,
  Sparkles,
} from 'lucide-react';
import Modal from '../ui/Modal';

interface ManageAccountsModalProps {
  accounts: Account[];
  transactions: Transaction[];
  vehicles?: Vehicle[];
  onClose: () => void;
  onOpenPayout?: (vehicleId?: string, accountId?: string) => void;
}

const ManageAccountsModal: React.FC<ManageAccountsModalProps> = ({
  accounts = [],
  transactions = [],
  vehicles = [],
  onClose,
  onOpenPayout,
}) => {
  const [newAccountName, setNewAccountName] = useState('');
  const [loading, setLoading] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [editName, setEditName] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<Account | null>(null);

  // Shared Ownership Form State
  const [isSharedOwnership, setIsSharedOwnership] = useState(false);
  const [selectedVehicleId, setSelectedVehicleId] = useState<string>('');
  const [sharedOwners, setSharedOwners] = useState<SharedOwnerShare[]>([
    { ownerName: 'AIE Skyline Limited', sharePercentage: 60, isCompany: true },
    { ownerName: 'Partner Co-Owner', sharePercentage: 40, isCompany: false },
  ]);

  const { formatCurrency } = useFormattedDisplay();

  // Calculate balances using arrays and FULL amount per account
  const accountBalances = useMemo(() => {
    if (!accounts || accounts.length === 0) return new Map<string, number>();

    const balances = new Map<string, number>();
    accounts.forEach((acc) => {
      balances.set(acc.id, 0);
    });

    transactions.forEach((txn) => {
      const fullAmount = txn.amount;

      if (txn.type === 'income' && txn.accountsTo) {
        txn.accountsTo.forEach((accId) => {
          if (balances.has(accId)) {
            balances.set(accId, (balances.get(accId) || 0) + fullAmount);
          }
        });
      } else if (txn.type === 'expense' && txn.accountsFrom) {
        txn.accountsFrom.forEach((accId) => {
          if (balances.has(accId)) {
            balances.set(accId, (balances.get(accId) || 0) - fullAmount);
          }
        });
      } else if (
        (!txn.accountsFrom || txn.accountsFrom.length === 0) &&
        (!txn.accountsTo || txn.accountsTo.length === 0)
      ) {
        const defaultAccount = accounts.find(
          (a) => a.name === 'AIE SKYLINE ACCOUNT' || a.name === 'AIE Skyline Limited'
        );
        if (defaultAccount && balances.has(defaultAccount.id)) {
          const amountToAdd = txn.type === 'income' ? fullAmount : -fullAmount;
          balances.set(defaultAccount.id, (balances.get(defaultAccount.id) || 0) + amountToAdd);
        }
      }
    });

    return balances;
  }, [accounts, transactions]);

  // Total Percentage Calculator
  const totalPercentage = useMemo(() => {
    return sharedOwners.reduce((sum, o) => sum + (Number(o.sharePercentage) || 0), 0);
  }, [sharedOwners]);

  const isPercentageValid = Math.abs(totalPercentage - 100) < 0.01;

  const handleVehicleChange = (vId: string) => {
    setSelectedVehicleId(vId);
    const foundVehicle = vehicles.find((v) => v.id === vId);
    if (foundVehicle) {
      if (!newAccountName || newAccountName.includes('(')) {
        setNewAccountName(`${foundVehicle.make} ${foundVehicle.model} (${foundVehicle.registrationNumber})`);
      }
      const partnerName = foundVehicle.owner?.name && foundVehicle.owner.name !== 'AIE Skyline' ? foundVehicle.owner.name : 'Partner Co-Owner';
      setSharedOwners([
        { ownerName: 'AIE Skyline Limited', sharePercentage: 60, isCompany: true },
        { ownerName: partnerName, sharePercentage: 40, isCompany: false },
      ]);
    }
  };

  const handleAddOwnerRow = () => {
    const remaining = Math.max(0, 100 - totalPercentage);
    setSharedOwners([
      ...sharedOwners,
      { ownerName: `Partner ${sharedOwners.length + 1}`, sharePercentage: remaining, isCompany: false },
    ]);
  };

  const handleRemoveOwnerRow = (index: number) => {
    if (sharedOwners.length <= 1) return;
    setSharedOwners(sharedOwners.filter((_, i) => i !== index));
  };

  const handleUpdateOwnerField = (index: number, field: keyof SharedOwnerShare, value: any) => {
    setSharedOwners(
      sharedOwners.map((owner, i) => {
        if (i !== index) return owner;
        return { ...owner, [field]: value };
      })
    );
  };

  const handleAutoBalance = () => {
    if (sharedOwners.length === 0) return;
    const split = Number((100 / sharedOwners.length).toFixed(1));
    const remainder = Number((100 - split * (sharedOwners.length - 1)).toFixed(1));
    setSharedOwners(
      sharedOwners.map((owner, idx) => ({
        ...owner,
        sharePercentage: idx === sharedOwners.length - 1 ? remainder : split,
      }))
    );
  };

  const handleAddAccount = async () => {
    if (!newAccountName.trim()) {
      toast.error('Please enter an account name');
      return;
    }
    if (accounts.some((acc) => acc.name.toLowerCase() === newAccountName.trim().toLowerCase())) {
      toast.error(`An account named "${newAccountName.trim()}" already exists.`);
      return;
    }
    if (isSharedOwnership && !isPercentageValid) {
      toast.error(`Ownership percentages must total exactly 100% (currently ${totalPercentage}%)`);
      return;
    }

    setLoading(true);
    try {
      const targetVehicle = vehicles.find((v) => v.id === selectedVehicleId);
      const vehicleName = targetVehicle
        ? `${targetVehicle.make} ${targetVehicle.model} (${targetVehicle.registrationNumber})`
        : null;

      const accountPayload: Record<string, any> = {
        name: newAccountName.trim(),
        balance: 0,
        isSharedOwnership: isSharedOwnership,
        sharedOwnership: isSharedOwnership ? sharedOwners : null,
        vehicleId: selectedVehicleId || null,
        vehicleName,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      const docRef = await addDoc(collection(db, 'accounts'), accountPayload);

      // If linked to a vehicle, update the vehicle document as well
      if (selectedVehicleId && targetVehicle) {
        try {
          await updateDoc(doc(db, 'vehicles', selectedVehicleId), {
            isSharedOwnership: isSharedOwnership,
            sharedOwnership: isSharedOwnership ? sharedOwners : null,
            owner: {
              ...(targetVehicle.owner || {}),
              accountId: docRef.id,
              accountName: newAccountName.trim(),
              isSharedOwnership: isSharedOwnership,
              sharedOwnership: isSharedOwnership ? sharedOwners : null,
            },
          });
        } catch (vErr) {
          console.warn('Error updating linked vehicle:', vErr);
        }
      }

      toast.success('Account created successfully');
      setNewAccountName('');
      setIsSharedOwnership(false);
      setSelectedVehicleId('');
      setSharedOwners([
        { ownerName: 'AIE Skyline Limited', sharePercentage: 60, isCompany: true },
        { ownerName: 'Partner Co-Owner', sharePercentage: 40, isCompany: false },
      ]);
    } catch (error) {
      console.error('Error adding account:', error);
      toast.error('Failed to add account');
    } finally {
      setLoading(false);
    }
  };

  const handleStartEdit = (account: Account) => {
    setEditingAccount(account);
    setEditName(account.name);
    setIsSharedOwnership(account.isSharedOwnership === true || Boolean(account.sharedOwnership?.length));
    setSelectedVehicleId(account.vehicleId || '');
    if (account.sharedOwnership && account.sharedOwnership.length > 0) {
      setSharedOwners(account.sharedOwnership);
    } else {
      setSharedOwners([
        { ownerName: 'AIE Skyline Limited', sharePercentage: 60, isCompany: true },
        { ownerName: 'Partner Co-Owner', sharePercentage: 40, isCompany: false },
      ]);
    }
  };

  const handleUpdateAccount = async (accountId: string) => {
    if (!editName.trim()) {
      toast.error('Please enter an account name');
      return;
    }
    if (accounts.some((acc) => acc.id !== accountId && acc.name.toLowerCase() === editName.trim().toLowerCase())) {
      toast.error(`An account named "${editName.trim()}" already exists.`);
      return;
    }
    if (isSharedOwnership && !isPercentageValid) {
      toast.error(`Ownership percentages must total exactly 100% (currently ${totalPercentage}%)`);
      return;
    }

    setLoading(true);
    try {
      const targetVehicle = vehicles.find((v) => v.id === selectedVehicleId);
      const vehicleName = targetVehicle
        ? `${targetVehicle.make} ${targetVehicle.model} (${targetVehicle.registrationNumber})`
        : null;

      await updateDoc(doc(db, 'accounts', accountId), {
        name: editName.trim(),
        isSharedOwnership: isSharedOwnership,
        sharedOwnership: isSharedOwnership ? sharedOwners : null,
        vehicleId: selectedVehicleId || null,
        vehicleName,
        updatedAt: serverTimestamp(),
      });

      if (selectedVehicleId && targetVehicle) {
        try {
          await updateDoc(doc(db, 'vehicles', selectedVehicleId), {
            isSharedOwnership: isSharedOwnership,
            sharedOwnership: isSharedOwnership ? sharedOwners : null,
            owner: {
              ...(targetVehicle.owner || {}),
              accountId,
              accountName: editName.trim(),
              isSharedOwnership: isSharedOwnership,
              sharedOwnership: isSharedOwnership ? sharedOwners : null,
            },
          });
        } catch (vErr) {
          console.warn('Error updating linked vehicle:', vErr);
        }
      }

      toast.success('Account updated successfully');
      setEditingAccount(null);
      setEditName('');
    } catch (error) {
      console.error('Error updating account:', error);
      toast.error('Failed to update account');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteClick = (account: Account) => {
    const balance = accountBalances.get(account.id) || 0;
    if (balance !== 0) {
      toast.error(`Cannot delete "${account.name}". Balance: ${formatCurrency(balance)}.`);
      return;
    }

    const isUsed = transactions.some(
      (t) => t.accountsFrom?.includes(account.id) || t.accountsTo?.includes(account.id)
    );
    if (isUsed) {
      toast.error(`Cannot delete "${account.name}". Associated with transactions. Re-assign them first.`);
      return;
    }

    setShowDeleteConfirm(account);
  };

  const handleConfirmDelete = async () => {
    if (!showDeleteConfirm) return;
    setLoading(true);
    try {
      await deleteDoc(doc(db, 'accounts', showDeleteConfirm.id));
      toast.success(`Account "${showDeleteConfirm.name}" deleted successfully`);
      setShowDeleteConfirm(null);
    } catch (error) {
      console.error('Error deleting account:', error);
      toast.error('Failed to delete account');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="space-y-6">
        {/* ADD OR EDIT ACCOUNT FORM */}
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 sm:p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-200 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-indigo-50 border border-indigo-200 text-indigo-700 rounded-xl">
                <Building2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm sm:text-base font-bold text-slate-900">
                  {editingAccount ? `Edit Account: ${editingAccount.name}` : 'Create New Finance Account'}
                </h3>
                <p className="text-xs text-slate-500">
                  Configure vehicle link and designated shared ownership percentages.
                </p>
              </div>
            </div>

            {editingAccount && (
              <button
                type="button"
                onClick={() => {
                  setEditingAccount(null);
                  setEditName('');
                  setIsSharedOwnership(false);
                  setSelectedVehicleId('');
                }}
                className="text-xs text-slate-500 hover:text-slate-700 font-semibold cursor-pointer"
              >
                Cancel Edit
              </button>
            )}
          </div>

          {/* Basic Account Info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <FormField
              label="Account Name"
              value={editingAccount ? editName : newAccountName}
              onChange={(e) => (editingAccount ? setEditName(e.target.value) : setNewAccountName(e.target.value))}
              placeholder="e.g. Toyota Prius (LR60 XYX) or Partner Account"
              required
            />

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Linked Vehicle (Optional)
              </label>
              <select
                value={selectedVehicleId}
                onChange={(e) => handleVehicleChange(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-xl text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">-- No Specific Vehicle Linked --</option>
                {vehicles.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.make} {v.model} ({v.registrationNumber})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* SHARED OWNERSHIP TOGGLE */}
          <div className="pt-2 border-t border-slate-200">
            <div className="flex items-center justify-between p-3 bg-white rounded-xl border border-slate-200">
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="sharedOwnershipToggle"
                  checked={isSharedOwnership}
                  onChange={(e) => setIsSharedOwnership(e.target.checked)}
                  className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300 cursor-pointer"
                />
                <label htmlFor="sharedOwnershipToggle" className="cursor-pointer">
                  <span className="block text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                    <PieChart className="w-3.5 h-3.5 text-indigo-600" />
                    Designate Shared Ownership & Profit Split
                  </span>
                  <span className="text-[11px] text-slate-500">
                    Enable co-owner percentage assignment for automated profit distribution.
                  </span>
                </label>
              </div>

              {isSharedOwnership && (
                <div className="flex items-center gap-2">
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-xs font-extrabold ${
                      isPercentageValid
                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                        : 'bg-amber-100 text-amber-800 border border-amber-300'
                    }`}
                  >
                    Total: {totalPercentage}% {isPercentageValid ? '✓ Balanced' : `(${100 - totalPercentage}% remaining)`}
                  </span>
                  <button
                    type="button"
                    onClick={handleAutoBalance}
                    className="text-[11px] text-indigo-600 hover:text-indigo-800 font-bold underline cursor-pointer"
                  >
                    Auto-Balance
                  </button>
                </div>
              )}
            </div>

            {/* CO-OWNERS SHARE TABLE */}
            {isSharedOwnership && (
              <div className="mt-3 p-3.5 bg-indigo-50/50 border border-indigo-200 rounded-xl space-y-3 animate-in fade-in duration-150">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-indigo-950 uppercase tracking-wider">
                    Assigned Co-Owners & Ownership Percentages (%)
                  </h4>
                  <button
                    type="button"
                    onClick={handleAddOwnerRow}
                    className="px-2.5 py-1 text-xs font-bold bg-white text-indigo-700 border border-indigo-300 hover:bg-indigo-50 rounded-lg shadow-2xs flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3 h-3" /> Add Co-Owner
                  </button>
                </div>

                <div className="space-y-2">
                  {sharedOwners.map((owner, idx) => (
                    <div
                      key={idx}
                      className="flex flex-col sm:flex-row items-center gap-2 bg-white p-2.5 rounded-xl border border-indigo-100 shadow-2xs"
                    >
                      <div className="flex-1 w-full flex flex-col sm:flex-row gap-1.5">
                        <input
                          type="text"
                          value={owner.ownerName}
                          onChange={(e) => handleUpdateOwnerField(idx, 'ownerName', e.target.value)}
                          placeholder="Owner / Entity Name"
                          className="flex-1 px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-medium focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        />
                        <select
                          value={owner.accountId || ''}
                          onChange={(e) => {
                            const val = e.target.value;
                            const matchedAcc = accounts.find((a) => a.id === val);
                            setSharedOwners(
                              sharedOwners.map((o, i) => {
                                if (i !== idx) return o;
                                return {
                                  ...o,
                                  accountId: val || undefined,
                                  ownerName: matchedAcc ? matchedAcc.name : o.ownerName,
                                };
                              })
                            );
                          }}
                          className="w-full sm:w-36 px-2 py-1.5 text-[11px] bg-slate-50 border border-slate-200 rounded-lg text-slate-600 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-medium"
                          title="Optionally link to an existing finance account"
                        >
                          <option value="">(Link Account)</option>
                          {accounts.map((a) => (
                            <option key={a.id} value={a.id}>
                              {a.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="w-full sm:w-28 flex items-center gap-1">
                        <input
                          type="number"
                          min="0"
                          max="100"
                          step="0.5"
                          value={owner.sharePercentage}
                          onChange={(e) =>
                            handleUpdateOwnerField(idx, 'sharePercentage', parseFloat(e.target.value) || 0)
                          }
                          className="w-full px-2 py-1.5 text-xs font-mono font-bold text-right bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        />
                        <span className="text-xs font-bold text-slate-500">%</span>
                      </div>

                      <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                        <label className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-600 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={owner.isCompany ?? false}
                            onChange={(e) => handleUpdateOwnerField(idx, 'isCompany', e.target.checked)}
                            className="w-3.5 h-3.5 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300"
                          />
                          Company
                        </label>

                        {sharedOwners.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveOwnerRow(idx)}
                            className="p-1 text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                            title="Remove Owner"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Form Actions */}
          <div className="flex justify-end pt-2">
            <button
              onClick={() => (editingAccount ? handleUpdateAccount(editingAccount.id) : handleAddAccount())}
              disabled={loading}
              className="px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs transition-colors disabled:opacity-50 cursor-pointer"
            >
              {loading ? 'Saving...' : editingAccount ? 'Update Account Configuration' : 'Create Account'}
            </button>
          </div>
        </div>

        {/* MANAGE ACCOUNTS LIST WITH BADGES */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Existing Accounts ({accounts.length})
            </h3>
            <span className="text-xs text-slate-500">
              {accounts.filter((a) => a.isSharedOwnership || a.sharedOwnership?.length).length} Co-Owned Accounts
            </span>
          </div>

          <div className="space-y-2 max-h-96 overflow-y-auto pr-1 border border-slate-200 rounded-2xl p-2 bg-slate-50/50 divide-y divide-slate-100">
            {accounts.length === 0 && (
              <p className="text-xs text-slate-500 text-center py-6">No accounts created yet.</p>
            )}

            {accounts.map((account) => {
              const balance = accountBalances.get(account.id) || 0;
              const balanceColor = balance > 0 ? 'text-emerald-700 font-bold' : balance < 0 ? 'text-rose-700 font-bold' : 'text-slate-600';
              const shares = account.sharedOwnership || [];
              const isShared = account.isSharedOwnership === true || shares.length > 0;

              return (
                <div
                  key={account.id}
                  className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-3 bg-white rounded-xl border border-slate-200 hover:border-slate-300 transition-colors gap-2"
                >
                  <div className="flex-1 min-w-0 mr-2">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-xs text-slate-900 truncate" title={account.name}>
                        {account.name}
                      </span>

                      {/* SHARED OWNERSHIP BADGE */}
                      {isShared && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-indigo-50 border border-indigo-200 text-indigo-700 whitespace-nowrap">
                          Shared:{' '}
                          {shares.length > 0
                            ? shares.map((s) => `${s.sharePercentage}% ${s.ownerName.split(' ')[0]}`).join(' / ')
                            : 'Co-Owned'}
                        </span>
                      )}
                    </div>

                    {account.vehicleName && (
                      <span className="text-[11px] text-slate-500 block truncate flex items-center gap-1 mt-0.5">
                        <Car className="w-3 h-3 text-slate-400" />
                        Vehicle: {account.vehicleName}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center space-x-3 w-full sm:w-auto justify-between sm:justify-end">
                    <span
                      className={`font-mono text-xs ${balanceColor} sm:w-24 text-right`}
                      title={`Balance: ${formatCurrency(balance)}`}
                    >
                      {formatCurrency(balance)}
                    </span>

                    <div className="flex items-center space-x-1.5">
                      {isShared && onOpenPayout && (
                        <button
                          type="button"
                          onClick={() => {
                            onClose();
                            onOpenPayout(account.vehicleId || undefined, account.id);
                          }}
                          className="px-2 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-lg text-[11px] font-bold transition-colors cursor-pointer"
                        >
                          Payout
                        </button>
                      )}

                      <button
                        onClick={() => handleStartEdit(account)}
                        disabled={loading}
                        className="px-2 py-1 text-xs text-indigo-600 hover:text-indigo-800 font-semibold cursor-pointer"
                      >
                        Edit
                      </button>

                      <button
                        onClick={() => handleDeleteClick(account)}
                        disabled={loading}
                        className="px-2 py-1 text-xs text-rose-600 hover:text-rose-800 font-semibold cursor-pointer"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Close Button */}
        <div className="flex justify-end pt-3 border-t border-slate-200">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-slate-50 cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <Modal
          isOpen={!!showDeleteConfirm}
          onClose={() => setShowDeleteConfirm(null)}
          title="Confirm Delete Account"
          size="sm"
        >
          <div className="p-4 space-y-4">
            <div className="flex items-start gap-3">
              <div className="p-2.5 rounded-full bg-rose-100 text-rose-600 shrink-0">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-900">Delete Account</h4>
                <p className="text-xs text-slate-500 mt-1">
                  Are you sure you want to delete the account "{showDeleteConfirm.name}"? This action cannot be
                  undone.
                </p>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                disabled={loading}
                onClick={() => setShowDeleteConfirm(null)}
                className="px-3.5 py-1.5 text-xs font-bold text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={loading}
                onClick={handleConfirmDelete}
                className="px-3.5 py-1.5 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl cursor-pointer"
              >
                {loading ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
};

export default ManageAccountsModal;
