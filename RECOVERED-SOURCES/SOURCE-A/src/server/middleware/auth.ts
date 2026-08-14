/**
 * SMS — Authorization Foundation & Permission Enforcement
 */

import { Request, Response, NextFunction } from 'express';
import { AuthorizationError } from '../errors/AppError.js';

export const PERMISSIONS = {
  STUDENT_VIEW: 'student:view',
  STUDENT_CREATE: 'student:create',
  STUDENT_EDIT: 'student:edit',
  STUDENT_OVERRIDE_DUPLICATE: 'student:override_duplicate',
  STUDENT_DOCUMENT_UPLOAD: 'student:document_upload',
  STUDENT_AUDIT_VIEW: 'student:audit_view',

  // Module 02 — Guardian Permissions
  GUARDIAN_VIEW: 'guardian:view',
  GUARDIAN_CREATE: 'guardian:create',
  GUARDIAN_EDIT: 'guardian:edit',
  GUARDIAN_RELATIONSHIP_MANAGE: 'guardian:relationship_manage',
  GUARDIAN_PRIMARY_MANAGE: 'guardian:primary_manage',
  GUARDIAN_STATUS_MANAGE: 'guardian:status_manage',
  GUARDIAN_AUDIT_VIEW: 'guardian:audit_view',
} as const;

export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

export interface UserContext {
  userId: string;
  role: string;
  permissions: Permission[];
}

const ROLE_PERMISSIONS: Record<string, Permission[]> = {
  ADMIN: [
    PERMISSIONS.STUDENT_VIEW,
    PERMISSIONS.STUDENT_CREATE,
    PERMISSIONS.STUDENT_EDIT,
    PERMISSIONS.STUDENT_OVERRIDE_DUPLICATE,
    PERMISSIONS.STUDENT_DOCUMENT_UPLOAD,
    PERMISSIONS.STUDENT_AUDIT_VIEW,
    PERMISSIONS.GUARDIAN_VIEW,
    PERMISSIONS.GUARDIAN_CREATE,
    PERMISSIONS.GUARDIAN_EDIT,
    PERMISSIONS.GUARDIAN_RELATIONSHIP_MANAGE,
    PERMISSIONS.GUARDIAN_PRIMARY_MANAGE,
    PERMISSIONS.GUARDIAN_STATUS_MANAGE,
    PERMISSIONS.GUARDIAN_AUDIT_VIEW,
  ],
  REGISTRAR: [
    PERMISSIONS.STUDENT_VIEW,
    PERMISSIONS.STUDENT_CREATE,
    PERMISSIONS.STUDENT_EDIT,
    PERMISSIONS.STUDENT_OVERRIDE_DUPLICATE,
    PERMISSIONS.STUDENT_DOCUMENT_UPLOAD,
    PERMISSIONS.GUARDIAN_VIEW,
    PERMISSIONS.GUARDIAN_CREATE,
    PERMISSIONS.GUARDIAN_EDIT,
    PERMISSIONS.GUARDIAN_RELATIONSHIP_MANAGE,
    PERMISSIONS.GUARDIAN_PRIMARY_MANAGE,
    PERMISSIONS.GUARDIAN_STATUS_MANAGE,
  ],
  VIEWER: [
    PERMISSIONS.STUDENT_VIEW,
    PERMISSIONS.GUARDIAN_VIEW,
  ],
};

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: UserContext;
    }
  }
}

export function attachUserContext(req: Request, _res: Response, next: NextFunction): void {
  const roleHeader = (req.headers['x-user-role'] as string)?.toUpperCase() || 'REGISTRAR';
  const userIdHeader = (req.headers['x-user-id'] as string) || 'SYS-USER-01';

  const permissions = ROLE_PERMISSIONS[roleHeader] || ROLE_PERMISSIONS.REGISTRAR;

  req.user = {
    userId: userIdHeader,
    role: roleHeader,
    permissions,
  };

  next();
}

export function requirePermission(permission: Permission) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      return next(new AuthorizationError('User context missing'));
    }

    if (!req.user.permissions.includes(permission)) {
      return next(
        new AuthorizationError(`Permission denied: Missing '${permission}' required for this action`)
      );
    }

    next();
  };
}
