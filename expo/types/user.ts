export type UserRole = 'superadmin' | 'admin' | 'finance' | 'worker' | 'citizen';

export interface UserPermissions {
  canReadMeters: boolean;
  canReportIssues: boolean;
  canManageTasks: boolean;
  canEditReadings: boolean;
  canSendNotifications: boolean;
  canViewAllData: boolean;
  canManageUsers: boolean;
  canManageCompanies: boolean;
  canManageBilling: boolean;
  canBackupData: boolean;
}

export interface User {
  id: string;
  name: string;
  email: string;
  password?: string;
  role: UserRole;
  permissions: UserPermissions;
  isActive: boolean;
  phone?: string;
  address?: string;
  avatar?: string;
  createdAt: number;
  updatedAt?: number;
  lastLogin?: number;
  companyId?: string;
  locationIds?: string[]; // Multiple locations
  meterIds?: string[]; // Multiple meters
}

// Default permissions based on role
export const getDefaultPermissions = (role: UserRole): UserPermissions => {
  switch (role) {
    case 'superadmin':
      return {
        canReadMeters: true,
        canReportIssues: true,
        canManageTasks: true,
        canEditReadings: true,
        canSendNotifications: true,
        canViewAllData: true,
        canManageUsers: true,
        canManageCompanies: true,
        canManageBilling: true,
        canBackupData: true
      };
    case 'admin':
      return {
        canReadMeters: true,
        canReportIssues: true,
        canManageTasks: true,
        canEditReadings: true,
        canSendNotifications: true,
        canViewAllData: true,
        canManageUsers: true,
        canManageCompanies: false,
        canManageBilling: true,
        canBackupData: true
      };
    case 'finance':
      return {
        canReadMeters: true,
        canReportIssues: true,
        canManageTasks: true,
        canEditReadings: true,
        canSendNotifications: true,
        canViewAllData: true,
        canManageUsers: false,
        canManageCompanies: false,
        canManageBilling: true,
        canBackupData: false
      };
    case 'worker':
      return {
        canReadMeters: true,
        canReportIssues: true,
        canManageTasks: true,
        canEditReadings: false,
        canSendNotifications: false,
        canViewAllData: false,
        canManageUsers: false,
        canManageCompanies: false,
        canManageBilling: false,
        canBackupData: false
      };
    case 'citizen':
      return {
        canReadMeters: false, // This can be toggled by admin/finance
        canReportIssues: true,
        canManageTasks: false,
        canEditReadings: false,
        canSendNotifications: false,
        canViewAllData: false,
        canManageUsers: false,
        canManageCompanies: false,
        canManageBilling: false,
        canBackupData: false
      };
    default:
      return {
        canReadMeters: false,
        canReportIssues: false,
        canManageTasks: false,
        canEditReadings: false,
        canSendNotifications: false,
        canViewAllData: false,
        canManageUsers: false,
        canManageCompanies: false,
        canManageBilling: false,
        canBackupData: false
      };
  }
};