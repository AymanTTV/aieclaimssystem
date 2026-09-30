// src/utils/vehicleDepartmentAccount.ts
import { Vehicle } from '../types';
import { Account } from '../types/finance';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';

export interface VehicleDepartmentAccountMapping {
  /**
   * Resolved account ID (from accounts collection or department mapping)
   */
  accountId: string;
  /**
   * Human-readable account name
   */
  accountName: string;
  /**
   * Department ID if assigned
   */
  departmentId?: string;
  /**
   * Department Name if assigned
   */
  departmentName?: string;
  /**
   * Finance Group ID if assigned
   */
  groupId?: string;
  /**
   * Finance Group Name if assigned
   */
  groupName?: string;
  /**
   * Indicates how the account was resolved
   */
  source: 'department_match' | 'department_direct' | 'owner_account' | 'group_match' | 'system_default' | 'none';
}

/**
 * Normalizes text for tolerant case-insensitive substring comparisons
 */
function normalize(str?: string | null): string {
  return (str || '').trim().toLowerCase().replace(/[^a-z0-9]/g, '');
}

/**
 * Automatically maps a vehicle record to its associated department account,
 * ensuring seamless financial and invoice posting across modules.
 *
 * Mapping Hierarchy:
 * 1. Exact or fuzzy match between vehicle.assignedDepartmentId / assignedDepartmentName and an Account in the accounts list.
 * 2. Vehicle Owner's pre-assigned account (vehicle.owner.accountId / accountName).
 * 3. Vehicle Group match against accounts list (vehicle.assignedGroupId / assignedGroupName).
 * 4. Direct department metadata (if vehicle has department assigned, even if no explicit Account object exists yet).
 * 5. General / Default Fleet operating account fallback.
 *
 * @param vehicle The vehicle object to inspect
 * @param accounts The list of available finance accounts
 * @returns VehicleDepartmentAccountMapping
 */
export function mapVehicleToDepartmentAccount(
  vehicle?: Partial<Vehicle> | null,
  accounts: Account[] = []
): VehicleDepartmentAccountMapping {
  if (!vehicle) {
    const defaultAcc = accounts[0];
    return {
      accountId: defaultAcc?.id || '',
      accountName: defaultAcc?.name || 'General Fleet Account',
      source: defaultAcc ? 'system_default' : 'none',
    };
  }

  const deptId = vehicle.assignedDepartmentId || undefined;
  const deptName = vehicle.assignedDepartmentName || undefined;
  const normDeptName = normalize(deptName);

  const ownerAccountId = vehicle.owner?.accountId || undefined;
  const ownerAccountName = vehicle.owner?.accountName || vehicle.owner?.name || undefined;
  const normOwnerName = normalize(ownerAccountName);

  const groupId = vehicle.assignedGroupId || undefined;
  const groupName = vehicle.assignedGroupName || undefined;
  const normGroupName = normalize(groupName);

  // 1. Try matching against vehicle.assignedDepartment
  if (deptId || deptName) {
    // 1a. Direct ID match in accounts
    if (deptId) {
      const matchById = accounts.find((a) => a.id === deptId);
      if (matchById) {
        return {
          accountId: matchById.id,
          accountName: matchById.name,
          departmentId: deptId,
          departmentName: deptName || matchById.name,
          groupId,
          groupName,
          source: 'department_match',
        };
      }
    }

    // 1b. Exact or tolerant name match in accounts
    if (normDeptName) {
      const matchByName = accounts.find((a) => {
        const normAcc = normalize(a.name);
        return (
          normAcc === normDeptName ||
          normAcc.includes(normDeptName) ||
          normDeptName.includes(normAcc)
        );
      });

      if (matchByName) {
        return {
          accountId: matchByName.id,
          accountName: matchByName.name,
          departmentId: deptId || matchByName.id,
          departmentName: deptName || matchByName.name,
          groupId,
          groupName,
          source: 'department_match',
        };
      }
    }
  }

  // 2. Try matching against vehicle.owner (pre-assigned owner account)
  if (ownerAccountId || ownerAccountName) {
    if (ownerAccountId) {
      const matchOwnerAcc = accounts.find((a) => a.id === ownerAccountId);
      if (matchOwnerAcc) {
        return {
          accountId: matchOwnerAcc.id,
          accountName: matchOwnerAcc.name,
          departmentId: deptId,
          departmentName: deptName,
          groupId,
          groupName,
          source: 'owner_account',
        };
      }

      // Valid accountId string even if not in current accounts array
      return {
        accountId: ownerAccountId,
        accountName: ownerAccountName || 'Owner Account',
        departmentId: deptId,
        departmentName: deptName,
        groupId,
        groupName,
        source: 'owner_account',
      };
    }

    if (normOwnerName) {
      const matchOwnerName = accounts.find((a) => normalize(a.name) === normOwnerName);
      if (matchOwnerName) {
        return {
          accountId: matchOwnerName.id,
          accountName: matchOwnerName.name,
          departmentId: deptId,
          departmentName: deptName,
          groupId,
          groupName,
          source: 'owner_account',
        };
      }
    }
  }

  // 3. Try matching against vehicle.assignedGroup
  if (groupId || groupName) {
    if (groupId) {
      const matchGroup = accounts.find((a) => a.id === groupId);
      if (matchGroup) {
        return {
          accountId: matchGroup.id,
          accountName: matchGroup.name,
          departmentId: deptId,
          departmentName: deptName,
          groupId,
          groupName: groupName || matchGroup.name,
          source: 'group_match',
        };
      }
    }

    if (normGroupName) {
      const matchGroupName = accounts.find((a) => {
        const normAcc = normalize(a.name);
        return normAcc === normGroupName || normAcc.includes(normGroupName);
      });
      if (matchGroupName) {
        return {
          accountId: matchGroupName.id,
          accountName: matchGroupName.name,
          departmentId: deptId,
          departmentName: deptName,
          groupId: groupId || matchGroupName.id,
          groupName: groupName || matchGroupName.name,
          source: 'group_match',
        };
      }
    }
  }

  // 4. Vehicle has department metadata, but no corresponding ledger account was found
  if (deptId || deptName) {
    return {
      accountId: deptId || 'dept_unlinked',
      accountName: deptName ? `${deptName} (Dept Account)` : 'Department Account',
      departmentId: deptId,
      departmentName: deptName,
      groupId,
      groupName,
      source: 'department_direct',
    };
  }

  // 5. System fallback (look for "Fleet", "General", "Main", or first account)
  const generalFleetAccount =
    accounts.find((a) => {
      const n = a.name.toLowerCase();
      return n.includes('fleet') || n.includes('general') || n.includes('main') || n.includes('operating');
    }) || accounts[0];

  return {
    accountId: generalFleetAccount?.id || '',
    accountName: generalFleetAccount?.name || 'General Fleet Account',
    groupId,
    groupName,
    source: generalFleetAccount ? 'system_default' : 'none',
  };
}

/**
 * Asynchronously loads accounts from Firestore if not provided, then maps
 * the vehicle to its associated department account.
 */
export async function resolveVehicleDepartmentAccount(
  vehicle?: Partial<Vehicle> | null,
  cachedAccounts?: Account[]
): Promise<VehicleDepartmentAccountMapping> {
  let accounts = cachedAccounts;
  if (!accounts || accounts.length === 0) {
    try {
      const snap = await getDocs(collection(db, 'accounts'));
      accounts = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Account));
    } catch (err) {
      console.warn('Error fetching accounts for vehicle department mapping:', err);
      accounts = [];
    }
  }

  return mapVehicleToDepartmentAccount(vehicle, accounts);
}
