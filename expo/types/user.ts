export type UserRole = 'superadmin' | 'admin' | 'finance' | 'worker' | 'citizen' | 'maintenance';

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
  locationIds?: string[];
  meterIds?: string[];
}

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
    case 'maintenance':
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
        canReadMeters: false,
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

export type UserGroupType =
  | 'residential'
  | 'commercial'
  | 'industrial'
  | 'public'
  | 'household'
  | 'business'
  | 'agriculture'
  | 'livestock'
  | 'other';

export interface UserGroup {
  id: string;
  name: string;
  type: UserGroupType;
  description?: string;
  discountPercent?: number;
  isDefault?: boolean;
  createdAt?: number;
}

export interface CompanyWithStatus {
  id: string;
  name: string;
  address: string;
  city: string;
  postalCode: string;
  country: string;
  phone: string;
  email: string;
  website?: string;
  logo?: string;
  supportEmail?: string;
  usersCount?: number;
  locationsCount?: number;
  metersCount?: number;
  isActive?: boolean;
  createdAt: number;
  updatedAt?: number;
}

// Alias za Company koji se koristi u companies/index.tsx
export type Company = CompanyWithStatus;

export const canManageUser = (manager: User, target: User): boolean => {
  if (manager.role === 'superadmin') return true;
  if (manager.role === 'admin' && target.role !== 'superadmin') return true;
  return false;
};
