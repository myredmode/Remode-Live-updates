import React from 'react';
import { ShieldAlert, ArrowRight, Lock } from 'lucide-react';
import { AdminRole, AdminUser } from '../../types';
import {
  AdminPermission,
  hasAllPermissions,
  hasAnyPermission,
  PERMISSION_CATALOG,
} from '../../utils/rbac';

interface AccessDeniedNoticeProps {
  role: AdminRole;
  section: string;
  requiredPermission?: AdminPermission | string;
  onRedirect: () => void;
}

export const AccessDeniedNotice: React.FC<AccessDeniedNoticeProps> = ({
  role,
  section,
  requiredPermission,
  onRedirect,
}) => {
  const defaultWorkspaceName =
    role === 'Label Admin'
      ? 'Orders & Shipping Labels'
      : role === 'Listing Admin' || role === 'Listing + Label Admin'
      ? 'Product Catalog & Listings'
      : 'Dashboard';

  const permissionDef = requiredPermission
    ? PERMISSION_CATALOG.find((p) => p.key === requiredPermission)
    : undefined;

  return (
    <div className="bg-white border border-rose-200 rounded-2xl p-8 max-w-xl mx-auto my-8 text-center shadow-xs space-y-4">
      <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center mx-auto">
        <ShieldAlert className="w-6 h-6" />
      </div>
      <div className="space-y-1.5">
        <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-rose-100 text-rose-800">
          Role-Based Access Control (RBAC)
        </span>
        <h3 className="text-lg font-extrabold text-slate-900">
          Restricted Access: {section}
        </h3>
        <p className="text-xs text-slate-600 leading-relaxed max-w-md mx-auto">
          Your active staff role is{' '}
          <strong className="text-slate-900 font-bold">{role}</strong>. Access to{' '}
          <span className="font-semibold text-slate-800">{section}</span> is
          restricted to authorized roles or accounts granted the required
          granular permission by the{' '}
          <strong className="text-rose-600 font-semibold">Super Admin</strong>.
        </p>
      </div>

      {requiredPermission && (
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-[11px] text-slate-700">
          <Lock className="w-3.5 h-3.5 text-rose-500 shrink-0" />
          <span>
            Required Permission:{' '}
            <code className="font-mono font-bold text-slate-900">
              {permissionDef ? `${permissionDef.label} (${requiredPermission})` : requiredPermission}
            </code>
          </span>
        </div>
      )}

      <div className="pt-2">
        <button
          type="button"
          onClick={onRedirect}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-black text-white text-xs font-bold transition shadow-xs cursor-pointer"
        >
          <span>Go to {defaultWorkspaceName}</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};

interface PermissionGuardProps {
  user: AdminUser | AdminRole | null | undefined;
  permission: AdminPermission | AdminPermission[];
  mode?: 'any' | 'all';
  fallback?: React.ReactNode;
  children: React.ReactNode;
}

/**
 * Declarative wrapper component that conditionally renders children only if the
 * current admin user holds the required granular permission(s).
 */
export const PermissionGuard: React.FC<PermissionGuardProps> = ({
  user,
  permission,
  mode = 'any',
  fallback = null,
  children,
}) => {
  const permissions = Array.isArray(permission) ? permission : [permission];
  const allowed =
    mode === 'all'
      ? hasAllPermissions(user, permissions)
      : hasAnyPermission(user, permissions);

  if (!allowed) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
};
