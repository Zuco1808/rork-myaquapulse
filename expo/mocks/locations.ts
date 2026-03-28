import { Location, WaterMeter, MeterReading, Bill } from '@/types/location';

export const mockLocations: Location[] = [
  // Cities
  { 
    id: 'l1', 
    name: 'Ilidža', 
    type: 'city', 
    companyId: 'c1', 
    address: 'Butmirska cesta 12',
    city: 'Sarajevo',
    postalCode: '71210',
    latitude: 43.8282,
    longitude: 18.3085,
    buildingCount: 120,
    meterCount: 450,
    userCount: 380,
    createdAt: Date.now(), 
    updatedAt: Date.now() 
  },
  { 
    id: 'l2', 
    name: 'Centar', 
    type: 'city', 
    companyId: 'c1', 
    address: 'Maršala Tita 10',
    city: 'Sarajevo',
    postalCode: '71000',
    latitude: 43.8563,
    longitude: 18.4131,
    buildingCount: 180,
    meterCount: 720,
    userCount: 650,
    createdAt: Date.now(), 
    updatedAt: Date.now() 
  },
  { 
    id: 'l3', 
    name: 'Novi Grad', 
    type: 'city', 
    companyId: 'c1', 
    address: 'Bulevar Meše Selimovića 97',
    city: 'Sarajevo',
    postalCode: '71000',
    latitude: 43.8456,
    longitude: 18.3656,
    buildingCount: 210,
    meterCount: 840,
    userCount: 760,
    createdAt: Date.now(), 
    updatedAt: Date.now() 
  },
  { 
    id: 'l4', 
    name: 'Stari Grad', 
    type: 'city', 
    companyId: 'c1', 
    address: 'Zelenih beretki 4',
    city: 'Sarajevo',
    postalCode: '71000',
    latitude: 43.8598,
    longitude: 18.4313,
    buildingCount: 90,
    meterCount: 360,
    userCount: 320,
    createdAt: Date.now(), 
    updatedAt: Date.now() 
  },
  { 
    id: 'l5', 
    name: 'Novo Sarajevo', 
    type: 'city', 
    companyId: 'c1', 
    address: 'Zmaja od Bosne 55',
    city: 'Sarajevo',
    postalCode: '71000',
    latitude: 43.8522,
    longitude: 18.3975,
    buildingCount: 150,
    meterCount: 600,
    userCount: 540,
    createdAt: Date.now(), 
    updatedAt: Date.now() 
  },
  
  // Municipalities
  { 
    id: 'mun1', 
    name: 'Centar', 
    type: 'municipality', 
    parentId: 'city1', 
    companyId: 'c1', 
    address: 'Maršala Tita 10',
    city: 'Sarajevo',
    postalCode: '71000',
    latitude: 43.8563,
    longitude: 18.4131,
    createdAt: Date.now(), 
    updatedAt: Date.now() 
  },
  { 
    id: 'mun2', 
    name: 'Novi Grad', 
    type: 'municipality', 
    parentId: 'city1', 
    companyId: 'c1', 
    address: 'Bulevar Meše Selimovića 97',
    city: 'Sarajevo',
    postalCode: '71000',
    latitude: 43.8456,
    longitude: 18.3656,
    createdAt: Date.now(), 
    updatedAt: Date.now() 
  },
  
  // Settlements
  { 
    id: 'set1', 
    name: 'Marijin Dvor', 
    type: 'settlement', 
    parentId: 'mun1', 
    companyId: 'c1', 
    address: 'Zmaja od Bosne bb',
    city: 'Sarajevo',
    postalCode: '71000',
    latitude: 43.8545,
    longitude: 18.4012,
    createdAt: Date.now(), 
    updatedAt: Date.now() 
  },
  { 
    id: 'set2', 
    name: 'Čengić Vila', 
    type: 'settlement', 
    parentId: 'mun2', 
    companyId: 'c1', 
    address: 'Hamdije Čemerlića bb',
    city: 'Sarajevo',
    postalCode: '71000',
    latitude: 43.8489,
    longitude: 18.3789,
    createdAt: Date.now(), 
    updatedAt: Date.now() 
  },
  
  // Streets
  { 
    id: 'str1', 
    name: 'Zmaja od Bosne', 
    type: 'street', 
    parentId: 'set1', 
    companyId: 'c1', 
    address: 'Zmaja od Bosne',
    city: 'Sarajevo',
    postalCode: '71000',
    latitude: 43.8545,
    longitude: 18.4012,
    createdAt: Date.now(), 
    updatedAt: Date.now() 
  },
  { 
    id: 'str2', 
    name: 'Hamdije Čemerlića', 
    type: 'street', 
    parentId: 'set2', 
    companyId: 'c1', 
    address: 'Hamdije Čemerlića',
    city: 'Sarajevo',
    postalCode: '71000',
    latitude: 43.8489,
    longitude: 18.3789,
    createdAt: Date.now(), 
    updatedAt: Date.now() 
  },
  
  // Buildings
  { 
    id: 'bld1', 
    name: 'Zgrada UNITIC', 
    type: 'building', 
    parentId: 'str1', 
    companyId: 'c1', 
    address: 'Zmaja od Bosne 8',
    city: 'Sarajevo',
    postalCode: '71000',
    latitude: 43.8545,
    longitude: 18.4012,
    createdAt: Date.now(), 
    updatedAt: Date.now() 
  },
  { 
    id: 'bld2', 
    name: 'Stambena zgrada 15', 
    type: 'building', 
    parentId: 'str2', 
    companyId: 'c1', 
    address: 'Hamdije Čemerlića 15',
    city: 'Sarajevo',
    postalCode: '71000',
    latitude: 43.8489,
    longitude: 18.3789,
    createdAt: Date.now(), 
    updatedAt: Date.now() 
  },
];

export const mockWaterMeters: WaterMeter[] = [
  {
    id: 'meter1',
    serialNumber: 'SJV-12345',
    locationId: 'bld1',
    userId: '5', // Citizen
    type: 'digital',
    installDate: Date.now() - 365 * 24 * 60 * 60 * 1000,
    status: 'active',
  },
  {
    id: 'meter2',
    serialNumber: 'SJV-67890',
    locationId: 'bld2',
    type: 'analog',
    installDate: Date.now() - 180 * 24 * 60 * 60 * 1000,
    status: 'active',
  },
];

export const mockReadings: MeterReading[] = [
  {
    id: 'read1',
    meterId: 'meter1',
    value: 1234,
    previousValue: 1200,
    consumption: 34,
    readingDate: Date.now() - 30 * 24 * 60 * 60 * 1000,
    readBy: '4', // Worker
    readMethod: 'manual',
    status: 'verified',
  },
  {
    id: 'read2',
    meterId: 'meter1',
    value: 1268,
    previousValue: 1234,
    consumption: 34,
    readingDate: Date.now() - 1 * 24 * 60 * 60 * 1000,
    readBy: '5', // Citizen
    readMethod: 'citizen',
    status: 'pending',
  },
];

export const mockBills: Bill[] = [
  {
    id: 'bill1',
    meterId: 'meter1',
    userId: '5',
    readingId: 'read1',
    amount: 34 * 1.5, // Consumption * rate
    consumption: 34,
    issueDate: Date.now() - 25 * 24 * 60 * 60 * 1000,
    dueDate: Date.now() + 5 * 24 * 60 * 60 * 1000,
    status: 'pending',
  },
];

export const getLocationsByType = (type: Location['type']): Location[] => {
  return mockLocations.filter(loc => loc.type === type);
};

export const getLocationsByParent = (parentId: string): Location[] => {
  return mockLocations.filter(loc => loc.parentId === parentId);
};

export const getLocationPath = (locationId: string): Location[] => {
  const result: Location[] = [];
  let currentLocation = mockLocations.find(loc => loc.id === locationId);
  
  while (currentLocation) {
    result.unshift(currentLocation);
    if (currentLocation.parentId) {
      currentLocation = mockLocations.find(loc => loc.id === currentLocation?.parentId);
    } else {
      break;
    }
  }
  
  return result;
};

export const getMetersByLocation = (locationId: string): WaterMeter[] => {
  return mockWaterMeters.filter(meter => meter.locationId === locationId);
};

export const getMetersByUser = (userId: string): WaterMeter[] => {
  return mockWaterMeters.filter(meter => meter.userId === userId);
};

export const getReadingsByMeter = (meterId: string): MeterReading[] => {
  return mockReadings.filter(reading => reading.meterId === meterId);
};

export const getBillsByUser = (userId: string): Bill[] => {
  return mockBills.filter(bill => bill.userId === userId);
};