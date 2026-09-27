// src/services/maintenanceCategory.service.ts
// Connected to the system-wide unified categories service (Finance, Invoices & Maintenance)

import { unifiedCategoryService } from './unifiedCategory.service';
import { Category } from '../types/category';

export const getAll = async (): Promise<Category[]> => unifiedCategoryService.getAll();
export const create = async (payload: { name: string }): Promise<Category> => unifiedCategoryService.create(payload);
export const createBulk = async (names: string[]): Promise<Category[]> => unifiedCategoryService.createBulk(names);
export const update = async (id: string, payload: { name: string }): Promise<void> => unifiedCategoryService.update(id, payload);
export const remove = async (id: string): Promise<void> => unifiedCategoryService.delete(id);
export const subscribe = (callback: (categories: Category[]) => void) => unifiedCategoryService.subscribe(callback);

export default {
  getAll,
  create,
  createBulk,
  update,
  delete: remove,
  subscribe,
};
