import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, SafeAreaView,
  RefreshControl, ActivityIndicator, Modal, ScrollView, Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Package, Plus, X, Edit2, Trash2 } from 'lucide-react-native';
import { Header } from '@/components/layout/Header';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { EmptyState } from '@/components/ui/EmptyState';
import { useAuthStore } from '@/store/auth-store';
import { usePermissions } from '@/lib/use-permissions';
import {
  getMaterials, createMaterial, updateMaterial, deactivateMaterial,
  Material, MATERIAL_UNITS,
} from '@/lib/api/materials';
import { captureError } from '@/lib/sentry';
import Colors from '@/constants/colors';

export default function MaterialsScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { canManageBilling } = usePermissions(); // admin/finance uređuju katalog

  const [items, setItems]       = useState<Material[]>([]);
  const [loading, setLoading]   = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing]   = useState<Material | null>(null);
  const [name, setName]         = useState('');
  const [code, setCode]         = useState('');
  const [unit, setUnit]         = useState<string>('kom');
  const [purchase, setPurchase] = useState('');
  const [sale, setSale]         = useState('');
  const [saving, setSaving]     = useState(false);

  const fetchData = async () => {
    if (!user?.utility_id) { setLoading(false); return; }
    try {
      setItems(await getMaterials(user.utility_id, true));
    } catch (e) {
      captureError(e, { screen: 'materials', action: 'fetch' });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(useCallback(() => { fetchData(); }, [user?.utility_id]));

  const openCreate = () => {
    setEditing(null);
    setName(''); setCode(''); setUnit('kom'); setPurchase(''); setSale('');
    setShowForm(true);
  };

  const openEdit = (m: Material) => {
    setEditing(m);
    setName(m.name); setCode(m.code ?? ''); setUnit(m.unit);
    setPurchase(String(m.purchasePrice)); setSale(String(m.salePrice));
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!name.trim()) { Alert.alert('Greška', 'Naziv je obavezan.'); return; }
    if (!user?.utility_id) return;
    const p = parseFloat(purchase.replace(',', '.')) || 0;
    const s = parseFloat(sale.replace(',', '.')) || 0;
    setSaving(true);
    try {
      if (editing) {
        const upd = await updateMaterial(editing.id, {
          name: name.trim(), code: code.trim(), unit, purchase_price: p, sale_price: s,
        });
        setItems(prev => prev.map(x => x.id === upd.id ? upd : x));
      } else {
        const created = await createMaterial({
          utility_id: user.utility_id, name: name.trim(), code: code.trim() || undefined,
          unit, purchase_price: p, sale_price: s,
        });
        setItems(prev => [created, ...prev]);
      }
      setShowForm(false);
    } catch (e: any) {
      Alert.alert('Greška', e.message || 'Spremanje nije uspjelo.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeactivate = (m: Material) => {
    Alert.alert('Deaktivacija', `Deaktivirati artikal "${m.name}"?`, [
      { text: 'Otkaži', style: 'cancel' },
      {
        text: 'Deaktiviraj', style: 'destructive',
        onPress: async () => {
          try {
            await deactivateMaterial(m.id);
            setItems(prev => prev.map(x => x.id === m.id ? { ...x, is_active: false } : x));
          } catch (e: any) { Alert.alert('Greška', e.message); }
        },
      },
    ]);
  };

  const renderItem = ({ item }: { item: Material }) => (
    <Card style={[styles.row, !item.is_active && styles.rowInactive]}>
      <View style={{ flex: 1 }}>
        <Text style={styles.name}>
          {item.code ? `${item.code} · ` : ''}{item.name}
          {!item.is_active ? '  (neaktivan)' : ''}
        </Text>
        <Text style={styles.meta}>
          Jedinica: {item.unit}
          {canManageBilling ? `  ·  Prodajna: ${item.salePrice.toFixed(2)} BAM` : ''}
        </Text>
      </View>
      {canManageBilling && (
        <View style={styles.actions}>
          <TouchableOpacity onPress={() => openEdit(item)} hitSlop={8} style={styles.iconBtn}>
            <Edit2 size={18} color={Colors.primary} />
          </TouchableOpacity>
          {item.is_active && (
            <TouchableOpacity onPress={() => handleDeactivate(item)} hitSlop={8} style={styles.iconBtn}>
              <Trash2 size={18} color={Colors.error} />
            </TouchableOpacity>
          )}
        </View>
      )}
    </Card>
  );

  return (
    <SafeAreaView style={styles.safe}>
      <Header title="Artikli" showBack onLeftPress={() => router.back()} />

      {loading ? (
        <View style={styles.center}><ActivityIndicator size="large" color={Colors.primary} /></View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(i) => i.id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchData(); }} />}
          ListEmptyComponent={
            <EmptyState
              icon={<Package size={48} color={Colors.textLight} />}
              title="Nema artikala"
              message="Dodajte materijale i usluge u katalog za radne naloge."
            />
          }
        />
      )}

      {canManageBilling && (
        <TouchableOpacity style={styles.fab} onPress={openCreate} activeOpacity={0.8}>
          <Plus size={24} color="#fff" />
        </TouchableOpacity>
      )}

      <Modal visible={showForm} transparent animationType="slide" onRequestClose={() => setShowForm(false)}>
        <KeyboardAvoidingView style={styles.modalWrap} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{editing ? 'Uredi artikal' : 'Novi artikal'}</Text>
              <TouchableOpacity onPress={() => setShowForm(false)}><X size={24} color={Colors.text} /></TouchableOpacity>
            </View>
            <ScrollView keyboardShouldPersistTaps="handled">
              <Input label="Naziv *" value={name} onChangeText={setName} placeholder="npr. Vodomjer DN20" />
              <Input label="Šifra" value={code} onChangeText={setCode} placeholder="npr. ART-001" />

              <Text style={styles.fieldLabel}>Jedinica</Text>
              <View style={styles.unitRow}>
                {MATERIAL_UNITS.map(u => (
                  <TouchableOpacity
                    key={u}
                    style={[styles.unitChip, unit === u && styles.unitChipActive]}
                    onPress={() => setUnit(u)}
                  >
                    <Text style={[styles.unitText, unit === u && styles.unitTextActive]}>{u}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Input label="Nabavna cijena (BAM)" value={purchase} onChangeText={setPurchase}
                keyboardType="decimal-pad" placeholder="0.00" containerStyle={{ marginTop: 16 }} />
              <Input label="Prodajna cijena (BAM)" value={sale} onChangeText={setSale}
                keyboardType="decimal-pad" placeholder="0.00" />

              <Button title={editing ? 'Spremi' : 'Dodaj'} onPress={handleSave} isLoading={saving} style={{ marginTop: 8 }} />
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: '#f4f6f9' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list:   { padding: 16, paddingBottom: 90, flexGrow: 1 },

  row:         { flexDirection: 'row', alignItems: 'center', padding: 14, marginBottom: 10 },
  rowInactive: { opacity: 0.55 },
  name:        { fontSize: 14, fontWeight: '600', color: Colors.text },
  meta:        { fontSize: 12, color: Colors.textLight, marginTop: 3 },
  actions:     { flexDirection: 'row', gap: 12 },
  iconBtn:     { padding: 4 },

  fab: {
    position: 'absolute', right: 20, bottom: 24,
    width: 56, height: 56, borderRadius: 28, backgroundColor: Colors.primary,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 4, elevation: 5,
  },

  modalWrap:   { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modalCard:   { backgroundColor: '#fff', borderTopLeftRadius: 16, borderTopRightRadius: 16, padding: 20, maxHeight: '88%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalTitle:  { fontSize: 17, fontWeight: 'bold', color: Colors.text },

  fieldLabel:  { fontSize: 14, fontWeight: '500', color: Colors.text, marginBottom: 8 },
  unitRow:     { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  unitChip:    { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 18, borderWidth: 1, borderColor: Colors.border, backgroundColor: '#fff' },
  unitChipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  unitText:    { fontSize: 13, color: Colors.text },
  unitTextActive: { color: '#fff', fontWeight: '600' },
});
