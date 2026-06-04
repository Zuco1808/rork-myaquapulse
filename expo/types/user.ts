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
  canManageMeters: boolean;      // create / edit / delete meters
  canManageReadings: boolean;    // submit readings (staff/worker)
  canVerifyReadings: boolean;    // approve / reject submitted readings
  canManageTasks: boolean;
  canSendNotifications: boolean;
  canViewReports: boolean;
  canManageUsers: boolean;
  canManageBilling: boolean;
  canManageUtility: boolean;
  canManageDistributor: boolean;
  canAccessAllTenants: boolean;
  // Role identity flags — for UI branching that depends on who the user is, not what they can do
  isEndUser: boolean;
  isWorker: boolean;
}

export const getPermissions = (role: UserRole): UserPermissions => {
  const none: UserPermissions = {
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
    isEndUser:            false,
    isWorker:             false,
  };

  switch (role) {
    case 'super_admin':
      return {
        canReadMeters:        true,
        canManageMeters:      true,
        canManageReadings:    true,
        canVerifyReadings:    true,
        canManageTasks:       true,
        canSendNotifications: true,
        canViewReports:       true,
        canManageUsers:       true,
        canManageBilling:     true,
        canManageUtility:     true,
        canManageDistributor: true,
        canAccessAllTenants:  true,
        isEndUser:            false,
        isWorker:             false,
      };
    case 'distributor_admin':
      return { ...none,
        canManageMeters:      true,
        canViewReports:       true,
        canManageUsers:       true,
        canManageDistributor: true,
      };
    case 'utility_admin':
      return { ...none,
        canReadMeters:        true,
        canManageMeters:      true,
        canManageReadings:    true,
        canVerifyReadings:    true,
        canManageTasks:       true,
        canSendNotifications: true,
        canViewReports:       true,
        canManageUsers:       true,
        canManageBilling:     true,
        canManageUtility:     true,
      };
    case 'finance':
      return { ...none,
        canReadMeters:     true,
        canVerifyReadings: true,   // finance approves readings for billing
        canViewReports:    true,
        canManageBilling:  true,
      };
    case 'worker':
      return { ...none,
        canReadMeters:     true,
        canManageReadings: true,   // workers submit readings
        canManageTasks:    true,
        isWorker:          true,
      };
    case 'end_user':
    default:
      return { ...none, isEndUser: true };
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
  // Notification preferences
  push_token?: string | null;
  email_notifications_enabled?: boolean;
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
  // joined
  assigned_to_name?: string | null;
  connection_address?: string | null;
  connection_serial?: string | null;
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

// ─────────────────────────────────────────────────────────────────────────────
// UI / display types (camelCase, returned by API mappers — not raw DB rows)
// Previously in types/location.ts — consolidated here as single source of truth
// ─────────────────────────────────────────────────────────────────────────────

/** Mapped meter reading returned by mapReading() in lib/api/readings.ts */
export interface ReadingDisplay {
  id: string;
  meterId: string;
  connection_id?: string;
  utility_id?: string;
  worker_id?: string;
  value: number;
  readingDate: number;
  readBy: string;
  readMethod?: 'manual' | 'ocr' | 'end_user' | 'smart' | 'estimated';
  imageUrl?: string;
  status: 'pending' | 'verified' | 'rejected';
  notes?: string;
  meterSerialNumber?: string;
  consumption?: number;
  previousValue?: number;
  createdAt?: number;
}

/** Extended display reading (alias for ReadingCard component) */
export interface Reading extends ReadingDisplay {}

export interface WaterMeter {
  id: string;
  serialNumber: string;
  type: 'standard' | 'smart' | 'industrial' | 'analog' | 'digital';
  installDate: number;
  status: 'active' | 'inactive';
  locationId: string;
  userId: string;
  lastReading?: ReadingDisplay;
  previousReadings?: ReadingDisplay[];
}

export interface Location {
  id: string;
  name: string;
  address: string;
  city: string;
  postalCode: string;
  country: string;
  companyId: string;
  type?: 'city' | 'municipality' | 'settlement' | 'street' | 'building';
  parentId?: string;
  buildingCount?: number;
  meterCount?: number;
  userCount?: number;
  coordinates?: { latitude: number; longitude: number };
  createdAt: number;
  updatedAt?: number;
}

/** UI Bill (camelCase display model). For the DB invoice row use Invoice. */
export interface Bill {
  id: string;
  userId: string;
  meterId: string;
  locationId: string;
  amount: number;
  currency: string;
  periodFrom: number;
  periodTo: number;
  dueDate: number;
  issueDate?: number;
  paidDate?: number;
  status: 'draft' | 'issued' | 'pending' | 'paid' | 'overdue' | 'cancelled';
  consumption: number;
  createdAt: number;
  updatedAt?: number;
}

export interface WaterAlert {
  id: string;
  meterId: string;
  userId?: string;
  companyId?: string;
  companyName?: string;
  title?: string;
  meterName?: string;
  locationName?: string;
  type: 'high_consumption' | 'low_consumption' | 'leak' | 'no_reading' | 'meter_fault';
  severity: 'low' | 'medium' | 'high' | 'warning' | 'critical' | 'info';
  message: string;
  value?: number;
  threshold?: number;
  unit?: string;
  isResolved: boolean;
  createdAt: number;
  resolvedAt?: number;
}