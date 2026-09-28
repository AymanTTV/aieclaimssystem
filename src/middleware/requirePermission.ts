// src/middleware/requirePermission.ts
import { Request, Response, NextFunction } from 'express';

export interface AuthenticatedUser {
  id: string;
  email?: string;
  role?: string;
  permissions?: Record<string, Record<string, boolean>>;
}

export interface AuthenticatedRequest extends Request {
  user?: AuthenticatedUser;
}

/**
 * Express middleware for Universal Explicit-Allow RBAC.
 *
 * Rules:
 * 1. NO AUTOMATIC PERMISSIONS FOR ANYONE (no role, manager, or admin bypass).
 * 2. Explicit Allow Only: user.permissions[module][action] MUST be explicitly true.
 * 3. Deny-by-Default: Missing, undefined, null, or false values return 403 Forbidden.
 * 4. Zero schema changes required.
 *
 * @param module - Permission module key (e.g. 'vehicles', 'rentals', 'users', 'finance')
 * @param action - Action key (e.g. 'view', 'create', 'update', 'delete', 'export')
 */
export const requirePermission = (module: string, action: string) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    const user = req.user;

    // 1. Check authentication
    if (!user) {
      res.status(401).json({
        success: false,
        error: 'Unauthorized',
        message: 'Authentication is required to perform this action.',
      });
      return;
    }

    // 2. Strict Universal Explicit-Allow Check
    // Unticked, missing, false, or undefined are strictly blocked for all users (including Admin & Manager)
    const isExplicitlyAllowed = user.permissions?.[module]?.[action] === true;

    if (!isExplicitlyAllowed) {
      res.status(403).json({
        success: false,
        error: 'Forbidden',
        message: `Access denied. You do not have explicit permission to '${action}' on '${module}'.`,
      });
      return;
    }

    return next();
  };
};
