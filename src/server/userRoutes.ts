// src/server/userRoutes.ts
import { Router, Request, Response } from 'express';

export const usersRouter = Router();

// In-memory permissions store for server-side persistence & fast responses
const serverUserPermissions: Record<string, any> = {};

/**
 * PATCH /api/users/:id/permissions
 * Updates user permissions and RBAC flags such as canManageProfitDistribution
 */
usersRouter.patch('/:id/permissions', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const body = req.body;

    if (!id) {
      return res.status(400).json({ success: false, error: 'User ID is required' });
    }

    const current = serverUserPermissions[id] || {};
    const updated = {
      ...current,
      ...body,
      canManageProfitDistribution:
        body.canManageProfitDistribution !== undefined
          ? Boolean(body.canManageProfitDistribution)
          : current.canManageProfitDistribution,
      allowDocumentOverrides:
        body.allowDocumentOverrides !== undefined
          ? Boolean(body.allowDocumentOverrides)
          : current.allowDocumentOverrides,
      updatedAt: new Date().toISOString(),
    };

    serverUserPermissions[id] = updated;

    res.json({
      success: true,
      message: 'User permissions updated successfully',
      userId: id,
      data: updated,
    });
  } catch (error: any) {
    console.error('Error in PATCH /api/users/:id/permissions:', error);
    res.status(500).json({ success: false, error: error?.message || 'Server error updating permissions' });
  }
});

/**
 * GET /api/users/:id/permissions
 */
usersRouter.get('/:id/permissions', (req: Request, res: Response) => {
  const { id } = req.params;
  const permissions = serverUserPermissions[id] || {};
  res.json({ success: true, userId: id, permissions });
});
