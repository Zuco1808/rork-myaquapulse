import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Alert, Platform, ActivityIndicator,
  Modal, ScrollView, SafeAreaView,
} from 'react-native';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { FileText, Download, Printer, Mail, X } from 'lucide-react-native';
import { Card } from '@/components/ui/Card';
import { getTaskMaterials, getTaskServices, TaskMaterial, TaskService } from '@/lib/api/task-items';
import { sendWorkOrderEmail } from '@/lib/api/tasks';
import { Task } from '@/types/user';
import { captureError } from '@/lib/sentry';
import Colors from '@/constants/colors';

interface Props {
  task: Task;
  utilityName?: string | null;
  canSendEmail: boolean; // admin/finance
}

const TYPE_LABELS: Record<string, string> = {
  reading: 'Očitanje', maintenance: 'Radni nalog', inspection: 'Inspekcija',
  installation: 'Instalacija', other: 'Ostalo',
};

const fmtDate = (v?: string | null) => {
  if (!v) return '—';
  try { return new Date(v).toLocaleDateString('bs-BA'); } catch { return v; }
};

/** Gradi HTML radnog naloga BEZ cijena. */
function buildWorkOrderHtml(task: Task, materials: TaskMaterial[], services: TaskService[], utilityName?: string | null): string {
  const idShort = String(task.id).substring(0, 8).toUpperCase();
  const matRows = materials.length
    ? materials.map(m => `<tr><td>${m.name}</td><td style="text-align:right">${m.quantity} ${m.unit}</td></tr>`).join('')
    : `<tr><td colspan="2" style="color:#999">Nema unesenog materijala</td></tr>`;
  const svcRows = services.length
    ? services.map(s => `<tr><td>${s.description}${s.provider ? ` <span style="color:#999">(${s.provider})</span>` : ''}</td>`
        + `<td style="text-align:center">${s.isExternal ? 'Eksterno' : 'Interno'}</td>`
        + `<td style="text-align:right">${s.quantity} ${s.unit}</td></tr>`).join('')
    : `<tr><td colspan="3" style="color:#999">Nema unesenih usluga</td></tr>`;

  return `<!DOCTYPE html><html><head><meta charset="utf-8"/>
<style>
  body{font-family:Arial,sans-serif;padding:28px;color:#333;font-size:13px;}
  .header{display:flex;justify-content:space-between;border-bottom:2px solid #003366;padding-bottom:14px;margin-bottom:14px;}
  .co{font-weight:700;color:#003366;font-size:14px;}
  .no{font-size:20px;font-weight:800;color:#0ea5e9;}
  .sub{font-size:11px;color:#999;}
  .box{display:flex;justify-content:space-between;border:1px solid #eee;border-radius:6px;padding:12px;margin:12px 0;}
  .lbl{font-size:10px;color:#999;}
  .sec{background:#f0f7ff;padding:7px 12px;font-weight:700;color:#003366;margin:16px 0 6px;border-radius:3px;}
  table{width:100%;border-collapse:collapse;}
  th,td{padding:7px 10px;border-bottom:1px solid #f0f0f0;font-size:12px;}
  th{text-align:left;color:#666;background:#fafafa;}
  .note{border:1px solid #eee;border-radius:6px;padding:12px;color:#444;white-space:pre-wrap;}
  .footer{margin-top:30px;display:flex;justify-content:space-between;}
  .sign{width:45%;text-align:center;border-top:1px solid #ccc;padding-top:6px;font-size:11px;color:#888;}
</style></head><body>
<div class="header">
  <div><div class="co">${utilityName ?? 'JAVNO KOMUNALNO PREDUZEĆE'}</div><div class="sub">AquaPulse platforma</div></div>
  <div style="text-align:right"><div class="sub">RADNI NALOG</div><div class="no">${idShort}</div></div>
</div>
<div class="box">
  <div><div class="lbl">Naslov</div><div><b>${task.title}</b></div><div class="sub">${TYPE_LABELS[task.task_type] ?? task.task_type}</div></div>
  <div style="text-align:right"><div class="lbl">Datum</div><div>${fmtDate(task.created_at)}</div>${task.due_date ? `<div class="sub">Rok: ${fmtDate(task.due_date)}</div>` : ''}</div>
</div>
<div class="box">
  <div><div class="lbl">Adresa / Lokacija</div><div>${task.connection_address ?? '—'}</div></div>
  <div style="text-align:right"><div class="lbl">Vodomjer</div><div>${task.connection_serial ?? '—'}</div><div class="sub">Izvršilac: ${task.assigned_to_name ?? '—'}</div></div>
</div>
${task.description ? `<div class="sec">Opis problema</div><div class="note">${task.description}</div>` : ''}
<div class="sec">Utrošeni materijal</div>
<table><thead><tr><th>Artikal</th><th style="text-align:right">Količina</th></tr></thead><tbody>${matRows}</tbody></table>
<div class="sec">Usluge / rad</div>
<table><thead><tr><th>Opis</th><th style="text-align:center">Vrsta</th><th style="text-align:right">Količina</th></tr></thead><tbody>${svcRows}</tbody></table>
${task.notes ? `<div class="sec">Napomena</div><div class="note">${task.notes}</div>` : ''}
<div class="footer">
  <div class="sign">Izvršilac</div>
  <div class="sign">Korisnik / Potpis</div>
</div>
</body></html>`;
}

export function WorkOrderActions({ task, utilityName, canSendEmail }: Props) {
  const [loading, setLoading]   = useState(false);
  const [emailing, setEmailing] = useState(false);
  const [preview, setPreview]   = useState(false);
  const [html, setHtml]         = useState('');

  const loadHtml = async (): Promise<string> => {
    const [materials, services] = await Promise.all([
      getTaskMaterials(task.id), getTaskServices(task.id),
    ]);
    return buildWorkOrderHtml(task, materials, services, utilityName);
  };

  const handlePreview = async () => {
    setLoading(true);
    try { setHtml(await loadHtml()); setPreview(true); }
    catch (e: any) { Alert.alert('Greška', e.message || 'Pregled nije uspio.'); }
    finally { setLoading(false); }
  };

  const handleDownload = async () => {
    setLoading(true);
    try {
      const content = await loadHtml();
      if (Platform.OS === 'web') { await Print.printAsync({ html: content }); return; }
      const { uri } = await Print.printToFileAsync({ html: content });
      await Sharing.shareAsync(uri, { mimeType: 'application/pdf', dialogTitle: `Radni nalog ${task.id.substring(0,8).toUpperCase()}`, UTI: 'com.adobe.pdf' });
    } catch (e: any) {
      captureError(e, { screen: 'work-order', action: 'download' });
      Alert.alert('Greška', e.message || 'Generisanje PDF-a nije uspjelo.');
    } finally { setLoading(false); }
  };

  const handlePrint = async () => {
    setLoading(true);
    try { await Print.printAsync({ html: await loadHtml() }); }
    catch (e: any) { Alert.alert('Greška', e.message || 'Štampanje nije uspjelo.'); }
    finally { setLoading(false); }
  };

  const handleEmail = () => {
    Alert.alert('Slanje naloga', 'Poslati radni nalog korisniku na e-mail (bez cijena)?', [
      { text: 'Otkaži', style: 'cancel' },
      { text: 'Pošalji', onPress: async () => {
        setEmailing(true);
        try {
          const { email } = await sendWorkOrderEmail({ task_id: task.id });
          Alert.alert('Poslano', `Radni nalog je poslan na ${email}.`);
        } catch (e: any) {
          captureError(e, { screen: 'work-order', action: 'email' });
          Alert.alert('Greška', e.message || 'Slanje nije uspjelo.');
        } finally { setEmailing(false); }
      } },
    ]);
  };

  return (
    <Card style={styles.card}>
      <Text style={styles.title}>Radni nalog (PDF)</Text>
      <View style={styles.row}>
        <TouchableOpacity style={styles.btn} onPress={handlePreview} disabled={loading}>
          {loading ? <ActivityIndicator size="small" color={Colors.primary} /> : <FileText size={18} color={Colors.primary} />}
          <Text style={styles.btnText}>Pregled</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.btn} onPress={handleDownload} disabled={loading}>
          <Download size={18} color={Colors.primary} />
          <Text style={styles.btnText}>Preuzmi</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.btn} onPress={handlePrint} disabled={loading}>
          <Printer size={18} color={Colors.primary} />
          <Text style={styles.btnText}>Štampaj</Text>
        </TouchableOpacity>
      </View>
      {canSendEmail && (
        <TouchableOpacity style={[styles.emailBtn, emailing && { opacity: 0.6 }]} onPress={handleEmail} disabled={emailing}>
          {emailing ? <ActivityIndicator size="small" color="#fff" /> : <Mail size={18} color="#fff" />}
          <Text style={styles.emailText}>Pošalji korisniku mailom</Text>
        </TouchableOpacity>
      )}

      <Modal visible={preview} animationType="slide" onRequestClose={() => setPreview(false)}>
        <SafeAreaView style={styles.modalSafe}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setPreview(false)}><X size={24} color={Colors.text} /></TouchableOpacity>
            <Text style={styles.modalTitle}>Radni nalog</Text>
            <TouchableOpacity onPress={handleDownload}><Download size={22} color={Colors.primary} /></TouchableOpacity>
          </View>
          {Platform.OS === 'web' ? (
            <iframe srcDoc={html} style={{ flex: 1, border: 'none' } as any} />
          ) : (
            <ScrollView><WebPreview html={html} /></ScrollView>
          )}
        </SafeAreaView>
      </Modal>
    </Card>
  );
}

// Jednostavan native preview preko WebView
function WebPreview({ html }: { html: string }) {
  const { WebView } = require('react-native-webview');
  return <WebView originWhitelist={['*']} source={{ html }} style={{ height: 700 }} />;
}

const styles = StyleSheet.create({
  card:    { padding: 16, marginBottom: 14 },
  title:   { fontSize: 15, fontWeight: '700', color: Colors.text, marginBottom: 12 },
  row:     { flexDirection: 'row', gap: 10 },
  btn:     { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 11, borderRadius: 10, borderWidth: 1, borderColor: Colors.border, backgroundColor: '#fff' },
  btnText: { fontSize: 12, fontWeight: '600', color: Colors.primary },
  emailBtn:{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 12, borderRadius: 10, backgroundColor: Colors.primary, marginTop: 10 },
  emailText:{ fontSize: 14, fontWeight: '600', color: '#fff' },

  modalSafe:   { flex: 1, backgroundColor: '#f4f6f9' },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: Colors.border },
  modalTitle:  { fontSize: 17, fontWeight: 'bold', color: Colors.text },
});
