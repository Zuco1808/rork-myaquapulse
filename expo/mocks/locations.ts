import { Location, WaterMeter, MeterReading, Bill } from '@/types/location';

export const mockLocations: Location[] = [
  {
    id: 'loc1',
    name: 'Sarajevo Centar',
    address: 'Ferhadija 1',
    city: 'Sarajevo',
    postalCode: '71000',
    country: 'Bosnia and Herzegovina',
    companyId: 'c1',
    type: 'city',
    buildingCount: 45,
    meterCount: 120,
    userCount: 200,
    coordinates: { latitude: 43.8563, longitude: 18.4131 },
    createdAt: Date.now() - 365 * 24 * 60 * 60 * 1000,
  },
  {
    id: 'loc2',
    name: 'Novo Sarajevo',
    address: 'Zmaja od Bosne 10',
    city: 'Sarajevo',
    postalCode: '71000',
    country: 'Bosnia and Herzegovina',
    companyId: 'c1',
    type: 'municipality',
    buildingCount: 30,
    meterCount: 80,
    userCount: 150,
    coordinates: { latitude: 43.8476, longitude: 18.3564 },
    createdAt: Date.now() - 300 * 24 * 60 * 60 * 1000,
  },
  {
    id: 'loc3',
    name: 'Ilidza',
    address: 'Bosanski put 5',
    city: 'Ilidza',
    postalCode: '71210',
    country: 'Bosnia and Herzegovina',
    companyId: 'c1',
    type: 'municipality',
    buildingCount: 20,
    meterCount: 60,
    userCount: 100,
    coordinates: { latitude: 43.8300, longitude: 18.3100 },
    createdAt: Date.now() - 250 * 24 * 60 * 60 * 1000,
  },
  {
    id: 'loc4',
    name: 'Stari Grad',
    address: 'Bascarsija 1',
    city: 'Sarajevo',
    postalCode: '71000',
    country: 'Bosnia and Herzegovina',
    companyId: 'c1',
    type: 'settlement',
    buildingCount: 15,
    meterCount: 40,
    userCount: 80,
    coordinates: { latitude: 43.8600, longitude: 18.4300 },
    createdAt: Date.now() - 200 * 24 * 60 * 60 * 1000,
  },
  {
    id: 'loc5',
    name: 'Vogosca',
    address: 'Igmanska 2',
    city: 'Vogosca',
    postalCode: '71320',
    country: 'Bosnia and Herzegovina',
    companyId: 'c2',
    type: 'city',
    buildingCount: 10,
    meterCount: 30,
    userCount: 60,
    coordinates: { latitude: 43.9000, longitude: 18.3400 },
    createdAt: Date.now() - 150 * 24 * 60 * 60 * 1000,
  },
];

export const mockMeters: WaterMeter[] = [
  {
    id: 'm1',
    serialNumber: 'WM-2024-001',
    type: 'digital',
    installDate: Date.now() - 365 * 24 * 60 * 60 * 1000,
    status: 'active',
    locationId: 'loc1',
    userId: 'u5',
  },
  {
    id: 'm2',
    serialNumber: 'WM-2024-002',
    type: 'analog',
    installDate: Date.now() - 300 * 24 * 60 * 60 * 1000,
    status: 'active',
    locationId: 'loc2',
    userId: 'u5',
  },
  {
    id: 'm3',
    serialNumber: 'WM-2024-003',
    type: 'smart',
    installDate: Date.now() - 200 * 24 * 60 * 60 * 1000,
    status: 'inactive',
    locationId: 'loc3',
    userId: 'u7',
  },
];

export const mockReadings: MeterReading[] = [
  {
    id: 'r1',
    meterId: 'm1',
    value: 1250,
    readingDate: Date.now() - 30 * 24 * 60 * 60 * 1000,
    readBy: 'u4',
    readMethod: 'manual',
    status: 'verified',
    consumption: 45,
    previousValue: 1205,
  },
  {
    id: 'r2',
    meterId: 'm1',
    value: 1205,
    readingDate: Date.now() - 60 * 24 * 60 * 60 * 1000,
    readBy: 'u4',
    readMethod: 'ocr',
    status: 'verified',
    consumption: 38,
    previousValue: 1167,
  },
  {
    id: 'r3',
    meterId: 'm2',
    value: 890,
    readingDate: Date.now() - 30 * 24 * 60 * 60 * 1000,
    readBy: 'u4',
    readMethod: 'manual',
    status: 'pending',
    consumption: 32,
    previousValue: 858,
  },
];

export const mockBills: Bill[] = [
  {
    id: 'b1',
    userId: 'u5',
    meterId: 'm1',
    locationId: 'loc1',
    amount: 45.50,
    currency: 'BAM',
    periodFrom: Date.now() - 60 * 24 * 60 * 60 * 1000,
    periodTo: Date.now() - 30 * 24 * 60 * 60 * 1000,
    dueDate: Date.now() + 15 * 24 * 60 * 60 * 1000,
    issueDate: Date.now() - 25 * 24 * 60 * 60 * 1000,
    status: 'issued',
    consumption: 45,
    createdAt: Date.now() - 25 * 24 * 60 * 60 * 1000,
  },
  {
    id: 'b2',
    userId: 'u5',
    meterId: 'm1',
    locationId: 'loc1',
    amount: 38.20,
    currency: 'BAM',
    periodFrom: Date.now() - 90 * 24 * 60 * 60 * 1000,
    periodTo: Date.now() - 60 * 24 * 60 * 60 * 1000,
    dueDate: Date.now() - 15 * 24 * 60 * 60 * 1000,
    issueDate: Date.now() - 55 * 24 * 60 * 60 * 1000,
    paidDate: Date.now() - 20 * 24 * 60 * 60 * 1000,
    status: 'paid',
    consumption: 38,
    createdAt: Date.now() - 55 * 24 * 60 * 60 * 1000,
  },
  {
    id: 'b3',
    userId: 'u7',
    meterId: 'm2',
    locationId: 'loc2',
    amount: 29.80,
    currency: 'BAM',
    periodFrom: Date.now() - 60 * 24 * 60 * 60 * 1000,
    periodTo: Date.now() - 30 * 24 * 60 * 60 * 1000,
    dueDate: Date.now() - 5 * 24 * 60 * 60 * 1000,
    issueDate: Date.now() - 25 * 24 * 60 * 60 * 1000,
    status: 'overdue',
    consumption: 32,
    createdAt: Date.now() - 25 * 24 * 60 * 60 * 1000,
  },
];

export const getLocationsByType = (type: Location['type']): Location[] => {
  return mockLocations.filter(loc => loc.type === type);
};

export const getLocationsByParent = (parentId: string): Location[] => {
  return mockLocations.filter(loc => loc.parentId === parentId);
};

export const getLocationPath = (locationId: string): Location[] => {
  const path: Location[] = [];
  let currentLocation: Location | undefined = mockLocations.find(loc => loc.id === locationId);

  while (currentLocation) {
    path.unshift(currentLocation);
    if (currentLocation.parentId) {
      currentLocation = mockLocations.find(loc => loc.id === currentLocation?.parentId);
    } else {
      break;
    }
  }

  return path;
};
