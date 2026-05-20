import { User, getDefaultPermissions } from '@/types/user';

export const mockUsers: User[] = [
  {
    id: 'u1',
    name: 'Amina Hodžić',
    email: 'superadmin@aquapulse.com',
    password: 'password',
    role: 'superadmin',
    permissions: getDefaultPermissions('superadmin'),
    isActive: true,
    phone: '+387 61 123 456',
    address: 'Zmaja od Bosne 8, Sarajevo',
    avatar: 'https://randomuser.me/api/portraits/women/1.jpg',
    createdAt: Date.now() - 365 * 24 * 60 * 60 * 1000,
  },
  {
    id: 'u2',
    name: 'Emir Kovačević',
    email: 'admin@vodovod.com',
    password: 'password',
    role: 'admin',
    permissions: getDefaultPermissions('admin'),
    isActive: true,
    phone: '+387 61 234 567',
    address: 'Ferhadija 12, Sarajevo',
    avatar: 'https://randomuser.me/api/portraits/men/2.jpg',
    createdAt: Date.now() - 300 * 24 * 60 * 60 * 1000,
  },
  {
    id: 'u3',
    name: 'Selma Begić',
    email: 'finance@vodovod.com',
    password: 'password',
    role: 'finance',
    permissions: getDefaultPermissions('finance'),
    isActive: true,
    phone: '+387 61 345 678',
    address: 'Titova 18, Sarajevo',
    avatar: 'https://randomuser.me/api/portraits/women/3.jpg',
    createdAt: Date.now() - 250 * 24 * 60 * 60 * 1000,
  },
  {
    id: 'u4',
    name: 'Adnan Mehić',
    email: 'radnik@vodovod.com',
    password: 'password',
    role: 'worker',
    permissions: getDefaultPermissions('worker'),
    isActive: true,
    phone: '+387 61 456 789',
    address: 'Alipašina 22, Sarajevo',
    avatar: 'https://randomuser.me/api/portraits/men/4.jpg',
    createdAt: Date.now() - 200 * 24 * 60 * 60 * 1000,
  },
  {
    id: 'u5',
    name: 'Lejla Hadžić',
    email: 'gradjanin@email.com',
    password: 'password',
    role: 'citizen',
    permissions: getDefaultPermissions('citizen'),
    isActive: true,
    phone: '+387 61 567 890',
    address: 'Koševo 5, Sarajevo',
    avatar: 'https://randomuser.me/api/portraits/women/5.jpg',
    createdAt: Date.now() - 150 * 24 * 60 * 60 * 1000,
  },
  {
    id: 'u6',
    name: 'Haris Mujić',
    email: 'odrzavanje@vodovod.com',
    password: 'password',
    role: 'maintenance',
    permissions: getDefaultPermissions('maintenance'),
    isActive: true,
    phone: '+387 61 678 901',
    address: 'Hamdije Kreševljakovića 15, Sarajevo',
    avatar: 'https://randomuser.me/api/portraits/men/6.jpg',
    createdAt: Date.now() - 100 * 24 * 60 * 60 * 1000,
  },
  {
    id: 'u7',
    name: 'Jasmina Delić',
    email: 'jasmina@email.com',
    password: 'password',
    role: 'citizen',
    permissions: getDefaultPermissions('citizen'),
    isActive: false,
    phone: '+387 61 789 012',
    address: 'Branilaca Sarajeva 20, Sarajevo',
    avatar: 'https://randomuser.me/api/portraits/women/7.jpg',
    createdAt: Date.now() - 50 * 24 * 60 * 60 * 1000,
  },
];

export const getUserByCredentials = (email: string, password: string): User | null => {
  const user = mockUsers.find(
    (u) => u.email.toLowerCase() === email.toLowerCase() && u.password === password
  );
  if (user) {
    const { password: _pwd, ...userWithoutPassword } = user;
    return userWithoutPassword as User;
  }
  return null;
};
