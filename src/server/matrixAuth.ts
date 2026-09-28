// src/server/matrixAuth.ts
import { Request, Response, NextFunction } from 'express';

export interface MatrixUserPayload {
  id?: string;
  email?: string;
  role?: string;
  permissions?: Record<string, Record<string, boolean>>;
}

export interface MatrixAuthRequest extends Request {
  matrixUser?: MatrixUserPayload;
}

/**
 * Extracts the user and matrix permissions from the incoming Express request.
 * Checks:
 * 1. req.matrixUser or req.user (already attached)
 * 2. 'x-user-permissions' header (JSON string)
 * 3. 'authorization' Bearer token containing JSON payload or base64 token
 * 4. req.body.user / req.query.user
 */
export function extractMatrixUser(req: Request): MatrixUserPayload | null {
  // 1. Existing attached user
  const existingUser = (req as any).matrixUser || (req as any).user;
  if (existingUser && existingUser.permissions) {
    return existingUser;
  }

  // 2. Custom header 'x-user-permissions'
  const permissionsHeader = req.headers['x-user-permissions'];
  if (permissionsHeader && typeof permissionsHeader === 'string') {
    try {
      const parsedPerms = JSON.parse(permissionsHeader);
      const userRole = (req.headers['x-user-role'] as string) || (existingUser?.role) || 'authenticated_user';
      const userId = (req.headers['x-user-id'] as string) || (existingUser?.id) || 'usr_unknown';
      const userEmail = (req.headers['x-user-email'] as string) || (existingUser?.email) || '';
      return {
        id: userId,
        email: userEmail,
        role: userRole,
        permissions: parsedPerms,
      };
    } catch {
      // Invalid JSON header
    }
  }

  // 3. Authorization Bearer Token
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.slice(7).trim();
    try {
      // Attempt to decode base64 or direct JSON payload if passed by client
      let decodedStr = token;
      if (token.startsWith('{') && token.endsWith('}')) {
        decodedStr = token;
      } else {
        decodedStr = Buffer.from(token, 'base64').toString('utf8');
      }
      const parsed = JSON.parse(decodedStr);
      if (parsed && typeof parsed === 'object') {
        return {
          id: parsed.id || parsed.uid,
          email: parsed.email,
          role: parsed.role,
          permissions: parsed.permissions || parsed,
        };
      }
    } catch {
      // Not a raw JSON/base64 token
    }
  }

  // 4. Request body or query fallback
  if (req.body && req.body.user && req.body.user.permissions) {
    return req.body.user;
  }

  return null;
}

/**
 * Universal Explicit-Allow Authorization Middleware for High Risk Registry
 * 
 * Strict RBAC Rules:
 * - NO role bypasses (Admin, Manager, Super Admin must still have explicit true in matrix).
 * - Checks aliases: 'highRisk', 'highRiskRegistry', 'high_risk_registry', 'High Risk Registry'.
 * - Checks action aliases: 'edit' <-> 'update'.
 * - Returns 401 if unauthenticated.
 * - Returns 403 Forbidden if explicit matrix toggle is missing or false.
 */
export function requireHighRiskPermission(action: 'view' | 'create' | 'edit' | 'update' | 'delete' | 'export' | 'import') {
  return (req: Request, res: Response, next: NextFunction): void => {
    const user = extractMatrixUser(req);

    if (!user) {
      res.status(401).json({
        success: false,
        error: 'Unauthorized',
        code: 'AUTH_REQUIRED',
        message: 'Authentication credentials or user permission matrix required.',
      });
      return;
    }

    (req as MatrixAuthRequest).matrixUser = user;
    const permissions = user.permissions;

    if (!permissions || typeof permissions !== 'object') {
      res.status(403).json({
        success: false,
        error: 'Forbidden',
        code: 'NO_PERMISSIONS_MATRIX',
        module: 'highRiskRegistry',
        requiredAction: action,
        message: `Access denied: User '${user.email || user.id || 'User'}' has no permission matrix configured. Explicit '${action}' permission required.`,
      });
      return;
    }

    // Inspect aliases
    const highRiskModule =
      permissions.highRisk ||
      (permissions as any).highRiskRegistry ||
      (permissions as any)['high_risk_registry'] ||
      (permissions as any)['High Risk Registry'];

    if (!highRiskModule || typeof highRiskModule !== 'object') {
      res.status(403).json({
        success: false,
        error: 'Forbidden',
        code: 'MODULE_PERMISSION_DENIED',
        module: 'highRiskRegistry',
        requiredAction: action,
        message: `Access denied: High Risk Registry is not granted in the permission matrix. Explicit '${action}' permission required.`,
      });
      return;
    }

    // Evaluate target action
    let isAllowed = false;
    if (action === 'update' || action === 'edit') {
      isAllowed = highRiskModule.update === true || highRiskModule.edit === true;
    } else {
      isAllowed = highRiskModule[action] === true;
    }

    if (!isAllowed) {
      res.status(403).json({
        success: false,
        error: 'Forbidden',
        code: 'ACTION_PERMISSION_DENIED',
        module: 'highRiskRegistry',
        requiredAction: action,
        message: `Access denied: Missing explicit '${action}' permission for High Risk Registry in permissions matrix.`,
        user: {
          id: user.id,
          role: user.role,
        },
      });
      return;
    }

    // Explicit permission verified
    next();
  };
}
