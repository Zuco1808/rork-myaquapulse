import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  SafeAreaView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import {
  Calendar,
  Clock,
  User,
  Droplet,
  MapPin,
  PlayCircle,
  CheckCircle,
  XCircle,
  DollarSign,
  Wrench,
} from 'lucide-react-native';
import { Header } from '@/components/layout/Header';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { useAuthStore } from '@/store/auth-store';
import { usePermissions } from '@/lib/use-permissions';
import { getTaskById, updateTaskStatus, updateTaskCosts } from '@/lib/api/tasks';
import { Task } from '@/types/user';
import Colors from '@/constants/colors';

/* ── helpers (same as tasks/index.tsx) ────────────────── */
type TaskStatus = Task['status'];
type TaskType   = Task['task_type'];
type Priority   = Task['priority'];

const TYPE_LABELS: Record<TaskType, string> = {
  reading: 'Očitanje', worker: 'Radni', inspection: 'Inspekcija',
  installation: 'Instalacija', other: 'Ostalo',
};
const TYPE_COLORS: Record<TaskType, string> = {
  reading: Colors.primary, worker: '#9C27B0', inspection: '#4CAF50',
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

/* ── component ─────────────────────────────────────────── */
export default function TaskDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuthStore();
  const { isWorker } = usePermissions();

  const [task, setTask]                   = useState<Task | null>(null);
  const [loading, setLoading]             = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [cancelNote, setCancelNote]       = useState('');
  const [showCancelForm, setShowCancelForm] = useState(false);
  const { canManageTasks } = usePermissions();
  const [editCosts, setEditCosts]   = useState(false);
  const [materialInput, setMaterialInput] = useState('');
  const [laborInput, setLaborInput]       = useState('');
  const [costSaving, setCostSaving]       = useState(false);

  /* ── Fetch ──────────────────────────────────────────── */
  useFocusEffect(
    useCallback(() => {
      if (!id) return;
      (async () => {
        try {
          const data = await getTaskById(id);
          setTask(data);
        } catch {
          Alert.alert('Greška', 'Zadatak nije pronađen.');
          router.back();
        } finally {
          setLoading(false);
        }
      })();
    }, [id]),
  );

  /* ── Actions ────────────────────────────────────────── */
  const handleStart = async () => {
    if (!task) return;
    setActionLoading(true);
    try {
      const assignTo = isWorker && !task.assigned_to ? user?.id : undefined;
      const updated = await updateTaskStatus(task.id, 'in_progress', undefined, assignTo);
      setTask(updated);
    } catch (e: any) {
      Alert.alert('Greška', e.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleComplete = () => {
    Alert.alert(
      'Završi zadatak',
      'Da li ste sigurni da je zadatak završen?',
      [
        { text: 'Otkaži', style: 'cancel' },
        {
          text: 'Potvrdi',
          onPress: async () => {
            setActionLoading(true);
            try {
              const updated = await updateTaskStatus(task!.id, 'done');
              setTask(updated);
              Alert.alert('Uspjeh', 'Zadatak je označen kao završen.');
            } catch (e: any) {
              Alert.alert('Greška', e.message);
            } finally {
              setActionLoading(false);
            }
          },
        },
      ],
    );
  };

  const handleCancel = async () => {
    if (!cancelNote.trim()) {
      Alert.alert('Greška', 'Unesite razlog otkazivanja.');
      return;
    }
    setActionLoading(true);
    try {
      const updated = await updateTaskStatus(task!.id, 'cancelled', cancelNote.trim());
      setTask(updated);
      setShowCancelForm(false);
      setCancelNote('');
      Alert.alert('Uspjeh', 'Zadatak je otkazan.');
    } catch (e: any) {
      Alert.alert('Greška', e.message);
    } finally {
      setActionLoading(false);
    }
  };

  const openCostEditor = () => {
    if (!task) return;
    setMaterialInput(String(task.material_cost ?? 0));
    setLaborInput(String(task.labor_cost ?? 0));
    setEditCosts(true);
  };

  const handleSaveCosts = async () => {
    if (!task) return;
    const material = parseFloat(materialInput.replace(',', '.'));
    const labor    = parseFloat(laborInput.replace(',', '.'));
    if (isNaN(material) || isNaN(labor) || material < 0 || labor < 0) {
      Alert.alert('Greška', 'Unesite ispravne iznose (≥ 0).');
      return;
    }
    setCostSaving(true);
    try {
      const updated = await updateTaskCosts(task.id, material, labor);
      setTask(updated);
      setEditCosts(false);
    } catch (e: any) {
      Alert.alert('Greška', e.message || 'Spremanje troškova nije uspjelo.');
    } finally {
      setCostSaving(false);
    }
  };

  /* ── Loading ────────────────────────────────────────── */
  if (loading || !task) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <Header title="Zadatak" showBack onLeftPress={() => router.back()} />
        <View style={styles.center}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  const isActive = task.status === 'open' || task.status === 'in_progress';

  /* ── Render ─────────────────────────────────────────── */
  return (
    <SafeAreaView style={styles.safeArea}>
      <Header title="Detalji zadatka" showBack onLeftPress={() => router.back()} />

      <ScrollView contentContainerStyle={styles.content}>
        {/* Title + badges */}
        <Card style={styles.card}>
          <Text style={styles.title}>{task.title}</Text>

          <View style={styles.badgeRow}>
            <Badge
              label={TYPE_LABELS[task.task_type]}
              color={TYPE_COLORS[task.task_type]}
              size="small"
            />
            <Badge
              label={STATUS_LABELS[task.status]}
              color={STATUS_COLORS[task.status]}
              size="small"
              style={styles.ml8}
            />
            <Badge
              label={PRIORITY_LABELS[task.priority]}
              color={PRIORITY_COLORS[task.priority]}
              size="small"
              style={styles.ml8}
            />
          </View>

          {task.description ? (
            <Text style={styles.description}>{task.description}</Text>
          ) : null}
        </Card>

        {/* Meta info */}
        <Card style={styles.card}>
          <Text style={styles.sectionTitle}>Informacije</Text>

          {task.assigned_to_name ? (
            <Row icon={<User size={16} color={Colors.primary} />}
              label="Dodijeljeno" value={task.assigned_to_name} />
          ) : null}
          {task.connection_address ? (
            <Row icon={<MapPin size={16} color={Colors.primary} />}
              label="Adresa" value={task.connection_address} />
          ) : null}
          {task.connection_serial ? (
            <Row icon={<Droplet size={16} color={Colors.primary} />}
              label="Vodomjer" value={task.connection_serial} />
          ) : null}
          {task.due_date ? (
            <Row icon={<Calendar size={16} color={Colors.primary} />}
              label="Rok" value={task.due_date} />
          ) : null}
          {task.completed_at ? (
            <Row icon={<CheckCircle size={16} color={Colors.success} />}
              label="Završeno" value={task.completed_at.split('T')[0]} />
          ) : null}
          <Row icon={<Clock size={16} color={Colors.textLight} />}
            label="Kreirano" value={task.created_at.split('T')[0]} />
        </Card>

        {/* Troškovi servisa */}
        {(() => {
          const material = task.material_cost ?? 0;
          const labor    = task.labor_cost ?? 0;
          const total    = material + labor;
          const canEdit  = canManageTasks || (isWorker && task.assigned_to === user?.id);
          if (total === 0 && !canEdit) return null;
          return (
            <Card style={styles.card}>
              <View style={styles.costHeader}>
                <View style={styles.costTitleRow}>
                  <Wrench size={18} color={Colors.primary} />
                  <Text style={styles.sectionTitleInline}>Troškovi servisa</Text>
                </View>
                {total > 0 && (
                  <Text style={styles.costTotal}>{total.toFixed(2)} BAM</Text>
                )}
              </View>

              {!editCosts ? (
                <>
                  <Row icon={<DollarSign size={16} color={Colors.textLight} />}
                    label="Materijal" value={`${material.toFixed(2)} BAM`} />
                  <Row icon={<DollarSign size={16} color={Colors.textLight} />}
                    label="Rad" value={`${labor.toFixed(2)} BAM`} />
                  {canEdit && (
                    <Button
                      title={total > 0 ? 'Uredi troškove' : 'Dodaj troškove'}
                      size="small"
                      variant="outline"
                      onPress={openCostEditor}
                      style={{ marginTop: 8 }}
                    />
                  )}
                </>
              ) : (
                <View>
                  <Input
                    label="Trošak materijala (BAM)"
                    value={materialInput}
                    onChangeText={setMaterialInput}
                    keyboardType="decimal-pad"
                    placeholder="0.00"
                  />
                  <Input
                    label="Trošak rada (BAM)"
                    value={laborInput}
                    onChangeText={setLaborInput}
                    keyboardType="decimal-pad"
                    placeholder="0.00"
                  />
                  <View style={styles.cancelButtons}>
                    <Button
                      title="Odustani"
                      variant="outline"
                      onPress={() => setEditCosts(false)}
                      style={styles.cancelFormBtn}
                    />
                    <Button
                      title="Spremi"
                      onPress={handleSaveCosts}
                      isLoading={costSaving}
                      style={styles.cancelFormBtn}
                    />
                  </View>
                </View>
              )}
            </Card>
          );
        })()}

        {/* Actions */}
        {isActive && (
          <Card style={styles.card}>
            <Text style={styles.sectionTitle}>Akcije</Text>

            {task.status === 'open' && (
              <Button
                title="Počni zadatak"
                leftIcon={<PlayCircle size={18} color="#fff" />}
                onPress={handleStart}
                isLoading={actionLoading}
                style={styles.actionBtn}
              />
            )}

            {task.status === 'in_progress' && (
              <Button
                title="Označi kao završen"
                leftIcon={<CheckCircle size={18} color="#fff" />}
                onPress={handleComplete}
                isLoading={actionLoading}
                style={styles.actionBtn}
              />
            )}

            {!showCancelForm ? (
              <Button
                title="Otkaži zadatak"
                variant="outline"
                leftIcon={<XCircle size={18} color={Colors.error} />}
                onPress={() => setShowCancelForm(true)}
                style={[styles.actionBtn, styles.cancelBtn]}
              />
            ) : (
              <View style={styles.cancelForm}>
                <Input
                  label="Razlog otkazivanja *"
                  placeholder="Unesite razlog..."
                  value={cancelNote}
                  onChangeText={setCancelNote}
                />
                <View style={styles.cancelButtons}>
                  <Button
                    title="Odustani"
                    variant="outline"
                    onPress={() => { setShowCancelForm(false); setCancelNote(''); }}
                    style={styles.cancelFormBtn}
                  />
                  <Button
                    title="Potvrdi otkazivanje"
                    onPress={handleCancel}
                    isLoading={actionLoading}
                    style={[styles.cancelFormBtn, { backgroundColor: Colors.error }]}
                  />
                </View>
              </View>
            )}
          </Card>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

/* ── Row helper ─────────────────────────────────────────── */
function Row({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <View style={rowStyles.row}>
      {icon}
      <Text style={rowStyles.label}>{label}:</Text>
      <Text style={rowStyles.value}>{value}</Text>
    </View>
  );
}

const rowStyles = StyleSheet.create({
  row:   { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  label: { fontSize: 13, color: Colors.textLight, width: 80 },
  value: { fontSize: 13, color: Colors.text, flex: 1, fontWeight: '500' },
});

/* ── styles ─────────────────────────────────────────────── */
const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#f4f6f9' },
  center:   { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content:  { padding: 16, paddingBottom: Platform.OS === 'android' ? 80 : 40 },

  card:         { padding: 16, marginBottom: 14 },
  title:        { fontSize: 18, fontWeight: 'bold', color: Colors.text, marginBottom: 12 },
  badgeRow:     { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 12 },
  ml8:          { marginLeft: 6 },
  description:  { fontSize: 14, color: Colors.text, lineHeight: 21, marginTop: 4 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: Colors.text, marginBottom: 14 },
  sectionTitleInline: { fontSize: 15, fontWeight: '700', color: Colors.text },

  costHeader:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  costTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  costTotal:    { fontSize: 15, fontWeight: '800', color: Colors.primary },

  actionBtn:   { marginBottom: 10 },
  cancelBtn:   { borderColor: Colors.error },
  cancelForm:  { marginTop: 4 },
  cancelButtons: { flexDirection: 'row', gap: 8, marginTop: 4 },
  cancelFormBtn: { flex: 1 },
});
