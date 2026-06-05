import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Modal,
  SafeAreaView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
import {
  CreditCard,
  Calendar,
  DollarSign,
  MapPin,
  Droplet,
  CheckCircle,
  Download,
  Printer,
  X,
  Clock,
  FileText,
} from 'lucide-react-native';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Header } from '@/components/layout/Header';
import { useAuthStore } from '@/store/auth-store';
import { usePermissions } from '@/lib/use-permissions';
import { getBillById, updateBillStatus } from '@/lib/api/bills';
import { captureError } from '@/lib/sentry';
import Colors from '@/constants/colors';

/* ── types ───────────────────────────────────────── */
type InvoiceStatus = 'draft' | 'pending' | 'sent' | 'paid' | 'overdue' | 'cancelled';

type MappedInvoice = ReturnType<typeof fakeMap>;
function fakeMap(b: any) {
  return b as {
    id: string;
    connection_id: string;
    utility_id: string;
    period_from: string;
    period_to: string;
    consumption_m3: number | null;
    amount: number;
    currency: string;
    status: InvoiceStatus;
    due_date: string | null;
    paid_at: string | null;
    meterSerial: string;
    address: string;
    createdAt: number;
    periodFrom: number;
    periodTo: number;
    dueDate: number | null;
    paidDate: number | null;
  };
}

/* ── status helpers ──────────────────────────────── */
const STATUS_LABEL: Record<InvoiceStatus, string> = {
  draft: 'Nacrt', pending: 'Na čekanju', sent: 'Poslano',
  paid: 'Plaćeno', overdue: 'Prekoračeno', cancelled: 'Otkazano',
};
const STATUS_COLOR: Record<InvoiceStatus, string> = {
  draft: '#9E9E9E', pending: '#FF9800', sent: '#2196F3',
  paid: '#4CAF50',  overdue: '#F44336',  cancelled: '#9E9E9E',
};
const STATUS_BG: Record<InvoiceStatus, string> = {
  draft: '#F5F5F5', pending: '#FFF3E0', sent: '#E3F2FD',
  paid: '#E8F5E9',  overdue: '#FFEBEE',  cancelled: '#F5F5F5',
};

function getStatusActions(status: InvoiceStatus): { label: string; next: InvoiceStatus }[] {
  switch (status) {
    case 'draft':   return [{ label: 'Aktiviraj', next: 'pending' }];
    case 'pending': return [{ label: 'Pošalji', next: 'sent' }, { label: 'Plaćeno', next: 'paid' }];
    case 'sent':    return [{ label: 'Plaćeno', next: 'paid' }, { label: 'Prekoračeno', next: 'overdue' }];
    case 'overdue': return [{ label: 'Plaćeno', next: 'paid' }];
    default:        return [];
  }
}

const formatDate = (iso: string | null | number) => {
  if (!iso) return '—';
  const d = new Date(typeof iso === 'number' ? iso : iso);
  return d.toLocaleDateString('bs-BA');
};

const formatPeriod = (from: string, to: string) => {
  const f = new Date(from);
  const t = new Date(to);
  return `${f.toLocaleDateString('bs-BA')} – ${t.toLocaleDateString('bs-BA')}`;
};

const buildInvoiceHtml = (bill: any): string => `
<!DOCTYPE html><html><head><meta charset="utf-8"/>
<style>
  body{font-family:Arial,sans-serif;padding:30px;color:#333;font-size:13px;}
  .header{display:flex;justify-content:space-between;border-bottom:2px solid #003366;padding-bottom:14px;margin-bottom:14px;}
  .co{font-weight:700;color:#003366;font-size:13px;line-height:1.5;}
  .bill-no{font-size:20px;font-weight:800;color:#0ea5e9;}
  .sub{font-size:11px;color:#999;}
  .dates{display:flex;justify-content:space-between;margin-bottom:12px;}
  .cbox{display:flex;justify-content:space-between;border:1px solid #eee;border-radius:6px;padding:12px;margin:12px 0;}
  .lbl{font-size:10px;color:#999;margin-bottom:2px;}
  .sec{background:#f0f7ff;padding:7px 12px;font-weight:700;color:#003366;margin:14px 0 2px;border-radius:3px;}
  .row{display:flex;justify-content:space-between;padding:7px 12px;border-bottom:1px solid #f0f0f0;}
  .rl{color:#666;}
  .total{display:flex;justify-content:space-between;padding:12px;background:#f0f7ff;font-size:15px;font-weight:700;border-radius:3px;margin-top:2px;}
  .tv{color:#0ea5e9;}
  .footer{margin-top:28px;text-align:center;font-size:10px;color:#aaa;line-height:1.6;}
</style></head><body>
<div class="header">
  <div><div class="co">${bill.utilityName ?? 'JAVNO KOMUNALNO PREDUZEĆE'}</div>${bill.utilityCity ? `<div class="sub">${bill.utilityCity}</div>` : ''}<div class="sub">AquaPulse platforma</div></div>
  <div style="text-align:right"><div class="sub">RAČUN</div><div class="bill-no">${bill.id.substring(0, 8).toUpperCase()}</div><div class="sub">za utrošenu vodu</div></div>
</div>
<div class="dates"><span>Datum: ${formatDate(bill.createdAt)}</span><span>Valuta: ${formatDate(bill.due_date)}</span></div>
<div class="cbox">
  <div><div class="lbl">Korisnik / Adresa</div><div>${bill.address || '—'}</div></div>
  <div style="text-align:right"><div class="lbl">Vodomjer</div><div>${bill.meterSerial || '—'}</div></div>
</div>
<div class="sec">Podaci o obračunu</div>
<div class="row"><span class="rl">Period</span><span>${formatPeriod(bill.period_from, bill.period_to)}</span></div>
${bill.consumption_m3 != null ? `<div class="row"><span class="rl">Potrošnja (m³)</span><span>${bill.consumption_m3}</span></div>` : ''}
<div class="sec">Obračun</div>
<div class="row"><span class="rl">Usluga vodovoda</span><span>${(bill.amount * 0.85).toFixed(2)} BAM</span></div>
<div class="row"><span class="rl">PDV (17%)</span><span>${(bill.amount * 0.15).toFixed(2)} BAM</span></div>
<div class="total"><span>UKUPNO (s PDV)</span><span class="tv">${bill.amount?.toFixed(2)} BAM</span></div>
<div class="sec" style="margin-top:18px">UPLATNI NALOG</div>
<div class="row"><span class="rl">Iznos</span><span><strong>${bill.amount?.toFixed(2)} BAM</strong></span></div>
<div class="row"><span class="rl">Rok plaćanja</span><span>${formatDate(bill.due_date)}</span></div>
<div class="footer">Račun je generisan elektronski putem AquaPulse platforme i punovažan je bez potpisa.</div>
</body></html>
`;

/* ── component ───────────────────────────────────── */
export default function BillDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router  = useRouter();
  const { user } = useAuthStore();

  const [bill, setBill]               = useState<any | null>(null);
  const [loading, setLoading]         = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [pdfVisible, setPdfVisible]   = useState(false);
  const [pdfLoading, setPdfLoading]   = useState(false);

  const { canManageBilling: canManageStatus, isEndUser } = usePermissions();
  const canPay = isEndUser && bill && ['pending', 'sent', 'overdue'].includes(bill.status);

  /* ── fetch ───────────────────────────────────── */
  const fetchBill = async () => {
    if (!id) return;
    try {
      const data = await getBillById(id);
      setBill(data);
    } catch {
      Alert.alert('Greška', 'Račun nije pronađen.');
      router.back();
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(useCallback(() => { fetchBill(); }, [id]));

  /* ── status change ───────────────────────────── */
  const handleStatusChange = async (next: InvoiceStatus) => {
    if (!bill) return;
    setActionLoading(true);
    try {
      const paidAt = next === 'paid' ? new Date().toISOString() : undefined;
      const updated = await updateBillStatus(bill.id, next, paidAt);
      setBill(updated);
    } catch (e: any) {
      Alert.alert('Greška', e?.message || 'Promjena statusa nije uspjela.');
    } finally {
      setActionLoading(false);
    }
  };

  /* ── PDF / Print ────────────────────────────── */
  const handleDownloadPdf = async () => {
    if (!bill) return;
    if (Platform.OS === 'web') { handlePrint(); return; }
    setPdfLoading(true);
    try {
      const html = buildInvoiceHtml(bill);
      const { uri } = await Print.printToFileAsync({ html });
      await Sharing.shareAsync(uri, {
        mimeType: 'application/pdf',
        dialogTitle: `Račun ${bill.id.substring(0, 8).toUpperCase()}`,
        UTI: 'com.adobe.pdf',
      });
    } catch (e: any) {
      captureError(e, { screen: 'bill-detail', action: 'downloadPdf' });
      Alert.alert('Greška', e?.message || 'Nije moguće generisati PDF.');
    } finally {
      setPdfLoading(false);
    }
  };

  const handlePrint = async () => {
    if (!bill) return;
    setPdfLoading(true);
    try {
      await Print.printAsync({ html: buildInvoiceHtml(bill) });
    } catch (e: any) {
      captureError(e, { screen: 'bill-detail', action: 'print' });
      Alert.alert('Greška', e?.message || 'Štampanje nije uspjelo.');
    } finally {
      setPdfLoading(false);
    }
  };

  /* ── end_user "plaćanje" ─────────────────────── */
  const handlePayRequest = () => {
    Alert.alert(
      'Plaćanje računa',
      `Ukupan iznos: ${bill?.amount?.toFixed(2)} BAM\n\nPotvrdite plaćanje?`,
      [
        { text: 'Otkaži', style: 'cancel' },
        {
          text: 'Potvrdi',
          onPress: () => handleStatusChange('paid'),
        },
      ],
    );
  };

  /* ── loading ─────────────────────────────────── */
  if (loading || !bill) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <Header title="Detalji računa" showBack onLeftPress={() => router.back()} />
        <View style={styles.center}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  const statusActions = canManageStatus ? getStatusActions(bill.status as InvoiceStatus) : [];

  /* ── render ──────────────────────────────────── */
  return (
    <SafeAreaView style={styles.safeArea}>
      <Header title="Detalji računa" showBack onLeftPress={() => router.back()} />

      <ScrollView contentContainerStyle={styles.content}>
        {/* Status badge */}
        <View style={[styles.statusBanner, { backgroundColor: STATUS_BG[bill.status as InvoiceStatus] }]}>
          <Text style={[styles.statusText, { color: STATUS_COLOR[bill.status as InvoiceStatus] }]}>
            {STATUS_LABEL[bill.status as InvoiceStatus] ?? bill.status}
          </Text>
        </View>

        {/* Info card */}
        <Card style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <View style={styles.cardIconBox}>
              <CreditCard size={24} color={Colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.amountLarge}>{bill.amount?.toFixed(2)} BAM</Text>
              <Text style={styles.periodLabel}>
                {formatPeriod(bill.period_from, bill.period_to)}
              </Text>
            </View>
          </View>

          <View style={styles.divider} />

          <InfoRow icon={<MapPin size={15} color={Colors.primary} />}
            label="Adresa" value={bill.address || '—'} />
          <InfoRow icon={<Droplet size={15} color={Colors.primary} />}
            label="Vodomjer" value={bill.meterSerial || '—'} />
          {bill.consumption_m3 != null && (
            <InfoRow icon={<Droplet size={15} color={Colors.primary} />}
              label="Potrošnja" value={`${bill.consumption_m3} m³`} />
          )}
          <InfoRow icon={<Calendar size={15} color={Colors.primary} />}
            label="Rok plaćanja" value={formatDate(bill.due_date)} />
          {bill.paid_at && (
            <InfoRow icon={<CheckCircle size={15} color="#4CAF50" />}
              label="Plaćeno" value={formatDate(bill.paid_at)} />
          )}
          <InfoRow icon={<Clock size={15} color={Colors.textLight} />}
            label="Kreirano" value={formatDate(bill.createdAt)} />
        </Card>

        {/* Admin/finance status actions */}
        {canManageStatus && statusActions.length > 0 && (
          <Card style={styles.card}>
            <Text style={styles.actionsTitle}>Promjena statusa</Text>
            <View style={styles.actionsRow}>
              {statusActions.map((a) => (
                <Button
                  key={a.next}
                  title={a.label}
                  size="small"
                  variant={a.next === 'paid' ? 'primary' : 'outline'}
                  onPress={() => handleStatusChange(a.next)}
                  isLoading={actionLoading}
                  style={styles.actionBtn}
                />
              ))}
              {!['paid', 'cancelled'].includes(bill.status) && (
                <Button
                  key="cancel"
                  title="Otkaži"
                  size="small"
                  variant="outline"
                  onPress={() => handleStatusChange('cancelled')}
                  isLoading={actionLoading}
                  style={[styles.actionBtn, { borderColor: Colors.error }]}
                />
              )}
            </View>
          </Card>
        )}

        {/* End-user pay button */}
        {canPay && (
          <Button
            title={`Plati ${bill.amount?.toFixed(2)} BAM`}
            leftIcon={<CheckCircle size={18} color="#fff" />}
            onPress={handlePayRequest}
            isLoading={actionLoading}
            style={styles.payBtn}
          />
        )}

        {/* PDF / Print buttons */}
        <View style={styles.utilityRow}>
          <TouchableOpacity style={styles.utilBtn} onPress={() => setPdfVisible(true)}>
            <FileText size={18} color={Colors.primary} />
            <Text style={styles.utilBtnText}>Pregled</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.utilBtn, pdfLoading && { opacity: 0.6 }]}
            onPress={handleDownloadPdf}
            disabled={pdfLoading}
          >
            {pdfLoading
              ? <ActivityIndicator size="small" color={Colors.primary} />
              : <Download size={18} color={Colors.primary} />}
            <Text style={styles.utilBtnText}>Preuzmi PDF</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.utilBtn, pdfLoading && { opacity: 0.6 }]}
            onPress={handlePrint}
            disabled={pdfLoading}
          >
            <Printer size={18} color={Colors.primary} />
            <Text style={styles.utilBtnText}>Štampaj</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* ── PDF Preview Modal ── */}
      <Modal visible={pdfVisible} animationType="slide" onRequestClose={() => setPdfVisible(false)}>
        <SafeAreaView style={styles.pdfSafe}>
          {/* Header */}
          <View style={styles.pdfHeader}>
            <TouchableOpacity onPress={() => setPdfVisible(false)} style={styles.pdfClose}>
              <X size={24} color={Colors.text} />
            </TouchableOpacity>
            <Text style={styles.pdfHeaderTitle}>Račun</Text>
            <TouchableOpacity
              onPress={handleDownloadPdf}
              style={styles.pdfClose}
              disabled={pdfLoading}
            >
              {pdfLoading
                ? <ActivityIndicator size="small" color={Colors.primary} />
                : <Download size={22} color={Colors.primary} />}
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.pdfScroll} contentContainerStyle={styles.pdfContent}>
            <View style={styles.pdfDoc}>
              {/* Company header */}
              <View style={styles.pdfDocHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.pdfCompanyName}>{bill.utilityName ?? 'JAVNO KOMUNALNO PREDUZEĆE'}</Text>
                  {bill.utilityCity ? <Text style={styles.pdfCompanyAddr}>{bill.utilityCity}</Text> : null}
                  <Text style={styles.pdfCompanyAddr}>AquaPulse platforma</Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={styles.pdfBillTitle}>RAČUN</Text>
                  <Text style={styles.pdfBillId}>{bill.id.substring(0, 8).toUpperCase()}</Text>
                  <Text style={styles.pdfBillSub}>za utrošenu vodu</Text>
                </View>
              </View>

              {/* Dates */}
              <View style={styles.pdfDates}>
                <Text style={styles.pdfDateItem}>Datum: {formatDate(bill.createdAt)}</Text>
                <Text style={styles.pdfDateItem}>Valuta: {formatDate(bill.due_date)}</Text>
              </View>

              {/* Customer info */}
              <View style={styles.pdfCustomerBox}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.pdfCustomerLabel}>Korisnik</Text>
                  <Text style={styles.pdfCustomerAddr}>{bill.address || '—'}</Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={styles.pdfCustomerLabel}>Vodomjer</Text>
                  <Text style={styles.pdfCustomerAddr}>{bill.meterSerial || '—'}</Text>
                </View>
              </View>

              {/* Period + consumption */}
              <View style={styles.pdfTableHeader}>
                <Text style={styles.pdfTableHeaderText}>Podaci o obračunu</Text>
              </View>
              <View style={styles.pdfRow}>
                <Text style={styles.pdfRowLabel}>Period</Text>
                <Text style={styles.pdfRowValue}>{formatPeriod(bill.period_from, bill.period_to)}</Text>
              </View>
              {bill.consumption_m3 != null && (
                <View style={styles.pdfRow}>
                  <Text style={styles.pdfRowLabel}>Potrošnja (m³)</Text>
                  <Text style={styles.pdfRowValue}>{bill.consumption_m3}</Text>
                </View>
              )}

              {/* Amount */}
              <View style={styles.pdfTableHeader}>
                <Text style={styles.pdfTableHeaderText}>Obračun</Text>
              </View>
              <View style={styles.pdfRow}>
                <Text style={[styles.pdfRowLabel, { flex: 3 }]}>Usluga vodovoda</Text>
                <Text style={[styles.pdfRowValue, { flex: 1, textAlign: 'right' }]}>
                  {(bill.amount * 0.85).toFixed(2)} BAM
                </Text>
              </View>
              <View style={styles.pdfRow}>
                <Text style={[styles.pdfRowLabel, { flex: 3 }]}>PDV (17%)</Text>
                <Text style={[styles.pdfRowValue, { flex: 1, textAlign: 'right' }]}>
                  {(bill.amount * 0.15).toFixed(2)} BAM
                </Text>
              </View>
              <View style={styles.pdfTotalRow}>
                <Text style={styles.pdfTotalLabel}>UKUPNO (s PDV)</Text>
                <Text style={styles.pdfTotalValue}>{bill.amount?.toFixed(2)} BAM</Text>
              </View>

              {/* Payment slip */}
              <View style={[styles.pdfTableHeader, { marginTop: 20 }]}>
                <Text style={styles.pdfTableHeaderText}>UPLATNI NALOG</Text>
              </View>
              <View style={styles.pdfRow}>
                <Text style={styles.pdfRowLabel}>Iznos</Text>
                <Text style={[styles.pdfRowValue, { fontWeight: 'bold' }]}>{bill.amount?.toFixed(2)} BAM</Text>
              </View>
              <View style={styles.pdfRow}>
                <Text style={styles.pdfRowLabel}>Rok</Text>
                <Text style={styles.pdfRowValue}>{formatDate(bill.due_date)}</Text>
              </View>

              {/* Footer */}
              <Text style={styles.pdfFooter}>
                Račun je generisan elektronski putem AquaPulse platforme i punovažan je bez potpisa.
              </Text>
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

/* ── InfoRow helper ──────────────────────────────── */
function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <View style={infoStyles.row}>
      {icon}
      <Text style={infoStyles.label}>{label}:</Text>
      <Text style={infoStyles.value}>{value}</Text>
    </View>
  );
}
const infoStyles = StyleSheet.create({
  row:   { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  label: { fontSize: 13, color: Colors.textLight, width: 90 },
  value: { fontSize: 13, color: Colors.text, flex: 1, fontWeight: '500' },
});

/* ── styles ──────────────────────────────────────── */
const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#f4f6f9' },
  center:   { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content:  { padding: 16, paddingBottom: 40 },

  statusBanner: {
    alignSelf: 'center',
    paddingHorizontal: 20, paddingVertical: 8,
    borderRadius: 20, marginBottom: 16,
  },
  statusText: { fontSize: 14, fontWeight: '700' },

  card:       { padding: 16, marginBottom: 14 },
  cardHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 16 },
  cardIconBox: {
    width: 48, height: 48, borderRadius: 12,
    backgroundColor: Colors.primary + '18',
    alignItems: 'center', justifyContent: 'center',
  },
  amountLarge: { fontSize: 22, fontWeight: '800', color: Colors.text },
  periodLabel: { fontSize: 13, color: Colors.textLight, marginTop: 2 },
  divider:     { height: 1, backgroundColor: Colors.border, marginBottom: 14 },

  actionsTitle: { fontSize: 14, fontWeight: '700', color: Colors.text, marginBottom: 10 },
  actionsRow:   { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  actionBtn:    { minWidth: 90 },

  payBtn: { marginBottom: 14 },

  utilityRow: {
    flexDirection: 'row', gap: 10,
    justifyContent: 'center', marginTop: 4,
  },
  utilBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: 12, borderRadius: 10,
    backgroundColor: '#fff',
    borderWidth: 1, borderColor: Colors.border,
  },
  utilBtnText: { fontSize: 12, fontWeight: '600', color: Colors.primary },

  /* PDF modal */
  pdfSafe:   { flex: 1, backgroundColor: '#f4f6f9' },
  pdfHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 14,
    backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  pdfClose:       { padding: 4 },
  pdfHeaderTitle: { fontSize: 17, fontWeight: 'bold', color: Colors.text },
  pdfScroll:      { flex: 1 },
  pdfContent:     { padding: 16, paddingBottom: 40 },

  pdfDoc: {
    backgroundColor: '#fff', borderRadius: 10, padding: 20,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08, shadowRadius: 4, elevation: 2,
  },
  pdfDocHeader: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#eee', paddingBottom: 14, marginBottom: 14 },
  pdfCompanyName:  { fontSize: 13, fontWeight: '700', color: '#003366' },
  pdfCompanyAddr:  { fontSize: 11, color: Colors.textLight, marginTop: 2 },
  pdfBillTitle:    { fontSize: 14, color: Colors.textLight },
  pdfBillId:       { fontSize: 16, fontWeight: '800', color: Colors.primary, marginVertical: 2 },
  pdfBillSub:      { fontSize: 11, color: Colors.textLight },
  pdfDates:        { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 14 },
  pdfDateItem:     { fontSize: 12, color: Colors.text },
  pdfCustomerBox:  {
    flexDirection: 'row', borderWidth: 1, borderColor: '#eee',
    borderRadius: 6, padding: 12, marginBottom: 16,
  },
  pdfCustomerLabel: { fontSize: 11, color: Colors.textLight, marginBottom: 2 },
  pdfCustomerAddr:  { fontSize: 13, color: Colors.text, fontWeight: '500' },
  pdfTableHeader: {
    backgroundColor: '#f0f7ff', padding: 8,
    borderRadius: 4, marginBottom: 2,
  },
  pdfTableHeaderText: { fontSize: 12, fontWeight: '700', color: '#003366' },
  pdfRow: {
    flexDirection: 'row', paddingVertical: 8,
    borderBottomWidth: 1, borderBottomColor: '#f0f0f0',
  },
  pdfRowLabel: { flex: 2, fontSize: 12, color: Colors.textLight },
  pdfRowValue: { flex: 2, fontSize: 12, color: Colors.text, fontWeight: '500' },
  pdfTotalRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    backgroundColor: '#f0f7ff', padding: 12,
    borderRadius: 4, marginTop: 4,
  },
  pdfTotalLabel: { fontSize: 14, fontWeight: '700', color: '#003366' },
  pdfTotalValue: { fontSize: 16, fontWeight: '800', color: Colors.primary },
  pdfFooter: {
    fontSize: 10, color: Colors.textLight, textAlign: 'center',
    marginTop: 24, lineHeight: 15,
  },
});
