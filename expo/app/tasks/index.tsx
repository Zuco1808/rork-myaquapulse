import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  TextInput, RefreshControl, Alert, SafeAreaView, Platform,
  Modal, ScrollView as RNScrollView, ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useFreshFocus } from '@/lib/use-fresh-focus';
import {
  ClipboardList, Search, Plus, Filter, ChevronRight,
  Calendar, Clock, User, Droplet, X, CheckCircle,
  XCircle, PlayCircle, MapPin,
} from 'lucide-react-native';
import { Header } from '@/components/layout/Header';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { EmptyState } from '@/components/ui/EmptyState';
import { Badge } from '@/components/ui/Badge';
import { useAuthStore } from '@/store/auth-store';
import { usePermissions } from '@/lib/use-permissions';
import { getTasks, getMyTasks, updateTaskStatus, createTask } from '@/lib/api/tasks';
import { getMeters } from '@/lib/api/meters';
import { getUsersByUtility } from '@/lib/api/users';
import { supabase } from '@/lib/supabase';
import { DatePickerSheet } from '@/components/ui/DatePickerSheet';
import { Task } from '@/types/user';
import Colors from '@/constants/colors';
import { captureError } from '@/lib/sentry';

/* ─── pure date helper ────────────────────────────── */
const toDateStr = (d: Date): string => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

/* ─── helpers ─────────────────────────────────────── */
type TaskStatus = Task['status'];
type TaskType   = Task['task_type'];
type Priority   = Task['priority'];

const TYPE_LABELS: Record<TaskType, string> = {
  reading: 'Očitanje', maintenance: 'Radni nalog', inspection: 'Inspekcija',
  installation: 'Instalacija', other: 'Ostalo',
};
const TYPE_COLORS: Record<TaskType, string> = {
  reading: Colors.primary, maintenance: '#9C27B0', inspection: '#4CAF50',
  installation: '#FF9800', other: '#9E9E9E',
};
const STATUS_LABELS: Record<TaskStatus, string> = {
  open: 'Otvoreno', in_progress: 'U toku', done: 'Završeno', cancelled: 'Otkazano',
};
const STATUS_COLORS: Record<TaskStatus, string> = {
  open: '#FFC107', in_progress: '#2196F3', done: '#4CAF50', cancelled: '#F44336',
};
const PRIORITY_LABELS: Record<Priority, string> = {
  low: 'Nizak', normal: 'Normalan', high: 'Visok', urgent: 'Hitno',
};
const PRIORITY_COLORS: Record<Priority, string> = {
  low: '#4CAF50', normal: '#2196F3', high: '#FF9800', urgent: '#F44336',
};

/* ─── pure filter helper (no stale-closure risk) ──── */
const filterTasks = (
  source: Task[], q: string, status: string, type: string, priority: string,
): Task[] => {
  let f = source;
  if (q) {
    const ql = q.toLowerCase();
    f = f.filter(t =>
      t.title.toLowerCase().includes(ql) ||
      (t.description ?? '').toLowerCase().includes(ql) ||
      (t.connection_address ?? '').toLowerCase().includes(ql),
    );
  }
  if (status   !== 'all') f = f.filter(t => t.status    === status);
  if (type     !== 'all') f = f.filter(t => t.task_type === type);
  if (priority !== 'all') f = f.filter(t => t.priority  === priority);
  return f;
};

/* ─── component ───────────────────────────────────── */
export default function TasksScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { isWorker, canManageTasks } = usePermissions();

  // Task creation requires a utility_id scope. canManageTasks pokriva
  // utility_admin / finance / worker; svi oni imaju utility_id. super_admin
  // ima canManageTasks ali nema utility_id (globalni nivo) pa je isključen.
  // Radnici mogu kreirati, ali zadatak ide na odobravanje (admin/finance).
  const canCreateTasks = canManageTasks && !!user?.utility_id;

  const PAGE_SIZE = 40;
  const [tasks, setTasks]               = useState<Task[]>([]);
  const [loading, setLoading]           = useState(true);
  const [refreshing, setRefreshing]     = useState(false);
  const [loadingMore, setLoadingMore]   = useState(false);
  const [hasMore, setHasMore]           = useState(true);
  const [pageOffset, setPageOffset]     = useState(0);
  const [searchQuery, setSearchQuery]   = useState('');
  const [showFilters, setShowFilters]   = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterType, setFilterType]     = useState<string>('all');
  const [filterPriority, setFilterPriority] = useState<string>('all');

  // selected task for detail / action
  const [selected, setSelected]           = useState<Task | null>(null);
  const [showDetail, setShowDetail]       = useState(false);
  const [showComplete, setShowComplete]   = useState(false);
  const [showCancel, setShowCancel]       = useState(false);
  const [cancelNote, setCancelNote]       = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  // create task modal
  const [showCreate, setShowCreate]       = useState(false);
  const [newTitle, setNewTitle]           = useState('');
  const [newDesc, setNewDesc]             = useState('');
  const [newType, setNewType]             = useState<TaskType>('maintenance');
  const [newPriority, setNewPriority]     = useState<Priority>('normal');
  const [newDueDate, setNewDueDate]       = useState('');
  const [newAssignedTo, setNewAssignedTo] = useState('');
  const [newConnectionId, setNewConnectionId] = useState('');
  const [workers, setWorkers]             = useState<{ id: string; full_name: string }[]>([]);
  const [connections, setConnections]     = useState<{ id: string; address: string; meter_serial: string }[]>([]);
  const [creating, setCreating]           = useState(false);
  const [titleError, setTitleError]       = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);

  // Derived — always fresh, no stale-closure risk
  const filteredTasks = filterTasks(tasks, searchQuery, filterStatus, filterType, filterPriority);

  /* ── fetch ─────────────────────────────────────── */
  const fetchTasks = async () => {
    if (!user) return;
    setPageOffset(0);
    setHasMore(true);
    try {
      const data = isWorker
        ? await getMyTasks(user.id, user.utility_id ?? '')
        : await getTasks({ limit: PAGE_SIZE, offset: 0 });
      setTasks(data);
      if (!isWorker) {
        setHasMore(data.length === PAGE_SIZE);
        setPageOffset(PAGE_SIZE);
      }
    } catch (e: any) {
      captureError(e, { screen: 'tasks', action: 'fetchTasks' });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const loadMore = async () => {
    if (loadingMore || !hasMore || !user || isWorker) return;
    setLoadingMore(true);
    try {
      const data = await getTasks({ limit: PAGE_SIZE, offset: pageOffset });
      setTasks(prev => [...prev, ...data]);
      setHasMore(data.length === PAGE_SIZE);
      setPageOffset(prev => prev + PAGE_SIZE);
    } catch (e: any) {
      captureError(e, { screen: 'tasks', action: 'loadMore' });
    } finally {
      setLoadingMore(false);
    }
  };

  useFreshFocus(() => {
    if (!user) { router.replace('/login'); return; }
    fetchTasks();
  });

  const onRefresh = () => { setRefreshing(true); fetchTasks(); };

  /* ── filter handlers — just set state, filteredTasks derives automatically */
  const handleSearch = (v: string) => setSearchQuery(v);
  const setStatus    = (v: string) => setFilterStatus(v);
  const setType      = (v: string) => setFilterType(v);
  const setPriority  = (v: string) => setFilterPriority(v);

  /* ── actions ───────────────────────────────────── */
  // Otvori puni detalj zadatka (dodjela radniku, odobravanje, troškovi…)
  const openDetail = (t: Task) => { router.push(`/tasks/${t.id}` as any); };

  const startTask = async (t: Task) => {
    setActionLoading(true);
    try {
      // Worker auto-assigns to themselves when picking up an unassigned task
      const assignTo = isWorker && !t.assigned_to ? user?.id : undefined;
      const updated = await updateTaskStatus(t.id, 'in_progress', undefined, assignTo);
      patchLocal(updated);
    } catch (e: any) { Alert.alert('Greška', e.message); }
    finally { setActionLoading(false); }
  };

  const confirmComplete = async () => {
    if (!selected) return;
    setActionLoading(true);
    try {
      const updated = await updateTaskStatus(selected.id, 'done');
      patchLocal(updated);
      setShowComplete(false); setShowDetail(false); setSelected(null);
      Alert.alert('Uspjeh', 'Zadatak označen kao završen.');
    } catch (e: any) { Alert.alert('Greška', e.message); }
    finally { setActionLoading(false); }
  };

  const confirmCancel = async () => {
    if (!selected) return;
    if (!cancelNote.trim()) { Alert.alert('Greška', 'Unesite razlog otkazivanja.'); return; }
    setActionLoading(true);
    try {
      const updated = await updateTaskStatus(selected.id, 'cancelled', cancelNote.trim());
      patchLocal(updated);
      setShowCancel(false); setShowDetail(false); setSelected(null); setCancelNote('');
      Alert.alert('Uspjeh', 'Zadatak je otkazan.');
    } catch (e: any) { Alert.alert('Greška', e.message); }
    finally { setActionLoading(false); }
  };

  const patchLocal = (updated: Task) => {
    setTasks(prev => prev.map(t => t.id === updated.id ? updated : t));
    if (selected?.id === updated.id) setSelected(updated);
  };

  /* ── create task ────────────────────────────────── */
  const openCreateModal = async () => {
    if (!user?.utility_id) return;
    try {
      const [w, c] = await Promise.all([
        getUsersByUtility(user.utility_id),
        supabase.from('connections').select('id, address, meter_serial')
          .eq('utility_id', user.utility_id).eq('is_active', true),
      ]);
      setWorkers(w.filter(u => u.role === 'worker'));
      setConnections((c.data ?? []) as { id: string; address: string; meter_serial: string }[]);
    } catch (e: any) {
      captureError(e, { screen: 'tasks', action: 'openCreateModal' });
    }
    setNewTitle(''); setNewDesc(''); setNewType('maintenance');
    setNewPriority('normal'); setNewDueDate(''); setShowDatePicker(false);
    setNewAssignedTo(''); setNewConnectionId(''); setTitleError('');
    setShowCreate(true);
  };

  const handleCreate = async () => {
    if (!newTitle.trim()) { setTitleError('Naslov je obavezan'); return; }
    if (!user?.utility_id) return;
    setCreating(true);
    try {
      const t = await createTask({
        utility_id:    user.utility_id,
        title:         newTitle.trim(),
        description:   newDesc.trim() || undefined,
        task_type:     newType,
        priority:      newPriority,
        assigned_to:   newAssignedTo || undefined,
        connection_id: newConnectionId || undefined,
        due_date:      newDueDate || undefined,
      });
      setTasks(prev => [t, ...prev]);
      setShowCreate(false);
      Alert.alert(
        'Uspjeh',
        isWorker
          ? 'Zadatak je poslan na odobravanje administratoru/finansijama.'
          : 'Zadatak je kreiran.',
      );
    } catch (e: any) { Alert.alert('Greška', e.message); }
    finally { setCreating(false); }
  };

  /* ── render helpers ─────────────────────────────── */
  const FilterChip = ({ label, value, current, onSelect }: {
    label: string; value: string; current: string; onSelect: (v: string) => void;
  }) => (
    <TouchableOpacity
      style={[styles.chip, current === value && styles.chipActive]}
      onPress={() => onSelect(value)}
    >
      <Text style={[styles.chipText, current === value && styles.chipTextActive]}>{label}</Text>
    </TouchableOpacity>
  );

  const renderCard = ({ item: t }: { item: Task }) => {
    const active = t.status === 'open' || t.status === 'in_progress';
    return (
      <Card style={styles.taskCard}>
        <TouchableOpacity style={styles.cardBody} onPress={() => openDetail(t)} activeOpacity={0.7}>
          <Text style={styles.taskTitle}>{t.title}</Text>
          <View style={styles.badgeRow}>
            <Badge label={TYPE_LABELS[t.task_type]}     color={TYPE_COLORS[t.task_type]}     size="small" />
            <Badge label={STATUS_LABELS[t.status]}      color={STATUS_COLORS[t.status]}      size="small" style={styles.ml8} />
            <Badge label={PRIORITY_LABELS[t.priority]}  color={PRIORITY_COLORS[t.priority]}  size="small" style={styles.ml8} />
            {t.approved === false && (
              <Badge label="Na odobravanju" color="#FF9800" size="small" style={styles.ml8} />
            )}
          </View>
          {t.description ? <Text style={styles.taskDesc} numberOfLines={2}>{t.description}</Text> : null}
          <View style={styles.metaRow}>
            {t.connection_address ? (
              <View style={styles.metaItem}>
                <MapPin size={14} color={Colors.textLight} />
                <Text style={styles.metaText}>{t.connection_address}</Text>
              </View>
            ) : null}
            {t.due_date ? (
              <View style={styles.metaItem}>
                <Calendar size={14} color={Colors.textLight} />
                <Text style={styles.metaText}>Rok: {t.due_date}</Text>
              </View>
            ) : null}
            {t.assigned_to_name ? (
              <View style={styles.metaItem}>
                <User size={14} color={Colors.textLight} />
                <Text style={styles.metaText}>{t.assigned_to_name}</Text>
              </View>
            ) : null}
          </View>
        </TouchableOpacity>

        {active && (
          <View style={styles.cardActions}>
            {t.status === 'open' && (
              <Button
                title="Počni"
                size="small"
                variant="outline"
                leftIcon={<PlayCircle size={15} color={Colors.primary} />}
                onPress={() => startTask(t)}
                style={styles.actBtn}
              />
            )}
            {t.status === 'in_progress' && (
              <Button
                title="Završi"
                size="small"
                variant="outline"
                leftIcon={<CheckCircle size={15} color={Colors.success} />}
                onPress={() => { setSelected(t); setShowComplete(true); }}
                style={[styles.actBtn, { borderColor: Colors.success }]}
              />
            )}
            <Button
              title="Otkaži"
              size="small"
              variant="outline"
              leftIcon={<XCircle size={15} color={Colors.error} />}
              onPress={() => { setSelected(t); setCancelNote(''); setShowCancel(true); }}
              style={[styles.actBtn, { borderColor: Colors.error }]}
            />
            <TouchableOpacity style={styles.arrowBtn} onPress={() => openDetail(t)}>
              <ChevronRight size={20} color={Colors.primary} />
            </TouchableOpacity>
          </View>
        )}
      </Card>
    );
  };

  /* ── JSX ────────────────────────────────────────── */
  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.container}>
          <Header
            title={isWorker ? 'Moji zadaci' : 'Zadaci'}
            showBack
            onLeftPress={() => router.back()}
          />
          <View style={styles.center}>
            <ActivityIndicator size="large" color={Colors.primary} />
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <Header
          title={isWorker ? 'Moji zadaci' : 'Zadaci'}
          showBack
          onLeftPress={() => router.back()}
        />

        {/* Search + filter toggle */}
        <View style={styles.searchRow}>
          <View style={styles.searchBox}>
            <Search size={18} color={Colors.textLight} />
            <TextInput
              style={styles.searchInput}
              placeholder="Pretraži zadatke..."
              value={searchQuery}
              onChangeText={handleSearch}
            />
          </View>
          <TouchableOpacity style={styles.filterBtn} onPress={() => setShowFilters(v => !v)}>
            <Filter size={20} color={Colors.primary} />
          </TouchableOpacity>
        </View>

        {/* Filters */}
        {showFilters && (
          <View style={styles.filtersBox}>
            <Text style={styles.filterLabel}>Status:</Text>
            <View style={styles.chipRow}>
              {(['all', 'open', 'in_progress', 'done', 'cancelled'] as const).map(v => (
                <FilterChip key={v} value={v} label={v === 'all' ? 'Svi' : STATUS_LABELS[v as TaskStatus]} current={filterStatus} onSelect={setStatus} />
              ))}
            </View>
            <Text style={styles.filterLabel}>Tip:</Text>
            <View style={styles.chipRow}>
              {(['all', 'reading', 'maintenance', 'inspection', 'installation', 'other'] as const).map(v => (
                <FilterChip key={v} value={v} label={v === 'all' ? 'Svi' : TYPE_LABELS[v as TaskType]} current={filterType} onSelect={setType} />
              ))}
            </View>
            <Text style={styles.filterLabel}>Prioritet:</Text>
            <View style={styles.chipRow}>
              {(['all', 'urgent', 'high', 'normal', 'low'] as const).map(v => (
                <FilterChip key={v} value={v} label={v === 'all' ? 'Svi' : PRIORITY_LABELS[v as Priority]} current={filterPriority} onSelect={setPriority} />
              ))}
            </View>
          </View>
        )}

        <FlatList
          data={filteredTasks}
          renderItem={renderCard}
          keyExtractor={t => t.id}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          onEndReached={loadMore}
          onEndReachedThreshold={0.3}
          ListFooterComponent={loadingMore ? <ActivityIndicator size="small" color={Colors.primary} style={{ marginVertical: 16 }} /> : null}
          ListEmptyComponent={
            <EmptyState
              title="Nema zadataka"
              message="Trenutno nema zadataka koji odgovaraju filtru."
              icon={<ClipboardList size={48} color={Colors.textLight} />}
              actionLabel={canCreateTasks ? 'Novi zadatak' : undefined}
              onAction={canCreateTasks ? openCreateModal : undefined}
            />
          }
        />

        {canCreateTasks && (
          <TouchableOpacity style={styles.fab} onPress={openCreateModal} activeOpacity={0.8}>
            <Plus size={24} color="#fff" />
          </TouchableOpacity>
        )}

        {/* ── Detail modal ── */}
        <Modal visible={showDetail} transparent animationType="slide" onRequestClose={() => setShowDetail(false)}>
          <View style={styles.overlay}>
            <View style={styles.detailModal}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Detalji zadatka</Text>
                <TouchableOpacity onPress={() => setShowDetail(false)}><X size={24} color={Colors.text} /></TouchableOpacity>
              </View>
              {selected && (
                <RNScrollView style={{ paddingHorizontal: 20 }}>
                  <Text style={styles.detailName}>{selected.title}</Text>
                  <View style={styles.badgeRow}>
                    <Badge label={TYPE_LABELS[selected.task_type]}    color={TYPE_COLORS[selected.task_type]}    size="small" />
                    <Badge label={STATUS_LABELS[selected.status]}     color={STATUS_COLORS[selected.status]}     size="small" style={styles.ml8} />
                    <Badge label={PRIORITY_LABELS[selected.priority]} color={PRIORITY_COLORS[selected.priority]} size="small" style={styles.ml8} />
                  </View>

                  {selected.description ? <Text style={styles.detailDesc}>{selected.description}</Text> : null}

                  <View style={styles.detailGrid}>
                    {selected.assigned_to_name && <DetailRow icon={<User size={15} color={Colors.primary} />}     label="Radnik" value={selected.assigned_to_name} />}
                    {selected.connection_address && <DetailRow icon={<MapPin size={15} color={Colors.primary} />}   label="Adresa" value={selected.connection_address} />}
                    {selected.connection_serial && <DetailRow icon={<Droplet size={15} color={Colors.primary} />}  label="Vodomjer" value={selected.connection_serial} />}
                    {selected.due_date && <DetailRow icon={<Calendar size={15} color={Colors.primary} />} label="Rok" value={selected.due_date} />}
                    {selected.completed_at && <DetailRow icon={<Clock size={15} color={Colors.success} />}  label="Završeno" value={selected.completed_at.split('T')[0]} />}
                    <DetailRow icon={<Clock size={15} color={Colors.textLight} />} label="Kreirano" value={selected.created_at.split('T')[0]} />
                  </View>

                  {(selected.status === 'open' || selected.status === 'in_progress') && (
                    <View style={{ marginVertical: 16 }}>
                      {selected.status === 'open' && (
                        <Button title="Počni zadatak" leftIcon={<PlayCircle size={18} color="#fff" />}
                          isLoading={actionLoading}
                          onPress={() => { startTask(selected); setShowDetail(false); }}
                          style={{ marginBottom: 10 }} />
                      )}
                      {selected.status === 'in_progress' && (
                        <Button title="Označi kao završen" leftIcon={<CheckCircle size={18} color="#fff" />}
                          onPress={() => { setShowDetail(false); setShowComplete(true); }}
                          style={{ marginBottom: 10 }} />
                      )}
                      <Button title="Otkaži zadatak" variant="outline"
                        leftIcon={<XCircle size={18} color={Colors.error} />}
                        onPress={() => { setShowDetail(false); setCancelNote(''); setShowCancel(true); }}
                        style={{ borderColor: Colors.error }} />
                    </View>
                  )}
                </RNScrollView>
              )}
            </View>
          </View>
        </Modal>

        {/* ── Complete modal ── */}
        <Modal visible={showComplete} transparent animationType="slide" onRequestClose={() => setShowComplete(false)}>
          <View style={styles.overlay}>
            <View style={styles.actionModal}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Završi zadatak</Text>
                <TouchableOpacity onPress={() => setShowComplete(false)}><X size={24} color={Colors.text} /></TouchableOpacity>
              </View>
              <Text style={styles.modalSub}>Da li ste sigurni da je zadatak završen?</Text>
              <View style={styles.modalBtns}>
                <Button title="Odustani" variant="outline" onPress={() => setShowComplete(false)} style={styles.modalBtn} />
                <Button title="Potvrdi" onPress={confirmComplete} isLoading={actionLoading} style={styles.modalBtn} />
              </View>
            </View>
          </View>
        </Modal>

        {/* ── Cancel modal ── */}
        <Modal visible={showCancel} transparent animationType="slide" onRequestClose={() => setShowCancel(false)}>
          <View style={styles.overlay}>
            <View style={styles.actionModal}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Otkaži zadatak</Text>
                <TouchableOpacity onPress={() => setShowCancel(false)}><X size={24} color={Colors.text} /></TouchableOpacity>
              </View>
              <Input
                label="Razlog otkazivanja *"
                placeholder="Unesite razlog..."
                value={cancelNote}
                onChangeText={setCancelNote}
              />
              <View style={styles.modalBtns}>
                <Button title="Odustani" variant="outline" onPress={() => setShowCancel(false)} style={styles.modalBtn} />
                <Button title="Otkaži zadatak" onPress={confirmCancel} isLoading={actionLoading} style={styles.modalBtn} />
              </View>
            </View>
          </View>
        </Modal>

        {/* ── Create task modal ── */}
        <Modal visible={showCreate} transparent animationType="slide" onRequestClose={() => setShowCreate(false)}>
          <View style={styles.overlay}>
            <View style={styles.createModal}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Novi zadatak</Text>
                <TouchableOpacity onPress={() => setShowCreate(false)}><X size={24} color={Colors.text} /></TouchableOpacity>
              </View>
              <RNScrollView keyboardShouldPersistTaps="handled">
                <Input label="Naslov *" placeholder="Naziv zadatka" value={newTitle} onChangeText={setNewTitle} error={titleError} />
                <Input label="Opis" placeholder="Detaljan opis..." value={newDesc} onChangeText={setNewDesc} />
                <Text style={styles.filterLabel}>Rok (opcionalno):</Text>
                <TouchableOpacity
                  style={styles.datePickerBtn}
                  onPress={() => setShowDatePicker(true)}
                  activeOpacity={0.7}
                >
                  <Calendar size={16} color={newDueDate ? Colors.primary : Colors.textLight} />
                  <Text style={newDueDate ? styles.datePickerVal : styles.datePickerPh}>
                    {newDueDate || 'Odaberi datum roka'}
                  </Text>
                  {newDueDate ? (
                    <TouchableOpacity
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      onPress={(e) => { e.stopPropagation(); setNewDueDate(''); }}
                    >
                      <X size={14} color={Colors.textLight} />
                    </TouchableOpacity>
                  ) : null}
                </TouchableOpacity>

                <DatePickerSheet
                  visible={showDatePicker}
                  value={newDueDate ? new Date(newDueDate) : new Date()}
                  minimumDate={new Date()}
                  onChange={(date) => setNewDueDate(toDateStr(date))}
                  onClose={() => setShowDatePicker(false)}
                />

                <Text style={styles.filterLabel}>Tip:</Text>
                <View style={styles.chipRow}>
                  {(['reading', 'maintenance', 'inspection', 'installation', 'other'] as TaskType[]).map(v => (
                    <FilterChip key={v} value={v} label={TYPE_LABELS[v]} current={newType} onSelect={v => setNewType(v as TaskType)} />
                  ))}
                </View>

                <Text style={styles.filterLabel}>Prioritet:</Text>
                <View style={styles.chipRow}>
                  {(['low', 'normal', 'high', 'urgent'] as Priority[]).map(v => (
                    <FilterChip key={v} value={v} label={PRIORITY_LABELS[v]} current={newPriority} onSelect={v => setNewPriority(v as Priority)} />
                  ))}
                </View>

                {workers.length > 0 && (
                  <>
                    <Text style={styles.filterLabel}>Dodijeli radniku:</Text>
                    <View style={styles.chipRow}>
                      {workers.map(w => (
                        <FilterChip key={w.id} value={w.id} label={w.full_name} current={newAssignedTo} onSelect={setNewAssignedTo} />
                      ))}
                    </View>
                  </>
                )}

                {connections.length > 0 && (
                  <>
                    <Text style={styles.filterLabel}>Priključak:</Text>
                    <View style={styles.chipRow}>
                      {connections.map(c => (
                        <FilterChip key={c.id} value={c.id} label={`${c.meter_serial} – ${c.address}`} current={newConnectionId} onSelect={setNewConnectionId} />
                      ))}
                    </View>
                  </>
                )}

                <View style={[styles.modalBtns, { marginTop: 16 }]}>
                  <Button title="Otkaži" variant="outline" onPress={() => setShowCreate(false)} style={styles.modalBtn} />
                  <Button title="Kreiraj" onPress={handleCreate} isLoading={creating} style={styles.modalBtn} />
                </View>
              </RNScrollView>
            </View>
          </View>
        </Modal>
      </View>
    </SafeAreaView>
  );
}

/* ─── DetailRow ──────────────────────────────────── */
function DetailRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <View style={styles.detailRow}>
      {icon}
      <Text style={styles.detailLabel}>{label}:</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  );
}

/* ─── styles ─────────────────────────────────────── */
const styles = StyleSheet.create({
  safeArea:    { flex: 1, backgroundColor: '#fff' },
  container:   { flex: 1, backgroundColor: '#fff' },
  center:      { flex: 1, alignItems: 'center', justifyContent: 'center' },
  searchRow:   { flexDirection: 'row', padding: 12, borderBottomWidth: 1, borderBottomColor: Colors.border },
  searchBox:   { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.highlight, borderRadius: 8, paddingHorizontal: 12 },
  searchInput: { flex: 1, height: 40, color: Colors.text, marginLeft: 8 },
  filterBtn:   { marginLeft: 12, width: 40, height: 40, borderRadius: 8, backgroundColor: Colors.highlight, alignItems: 'center', justifyContent: 'center' },
  filtersBox:  { padding: 12, borderBottomWidth: 1, borderBottomColor: Colors.border },
  filterLabel: { fontSize: 13, fontWeight: '600', color: Colors.text, marginTop: 8, marginBottom: 6 },
  chipRow:     { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip:        { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, backgroundColor: Colors.highlight },
  chipActive:  { backgroundColor: Colors.primary },
  chipText:    { fontSize: 12, color: Colors.text },
  chipTextActive: { color: '#fff' },
  list:        { padding: 16, paddingBottom: Platform.OS === 'android' ? 100 : 80 },
  taskCard:    { marginBottom: 14 },
  cardBody:    { padding: 16 },
  taskTitle:   { fontSize: 15, fontWeight: 'bold', color: Colors.text, marginBottom: 8 },
  taskDesc:    { fontSize: 13, color: Colors.textLight, marginTop: 6, marginBottom: 6 },
  badgeRow:    { flexDirection: 'row', flexWrap: 'wrap' },
  ml8:         { marginLeft: 6 },
  metaRow:     { marginTop: 10, gap: 4 },
  metaItem:    { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText:    { fontSize: 12, color: Colors.textLight },
  cardActions: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: Colors.border, padding: 10, alignItems: 'center' },
  actBtn:      { flex: 1, marginRight: 8 },
  arrowBtn:    { width: 36, height: 36, borderRadius: 8, backgroundColor: Colors.highlight, alignItems: 'center', justifyContent: 'center' },
  fab:         { position: 'absolute', bottom: Platform.OS === 'android' ? 40 : 24, right: 24, width: 56, height: 56, borderRadius: 28, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center', elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 4 },
  overlay:     { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  detailModal: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '85%', paddingBottom: 24 },
  actionModal: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24 },
  createModal: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '90%', padding: 20, paddingBottom: 32 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 16, paddingHorizontal: 4 },
  modalTitle:  { fontSize: 18, fontWeight: 'bold', color: Colors.text },
  modalSub:    { fontSize: 14, color: Colors.textLight, marginBottom: 20 },
  modalBtns:   { flexDirection: 'row' },
  modalBtn:    { flex: 1, marginHorizontal: 6 },
  detailName:  { fontSize: 17, fontWeight: 'bold', color: Colors.text, marginBottom: 10 },
  detailDesc:  { fontSize: 14, color: Colors.text, marginVertical: 12, lineHeight: 20 },
  detailGrid:  { gap: 8, marginTop: 8 },
  detailRow:   { flexDirection: 'row', alignItems: 'center', gap: 8 },
  detailLabel: { fontSize: 13, color: Colors.textLight, width: 72 },
  detailValue: { fontSize: 13, color: Colors.text, flex: 1 },

  /* date picker */
  datePickerBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    borderWidth: 1, borderColor: Colors.border,
    borderRadius: 10, paddingHorizontal: 12, paddingVertical: 13,
    marginBottom: 12, backgroundColor: '#fff',
  },
  datePickerVal:      { flex: 1, fontSize: 15, color: Colors.text },
  datePickerPh:       { flex: 1, fontSize: 15, color: Colors.textLight },
  datePickerDone:     {
    alignItems: 'center', paddingVertical: 10, marginBottom: 8,
    borderRadius: 8, backgroundColor: Colors.highlight,
  },
  datePickerDoneText: { fontSize: 14, fontWeight: '600', color: Colors.primary },
});
