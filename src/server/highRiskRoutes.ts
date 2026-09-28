// src/server/highRiskRoutes.ts
import { Router, Response } from 'express';
import { requireHighRiskPermission, MatrixAuthRequest } from './matrixAuth';

export const highRiskRouter = Router();

// In-memory backend store for high-risk drivers (synced across sessions)
interface ServerHighRiskDriver {
  id: string;
  fullName: string;
  badgeNumber?: string;
  riskLevel: 'High Risk' | 'Caution' | 'Cleared';
  category: string;
  categoryDetails?: string;
  reportingFleet: string;
  reportedYear: number;
  createdAt: string;
  updatedAt?: string;
  isOverridden?: boolean;
  overriddenBy?: string;
  overrideReason?: string;
}

let driversDb: ServerHighRiskDriver[] = [
  {
    id: 'hrd-1',
    fullName: 'John Smith',
    badgeNumber: 'BDG-8821',
    riskLevel: 'High Risk',
    category: 'Damage',
    categoryDetails: 'Unpaid Vehicle Damage ($3,400 repair default)',
    reportingFleet: 'Apex Rentals',
    reportedYear: 2025,
    createdAt: '2025-04-12T10:30:00.000Z',
  },
  {
    id: 'hrd-2',
    fullName: 'Robert Johnson',
    badgeNumber: 'BDG-4409',
    riskLevel: 'Caution',
    category: 'Non-Payment',
    categoryDetails: 'Outstanding Rental Balance & Unsettled Invoices',
    reportingFleet: 'Metro Hire',
    reportedYear: 2025,
    createdAt: '2025-08-20T14:15:00.000Z',
  },
  {
    id: 'hrd-3',
    fullName: 'Michael Brown',
    badgeNumber: 'BDG-1904',
    riskLevel: 'High Risk',
    category: 'Breach of Terms',
    categoryDetails: 'Vehicle Abandonment & Unauthorized Commercial Subletting',
    reportingFleet: 'City Fleet',
    reportedYear: 2024,
    createdAt: '2024-11-05T09:45:00.000Z',
  },
];

/**
 * GET /api/high-risk-drivers
 * Required Matrix Permission: view === true
 */
highRiskRouter.get('/', requireHighRiskPermission('view'), (req: MatrixAuthRequest, res: Response) => {
  const query = typeof req.query.q === 'string' ? req.query.q.trim().toLowerCase() : '';
  
  if (!query) {
    res.json({
      success: true,
      totalCount: driversDb.length,
      drivers: driversDb,
    });
    return;
  }

  const matches = driversDb.filter(d => 
    d.fullName.toLowerCase().includes(query) ||
    (d.badgeNumber && d.badgeNumber.toLowerCase().includes(query)) ||
    (d.reportingFleet && d.reportingFleet.toLowerCase().includes(query)) ||
    d.category.toLowerCase().includes(query)
  );

  res.json({
    success: true,
    query,
    totalCount: matches.length,
    drivers: matches,
  });
});

/**
 * POST /api/high-risk-drivers
 * Required Matrix Permission: create === true
 */
highRiskRouter.post('/', requireHighRiskPermission('create'), (req: MatrixAuthRequest, res: Response) => {
  const { fullName, badgeNumber, riskLevel, category, categoryDetails, reportingFleet } = req.body;

  if (!fullName || typeof fullName !== 'string' || fullName.trim().length < 2) {
    res.status(400).json({
      success: false,
      error: 'BadRequest',
      message: 'Driver full name is required and must be at least 2 characters.',
    });
    return;
  }

  const newDriver: ServerHighRiskDriver = {
    id: `hrd-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    fullName: fullName.trim(),
    badgeNumber: badgeNumber?.trim() || `BDG-${Math.floor(1000 + Math.random() * 9000)}`,
    riskLevel: riskLevel || 'High Risk',
    category: category || 'Damage',
    categoryDetails: categoryDetails?.trim() || 'Adverse incident recorded in fleet operations.',
    reportingFleet: reportingFleet?.trim() || 'Apex Rentals',
    reportedYear: new Date().getFullYear(),
    createdAt: new Date().toISOString(),
  };

  driversDb.unshift(newDriver);

  res.status(201).json({
    success: true,
    message: `Driver "${newDriver.fullName}" successfully registered in High Risk database.`,
    driver: newDriver,
  });
});

/**
 * PUT /api/high-risk-drivers/:id
 * Required Matrix Permission: update === true (or edit === true)
 */
highRiskRouter.put('/:id', requireHighRiskPermission('update'), (req: MatrixAuthRequest, res: Response) => {
  const { id } = req.params;
  const index = driversDb.findIndex(d => d.id === id);

  if (index === -1) {
    res.status(404).json({
      success: false,
      error: 'NotFound',
      message: `High risk driver record with ID '${id}' not found.`,
    });
    return;
  }

  const existing = driversDb[index];
  const { fullName, badgeNumber, riskLevel, category, categoryDetails, reportingFleet, isOverridden, overriddenBy, overrideReason } = req.body;

  const updated: ServerHighRiskDriver = {
    ...existing,
    fullName: fullName !== undefined ? String(fullName).trim() : existing.fullName,
    badgeNumber: badgeNumber !== undefined ? String(badgeNumber).trim() : existing.badgeNumber,
    riskLevel: riskLevel !== undefined ? riskLevel : existing.riskLevel,
    category: category !== undefined ? category : existing.category,
    categoryDetails: categoryDetails !== undefined ? String(categoryDetails).trim() : existing.categoryDetails,
    reportingFleet: reportingFleet !== undefined ? String(reportingFleet).trim() : existing.reportingFleet,
    isOverridden: isOverridden !== undefined ? Boolean(isOverridden) : existing.isOverridden,
    overriddenBy: overriddenBy !== undefined ? String(overriddenBy) : existing.overriddenBy,
    overrideReason: overrideReason !== undefined ? String(overrideReason) : existing.overrideReason,
    updatedAt: new Date().toISOString(),
  };

  driversDb[index] = updated;

  res.json({
    success: true,
    message: `Driver record '${updated.fullName}' successfully updated.`,
    driver: updated,
  });
});

/**
 * DELETE /api/high-risk-drivers/:id
 * Required Matrix Permission: delete === true
 */
highRiskRouter.delete('/:id', requireHighRiskPermission('delete'), (req: MatrixAuthRequest, res: Response) => {
  const { id } = req.params;
  const index = driversDb.findIndex(d => d.id === id);

  if (index === -1) {
    res.status(404).json({
      success: false,
      error: 'NotFound',
      message: `High risk driver record with ID '${id}' not found.`,
    });
    return;
  }

  const removed = driversDb.splice(index, 1)[0];

  res.json({
    success: true,
    message: `Driver record '${removed.fullName}' successfully deleted.`,
    deletedId: id,
  });
});

/**
 * POST /api/high-risk-drivers/bulk-import
 * Required Matrix Permission: import === true
 */
highRiskRouter.post('/bulk-import', requireHighRiskPermission('import'), (req: MatrixAuthRequest, res: Response) => {
  const { drivers, mode } = req.body;

  if (!Array.isArray(drivers)) {
    res.status(400).json({
      success: false,
      error: 'BadRequest',
      message: 'Body must include an array of driver records in "drivers".',
    });
    return;
  }

  if (mode === 'replace') {
    driversDb = drivers;
  } else {
    // Merge: update existing, add new
    const existingIds = new Set(driversDb.map(d => d.id));
    for (const d of drivers) {
      if (existingIds.has(d.id)) {
        const idx = driversDb.findIndex(x => x.id === d.id);
        driversDb[idx] = { ...driversDb[idx], ...d };
      } else {
        driversDb.push(d);
      }
    }
  }

  res.json({
    success: true,
    message: `Imported ${drivers.length} drivers successfully. Mode: ${mode || 'merge'}.`,
    totalCount: driversDb.length,
    drivers: driversDb,
  });
});
