export interface WaterMeter {
  id: string;
  serialNumber: string;
  type: 'standard' | 'smart' | 'industrial' | 'analog' | 'digital';
  installDate: number;
  status: 'active' | 'inactive';
  locationId: string;
  userId: string;
  lastReading?: MeterReading;
  previousReadings?: MeterReading[];
}

export interface MeterReading {
  id: string;
  meterId: string;
  value: number;
  readingDate: number;
  readBy: string;
  readMethod?: 'manual' | 'ocr' | 'end_user';
  imageUrl?: string;
  status: 'pending' | 'verified' | 'rejected';
  consumption?: number;
  previousValue?: number;
}

export interface Reading extends MeterReading {
  // Extended properties for the ReadingCard component
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
  coordinates?: {
    latitude: number;
    longitude: number;
  };
  createdAt: number;
  updatedAt?: number;
}

export interface Company {
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
  createdAt: number;
  updatedAt?: number;
}

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
