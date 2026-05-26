/**
 * lib/use-permissions.ts
 *
 * Convenience hook — returns the current user's UserPermissions object.
 * When no user is logged in, returns a fully-restricted (all-false) object
 * so callers never need to null-check.
 *
 * Usage:
 *   const { canManageBilling, canSendNotifications } = usePermissions();
 */

import { useAuthStore } from '@/store/auth-store';
import type { UserPermissions } from '@/types/user';

const NONE: UserPermissions = {
  canReadMeters:        false,
  canManageMeters:      false,
  canManageReadings:    false,
  canVerifyReadings:    false,
  canManageTasks:       false,
  canSendNotifications: false,
  canViewReports:       false,
  canManageUsers:       false,
  canManageBilling:     false,
  canManageUtility:     false,
  canManageDistributor: false,
  canAccessAllTenants:  false,
};

export function usePermissions(): UserPermissions {
  return useAuthStore((s) => s.user?.permissions ?? NONE);
}
