// types/user.ts
export type UserRole =
  | 'super_admin'
  | 'distributor_admin'
  | 'utility_admin'
  | 'finance'
  | 'worker'
  | 'end_user';

export interface UserPermissions {
  canReadMeters: boolean;
  canManageReadings: boolean;
  canManageTasks: boolean;
  canSendNotifications: boolean;
  canViewReports: boolean;
  canManageUsers: boolean;
  canManageBilling: boolean;
  canManageUtility: boolean;
  canManageDistributor: boolean;
  canAccessAllTenants: boolean;
}

export const getPermissions = (role: UserRole): UserPermissions => {
  const none: UserPermissions = {
    canReadMeters:        false,
    canManageReadings:    false,
    canManageTasks:       false,
    canSendNotifications: false,
    canViewReports:       false,
    canManageUsers:       false,
    canManageBilling:     false,
    canManageUtility:     false,
    canManageDistributor: false,
    canAccessAllTenants:  false,
  };

  switch (role) {
    case 'super_admin':
      return {
        canReadMeters:        true,
        canManageReadings:    true,
        canManageTasks:       true,
        canSendNotifications: true,
        canViewReports:       true,
        canManageUsers:       true,
        canManageBilling:     true,
        canManageUtility:     true,
        canManageDistributor: true,
        canAccessAllTenants:  true,
      };
    case 'distributor_admin':
      return { ...none,
        canViewReports:       true,
        canManageUsers:       true,
        canManageDistributor: true,
      };
    case 'utility_admin':
      return { ...none,
        canReadMeters:        true,
        canManageReadings:    true,
        canManageTasks:       true,
        canSendNotifications: true,
        canViewReports:       true,
        canManageUsers:       true,
        canManageBilling:     true,
        canManageUtility:     true,
      };
    case 'finance':
      return { ...none,
        canReadMeters:    true,
        canViewReports:   true,
        canManageBilling: true,
      };
    case 'worker':
      return { ...none,
        canReadMeters:  true,
        canManageTasks: true,
      };
    case 'end_user':
    default:
      return { ...none };
  }
};

// Alias za backward compatibility
export const getDefaultPermissions = getPermissions;

export interface Profile {
  id: string;
  full_name: string;
  email: string;
  phone?: string;
  avatar_url?: string;
  role: UserRole;
  distributor_id?: string;
  utility_id?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  permissions: UserPermissions;
  // Compatibility aliases — mapirani u auth-store
  name?: string;
  avatar?: string;
  address?: string;
  companyId?: string;
  locationIds?: string[];
}

// Alias
export type User = Profile;

export interface Distributor {
  id: string;
  name: string;
  contact_email?: string;
  contact_phone?: string;
  address?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface WaterUtility {
  id: string;
  distributor_id?: string;
  name: string;
  city?: string;
  address?: string;
  pib?: string;
  logo_url?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// Company alias — stari kod koristi Company, mapira na WaterUtility
export interface CompanyWithStatus {
  id: string;
  name: string;
  city?: string;
  address?: string;
  usersCount?: number;
  locationsCount?: number;
  metersCount?: number;
  isActive?: boolean;
  created_at: string;
  updated_at?: string;
}
export type Company = CompanyWithStatus;

export type UserGroupType =
  | 'residential'
  | 'commercial'
  | 'industrial'
  | 'public'
  | 'agriculture'
  | 'household'
  | 'business'
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

export interface Connection {
  id: string;
  utility_id: string;
  user_id: string;
  address: string;
  meter_serial: string;
  meter_type: 'standard' | 'smart' | 'prepaid';
  user_group: UserGroupType;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface MeterReading {
  id: string;
  connection_id: string;
  utility_id: string;
  worker_id?: string;
  reading_value: number;
  reading_date: string;
  reading_type: 'manual' | 'smart' | 'estimated' | 'ocr';
  photo_url?: string;
  ocr_raw_text?: string;
  note?: string;
  is_verified: boolean;
  created_at: string;
}

export interface Invoice {
  id: string;
  connection_id: string;
  utility_id: string;
  reading_from_id?: string;
  reading_to_id?: string;
  period_from: string;
  period_to: string;
  consumption_m3?: number;
  amount_bam: number;
  status: 'draft' | 'pending' | 'sent' | 'paid' | 'overdue' | 'cancelled';
  due_date?: string;
  paid_at?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface Task {
  id: string;
  utility_id: string;
  assigned_to?: string;
  created_by?: string;
  connection_id?: string;
  title: string;
  description?: string;
  task_type: 'reading' | 'worker' | 'inspection' | 'installation' | 'other';
  priority: 'low' | 'normal' | 'high' | 'urgent';
  status: 'open' | 'in_progress' | 'done' | 'cancelled';
  due_date?: string;
  completed_at?: string;
  created_at: string;
  updated_at: string;
}

export interface Notification {
  id: string;
  utility_id?: string;
  user_id?: string;
  title: string;
  body: string;
  type: 'info' | 'warning' | 'alert' | 'billing';
  is_read: boolean;
  created_at: string;
}

export const canManageUser = (manager: Profile, target: Profile): boolean => {
  if (manager.role === 'super_admin') return true;
  if (manager.role === 'utility_admin' && target.role !== 'super_admin') return true;
  return false;
};