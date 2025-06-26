export interface Task {
  id: string;
  title: string;
  description: string;
  assignedTo: string; // User ID
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  dueDate: number;
  createdAt: number;
  completedAt?: number;
  meterIds?: string[]; // For reading tasks
}

export const mockTasks: Task[] = [
  {
    id: 'task1',
    title: 'Očitanje vodomjera - Centar',
    description: 'Potrebno očitati 10 vodomjera u naselju Marijin Dvor.',
    assignedTo: '4', // Worker
    status: 'in_progress',
    priority: 'medium',
    dueDate: Date.now() + 2 * 24 * 60 * 60 * 1000,
    createdAt: Date.now() - 3 * 24 * 60 * 60 * 1000,
    meterIds: ['meter1', 'meter2'],
  },
  {
    id: 'task2',
    title: 'Provjera curenja - Čengić Vila',
    description: 'Prijavljeno moguće curenje u zgradi na adresi Hamdije Čemerlića 15.',
    assignedTo: '4', // Worker
    status: 'pending',
    priority: 'high',
    dueDate: Date.now() + 1 * 24 * 60 * 60 * 1000,
    createdAt: Date.now() - 1 * 24 * 60 * 60 * 1000,
  },
];

export const getTasksByUser = (userId: string): Task[] => {
  return mockTasks.filter(task => task.assignedTo === userId);
};

export const getTasksByStatus = (status: Task['status']): Task[] => {
  return mockTasks.filter(task => task.status === status);
};

export const getTasksByPriority = (priority: Task['priority']): Task[] => {
  return mockTasks.filter(task => task.priority === priority);
};