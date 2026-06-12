import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Alert, Modal, ScrollView,
  SafeAreaView, ActivityIndicator,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Package, Wrench, Plus, X, Trash2, Check } from 'lucide-react-native';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { getMaterials, Material } from '@/lib/api/materials';
import {
  getTaskMaterials, addTaskMaterial, deleteTaskMaterial,
  getTaskServices, addTaskService, deleteTaskService,
  TaskMaterial, TaskService,
} from '@/lib/api/task-items';
import { captureError } from '@/lib/sentry';
import Colors from '@/constants/colors';

interface Props {
  taskId: string;
  utilityId: string;
  canEdit: boolean;     // dodijeljeni radnik ili admin/finance
  showPrices: boolean;  // admin/finance
  onChanged?: () => void;
}

export function TaskWorkItems({ taskId, utilityId, canEdit, showPrices, onChanged }: Props) {
  const [materials, setMaterials] = useState<TaskMaterial[]>([]);
  const [services, setServices]   = useState<TaskService[]>([]);
  const [loading, setLoading]     = useState(true);

  const [catalog, setCatalog]     = useState<Material[]>([]);
  const [matModal, setMatModal]   = useState(false);
  const [pickedMat, setPickedMat] = useState<Material | null>(null);
  const [matQty, setMatQty]       = useState('1');
  const [savingMat, setSavingMat] = useState(false);

  const [svcModal, setSvcModal]   = useState(false);
  const [svcFromCatalog, setSvcFromCatalog] = useState(true);
  const [svcPicked, setSvcPicked] = useState<Material | null>(null);
  const [svcDesc, setSvcDesc]     = useState('');
  const [svcExternal, setSvcExternal] = useState(false);
  const [svcHours, setSvcHours]   = useState('1');
  const [svcProvider, setSvcProvider] = useState('');
  const [svcPrice, setSvcPrice]   = useState('');
  const [savingSvc, setSavingSvc] = useState(false);

  const fetchItems = async () => {
    try {
      const [m, s] = await Promise.all([getTaskMaterials(taskId), getTaskServices(taskId)]);
      setMaterials(m);
      setServices(s);
    } catch (e) {
      captureError(e, { screen: 'task-work-items', action: 'fetch' });
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(useCallback(() => { fetchItems(); }, [taskId]));

  const materialTotal = materials.reduce((s, m) => s + m.total, 0);
  const serviceTotal  = services.reduce((s, x) => s + x.total, 0);

  /* ── Materijal ── */
  const openMatModal = async () => {
    setPickedMat(null); setMatQty('1'); setMatModal(true);
    if (catalog.length === 0) {
      try { setCatalog(await getMaterials(utilityId)); }
      catch (e: any) { Alert.alert('Greška', e.message || 'Katalog nije dostupan.'); }
    }
  };

  const handleAddMaterial = async () => {
    if (!pickedMat) { Alert.alert('Greška', 'Odaberite artikal.'); return; }
    const qty = parseFloat(matQty.replace(',', '.'));
    if (!qty || qty <= 0) { Alert.alert('Greška', 'Unesite ispravnu količinu.'); return; }
    setSavingMat(true);
    try {
      await addTaskMaterial({ task_id: taskId, material_id: pickedMat.id, quantity: qty });
      setMatModal(false);
      await fetchItems();
      onChanged?.();
    } catch (e: any) {
      Alert.alert('Greška', e.message || 'Dodavanje nije uspjelo.');
    } finally {
      setSavingMat(false);
    }
  };

  const handleDeleteMaterial = (m: TaskMaterial) => {
    Alert.alert('Brisanje', `Ukloniti "${m.name}"?`, [
      { text: 'Otkaži', style: 'cancel' },
      { text: 'Ukloni', style: 'destructive', onPress: async () => {
        try { await deleteTaskMaterial(m.id); await fetchItems(); onChanged?.(); }
        catch (e: any) { Alert.alert('Greška', e.message); }
      } },
    ]);
  };

  /* ── Usluga ── */
  const openSvcModal = async () => {
    setSvcFromCatalog(true); setSvcPicked(null);
    setSvcDesc(''); setSvcHours('1'); setSvcExternal(false); setSvcProvider(''); setSvcPrice('');
    setSvcModal(true);
    if (catalog.length === 0) {
      try { setCatalog(await getMaterials(utilityId)); }
      catch { /* katalog opcionalan za slobodan unos */ }
    }
  };

  const handleAddService = async () => {
    const hours = parseFloat(svcHours.replace(',', '.'));
    if (!hours || hours <= 0) { Alert.alert('Greška', 'Unesite ispravnu količinu/sate.'); return; }
    if (svcFromCatalog && !svcPicked) { Alert.alert('Greška', 'Odaberite uslugu iz kataloga.'); return; }
    if (!svcFromCatalog && !svcDesc.trim()) { Alert.alert('Greška', 'Opis usluge je obavezan.'); return; }
    setSavingSvc(true);
    try {
      await addTaskService({
        task_id: taskId,
        material_id: svcFromCatalog ? svcPicked!.id : undefined,
        description: svcFromCatalog ? '' : svcDesc.trim(),
        is_external: svcExternal,
        quantity: hours,
        unit: 'h',
        provider: svcExternal ? (svcProvider.trim() || undefined) : undefined,
        // Cijenu kod slobodnog unosa može upisati samo admin/finance
        unit_price: !svcFromCatalog && showPrices
          ? (parseFloat(svcPrice.replace(',', '.')) || 0)
          : undefined,
      });
      setSvcModal(false);
      await fetchItems();
      onChanged?.();
    } catch (e: any) {
      Alert.alert('Greška', e.message || 'Dodavanje nije uspjelo.');
    } finally {
      setSavingSvc(false);
    }
  };

  const handleDeleteService = (s: TaskService) => {
    Alert.alert('Brisanje', `Ukloniti "${s.description}"?`, [
      { text: 'Otkaži', style: 'cancel' },
      { text: 'Ukloni', style: 'destructive', onPress: async () => {
        try { await deleteTaskService(s.id); await fetchItems(); onChanged?.(); }
        catch (e: any) { Alert.alert('Greška', e.message); }
      } },
    ]);
  };

  if (loading) {
    return <Card style={styles.card}><ActivityIndicator color={Colors.primary} /></Card>;
  }

  return (
    <>
      {/* ── Materijal ── */}
      <Card style={styles.card}>
        <View style={styles.header}>
          <View style={styles.titleRow}><Package size={18} color={Colors.primary} /><Text style={styles.title}>Utrošeni materijal</Text></View>
          {showPrices && materialTotal > 0 && <Text style={styles.total}>{materialTotal.toFixed(2)} BAM</Text>}
        </View>

        {materials.length === 0 ? (
          <Text style={styles.empty}>Nema unesenog materijala.</Text>
        ) : materials.map((m) => (
          <View key={m.id} style={styles.itemRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.itemName}>{m.name}</Text>
              <Text style={styles.itemMeta}>
                {m.quantity} {m.unit}{showPrices ? `  ·  ${m.unitPrice.toFixed(2)} BAM  =  ${m.total.toFixed(2)} BAM` : ''}
              </Text>
            </View>
            {canEdit && (
              <TouchableOpacity onPress={() => handleDeleteMaterial(m)} hitSlop={8}><Trash2 size={16} color={Colors.error} /></TouchableOpacity>
            )}
          </View>
        ))}

        {canEdit && (
          <Button title="Dodaj materijal" size="small" variant="outline"
            leftIcon={<Plus size={16} color={Colors.primary} />} onPress={openMatModal} style={{ marginTop: 12 }} />
        )}
      </Card>

      {/* ── Usluge / rad ── */}
      <Card style={styles.card}>
        <View style={styles.header}>
          <View style={styles.titleRow}><Wrench size={18} color={Colors.primary} /><Text style={styles.title}>Usluge / rad</Text></View>
          {showPrices && serviceTotal > 0 && <Text style={styles.total}>{serviceTotal.toFixed(2)} BAM</Text>}
        </View>

        {services.length === 0 ? (
          <Text style={styles.empty}>Nema unesenih usluga.</Text>
        ) : services.map((s) => (
          <View key={s.id} style={styles.itemRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.itemName}>{s.description}</Text>
              <Text style={styles.itemMeta}>
                {s.isExternal ? `Eksterno${s.provider ? ` · ${s.provider}` : ''}` : 'Interno'} · {s.quantity} {s.unit}
                {showPrices && s.unitPrice > 0 ? `  ·  ${s.total.toFixed(2)} BAM` : ''}
              </Text>
            </View>
            {canEdit && (
              <TouchableOpacity onPress={() => handleDeleteService(s)} hitSlop={8}><Trash2 size={16} color={Colors.error} /></TouchableOpacity>
            )}
          </View>
        ))}

        {canEdit && (
          <Button title="Dodaj uslugu" size="small" variant="outline"
            leftIcon={<Plus size={16} color={Colors.primary} />} onPress={openSvcModal} style={{ marginTop: 12 }} />
        )}
      </Card>

      {/* ── Modal: materijal ── */}
      <Modal visible={matModal} animationType="slide" onRequestClose={() => setMatModal(false)}>
        <SafeAreaView style={styles.modalSafe}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setMatModal(false)}><X size={24} color={Colors.text} /></TouchableOpacity>
            <Text style={styles.modalTitle}>Dodaj materijal</Text>
            <View style={{ width: 24 }} />
          </View>
          <ScrollView contentContainerStyle={styles.modalBody} keyboardShouldPersistTaps="handled">
            <Text style={styles.fieldLabel}>Artikal</Text>
            {catalog.length === 0 ? (
              <Text style={styles.empty}>Katalog je prazan. Dodajte artikle u "Artikli".</Text>
            ) : catalog.map((c) => {
              const active = pickedMat?.id === c.id;
              return (
                <TouchableOpacity key={c.id} style={[styles.catItem, active && styles.catItemActive]} onPress={() => setPickedMat(c)}>
                  <Text style={[styles.catName, active && { color: Colors.primary, fontWeight: '700' }]}>
                    {c.code ? `${c.code} · ` : ''}{c.name} ({c.unit})
                  </Text>
                  {active && <Check size={16} color={Colors.primary} />}
                </TouchableOpacity>
              );
            })}
            <Input label="Količina" value={matQty} onChangeText={setMatQty} keyboardType="decimal-pad"
              placeholder="1" containerStyle={{ marginTop: 16 }} />
            <Button title="Dodaj" onPress={handleAddMaterial} isLoading={savingMat} style={{ marginTop: 4 }} />
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* ── Modal: usluga ── */}
      <Modal visible={svcModal} animationType="slide" onRequestClose={() => setSvcModal(false)}>
        <SafeAreaView style={styles.modalSafe}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setSvcModal(false)}><X size={24} color={Colors.text} /></TouchableOpacity>
            <Text style={styles.modalTitle}>Dodaj uslugu</Text>
            <View style={{ width: 24 }} />
          </View>
          <ScrollView contentContainerStyle={styles.modalBody} keyboardShouldPersistTaps="handled">
            {/* Izvor usluge: katalog (sa satnicom) ili slobodan unos */}
            <Text style={styles.fieldLabel}>Usluga</Text>
            <View style={styles.toggleRow}>
              <TouchableOpacity style={[styles.toggleChip, svcFromCatalog && styles.toggleChipActive]} onPress={() => setSvcFromCatalog(true)}>
                <Text style={[styles.toggleText, svcFromCatalog && styles.toggleTextActive]}>Iz kataloga</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.toggleChip, !svcFromCatalog && styles.toggleChipActive]} onPress={() => setSvcFromCatalog(false)}>
                <Text style={[styles.toggleText, !svcFromCatalog && styles.toggleTextActive]}>Slobodan unos</Text>
              </TouchableOpacity>
            </View>

            {svcFromCatalog ? (
              <View style={{ marginTop: 14 }}>
                {catalog.length === 0 ? (
                  <Text style={styles.empty}>Katalog je prazan. Dodajte usluge u "Artikli" (npr. "Rad montera", jedinica h).</Text>
                ) : catalog.map((c) => {
                  const active = svcPicked?.id === c.id;
                  return (
                    <TouchableOpacity key={c.id} style={[styles.catItem, active && styles.catItemActive]} onPress={() => setSvcPicked(c)}>
                      <Text style={[styles.catName, active && { color: Colors.primary, fontWeight: '700' }]}>
                        {c.code ? `${c.code} · ` : ''}{c.name} ({c.unit})
                      </Text>
                      {active && <Check size={16} color={Colors.primary} />}
                    </TouchableOpacity>
                  );
                })}
              </View>
            ) : (
              <Input label="Opis usluge" value={svcDesc} onChangeText={setSvcDesc}
                placeholder="npr. Iskop kanala, rad bagera" containerStyle={{ marginTop: 14 }} />
            )}

            <Text style={[styles.fieldLabel, { marginTop: 6 }]}>Vrsta</Text>
            <View style={styles.toggleRow}>
              <TouchableOpacity style={[styles.toggleChip, !svcExternal && styles.toggleChipActive]} onPress={() => setSvcExternal(false)}>
                <Text style={[styles.toggleText, !svcExternal && styles.toggleTextActive]}>Interno</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.toggleChip, svcExternal && styles.toggleChipActive]} onPress={() => setSvcExternal(true)}>
                <Text style={[styles.toggleText, svcExternal && styles.toggleTextActive]}>Eksterno</Text>
              </TouchableOpacity>
            </View>
            {svcExternal && (
              <Input label="Izvođač" value={svcProvider} onChangeText={setSvcProvider}
                placeholder="npr. GP Putevi d.o.o." containerStyle={{ marginTop: 16 }} />
            )}
            <Input label="Sati / jedinica" value={svcHours} onChangeText={setSvcHours} keyboardType="decimal-pad"
              placeholder="1" containerStyle={{ marginTop: 16 }} />
            {!svcFromCatalog && showPrices && (
              <Input label="Cijena po satu/jedinici (BAM)" value={svcPrice} onChangeText={setSvcPrice}
                keyboardType="decimal-pad" placeholder="0.00" />
            )}
            <Button title="Dodaj" onPress={handleAddService} isLoading={savingSvc} style={{ marginTop: 4 }} />
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  card:      { padding: 16, marginBottom: 14 },
  header:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  titleRow:  { flexDirection: 'row', alignItems: 'center', gap: 8 },
  title:     { fontSize: 15, fontWeight: '700', color: Colors.text },
  total:     { fontSize: 14, fontWeight: '800', color: Colors.primary },
  empty:     { fontSize: 13, color: Colors.textLight, fontStyle: 'italic' },

  itemRow:   { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 9, borderTopWidth: 1, borderTopColor: Colors.border },
  itemName:  { fontSize: 14, fontWeight: '500', color: Colors.text },
  itemMeta:  { fontSize: 12, color: Colors.textLight, marginTop: 2 },

  modalSafe:   { flex: 1, backgroundColor: '#f4f6f9' },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: Colors.border },
  modalTitle:  { fontSize: 17, fontWeight: 'bold', color: Colors.text },
  modalBody:   { padding: 16, paddingBottom: 40 },
  fieldLabel:  { fontSize: 14, fontWeight: '500', color: Colors.text, marginBottom: 8 },

  catItem:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12, paddingHorizontal: 12, borderRadius: 8, borderWidth: 1, borderColor: Colors.border, backgroundColor: '#fff', marginBottom: 8 },
  catItemActive: { borderColor: Colors.primary, backgroundColor: Colors.primary + '0D' },
  catName:       { fontSize: 14, color: Colors.text, flex: 1 },

  toggleRow:      { flexDirection: 'row', gap: 8 },
  toggleChip:     { flex: 1, paddingVertical: 10, borderRadius: 8, borderWidth: 1, borderColor: Colors.border, alignItems: 'center', backgroundColor: '#fff' },
  toggleChipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  toggleText:     { fontSize: 14, color: Colors.text },
  toggleTextActive: { color: '#fff', fontWeight: '600' },
});
