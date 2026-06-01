import React, { useState, useEffect, useCallback } from 'react';
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
  ActivityIndicator,
  ScrollView as RNScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  ClipboardList,
  Search,
  Filter,
  ChevronRight,
  MapPin,
  Calendar,
  Clock,
  CheckCircle,
  XCircle,
  X,
} from 'lucide-react-native';
import { Header } from '@/components/layout/Header';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { Badge } from '@/components/ui/Badge';
import { Drawer } from '@/components/layout/Drawer';
import { useAuthStore } from '@/store/auth-store';
import {
  getTasks,
  getTasksByUser,
  updateTaskStatus,
  type Task,
  type TaskStatus,
  type TaskPriority,
} from '@/lib/api/tasks';
import Colors from '@/constants/colors';

const formatDate = (value: string | null): string => {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('bs-BA', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
};

export default function TasksScreen() {
  const router = useRouter();
  const { user } = useAuthStore();

  // Tasks data
  const [tasks, setTasks] = useState<Task[]>([]);
  const [filteredTasks, setFilteredTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterPriority, setFilterPriority] = useState('all');

  // Task action modals
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [showTaskDetailModal, setShowTaskDetailModal] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  // Drawer state
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const canSeeAllTasks =
    user?.permissions?.canViewAllData === true ||
    user?.role === 'superadmin' ||
    user?.role === 'admin' ||
    user?.role === 'finance';

  const loadTasks = useCallback(async () => {
    if (!user) return;
    try {
      const data = canSeeAllTasks
        ? await getTasks()
        : await getTasksByUser(user.id);
      setTasks(data);
    } catch (error) {
      console.error('Greška pri učitavanju zadataka:', error);
      Alert.alert('Greška', 'Nije moguće učitati zadatke. Pokušajte ponovo.');
    }
  }, [user, canSeeAllTasks]);

  // Redirect unauthenticated users and load tasks
  useEffect(() => {
    if (!user) {
      router.replace('/login');
      return;
    }

    let isMounted = true;
    setIsLoading(true);
    loadTasks().finally(() => {
      if (isMounted) setIsLoading(false);
    });

    return () => {
      isMounted = false;
    };
  }, [user, router, loadTasks]);

  const applyFilters = useCallback(() => {
    let filtered = [...tasks];

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (task) =>
          task.title.toLowerCase().includes(query) ||
          task.description.toLowerCase().includes(query) ||
          task.address.toLowerCase().includes(query),
      );
    }

    if (filterStatus !== 'all') {
      filtered = filtered.filter((task) => task.status === filterStatus);
    }

    if (filterPriority !== 'all') {
      filtered = filtered.filter((task) => task.priority === filterPriority);
    }

    setFilteredTasks(filtered);
  }, [tasks, searchQuery, filterStatus, filterPriority]);

  useEffect(() => {
    applyFilters();
  }, [applyFilters]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadTasks();
    setRefreshing(false);
  };

  const handleViewTaskDetails = (task: Task) => {
    setSelectedTask(task);
    setShowTaskDetailModal(true);
  };

  const handleCompleteTask = (task: Task) => {
    setSelectedTask(task);
    setShowCompleteModal(true);
  };

  const handleCancelTask = (task: Task) => {
    setSelectedTask(task);
    setShowCancelModal(true);
  };

  const changeStatus = async (status: TaskStatus, successMessage: string) => {
    if (!selectedTask) return;

    setIsUpdating(true);
    try {
      const updated = await updateTaskStatus(selectedTask.id, status);
      setTasks((prev) =>
        prev.map((task) => (task.id === updated.id ? updated : task)),
      );
      setShowCompleteModal(false);
      setShowCancelModal(false);
      setSelectedTask(null);
      Alert.alert('Uspjeh', successMessage);
    } catch (error) {
      console.error('Greška pri ažuriranju zadatka:', error);
      Alert.alert('Greška', 'Nije moguće ažurirati zadatak. Pokušajte ponovo.');
    } finally {
      setIsUpdating(false);
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

  const getPriorityLabel = (priority: TaskPriority) => {
    switch (priority) {
      case 'low':
        return 'Nizak';
      case 'medium':
        return 'Srednji';
      case 'high':
        return 'Visok';
      case 'urgent':
        return 'Hitno';
      default:
        return priority;
    }
  };

  const getPriorityColor = (priority: TaskPriority) => {
    switch (priority) {
      case 'low':
        return '#4CAF50'; // Green
      case 'medium':
        return '#FFC107'; // Amber
      case 'high':
        return '#FF9800'; // Orange
      case 'urgent':
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
                  label={getStatusLabel(item.status)}
                  color={getStatusColor(item.status)}
                  size="small"
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

          {!!item.description && (
            <Text style={styles.taskDescription}>{item.description}</Text>
          )}

          <View style={styles.taskDetails}>
            {!!item.address && (
              <View style={styles.detailItem}>
                <MapPin size={16} color={Colors.textLight} />
                <Text style={styles.detailText}>{item.address}</Text>
              </View>
            )}

            <View style={styles.detailItem}>
              <Calendar size={16} color={Colors.textLight} />
              <Text style={styles.detailText}>Rok: {formatDate(item.dueDate)}</Text>
            </View>

            <View style={styles.detailItem}>
              <Clock size={16} color={Colors.textLight} />
              <Text style={styles.detailText}>
                Kreirano: {formatDate(item.createdAt)}
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

  const renderEmptyState = () => (
    <EmptyState
      title="Nema zadataka"
      message="Trenutno nema zadataka koji odgovaraju vašoj pretrazi."
      icon={<ClipboardList size={48} color={Colors.textLight} />}
    />
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <Header
          title="Zadaci"
          showBack
          showMenu={false}
          onLeftPress={() => setIsDrawerOpen(true)}
        />

        <Drawer isOpen={isDrawerOpen} onClose={() => setIsDrawerOpen(false)} />

        <View style={styles.searchContainer}>
          <View style={styles.searchInputContainer}>
            <Search size={20} color={Colors.textLight} style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Pretraži zadatke..."
              value={searchQuery}
              onChangeText={setSearchQuery}
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
            <Text style={styles.filtersTitle}>Status:</Text>
            <View style={styles.filterOptions}>
              {[
                { key: 'all', label: 'Svi' },
                { key: 'pending', label: 'Na čekanju' },
                { key: 'in_progress', label: 'U toku' },
                { key: 'completed', label: 'Završeni' },
                { key: 'cancelled', label: 'Otkazani' },
              ].map((option) => (
                <TouchableOpacity
                  key={option.key}
                  style={[
                    styles.filterOption,
                    filterStatus === option.key && styles.filterOptionActive,
                  ]}
                  onPress={() => setFilterStatus(option.key)}
                >
                  <Text
                    style={[
                      styles.filterOptionText,
                      filterStatus === option.key && styles.filterOptionTextActive,
                    ]}
                  >
                    {option.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.filtersTitle}>Prioritet:</Text>
            <View style={styles.filterOptions}>
              {[
                { key: 'all', label: 'Svi' },
                { key: 'urgent', label: 'Hitno' },
                { key: 'high', label: 'Visok' },
                { key: 'medium', label: 'Srednji' },
                { key: 'low', label: 'Nizak' },
              ].map((option) => (
                <TouchableOpacity
                  key={option.key}
                  style={[
                    styles.filterOption,
                    filterPriority === option.key && styles.filterOptionActive,
                  ]}
                  onPress={() => setFilterPriority(option.key)}
                >
                  <Text
                    style={[
                      styles.filterOptionText,
                      filterPriority === option.key && styles.filterOptionTextActive,
                    ]}
                  >
                    {option.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={Colors.primary} />
            <Text style={styles.loadingText}>Učitavanje zadataka...</Text>
          </View>
        ) : (
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
                <RNScrollView style={styles.detailScrollView}>
                  <View style={styles.detailSection}>
                    <Text style={styles.detailSectionTitle}>Osnovne informacije</Text>

                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Naslov:</Text>
                      <Text style={styles.detailValue}>{selectedTask.title}</Text>
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

                    {!!selectedTask.assignedToName && (
                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Zaduženi:</Text>
                        <Text style={styles.detailValue}>
                          {selectedTask.assignedToName}
                        </Text>
                      </View>
                    )}
                  </View>

                  {!!selectedTask.description && (
                    <View style={styles.detailSection}>
                      <Text style={styles.detailSectionTitle}>Opis</Text>
                      <Text style={styles.descriptionText}>
                        {selectedTask.description}
                      </Text>
                    </View>
                  )}

                  {(!!selectedTask.locationName ||
                    !!selectedTask.address ||
                    !!selectedTask.meterSerialNumber) && (
                    <View style={styles.detailSection}>
                      <Text style={styles.detailSectionTitle}>Lokacija</Text>

                      {!!selectedTask.locationName && (
                        <View style={styles.detailRow}>
                          <Text style={styles.detailLabel}>Lokacija:</Text>
                          <Text style={styles.detailValue}>
                            {selectedTask.locationName}
                          </Text>
                        </View>
                      )}

                      {!!selectedTask.address && (
                        <View style={styles.detailRow}>
                          <Text style={styles.detailLabel}>Adresa:</Text>
                          <Text style={styles.detailValue}>{selectedTask.address}</Text>
                        </View>
                      )}

                      {!!selectedTask.meterSerialNumber && (
                        <View style={styles.detailRow}>
                          <Text style={styles.detailLabel}>Vodomjer:</Text>
                          <Text style={styles.detailValue}>
                            {selectedTask.meterSerialNumber}
                          </Text>
                        </View>
                      )}
                    </View>
                  )}

                  <View style={styles.detailSection}>
                    <Text style={styles.detailSectionTitle}>Vremenski okvir</Text>

                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Kreiran:</Text>
                      <Text style={styles.detailValue}>
                        {formatDate(selectedTask.createdAt)}
                      </Text>
                    </View>

                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Rok:</Text>
                      <Text style={styles.detailValue}>
                        {formatDate(selectedTask.dueDate)}
                      </Text>
                    </View>

                    {!!selectedTask.completedAt && (
                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Završen:</Text>
                        <Text style={styles.detailValue}>
                          {formatDate(selectedTask.completedAt)}
                        </Text>
                      </View>
                    )}
                  </View>

                  {(selectedTask.status === 'pending' ||
                    selectedTask.status === 'in_progress') && (
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
                        style={[
                          styles.detailActionButton,
                          { borderColor: Colors.error },
                        ]}
                      />
                    </View>
                  )}
                </RNScrollView>
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

              <View style={styles.modalButtons}>
                <Button
                  title="Odustani"
                  variant="outline"
                  onPress={() => setShowCompleteModal(false)}
                  style={styles.modalButton}
                  disabled={isUpdating}
                />

                <Button
                  title="Završi"
                  onPress={() => changeStatus('completed', 'Zadatak je uspješno završen.')}
                  style={styles.modalButton}
                  isLoading={isUpdating}
                  disabled={isUpdating}
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

              <View style={styles.modalButtons}>
                <Button
                  title="Odustani"
                  variant="outline"
                  onPress={() => setShowCancelModal(false)}
                  style={styles.modalButton}
                  disabled={isUpdating}
                />

                <Button
                  title="Otkaži zadatak"
                  onPress={() => changeStatus('cancelled', 'Zadatak je uspješno otkazan.')}
                  style={styles.modalButton}
                  isLoading={isUpdating}
                  disabled={isUpdating}
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
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: Colors.textLight,
  },
  listContainer: {
    padding: 16,
    paddingBottom: Platform.OS === 'android' ? 100 : 80,
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
    marginBottom: 24,
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
