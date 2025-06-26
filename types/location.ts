export interface WaterMeter {
  id: string;
  serialNumber: string;
  type: 'standard' | 'smart' | 'industrial';
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
  readMethod?: 'manual' | 'ocr' | 'citizen';
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