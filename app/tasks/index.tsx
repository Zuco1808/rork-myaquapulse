import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  TouchableOpacity, 
  TextInput,
  RefreshControl,
  Alert,
  SafeAreaView,
  Platform,
  Modal,
  ScrollView
} from 'react-native';
import { useRouter } from 'expo-router';
import { 
  ClipboardList, 
  Search, 
  Plus, 
  Filter, 
  ChevronRight, 
  MapPin, 
  Calendar, 
  Clock,
  CheckCircle,
  XCircle,
  Menu,
  X
} from 'lucide-react-native';
import { Header } from '@/components/layout/Header';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { Badge } from '@/components/ui/Badge';
import { Drawer } from '@/components/layout/Drawer';
import { Input } from '@/components/ui/Input';
import { useAuthStore } from '@/store/auth-store';
import Colors from '@/constants/colors';

// Task types
type TaskType = 'reading' | 'repair' | 'inspection' | 'installation' | 'other';
type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled';

interface Task {
  id: string;
  title: string;
  description: string;
  type: TaskType;
  status: TaskStatus;
  priority: 'low' | 'medium' | 'high';
  assignedTo: string;
  assignedToName: string;
  locationId: string;
  locationName: string;
  address: string;
  dueDate: string;
  createdAt: string;
  completedAt?: string;
  cancelReason?: string;
}

// Mock tasks data
const mockTasks: Task[] = [
  {
    id: 't1',
    title: 'Očitanje vodomjera VM-2023-001',
    description: 'Potrebno očitati stanje vodomjera za mjesečni obračun.',
    type: 'reading',
    status: 'pending',
    priority: 'medium',
    assignedTo: 'u4',
    assignedToName: 'Adnan Mehić',
    locationId: 'l1',
    locationName: 'Ilidža',
    address: 'Zmaja od Bosne 8, Sarajevo',
    dueDate: '2023-05-20',
    createdAt: '2023-05-01',
  },
  {
    id: 't2',
    title: 'Popravka curenja na vodomjeru VM-2023-002',
    description: 'Prijavljeno curenje vode na spoju vodomjera. Potrebno hitno sanirati.',
    type: 'repair',
    status: 'in_progress',
    priority: 'high',
    assignedTo: 'u6',
    assignedToName: 'Mirza Bašić',
    locationId: 'l2',
    locationName: 'Centar',
    address: 'Ferhadija 12, Sarajevo',
    dueDate: '2023-05-15',
    createdAt: '2023-05-10',
  },
  {
    id: 't3',
    title: 'Inspekcija vodomjera VM-2023-003',
    description: 'Redovna godišnja inspekcija vodomjera.',
    type: 'inspection',
    status: 'completed',
    priority: 'low',
    assignedTo: 'u4',
    assignedToName: 'Adnan Mehić',
    locationId: 'l3',
    locationName: 'Novi Grad',
    address: 'Titova 18, Sarajevo',
    dueDate: '2023-05-05',
    createdAt: '2023-04-20',
    completedAt: '2023-05-04',
  },
  {
    id: 't4',
    title: 'Instalacija novog vodomjera',
    description: 'Instalacija novog pametnog vodomjera u stambenom objektu.',
    type: 'installation',
    status: 'pending',
    priority: 'medium',
    assignedTo: 'u6',
    assignedToName: 'Mirza Bašić',
    locationId: 'l4',
    locationName: 'Stari Grad',
    address: 'Alipašina 22, Sarajevo',
    dueDate: '2023-05-25',
    createdAt: '2023-05-12',
  },
  {
    id: 't5',
    title: 'Zamjena neispravnog vodomjera VM-2023-005',
    description: 'Vodomjer pokazuje netačna očitanja. Potrebno zamijeniti novim.',
    type: 'repair',
    status: 'cancelled',
    priority: 'medium',
    assignedTo: 'u4',
    assignedToName: 'Adnan Mehić',
    locationId: 'l5',
    locationName: 'Novo Sarajevo',
    address: 'Koševo 5, Sarajevo',
    dueDate: '2023-05-18',
    createdAt: '2023-05-08',
    cancelReason: 'Korisnik nije bio dostupan u zakazano vrijeme.'
  }
];

export default function TasksScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  
  // Tasks data
  const [tasks, setTasks] = useState<Task[]>(mockTasks);
  const [filteredTasks, setFilteredTasks] = useState<Task[]>(mockTasks);
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [filterType, setFilterType] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterPriority, setFilterPriority] = useState('all');
  
  // Task action modals
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [showTaskDetailModal, setShowTaskDetailModal] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [completionNotes, setCompletionNotes] = useState('');
  
  // Drawer state
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  
  // Check if user has permission to access this screen
  useEffect(() => {
    if (!user) {
      router.replace('/login');
      return;
    }
    
    // Filter tasks based on user role
    if (user.role === 'worker') {
      // Workers only see tasks assigned to them
      const userTasks = mockTasks.filter(task => task.assignedTo === user.id);
      setTasks(userTasks);
      setFilteredTasks(userTasks);
    } else if (user.role === 'citizen') {
      // Citizens only see reading tasks for their meters
      const userTasks = mockTasks.filter(task => 
        task.type === 'reading' && task.assignedTo === user.id
      );
      setTasks(userTasks);
      setFilteredTasks(userTasks);
    }
    
    // Create monthly reading tasks on the 1st of each month
    const today = new Date();
    if (today.getDate() === 1) {
      createMonthlyReadingTasks();
    }
  }, [user, router]);
  
  const createMonthlyReadingTasks = () => {
    // In a real app, this would be done on the server
    // Here we're just simulating it
    
    // Only create tasks for workers and citizens with reading permission
    if (user?.role !== 'worker' && 
        (user?.role !== 'citizen' || !user.permissions?.canReadMeters)) {
      return;
    }
    
    const today = new Date();
    const dueDate = new Date(today);
    dueDate.setDate(dueDate.getDate() + 7); // Due in 7 days
    
    const newTask: Task = {
      id: `t-${Date.now()}`,
      title: `Mjesečno očitanje vodomjera za ${today.toLocaleString('bs-BA', { month: 'long', year: 'numeric' })}`,
      description: 'Potrebno očitati stanje vodomjera za mjesečni obračun.',
      type: 'reading',
      status: 'pending',
      priority: 'medium',
      assignedTo: user.id,
      assignedToName: user.name,
      locationId: user.locationIds?.[0] || 'unknown',
      locationName: 'Vaša lokacija',
      address: user.address || 'Nepoznata adresa',
      dueDate: dueDate.toISOString().split('T')[0],
      createdAt: today.toISOString().split('T')[0],
    };
    
    setTasks(prevTasks => [newTask, ...prevTasks]);
    setFilteredTasks(prevTasks => [newTask, ...prevTasks]);
    
    Alert.alert(
      "Novi zadatak",
      "Kreiran je novi zadatak za mjesečno očitanje vodomjera."
    );
  };
  
  const onRefresh = () => {
    setRefreshing(true);
    // In a real app, you would fetch tasks from an API
    setRefreshing(false);
  };
  
  const applyFilters = () => {
    let filtered = [...tasks];
    
    // Apply search query
    if (searchQuery) {
      filtered = filtered.filter(task => 
        task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        task.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        task.address.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    
    // Apply type filter
    if (filterType !== 'all') {
      filtered = filtered.filter(task => task.type === filterType);
    }
    
    // Apply status filter
    if (filterStatus !== 'all') {
      filtered = filtered.filter(task => task.status === filterStatus);
    }
    
    // Apply priority filter
    if (filterPriority !== 'all') {
      filtered = filtered.filter(task => task.priority === filterPriority);
    }
    
    setFilteredTasks(filtered);
  };
  
  useEffect(() => {
    applyFilters();
  }, [searchQuery, filterType, filterStatus, filterPriority, tasks]);
  
  const handleSearch = (text: string) => {
    setSearchQuery(text);
  };
  
  const handleTypeChange = (type: string) => {
    setFilterType(type);
  };
  
  const handleStatusChange = (status: string) => {
    setFilterStatus(status);
  };
  
  const handlePriorityChange = (priority: string) => {
    setFilterPriority(priority);
  };
  
  const handleAddTask = () => {
    router.push('/tasks/add');
  };
  
  const handleViewTaskDetails = (task: Task) => {
    setSelectedTask(task);
    setShowTaskDetailModal(true);
  };
  
  const handleCompleteTask = (task: Task) => {
    setSelectedTask(task);
    setCompletionNotes('');
    setShowCompleteModal(true);
  };
  
  const confirmCompleteTask = () => {
    if (!selectedTask) return;
    
    // Update task status
    const updatedTasks = tasks.map(task => {
      if (task.id === selectedTask.id) {
        return {
          ...task,
          status: 'completed' as TaskStatus,
          completedAt: new Date().toISOString().split('T')[0]
        };
      }
      return task;
    });
    
    setTasks(updatedTasks);
    setShowCompleteModal(false);
    setSelectedTask(null);
    
    Alert.alert("Uspjeh", "Zadatak je uspješno završen.");
  };
  
  const handleCancelTask = (task: Task) => {
    setSelectedTask(task);
    setCancelReason('');
    setShowCancelModal(true);
  };
  
  const confirmCancelTask = () => {
    if (!selectedTask) return;
    
    if (!cancelReason.trim()) {
      Alert.alert("Greška", "Morate unijeti razlog otkazivanja.");
      return;
    }
    
    // Update task status
    const updatedTasks = tasks.map(task => {
      if (task.id === selectedTask.id) {
        return {
          ...task,
          status: 'cancelled' as TaskStatus,
          cancelReason: cancelReason
        };
      }
      return task;
    });
    
    setTasks(updatedTasks);
    setShowCancelModal(false);
    setSelectedTask(null);
    setCancelReason('');
    
    Alert.alert("Uspjeh", "Zadatak je uspješno otkazan.");
  };
  
  const getTaskTypeLabel = (type: TaskType) => {
    switch (type) {
      case 'reading':
        return 'Očitanje';
      case 'repair':
        return 'Popravka';
      case 'inspection':
        return 'Inspekcija';
      case 'installation':
        return 'Instalacija';
      case 'other':
        return 'Ostalo';
      default:
        return type;
    }
  };
  
  const getTaskTypeColor = (type: TaskType) => {
    switch (type) {
      case 'reading':
        return Colors.primary;
      case 'repair':
        return '#F44336'; // Red
      case 'inspection':
        return '#4CAF50'; // Green
      case 'installation':
        return '#FF9800'; // Orange
      case 'other':
        return '#9E9E9E'; // Grey
      default:
        return Colors.primary;
    }
  };
  
  const getStatusLabel = (status: TaskStatus) => {
    switch (status) {
      case 'pending':
        return 'Na čekanju';
      case 'in_progress':
        return 'U toku';
      case 'completed':
        return 'Završeno';
      case 'cancelled':
        return 'Otkazano';
      default:
        return status;
    }
  };
  
  const getStatusColor = (status: TaskStatus) => {
    switch (status) {
      case 'pending':
        return '#FFC107'; // Amber
      case 'in_progress':
        return '#2196F3'; // Blue
      case 'completed':
        return '#4CAF50'; // Green
      case 'cancelled':
        return '#F44336'; // Red
      default:
        return Colors.primary;
    }
  };
  
  const getPriorityLabel = (priority: string) => {
    switch (priority) {
      case 'low':
        return 'Nizak';
      case 'medium':
        return 'Srednji';
      case 'high':
        return 'Visok';
      default:
        return priority;
    }
  };
  
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'low':
        return '#4CAF50'; // Green
      case 'medium':
        return '#FFC107'; // Amber
      case 'high':
        return '#F44336'; // Red
      default:
        return Colors.primary;
    }
  };
  
  const renderTaskCard = ({ item }: { item: Task }) => {
    const isActive = item.status === 'pending' || item.status === 'in_progress';
    
    return (
      <Card style={styles.taskCard}>
        <TouchableOpacity 
          style={styles.cardContent}
          onPress={() => handleViewTaskDetails(item)}
          activeOpacity={0.7}
        >
          <View style={styles.taskHeader}>
            <View style={styles.taskInfo}>
              <Text style={styles.taskTitle}>{item.title}</Text>
              <View style={styles.badgeContainer}>
                <Badge 
                  label={getTaskTypeLabel(item.type)} 
                  color={getTaskTypeColor(item.type)} 
                  size="small"
                />
                <Badge 
                  label={getStatusLabel(item.status)} 
                  color={getStatusColor(item.status)} 
                  size="small"
                  style={styles.statusBadge}
                />
                <Badge 
                  label={getPriorityLabel(item.priority)} 
                  color={getPriorityColor(item.priority)} 
                  size="small"
                  style={styles.priorityBadge}
                />
              </View>
            </View>
          </View>
          
          <Text style={styles.taskDescription}>{item.description}</Text>
          
          <View style={styles.taskDetails}>
            <View style={styles.detailItem}>
              <MapPin size={16} color={Colors.textLight} />
              <Text style={styles.detailText}>{item.address}</Text>
            </View>
            
            <View style={styles.detailItem}>
              <Calendar size={16} color={Colors.textLight} />
              <Text style={styles.detailText}>
                Rok: {item.dueDate}
              </Text>
            </View>
            
            <View style={styles.detailItem}>
              <Clock size={16} color={Colors.textLight} />
              <Text style={styles.detailText}>
                Kreirano: {item.createdAt}
              </Text>
            </View>
          </View>
        </TouchableOpacity>
        
        <View style={styles.cardActions}>
          {isActive && (
            <>
              <Button
                title="Završi"
                variant="outline"
                size="small"
                leftIcon={<CheckCircle size={16} color={Colors.success} />}
                onPress={() => handleCompleteTask(item)}
                style={[styles.actionButton, { borderColor: Colors.success }]}
              />
              
              <Button
                title="Otkaži"
                variant="outline"
                size="small"
                leftIcon={<XCircle size={16} color={Colors.error} />}
                onPress={() => handleCancelTask(item)}
                style={[styles.actionButton, styles.cancelButton]}
              />
            </>
          )}
          
          <TouchableOpacity
            style={styles.detailsButton}
            onPress={() => handleViewTaskDetails(item)}
          >
            <ChevronRight size={20} color={Colors.primary} />
          </TouchableOpacity>
        </View>
      </Card>
    );
  };
  
  const renderEmptyState = () => {
    return (
      <EmptyState
        title="Nema zadataka"
        message="Trenutno nema zadataka koji odgovaraju vašoj pretrazi."
        icon={<ClipboardList size={48} color={Colors.textLight} />}
        actionLabel={canAddTasks ? "Dodaj novi zadatak" : undefined}
        onAction={canAddTasks ? handleAddTask : undefined}
      />
    );
  };
  
  const canAddTasks = user?.role === 'superadmin' || user?.role === 'admin' || user?.role === 'finance';
  
  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <Header 
          title="Zadaci"
          showBack
          showMenu={false}
          onLeftPress={() => setIsDrawerOpen(true)}
        />
        
        <Drawer
          isOpen={isDrawerOpen}
          onClose={() => setIsDrawerOpen(false)}
        />
        
        <View style={styles.searchContainer}>
          <View style={styles.searchInputContainer}>
            <Search size={20} color={Colors.textLight} style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Pretraži zadatke..."
              value={searchQuery}
              onChangeText={handleSearch}
            />
          </View>
          
          <TouchableOpacity
            style={styles.filterButton}
            onPress={() => setShowFilters(!showFilters)}
          >
            <Filter size={20} color={Colors.primary} />
          </TouchableOpacity>
        </View>
        
        {showFilters && (
          <View style={styles.filtersContainer}>
            <Text style={styles.filtersTitle}>Tip zadatka:</Text>
            <View style={styles.filterOptions}>
              <TouchableOpacity
                style={[
                  styles.filterOption,
                  filterType === 'all' && styles.filterOptionActive
                ]}
                onPress={() => handleTypeChange('all')}
              >
                <Text style={[
                  styles.filterOptionText,
                  filterType === 'all' && styles.filterOptionTextActive
                ]}>Svi</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[
                  styles.filterOption,
                  filterType === 'reading' && styles.filterOptionActive
                ]}
                onPress={() => handleTypeChange('reading')}
              >
                <Text style={[
                  styles.filterOptionText,
                  filterType === 'reading' && styles.filterOptionTextActive
                ]}>Očitanja</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[
                  styles.filterOption,
                  filterType === 'repair' && styles.filterOptionActive
                ]}
                onPress={() => handleTypeChange('repair')}
              >
                <Text style={[
                  styles.filterOptionText,
                  filterType === 'repair' && styles.filterOptionTextActive
                ]}>Popravke</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[
                  styles.filterOption,
                  filterType === 'inspection' && styles.filterOptionActive
                ]}
                onPress={() => handleTypeChange('inspection')}
              >
                <Text style={[
                  styles.filterOptionText,
                  filterType === 'inspection' && styles.filterOptionTextActive
                ]}>Inspekcije</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[
                  styles.filterOption,
                  filterType === 'installation' && styles.filterOptionActive
                ]}
                onPress={() => handleTypeChange('installation')}
              >
                <Text style={[
                  styles.filterOptionText,
                  filterType === 'installation' && styles.filterOptionTextActive
                ]}>Instalacije</Text>
              </TouchableOpacity>
            </View>
            
            <Text style={styles.filtersTitle}>Status:</Text>
            <View style={styles.filterOptions}>
              <TouchableOpacity
                style={[
                  styles.filterOption,
                  filterStatus === 'all' && styles.filterOptionActive
                ]}
                onPress={() => handleStatusChange('all')}
              >
                <Text style={[
                  styles.filterOptionText,
                  filterStatus === 'all' && styles.filterOptionTextActive
                ]}>Svi</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[
                  styles.filterOption,
                  filterStatus === 'pending' && styles.filterOptionActive
                ]}
                onPress={() => handleStatusChange('pending')}
              >
                <Text style={[
                  styles.filterOptionText,
                  filterStatus === 'pending' && styles.filterOptionTextActive
                ]}>Na čekanju</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[
                  styles.filterOption,
                  filterStatus === 'in_progress' && styles.filterOptionActive
                ]}
                onPress={() => handleStatusChange('in_progress')}
              >
                <Text style={[
                  styles.filterOptionText,
                  filterStatus === 'in_progress' && styles.filterOptionTextActive
                ]}>U toku</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[
                  styles.filterOption,
                  filterStatus === 'completed' && styles.filterOptionActive
                ]}
                onPress={() => handleStatusChange('completed')}
              >
                <Text style={[
                  styles.filterOptionText,
                  filterStatus === 'completed' && styles.filterOptionTextActive
                ]}>Završeni</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[
                  styles.filterOption,
                  filterStatus === 'cancelled' && styles.filterOptionActive
                ]}
                onPress={() => handleStatusChange('cancelled')}
              >
                <Text style={[
                  styles.filterOptionText,
                  filterStatus === 'cancelled' && styles.filterOptionTextActive
                ]}>Otkazani</Text>
              </TouchableOpacity>
            </View>
            
            <Text style={styles.filtersTitle}>Prioritet:</Text>
            <View style={styles.filterOptions}>
              <TouchableOpacity
                style={[
                  styles.filterOption,
                  filterPriority === 'all' && styles.filterOptionActive
                ]}
                onPress={() => handlePriorityChange('all')}
              >
                <Text style={[
                  styles.filterOptionText,
                  filterPriority === 'all' && styles.filterOptionTextActive
                ]}>Svi</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[
                  styles.filterOption,
                  filterPriority === 'high' && styles.filterOptionActive
                ]}
                onPress={() => handlePriorityChange('high')}
              >
                <Text style={[
                  styles.filterOptionText,
                  filterPriority === 'high' && styles.filterOptionTextActive
                ]}>Visok</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[
                  styles.filterOption,
                  filterPriority === 'medium' && styles.filterOptionActive
                ]}
                onPress={() => handlePriorityChange('medium')}
              >
                <Text style={[
                  styles.filterOptionText,
                  filterPriority === 'medium' && styles.filterOptionTextActive
                ]}>Srednji</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[
                  styles.filterOption,
                  filterPriority === 'low' && styles.filterOptionActive
                ]}
                onPress={() => handlePriorityChange('low')}
              >
                <Text style={[
                  styles.filterOptionText,
                  filterPriority === 'low' && styles.filterOptionTextActive
                ]}>Nizak</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
        
        <FlatList
          data={filteredTasks}
          renderItem={renderTaskCard}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContainer}
          ListEmptyComponent={renderEmptyState}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        />
        
        {canAddTasks && (
          <TouchableOpacity
            style={styles.fab}
            onPress={handleAddTask}
            activeOpacity={0.8}
          >
            <Plus size={24} color="#fff" />
          </TouchableOpacity>
        )}
        
        {/* Task Detail Modal */}
        <Modal
          visible={showTaskDetailModal}
          transparent={true}
          animationType="slide"
          onRequestClose={() => setShowTaskDetailModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.detailModalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Detalji zadatka</Text>
                <TouchableOpacity 
                  onPress={() => setShowTaskDetailModal(false)}
                  style={styles.closeButton}
                >
                  <X size={24} color={Colors.text} />
                </TouchableOpacity>
              </View>
              
              {selectedTask && (
                <ScrollView style={styles.detailScrollView}>
                  <View style={styles.detailSection}>
                    <Text style={styles.detailSectionTitle}>Osnovne informacije</Text>
                    
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Naslov:</Text>
                      <Text style={styles.detailValue}>{selectedTask.title}</Text>
                    </View>
                    
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Tip:</Text>
                      <Badge 
                        label={getTaskTypeLabel(selectedTask.type)} 
                        color={getTaskTypeColor(selectedTask.type)} 
                      />
                    </View>
                    
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Status:</Text>
                      <Badge 
                        label={getStatusLabel(selectedTask.status)} 
                        color={getStatusColor(selectedTask.status)} 
                      />
                    </View>
                    
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Prioritet:</Text>
                      <Badge 
                        label={getPriorityLabel(selectedTask.priority)} 
                        color={getPriorityColor(selectedTask.priority)} 
                      />
                    </View>
                  </View>
                  
                  <View style={styles.detailSection}>
                    <Text style={styles.detailSectionTitle}>Opis</Text>
                    <Text style={styles.descriptionText}>{selectedTask.description}</Text>
                  </View>
                  
                  <View style={styles.detailSection}>
                    <Text style={styles.detailSectionTitle}>Lokacija</Text>
                    
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Lokacija:</Text>
                      <Text style={styles.detailValue}>{selectedTask.locationName}</Text>
                    </View>
                    
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Adresa:</Text>
                      <Text style={styles.detailValue}>{selectedTask.address}</Text>
                    </View>
                  </View>
                  
                  <View style={styles.detailSection}>
                    <Text style={styles.detailSectionTitle}>Vremenski okvir</Text>
                    
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Kreiran:</Text>
                      <Text style={styles.detailValue}>{selectedTask.createdAt}</Text>
                    </View>
                    
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Rok:</Text>
                      <Text style={styles.detailValue}>{selectedTask.dueDate}</Text>
                    </View>
                    
                    {selectedTask.completedAt && (
                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Završen:</Text>
                        <Text style={styles.detailValue}>{selectedTask.completedAt}</Text>
                      </View>
                    )}
                  </View>
                  
                  {selectedTask.cancelReason && (
                    <View style={styles.detailSection}>
                      <Text style={styles.detailSectionTitle}>Razlog otkazivanja</Text>
                      <Text style={styles.descriptionText}>{selectedTask.cancelReason}</Text>
                    </View>
                  )}
                  
                  {(selectedTask.status === 'pending' || selectedTask.status === 'in_progress') && (
                    <View style={styles.detailActions}>
                      <Button
                        title="Završi zadatak"
                        leftIcon={<CheckCircle size={20} color="#fff" />}
                        onPress={() => {
                          setShowTaskDetailModal(false);
                          handleCompleteTask(selectedTask);
                        }}
                        style={styles.detailActionButton}
                      />
                      
                      <Button
                        title="Otkaži zadatak"
                        variant="outline"
                        leftIcon={<XCircle size={20} color={Colors.error} />}
                        onPress={() => {
                          setShowTaskDetailModal(false);
                          handleCancelTask(selectedTask);
                        }}
                        style={[styles.detailActionButton, { borderColor: Colors.error }]}
                      />
                    </View>
                  )}
                </ScrollView>
              )}
            </View>
          </View>
        </Modal>
        
        {/* Complete Task Modal */}
        <Modal
          visible={showCompleteModal}
          transparent={true}
          animationType="slide"
          onRequestClose={() => setShowCompleteModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Završi zadatak</Text>
                <TouchableOpacity 
                  onPress={() => setShowCompleteModal(false)}
                  style={styles.closeButton}
                >
                  <X size={24} color={Colors.text} />
                </TouchableOpacity>
              </View>
              
              <Text style={styles.modalSubtitle}>
                Da li ste sigurni da želite označiti ovaj zadatak kao završen?
              </Text>
              
              <Input
                label="Napomena (opcionalno)"
                placeholder="Unesite napomenu o završetku zadatka"
                value={completionNotes}
                onChangeText={setCompletionNotes}
                multiline
                numberOfLines={4}
                containerStyle={styles.textAreaContainer}
                inputStyle={styles.textArea}
              />
              
              <View style={styles.modalButtons}>
                <Button
                  title="Otkaži"
                  variant="outline"
                  onPress={() => setShowCompleteModal(false)}
                  style={styles.modalButton}
                />
                
                <Button
                  title="Završi"
                  onPress={confirmCompleteTask}
                  style={styles.modalButton}
                />
              </View>
            </View>
          </View>
        </Modal>
        
        {/* Cancel Task Modal */}
        <Modal
          visible={showCancelModal}
          transparent={true}
          animationType="slide"
          onRequestClose={() => setShowCancelModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Otkaži zadatak</Text>
                <TouchableOpacity 
                  onPress={() => setShowCancelModal(false)}
                  style={styles.closeButton}
                >
                  <X size={24} color={Colors.text} />
                </TouchableOpacity>
              </View>
              
              <Text style={styles.modalSubtitle}>
                Da li ste sigurni da želite otkazati ovaj zadatak?
              </Text>
              
              <Input
                label="Razlog otkazivanja *"
                placeholder="Unesite razlog otkazivanja zadatka"
                value={cancelReason}
                onChangeText={setCancelReason}
                multiline
                numberOfLines={4}
                containerStyle={styles.textAreaContainer}
                inputStyle={styles.textArea}
                error={!cancelReason.trim() ? "Razlog otkazivanja je obavezan" : ""}
              />
              
              <View style={styles.modalButtons}>
                <Button
                  title="Odustani"
                  variant="outline"
                  onPress={() => setShowCancelModal(false)}
                  style={styles.modalButton}
                />
                
                <Button
                  title="Otkaži zadatak"
                  onPress={confirmCancelTask}
                  style={styles.modalButton}
                  variant="primary"
                />
              </View>
            </View>
          </View>
        </Modal>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#fff',
  },
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  searchContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  searchInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.highlight,
    borderRadius: 8,
    paddingHorizontal: 12,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: 40,
    color: Colors.text,
  },
  filterButton: {
    marginLeft: 12,
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: Colors.highlight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filtersContainer: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  filtersTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 8,
    marginTop: 8,
  },
  filterOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  filterOption: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: Colors.highlight,
  },
  filterOptionActive: {
    backgroundColor: Colors.primary,
  },
  filterOptionText: {
    fontSize: 12,
    color: Colors.text,
  },
  filterOptionTextActive: {
    color: '#fff',
  },
  listContainer: {
    padding: 16,
    paddingBottom: Platform.OS === 'android' ? 100 : 80, // Extra padding for Android
  },
  taskCard: {
    marginBottom: 16,
  },
  cardContent: {
    padding: 16,
  },
  taskHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  taskInfo: {
    flex: 1,
  },
  taskTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 8,
  },
  badgeContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  statusBadge: {
    marginLeft: 8,
  },
  priorityBadge: {
    marginLeft: 8,
  },
  taskDescription: {
    fontSize: 14,
    color: Colors.text,
    marginBottom: 16,
  },
  taskDetails: {
    marginBottom: 8,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  detailText: {
    fontSize: 14,
    color: Colors.text,
    marginLeft: 8,
  },
  cardActions: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    padding: 12,
  },
  actionButton: {
    flex: 1,
    marginRight: 8,
  },
  cancelButton: {
    borderColor: Colors.error,
  },
  detailsButton: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: Colors.highlight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fab: {
    position: 'absolute',
    bottom: Platform.OS === 'android' ? 40 : 24, // Higher position for Android
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 12,
    width: '90%',
    maxWidth: 500,
    padding: 24,
  },
  detailModalContent: {
    backgroundColor: '#fff',
    borderRadius: 12,
    width: '90%',
    maxWidth: 500,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingHorizontal: 24,
    paddingTop: 24,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.text,
  },
  closeButton: {
    padding: 4,
  },
  modalSubtitle: {
    fontSize: 16,
    color: Colors.textLight,
    marginBottom: 16,
  },
  textAreaContainer: {
    marginBottom: 24,
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  modalButton: {
    flex: 1,
    marginHorizontal: 8,
  },
  detailScrollView: {
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
  detailSection: {
    marginBottom: 24,
  },
  detailSectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  detailLabel: {
    fontSize: 14,
    color: Colors.textLight,
    width: 100,
  },
  detailValue: {
    fontSize: 14,
    color: Colors.text,
    flex: 1,
  },
  descriptionText: {
    fontSize: 14,
    color: Colors.text,
    lineHeight: 20,
  },
  detailActions: {
    marginTop: 16,
    marginBottom: 24,
  },
  detailActionButton: {
    marginBottom: 12,
  },
});