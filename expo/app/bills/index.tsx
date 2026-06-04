import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  SafeAreaView,
  RefreshControl,
  Platform,
  ActivityIndicator,
  Modal,
  ScrollView,
  Alert,
  TextInput,
  KeyboardAvoidingView,
} from 'react-native';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { DatePickerSheet } from '@/components/ui/DatePickerSheet';
import {
  CreditCard,
  Calendar,
  DollarSign,
  CheckCircle,
  X,
  Plus,
  ChevronDown,
  MapPin,
  Send,
  AlertCircle,
  Ban,
} from 'lucide-react-native';
import { Header } from '@/components/layout/Header';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { Input } from '@/components/ui/Input';
import { useAuthStore } from '@/store/auth-store';
import { usePermissions } from '@/lib/use-permissions';
import {
  getBills,
  getBillsByConnection,
  getInvoicesByUser,
  createBill,
  updateBillStatus,
  calculateInvoice,
} from '@/lib/api/bills';
import { getMeters } from '@/lib/api/meters';
import { getReadingsByConnection } from '@/lib/api/readings';
import Colors from '@/constants/colors';
import { captureError } from '@/lib/sentry';

type InvoiceStatus =
  | 'draft'
  | 'pending'
  | 'sent'
  | 'paid'
  | 'overdue'
  | 'cancelled';

const STATUS_LABEL: Record<InvoiceStatus, string> = {
  draft: 'Nacrt',
  pending: 'Na čekanju',
  sent: 'Poslano',
  paid: 'Plaćeno',
  overdue: 'Prekoračeno',
  cancelled: 'Otkazano',
};

const STATUS_COLOR: Record<InvoiceStatus, string> = {
  draft: '#9E9E9E',
  pending: Colors.primary,
  sent: '#FF9800',
  paid: '#4CAF50',
  overdue: Colors.error,
  cancelled: '#9E9E9E',
};

const toDateStr = (d: Date): string => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

const formatDate = (dateStr: string | undefined | null) => {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString('de-DE', { month: 'short', year: 'numeric' });
};

const formatFullDate = (dateStr: string | undefined | null) => {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString('de-DE');
};

// Relative period filters
type PeriodFilter = 'all' | 'this_month' | 'last_3' | 'this_year';
const PERIOD_LABELS: Record<PeriodFilter, string> = {
  all: 'Svi',
  this_month: 'Ovaj mj.',
  last_3: 'Zadnja 3 mj.',
  this_year: 'Ova god.',
};

const applyPeriodFilter = (bills: any[], filter: PeriodFilter): any[] => {
  if (filter === 'all') return bills;
  const now = new Date();
  const thisYear = now.getFullYear();
  const thisYearMonth = `${thisYear}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const threeMonthsAgo = new Date(now);
  threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

  return bills.filter((b) => {
    if (!b.period_from) return false;
    const d = new Date(b.period_from);
    if (isNaN(d.getTime())) return false;
    if (filter === 'this_month') {
      const ym = b.period_from.slice(0, 7);
      return ym === thisYearMonth;
    }
    if (filter === 'last_3') return d >= threeMonthsAgo;
    if (filter === 'this_year') return d.getFullYear() === thisYear;
    return true;
  });
};

/* ── Status action helpers ─────────────────────── */
interface StatusAction {
  label: string;
  icon: React.ReactNode;
  newStatus: InvoiceStatus;
  isPrimary: boolean;
}

const getStatusActions = (status: InvoiceStatus): StatusAction[] => {
  const actions: StatusAction[] = [];
  if (status === 'draft') {
    actions.push({ label: 'Aktiviraj', icon: <CheckCircle size={16} color="#fff" />, newStatus: 'pending', isPrimary: true });
  }
  if (status === 'pending') {
    actions.push({ label: 'Pošalji', icon: <Send size={16} color="#fff" />, newStatus: 'sent', isPrimary: true });
    actions.push({ label: 'Plaćeno', icon: <CheckCircle size={16} color="#fff" />, newStatus: 'paid', isPrimary: true });
  }
  if (status === 'sent') {
    actions.push({ label: 'Plaćeno', icon: <CheckCircle size={16} color="#fff" />, newStatus: 'paid', isPrimary: true });
    actions.push({ label: 'Prekoračeno', icon: <AlertCircle size={16} color="#fff" />, newStatus: 'overdue', isPrimary: false });
  }
  if (status === 'overdue') {
    actions.push({ label: 'Plaćeno', icon: <CheckCircle size={16} color="#fff" />, newStatus: 'paid', isPrimary: true });
  }
  if (status !== 'cancelled' && status !== 'paid') {
    actions.push({ label: 'Otkaži', icon: <Ban size={16} color={Colors.error} />, newStatus: 'cancelled', isPrimary: false });
  }
  return actions;
};

/* ════════════════════════════════════════════════ */
export default function BillsScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { connectionId } = useLocalSearchParams<{ connectionId?: string }>();

  /* ── Data ──────────────────────────────────────── */
  const [bills, setBills] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [fetchError, setFetchError] = useState(false);

  /* ── Filters ───────────────────────────────────── */
  const [filterStatus, setFilterStatus] = useState<InvoiceStatus | 'all'>('all');
  const [filterPeriod, setFilterPeriod] = useState<PeriodFilter>('all');

  /* ── Detail modal ──────────────────────────────── */
  const [selectedBill, setSelectedBill] = useState<any>(null);
  const [detailVisible, setDetailVisible] = useState(false);
  const [saving, setSaving] = useState(false);

  /* ── Create modal ──────────────────────────────── */
  const [createVisible, setCreateVisible] = useState(false);
  const [connList, setConnList] = useState<any[]>([]);
  const [loadingConns, setLoadingConns] = useState(false);
  const [newConnId, setNewConnId] = useState('');
  const [showConnPicker, setShowConnPicker] = useState(false);
  const [newPeriodFrom, setNewPeriodFrom] = useState('');
  const [newPeriodTo, setNewPeriodTo] = useState('');
  const [newAmount, setNewAmount] = useState('');
  const [newConsumption, setNewConsumption] = useState('');
  const [newDueDate, setNewDueDate] = useState('');
  const [creating, setCreating] = useState(false);
  const [showPeriodFromPicker, setShowPeriodFromPicker] = useState(false);
  const [showPeriodToPicker,   setShowPeriodToPicker]   = useState(false);
  const [showDueDatePicker,    setShowDueDatePicker]    = useState(false);

  /* ── Create modal: auto-kalkulacija state ────────── */
  const [createMode,        setCreateMode]        = useState<'auto' | 'manual'>('auto');
  const [connReadings,      setConnReadings]      = useState<any[]>([]);
  const [loadingReadings,   setLoadingReadings]   = useState(false);
  const [fromReadingId,     setFromReadingId]     = useState('');
  const [toReadingId,       setToReadingId]       = useState('');
  const [showFromRdPicker,  setShowFromRdPicker]  = useState(false);
  const [showToRdPicker,    setShowToRdPicker]    = useState(false);

  const { canManageBilling: canManage, isEndUser } = usePermissions();

  /* ── Fetch ─────────────────────────────────────── */
  const fetchData = async () => {
    if (!user) return;
    setFetchError(false);
    try {
      let data: any[];
      if (connectionId) {
        data = await getBillsByConnection(connectionId);
      } else if (isEndUser) {
        data = await getInvoicesByUser(user.id);
      } else {
        data = await getBills();
      }
      setBills(data);
    } catch (err) {
      captureError(err, { screen: 'bills', action: 'fetchBills' });
      setFetchError(true);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [user?.id, connectionId]),
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  /* ── Open create modal + load connections ──────── */
  const openCreateModal = async () => {
    setLoadingConns(true);
    setCreateVisible(true);
    try {
      const data = await getMeters();
      setConnList(data);
    } catch (e) {
      captureError(e, { screen: 'bills', action: 'fetchConnections' });
    } finally {
      setLoadingConns(false);
    }
  };

  const resetCreateForm = () => {
    setNewConnId('');
    setNewPeriodFrom('');
    setNewPeriodTo('');
    setNewAmount('');
    setNewConsumption('');
    setNewDueDate('');
    setShowConnPicker(false);
    setShowPeriodFromPicker(false);
    setShowPeriodToPicker(false);
    setShowDueDatePicker(false);
    setCreateMode('auto');
    setConnReadings([]);
    setFromReadingId('');
    setToReadingId('');
    setShowFromRdPicker(false);
    setShowToRdPicker(false);
  };

  /* ── Connection select: load readings in auto mode ── */
  const handleConnectionSelect = async (connId: string) => {
    setNewConnId(connId);
    setShowConnPicker(false);
    setFromReadingId('');
    setToReadingId('');
    if (createMode === 'auto' && connId) {
      setLoadingReadings(true);
      try {
        const data = await getReadingsByConnection(connId);
        setConnReadings(data);
      } catch (e: any) {
        setConnReadings([]);
        captureError(e, { screen: 'bills', action: 'loadReadings' });
        Alert.alert('Greška', 'Nije moguće učitati očitanja za ovaj priključak.');
      } finally {
        setLoadingReadings(false);
      }
    }
  };

  /* ── Auto-calculate via Edge Function ─────────────── */
  const handleAutoCalculate = async () => {
    if (!newConnId || !fromReadingId || !toReadingId) {
      Alert.alert('Greška', 'Odaberite priključak, početno i završno očitanje.');
      return;
    }
    if (fromReadingId === toReadingId) {
      Alert.alert('Greška', 'Početno i završno očitanje moraju biti različita.');
      return;
    }
    setCreating(true);
    try {
      await calculateInvoice({
        connection_id:   newConnId,
        reading_from_id: fromReadingId,
        reading_to_id:   toReadingId,
        due_date:        newDueDate || undefined,
      });
      await fetchData();
      setCreateVisible(false);
      resetCreateForm();
      Alert.alert('Uspjeh', 'Faktura kreirana automatski prema cjenovnom paketu.');
    } catch (e: any) {
      Alert.alert('Greška', e?.message || 'Kalkulacija nije uspjela.');
    } finally {
      setCreating(false);
    }
  };

  /* ── Create invoice (manual) ───────────────────────── */
  const handleCreateInvoice = async () => {
    if (!newConnId || !newPeriodFrom || !newPeriodTo || !newAmount) {
      Alert.alert('Greška', 'Priključak, period i iznos su obavezni.');
      return;
    }
    if (new Date(newPeriodFrom) > new Date(newPeriodTo)) {
      Alert.alert('Greška', 'Datum početka perioda mora biti prije datuma završetka.');
      return;
    }
    const amount = parseFloat(newAmount);
    if (isNaN(amount) || amount <= 0) {
      Alert.alert('Greška', 'Unesite validan iznos.');
      return;
    }
    const conn = connList.find((c) => c.id === newConnId);
    if (!conn) return;

    setCreating(true);
    try {
      await createBill({
        connection_id: newConnId,
        utility_id: conn.utility_id,
        period_from: newPeriodFrom,
        period_to: newPeriodTo,
        amount_bam: amount,
        consumption_m3: newConsumption ? parseFloat(newConsumption) : undefined,
        due_date: newDueDate || undefined,
      });
      await fetchData();
      setCreateVisible(false);
      resetCreateForm();
    } catch (e: any) {
      Alert.alert('Greška', e?.message || 'Kreiranje računa nije uspjelo.');
    } finally {
      setCreating(false);
    }
  };

  /* ── Status change ─────────────────────────────── */
  const handleStatusChange = async (bill: any, newStatus: InvoiceStatus) => {
    setSaving(true);
    try {
      const paidAt =
        newStatus === 'paid' ? new Date().toISOString() : undefined;
      await updateBillStatus(bill.id, newStatus, paidAt);
      await fetchData();
      setDetailVisible(false);
    } catch (e) {
      Alert.alert('Greška', 'Promjena statusa nije uspjela.');
    } finally {
      setSaving(false);
    }
  };

  /* ── Computed filtered list ────────────────────── */
  const filtered = applyPeriodFilter(
    filterStatus === 'all'
      ? bills
      : bills.filter((b) => b.status === filterStatus),
    filterPeriod,
  );

  /* ── Render helpers ────────────────────────────── */
  const renderFilterChip = (
    value: string,
    label: string,
    active: boolean,
    color: string,
    onPress: () => void,
  ) => (
    <TouchableOpacity
      key={value}
      onPress={onPress}
      style={[styles.chip, active && { backgroundColor: color, borderColor: color }]}
    >
      <Text style={[styles.chipText, active && { color: '#fff' }]}>{label}</Text>
    </TouchableOpacity>
  );

  const renderBillCard = ({ item }: { item: any }) => {
    const status = item.status as InvoiceStatus;
    const color = STATUS_COLOR[status] || '#9E9E9E';
    const isOverdue = status === 'overdue';

    return (
      <TouchableOpacity
        onPress={() => {
          setSelectedBill(item);
          setDetailVisible(true);
        }}
        activeOpacity={0.8}
      >
        <Card style={styles.billCard}>
          <View style={styles.billTop}>
            <View style={{ flex: 1 }}>
              <Text style={styles.billPeriod}>
                {formatDate(item.period_from)} – {formatDate(item.period_to)}
              </Text>
              <Text style={styles.billSerial} numberOfLines={1}>
                {item.meterSerial || '—'}  ·  {item.address || ''}
              </Text>
            </View>
            <View style={[styles.statusBadge, { backgroundColor: color + '22' }]}>
              <Text style={[styles.statusText, { color }]}>
                {STATUS_LABEL[status] || status}
              </Text>
            </View>
          </View>

          <View style={styles.billBottom}>
            <View style={styles.amountRow}>
              <DollarSign size={14} color={Colors.primary} />
              <Text style={styles.billAmount}>
                {Number(item.amount || 0).toFixed(2)} KM
              </Text>
              {item.consumption_m3 != null && (
                <Text style={styles.billConsumption}> · {item.consumption_m3} m³</Text>
              )}
            </View>
            <View style={styles.dueRow}>
              <Calendar
                size={13}
                color={isOverdue ? Colors.error : Colors.textLight}
              />
              <Text
                style={[styles.billDue, isOverdue && { color: Colors.error }]}
              >
                Rok: {formatFullDate(item.due_date)}
              </Text>
            </View>
          </View>
        </Card>
      </TouchableOpacity>
    );
  };

  /* ── Detail modal ──────────────────────────────── */
  const renderDetail = () => {
    if (!selectedBill) return null;
    const status = selectedBill.status as InvoiceStatus;
    const color = STATUS_COLOR[status] || '#9E9E9E';
    const actions = canManage ? getStatusActions(status) : [];

    return (
      <Modal
        visible={detailVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setDetailVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Detalji računa</Text>
              <TouchableOpacity onPress={() => setDetailVisible(false)}>
                <X size={22} color={Colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody} keyboardShouldPersistTaps="handled">
              <DetailRow label="Period" value={`${formatDate(selectedBill.period_from)} – ${formatDate(selectedBill.period_to)}`} />
              <DetailRow label="Vodomjer" value={selectedBill.meterSerial || '—'} />
              <DetailRow label="Adresa" value={selectedBill.address || '—'} />
              {selectedBill.consumption_m3 != null && (
                <DetailRow label="Potrošnja" value={`${selectedBill.consumption_m3} m³`} />
              )}
              <DetailRow
                label="Iznos"
                value={`${Number(selectedBill.amount || 0).toFixed(2)} KM`}
                bold
              />
              <DetailRow label="Rok plaćanja" value={formatFullDate(selectedBill.due_date)} />
              {selectedBill.paid_at && (
                <DetailRow label="Datum uplate" value={formatFullDate(selectedBill.paid_at)} />
              )}

              {/* Status badge */}
              <View style={{ marginTop: 12, alignItems: 'flex-start' }}>
                <View style={[styles.statusBadge, { backgroundColor: color + '22', paddingHorizontal: 14, paddingVertical: 6 }]}>
                  <Text style={[styles.statusText, { color, fontSize: 14 }]}>
                    {STATUS_LABEL[status] || status}
                  </Text>
                </View>
              </View>

              {/* Status action buttons */}
              {actions.length > 0 && (
                <View style={styles.actionBtns}>
                  {actions.map((a) => (
                    <Button
                      key={a.newStatus}
                      title={a.label}
                      leftIcon={a.icon}
                      variant={a.isPrimary ? 'primary' : 'outline'}
                      size="small"
                      isLoading={saving}
                      onPress={() => handleStatusChange(selectedBill, a.newStatus)}
                      style={[
                        styles.actionBtnItem,
                        !a.isPrimary && { borderColor: a.newStatus === 'cancelled' ? Colors.error : undefined },
                      ]}
                    />
                  ))}
                </View>
              )}
            </ScrollView>

            <View style={styles.modalFooter}>
              <Button
                title="Zatvori"
                variant="outline"
                onPress={() => setDetailVisible(false)}
              />
            </View>
          </View>
        </View>
      </Modal>
    );
  };

  /* ── Create modal ──────────────────────────────── */
  const renderCreate = () => {
    const selectedConn  = connList.find((c) => c.id === newConnId);
    const fromRd        = connReadings.find((r) => r.id === fromReadingId);
    const toRd          = connReadings.find((r) => r.id === toReadingId);
    const previewConsumption =
      fromRd && toRd ? Number(toRd.value) - Number(fromRd.value) : null;

    const fmtReading = (r: any) => {
      const d   = new Date(r.readingDate).toLocaleDateString('de-DE');
      const val = Number(r.value).toFixed(3);
      const ind = r.status === 'verified' ? ' ✓' : r.status === 'rejected' ? ' ✗' : ' …';
      return `${d}  ·  ${val} m³${ind}`;
    };
    const rdStatusColor = (r: any) =>
      r.status === 'verified' ? '#4CAF50' : r.status === 'rejected' ? Colors.error : '#FF9800';

    const closeModal = () => { setCreateVisible(false); resetCreateForm(); };

    return (
      <Modal
        visible={createVisible}
        transparent
        animationType="slide"
        onRequestClose={closeModal}
      >
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <View style={styles.modalOverlay}>
            <View style={[styles.modalBox, { maxHeight: '92%' }]}>

              {/* Header */}
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Novi račun</Text>
                <TouchableOpacity onPress={closeModal}>
                  <X size={22} color={Colors.text} />
                </TouchableOpacity>
              </View>

              {/* Mode tabs */}
              <View style={styles.modeTabs}>
                {(['auto', 'manual'] as const).map((m) => (
                  <TouchableOpacity
                    key={m}
                    style={[styles.modeTab, createMode === m && styles.modeTabActive]}
                    onPress={() => {
                      setCreateMode(m);
                      setFromReadingId('');
                      setToReadingId('');
                    }}
                  >
                    <Text style={[styles.modeTabText, createMode === m && styles.modeTabTextActive]}>
                      {m === 'auto' ? 'Auto-kalkulacija' : 'Ručni unos'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <ScrollView style={styles.modalBody} keyboardShouldPersistTaps="handled">

                {/* ── Shared: Connection picker ── */}
                <Text style={styles.fieldLabel}>Priključak *</Text>
                {loadingConns ? (
                  <ActivityIndicator size="small" color={Colors.primary} style={{ marginBottom: 12 }} />
                ) : (
                  <>
                    <TouchableOpacity
                      style={styles.picker}
                      onPress={() => setShowConnPicker(!showConnPicker)}
                    >
                      <View style={styles.pickerLeft}>
                        <MapPin size={15} color={Colors.primary} />
                        <Text
                          style={[styles.pickerText, !newConnId && styles.pickerPlaceholder]}
                          numberOfLines={1}
                        >
                          {selectedConn
                            ? `${selectedConn.serialNumber} – ${selectedConn.address}`
                            : 'Odaberite priključak'}
                        </Text>
                      </View>
                      <ChevronDown size={16} color={Colors.textLight} />
                    </TouchableOpacity>
                    {showConnPicker && (
                      <View style={styles.pickerDropdown}>
                        <ScrollView style={{ maxHeight: 200 }}>
                          {connList.filter((c) => c.is_active).map((c) => (
                            <TouchableOpacity
                              key={c.id}
                              style={[styles.pickerItem, newConnId === c.id && styles.pickerItemActive]}
                              onPress={() => handleConnectionSelect(c.id)}
                            >
                              <Text style={[styles.pickerItemText, newConnId === c.id && { color: Colors.primary, fontWeight: '600' }]}>
                                {c.serialNumber} – {c.address}
                              </Text>
                              {c.userName ? <Text style={styles.pickerItemSub}>{c.userName}</Text> : null}
                            </TouchableOpacity>
                          ))}
                        </ScrollView>
                      </View>
                    )}
                  </>
                )}

                {/* ════ AUTO MODE ════ */}
                {createMode === 'auto' && (
                  <>
                    {newConnId && (
                      loadingReadings ? (
                        <ActivityIndicator size="small" color={Colors.primary} style={{ marginVertical: 12 }} />
                      ) : connReadings.length === 0 ? (
                        <View style={styles.autoInfoBox}>
                          <Text style={styles.autoInfoText}>Nema očitanja za odabrani priključak.</Text>
                        </View>
                      ) : (
                        <>
                          {/* From reading */}
                          <Text style={styles.fieldLabel}>Početno očitanje *</Text>
                          <TouchableOpacity
                            style={styles.picker}
                            onPress={() => { setShowFromRdPicker(!showFromRdPicker); setShowToRdPicker(false); }}
                          >
                            <View style={styles.pickerLeft}>
                              <Calendar size={15} color={fromRd ? rdStatusColor(fromRd) : Colors.textLight} />
                              <Text style={[styles.pickerText, !fromReadingId && styles.pickerPlaceholder]} numberOfLines={1}>
                                {fromRd ? fmtReading(fromRd) : 'Odaberite početno očitanje'}
                              </Text>
                            </View>
                            <ChevronDown size={16} color={Colors.textLight} />
                          </TouchableOpacity>
                          {showFromRdPicker && (
                            <View style={styles.pickerDropdown}>
                              <ScrollView style={{ maxHeight: 180 }}>
                                {connReadings.map((r) => (
                                  <TouchableOpacity
                                    key={r.id}
                                    style={[styles.pickerItem, fromReadingId === r.id && styles.pickerItemActive]}
                                    onPress={() => { setFromReadingId(r.id); setShowFromRdPicker(false); }}
                                  >
                                    <Text style={[styles.pickerItemText, { color: rdStatusColor(r) }]}>
                                      {fmtReading(r)}
                                    </Text>
                                  </TouchableOpacity>
                                ))}
                              </ScrollView>
                            </View>
                          )}

                          {/* To reading */}
                          <Text style={styles.fieldLabel}>Završno očitanje *</Text>
                          <TouchableOpacity
                            style={styles.picker}
                            onPress={() => { setShowToRdPicker(!showToRdPicker); setShowFromRdPicker(false); }}
                          >
                            <View style={styles.pickerLeft}>
                              <Calendar size={15} color={toRd ? rdStatusColor(toRd) : Colors.textLight} />
                              <Text style={[styles.pickerText, !toReadingId && styles.pickerPlaceholder]} numberOfLines={1}>
                                {toRd ? fmtReading(toRd) : 'Odaberite završno očitanje'}
                              </Text>
                            </View>
                            <ChevronDown size={16} color={Colors.textLight} />
                          </TouchableOpacity>
                          {showToRdPicker && (
                            <View style={styles.pickerDropdown}>
                              <ScrollView style={{ maxHeight: 180 }}>
                                {connReadings.map((r) => (
                                  <TouchableOpacity
                                    key={r.id}
                                    style={[styles.pickerItem, toReadingId === r.id && styles.pickerItemActive]}
                                    onPress={() => { setToReadingId(r.id); setShowToRdPicker(false); }}
                                  >
                                    <Text style={[styles.pickerItemText, { color: rdStatusColor(r) }]}>
                                      {fmtReading(r)}
                                    </Text>
                                  </TouchableOpacity>
                                ))}
                              </ScrollView>
                            </View>
                          )}

                          {/* Consumption preview */}
                          {previewConsumption !== null && (
                            <View style={[
                              styles.autoInfoBox,
                              { backgroundColor: previewConsumption >= 0 ? '#E8F5E9' : '#FFEBEE' }
                            ]}>
                              <Text style={[
                                styles.autoInfoText,
                                { color: previewConsumption >= 0 ? '#2E7D32' : Colors.error, fontWeight: '600' }
                              ]}>
                                {previewConsumption >= 0
                                  ? `Potrošnja: ${previewConsumption.toFixed(3)} m³`
                                  : `Negativna potrošnja — provjeri redoslijed očitanja`}
                              </Text>
                            </View>
                          )}
                        </>
                      )
                    )}

                    {/* Due date (auto mode) */}
                    <Text style={styles.datePickerLabel}>Rok plaćanja</Text>
                    <TouchableOpacity style={styles.datePickerBtn} onPress={() => setShowDueDatePicker(true)} activeOpacity={0.7}>
                      <Calendar size={14} color={newDueDate ? Colors.primary : Colors.textLight} />
                      <Text style={newDueDate ? styles.datePickerVal : styles.datePickerPh}>
                        {newDueDate || 'Odaberi rok plaćanja'}
                      </Text>
                      {newDueDate ? (
                        <TouchableOpacity hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} onPress={(e) => { e.stopPropagation(); setNewDueDate(''); }}>
                          <X size={14} color={Colors.textLight} />
                        </TouchableOpacity>
                      ) : null}
                    </TouchableOpacity>
                    <DatePickerSheet
                      visible={showDueDatePicker}
                      value={newDueDate ? new Date(newDueDate) : new Date()}
                      minimumDate={new Date()}
                      onChange={(d) => setNewDueDate(toDateStr(d))}
                      onClose={() => setShowDueDatePicker(false)}
                    />
                  </>
                )}

                {/* ════ MANUAL MODE ════ */}
                {createMode === 'manual' && (
                  <>
                    {/* Period */}
                    <View style={styles.row2}>
                      <View style={{ flex: 1, marginRight: 8 }}>
                        <Text style={styles.datePickerLabel}>Period od *</Text>
                        <TouchableOpacity style={styles.datePickerBtn} onPress={() => setShowPeriodFromPicker(true)} activeOpacity={0.7}>
                          <Calendar size={14} color={newPeriodFrom ? Colors.primary : Colors.textLight} />
                          <Text style={newPeriodFrom ? styles.datePickerVal : styles.datePickerPh} numberOfLines={1}>
                            {newPeriodFrom || 'YYYY-MM-DD'}
                          </Text>
                        </TouchableOpacity>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.datePickerLabel}>Period do *</Text>
                        <TouchableOpacity style={styles.datePickerBtn} onPress={() => setShowPeriodToPicker(true)} activeOpacity={0.7}>
                          <Calendar size={14} color={newPeriodTo ? Colors.primary : Colors.textLight} />
                          <Text style={newPeriodTo ? styles.datePickerVal : styles.datePickerPh} numberOfLines={1}>
                            {newPeriodTo || 'YYYY-MM-DD'}
                          </Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                    <DatePickerSheet
                      visible={showPeriodFromPicker}
                      value={newPeriodFrom ? new Date(newPeriodFrom) : new Date()}
                      onChange={(d) => setNewPeriodFrom(toDateStr(d))}
                      onClose={() => setShowPeriodFromPicker(false)}
                    />
                    <DatePickerSheet
                      visible={showPeriodToPicker}
                      value={newPeriodTo ? new Date(newPeriodTo) : new Date()}
                      onChange={(d) => setNewPeriodTo(toDateStr(d))}
                      onClose={() => setShowPeriodToPicker(false)}
                    />

                    {/* Amount + consumption */}
                    <View style={styles.row2}>
                      <View style={{ flex: 1, marginRight: 8 }}>
                        <Input
                          label="Iznos (KM) *"
                          placeholder="0.00"
                          value={newAmount}
                          onChangeText={setNewAmount}
                          keyboardType="decimal-pad"
                        />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Input
                          label="Potrošnja (m³)"
                          placeholder="0"
                          value={newConsumption}
                          onChangeText={setNewConsumption}
                          keyboardType="decimal-pad"
                        />
                      </View>
                    </View>

                    {/* Due date (manual mode) */}
                    <Text style={styles.datePickerLabel}>Rok plaćanja</Text>
                    <TouchableOpacity style={styles.datePickerBtn} onPress={() => setShowDueDatePicker(true)} activeOpacity={0.7}>
                      <Calendar size={14} color={newDueDate ? Colors.primary : Colors.textLight} />
                      <Text style={newDueDate ? styles.datePickerVal : styles.datePickerPh}>
                        {newDueDate || 'Odaberi rok plaćanja'}
                      </Text>
                      {newDueDate ? (
                        <TouchableOpacity hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} onPress={(e) => { e.stopPropagation(); setNewDueDate(''); }}>
                          <X size={14} color={Colors.textLight} />
                        </TouchableOpacity>
                      ) : null}
                    </TouchableOpacity>
                    <DatePickerSheet
                      visible={showDueDatePicker}
                      value={newDueDate ? new Date(newDueDate) : new Date()}
                      minimumDate={new Date()}
                      onChange={(d) => setNewDueDate(toDateStr(d))}
                      onClose={() => setShowDueDatePicker(false)}
                    />
                  </>
                )}
              </ScrollView>

              {/* Footer buttons */}
              <View style={styles.modalFooter}>
                {createMode === 'auto' ? (
                  <Button
                    title="Kalkuliraj i kreiraj"
                    leftIcon={<Plus size={18} color="#fff" />}
                    isLoading={creating}
                    onPress={handleAutoCalculate}
                    style={{ flex: 1, marginRight: 8 }}
                  />
                ) : (
                  <Button
                    title="Kreiraj račun"
                    leftIcon={<Plus size={18} color="#fff" />}
                    isLoading={creating}
                    onPress={handleCreateInvoice}
                    style={{ flex: 1, marginRight: 8 }}
                  />
                )}
                <Button
                  title="Odustani"
                  variant="outline"
                  onPress={closeModal}
                  style={{ flex: 1 }}
                />
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    );
  };

  /* ── Loading ───────────────────────────────────── */
  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <Header title={isEndUser ? 'Moji računi' : 'Računi'} showBack onLeftPress={() => router.back()} />
        <View style={styles.center}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  /* ── Main render ───────────────────────────────── */
  return (
    <SafeAreaView style={styles.safeArea}>
      <Header
        title={isEndUser ? 'Moji računi' : 'Računi'}
        showBack
        onLeftPress={() => router.back()}
      />

      {/* Status filter chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chips}
      >
        {(['all', 'pending', 'sent', 'paid', 'overdue', 'draft', 'cancelled'] as const).map((s) =>
          renderFilterChip(
            s,
            s === 'all' ? 'Svi' : STATUS_LABEL[s as InvoiceStatus],
            filterStatus === s,
            s === 'all' ? Colors.primary : STATUS_COLOR[s as InvoiceStatus],
            () => setFilterStatus(s),
          ),
        )}
      </ScrollView>

      {/* Period filter chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={[styles.chips, { paddingTop: 0 }]}
      >
        {(Object.keys(PERIOD_LABELS) as PeriodFilter[]).map((p) =>
          renderFilterChip(
            p,
            PERIOD_LABELS[p],
            filterPeriod === p,
            Colors.primary,
            () => setFilterPeriod(p),
          ),
        )}
      </ScrollView>

      {/* Bills list */}
      <FlatList
        data={filtered}
        renderItem={renderBillCard}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          fetchError
            ? <EmptyState
                title="Greška pri učitavanju"
                message="Provjeri vezu i pokušaj ponovo."
                icon={<AlertCircle size={48} color={Colors.error} />}
                actionLabel="Pokušaj ponovo"
                onAction={fetchData}
              />
            : <EmptyState
                title="Nema računa"
                message="Nema računa koji odgovaraju odabranom filteru."
                icon={<CreditCard size={48} color={Colors.textLight} />}
              />
        }
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      />

      {/* FAB - create invoice */}
      {canManage && !connectionId && (
        <TouchableOpacity
          style={styles.fab}
          onPress={openCreateModal}
          activeOpacity={0.85}
        >
          <Plus size={24} color="#fff" />
        </TouchableOpacity>
      )}

      {renderDetail()}
      {renderCreate()}
    </SafeAreaView>
  );
}

/* ── Helper component ───────────────────────────── */
function DetailRow({
  label,
  value,
  bold,
}: {
  label: string;
  value: string;
  bold?: boolean;
}) {
  return (
    <View style={detailRowStyles.row}>
      <Text style={detailRowStyles.label}>{label}</Text>
      <Text
        style={[
          detailRowStyles.value,
          bold && { fontWeight: 'bold', color: Colors.text },
        ]}
      >
        {value}
      </Text>
    </View>
  );
}

const detailRowStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 9,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  label: { fontSize: 14, color: Colors.textLight },
  value: { fontSize: 14, color: Colors.text, maxWidth: '60%', textAlign: 'right' },
});

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#fff' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  /* Chips */
  chips: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    gap: 8,
    flexDirection: 'row',
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: '#fff',
  },
  chipText: { fontSize: 12, color: Colors.textLight },

  /* List */
  list: {
    padding: 16,
    paddingBottom: Platform.OS === 'android' ? 100 : 80,
  },
  billCard: { marginBottom: 12 },

  billTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 14,
    paddingBottom: 8,
  },
  billPeriod: { fontSize: 15, fontWeight: '600', color: Colors.text, marginBottom: 3 },
  billSerial: { fontSize: 12, color: Colors.textLight },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  statusText: { fontSize: 12, fontWeight: '600' },

  billBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingBottom: 14,
  },
  amountRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  billAmount: { fontSize: 15, fontWeight: 'bold', color: Colors.text },
  billConsumption: { fontSize: 12, color: Colors.textLight },
  dueRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  billDue: { fontSize: 12, color: Colors.textLight },

  /* FAB */
  fab: {
    position: 'absolute',
    bottom: Platform.OS === 'android' ? 40 : 24,
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

  /* Modals */
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  modalBox: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  modalTitle: { fontSize: 17, fontWeight: 'bold', color: Colors.text },
  modalBody: { padding: 16 },
  modalFooter: {
    flexDirection: 'row',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },

  /* Status actions */
  actionBtns: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 16,
  },
  actionBtnItem: { marginBottom: 4 },

  /* Create form */
  fieldLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 6,
    marginTop: 8,
  },
  picker: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 11,
    paddingHorizontal: 13,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    backgroundColor: '#fff',
    marginBottom: 8,
  },
  pickerLeft: { flexDirection: 'row', alignItems: 'center', flex: 1, gap: 7 },
  pickerText: { fontSize: 14, color: Colors.text, flex: 1 },
  pickerPlaceholder: { color: Colors.textLight },
  pickerDropdown: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    overflow: 'hidden',
    marginBottom: 12,
  },
  pickerItem: {
    paddingVertical: 11,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  pickerItemActive: { backgroundColor: Colors.highlight },
  pickerItemText: { fontSize: 14, color: Colors.text },
  pickerItemSub: { fontSize: 11, color: Colors.textLight, marginTop: 2 },
  row2: { flexDirection: 'row' },

  /* date picker shared styles */
  datePickerLabel: { fontSize: 13, fontWeight: '500', color: Colors.text, marginBottom: 5 },
  datePickerBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    borderWidth: 1, borderColor: Colors.border,
    borderRadius: 10, paddingHorizontal: 10, paddingVertical: 11,
    marginBottom: 12, backgroundColor: '#fff',
  },
  datePickerVal:      { flex: 1, fontSize: 13, color: Colors.text },
  datePickerPh:       { flex: 1, fontSize: 13, color: Colors.textLight },
  datePickerDone: {
    alignItems: 'center', paddingVertical: 9, marginBottom: 8,
    borderRadius: 8, backgroundColor: Colors.highlight,
  },
  datePickerDoneText: { fontSize: 14, fontWeight: '600', color: Colors.primary },

  /* Mode tabs (auto / manual) */
  modeTabs: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 4,
    borderRadius: 10,
    backgroundColor: Colors.highlight,
    padding: 3,
  },
  modeTab: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
  },
  modeTabActive: {
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  modeTabText: { fontSize: 13, fontWeight: '500', color: Colors.textLight },
  modeTabTextActive: { color: Colors.primary, fontWeight: '700' },

  /* Auto mode info/empty box */
  autoInfoBox: {
    borderRadius: 8,
    backgroundColor: Colors.highlight,
    padding: 12,
    marginBottom: 12,
    marginTop: 4,
  },
  autoInfoText: { fontSize: 13, color: Colors.textLight, textAlign: 'center' },
});
