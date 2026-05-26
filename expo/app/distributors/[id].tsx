import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
} from 'react-native';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import {
  Building2,
  Mail,
  Phone,
  MapPin,
  Edit,
  CheckCircle,
  XCircle,
  Plus,
  Link,
  Unlink,
  X,
} from 'lucide-react-native';
import { Header } from '@/components/layout/Header';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { useAuthStore } from '@/store/auth-store';
import {
  getDistributorById,
  getDistributorUtilities,
  getUnassignedUtilities,
  updateDistributor,
  assignUtilityToDistributor,
} from '@/lib/api/distributors';
import { Distributor } from '@/types/user';
import Colors from '@/constants/colors';

export default function DistributorDetailScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [distributor, setDistributor] = useState<Distributor | null>(null);
  const [utilities, setUtilities] = useState<any[]>([]);
  const [unassigned, setUnassigned] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [assignVisible, setAssignVisible] = useState(false);
  const [assigning, setAssigning] = useState(false);

  const fetchData = async () => {
    if (!id) return;
    try {
      const [dist, utils] = await Promise.all([
        getDistributorById(id),
        getDistributorUtilities(id),
      ]);
      setDistributor(dist);
      setUtilities(utils);
    } catch (err) {
      console.error('Greška:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadUnassigned = async () => {
    try {
      const data = await getUnassignedUtilities();
      setUnassigned(data);
    } catch {}
  };

  useFocusEffect(useCallback(() => { fetchData(); }, [id]));

  const openAssignModal = async () => {
    await loadUnassigned();
    setAssignVisible(true);
  };

  const handleAssign = async (utilityId: string) => {
    setAssigning(true);
    try {
      await assignUtilityToDistributor(utilityId, id!);
      setAssignVisible(false);
      fetchData();
    } catch (e) {
      Alert.alert('Greška', 'Dodjela vodovoda nije uspjela.');
    } finally {
      setAssigning(false);
    }
  };

  const handleUnassign = (utility: any) => {
    Alert.alert(
      'Ukloni vodovod',
      `Da li želite ukloniti "${utility.name}" od ovog distributera?`,
      [
        { text: 'Otkaži', style: 'cancel' },
        {
          text: 'Ukloni',
          style: 'destructive',
          onPress: async () => {
            try {
              await assignUtilityToDistributor(utility.id, null);
              fetchData();
            } catch {
              Alert.alert('Greška', 'Uklanjanje nije uspjelo.');
            }
          },
        },
      ],
    );
  };

  const handleToggleActive = () => {
    if (!distributor) return;
    Alert.alert(
      distributor.is_active ? 'Deaktivacija' : 'Aktivacija',
      `Da li želite ${distributor.is_active ? 'deaktivirati' : 'aktivirati'} ovog distributera?`,
      [
        { text: 'Otkaži', style: 'cancel' },
        {
          text: 'Potvrdi',
          onPress: async () => {
            try {
              await updateDistributor(distributor.id, { is_active: !distributor.is_active });
              fetchData();
            } catch {
              Alert.alert('Greška', 'Promjena statusa nije uspjela.');
            }
          },
        },
      ],
    );
  };

  if (loading || !distributor) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <Header title="Detalji distributera" showBack onLeftPress={() => router.back()} />
        <View style={styles.center}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <Header
        title={distributor.name}
        showBack
        onLeftPress={() => router.back()}
      />

      <ScrollView contentContainerStyle={styles.content}>
        {/* Info card */}
        <Card style={styles.section}>
          <View style={styles.infoHeader}>
            <View style={styles.iconBox}>
              <Building2 size={28} color={Colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.name}>{distributor.name}</Text>
              <View
                style={[
                  styles.activeBadge,
                  { backgroundColor: distributor.is_active ? '#E8F5E9' : '#FFEBEE' },
                ]}
              >
                {distributor.is_active
                  ? <CheckCircle size={11} color="#4CAF50" />
                  : <XCircle size={11} color={Colors.error} />}
                <Text
                  style={[
                    styles.activeBadgeText,
                    { color: distributor.is_active ? '#4CAF50' : Colors.error },
                  ]}
                >
                  {distributor.is_active ? 'Aktivan' : 'Neaktivan'}
                </Text>
              </View>
            </View>
          </View>

          {distributor.contact_email && (
            <InfoRow icon={<Mail size={15} color={Colors.primary} />} value={distributor.contact_email} />
          )}
          {distributor.contact_phone && (
            <InfoRow icon={<Phone size={15} color={Colors.primary} />} value={distributor.contact_phone} />
          )}
          {distributor.address && (
            <InfoRow icon={<MapPin size={15} color={Colors.primary} />} value={distributor.address} />
          )}

          {/* Action buttons */}
          <View style={styles.btnRow}>
            <Button
              title="Uredi"
              leftIcon={<Edit size={15} color="#fff" />}
              size="small"
              onPress={() => router.push(`/distributors/edit/${distributor.id}` as any)}
              style={styles.btn}
            />
            <Button
              title={distributor.is_active ? 'Deaktiviraj' : 'Aktiviraj'}
              variant="outline"
              size="small"
              onPress={handleToggleActive}
              style={[
                styles.btn,
                distributor.is_active && { borderColor: Colors.error },
              ]}
            />
          </View>
        </Card>

        {/* Utilities */}
        <Card style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>
              Vodovodi ({utilities.length})
            </Text>
            <TouchableOpacity
              style={styles.addUtilityBtn}
              onPress={openAssignModal}
            >
              <Link size={16} color={Colors.primary} />
              <Text style={styles.addUtilityText}>Dodijeli</Text>
            </TouchableOpacity>
          </View>

          {utilities.length === 0 ? (
            <EmptyState
              title="Nema vodovoda"
              message="Dodijelite vodovod ovom distributeru."
              icon={<Building2 size={36} color={Colors.textLight} />}
            />
          ) : (
            utilities.map((u) => (
              <View key={u.id} style={styles.utilityRow}>
                <View style={styles.utilityLeft}>
                  <View
                    style={[
                      styles.utilityDot,
                      { backgroundColor: u.is_active ? '#4CAF50' : '#9E9E9E' },
                    ]}
                  />
                  <View>
                    <Text style={styles.utilityName}>{u.name}</Text>
                    {u.city && (
                      <Text style={styles.utilityCity}>{u.city}</Text>
                    )}
                  </View>
                </View>
                <TouchableOpacity
                  onPress={() => handleUnassign(u)}
                  style={styles.unlinkBtn}
                >
                  <Unlink size={16} color={Colors.error} />
                </TouchableOpacity>
              </View>
            ))
          )}
        </Card>
      </ScrollView>

      {/* Assign utility modal */}
      <Modal
        visible={assignVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setAssignVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Dodijeli vodovod</Text>
              <TouchableOpacity onPress={() => setAssignVisible(false)}>
                <X size={22} color={Colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              {unassigned.length === 0 ? (
                <Text style={styles.noUnassigned}>
                  Nema slobodnih vodovoda za dodjelu.
                </Text>
              ) : (
                unassigned.map((u) => (
                  <TouchableOpacity
                    key={u.id}
                    style={styles.unassignedItem}
                    onPress={() => handleAssign(u.id)}
                    disabled={assigning}
                  >
                    <View>
                      <Text style={styles.unassignedName}>{u.name}</Text>
                      {u.city && (
                        <Text style={styles.unassignedCity}>{u.city}</Text>
                      )}
                    </View>
                    <Plus size={18} color={Colors.primary} />
                  </TouchableOpacity>
                ))
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function InfoRow({ icon, value }: { icon: React.ReactNode; value: string }) {
  return (
    <View style={infoStyles.row}>
      {icon}
      <Text style={infoStyles.text}>{value}</Text>
    </View>
  );
}
const infoStyles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  text: { fontSize: 14, color: Colors.text },
});

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#f4f6f9' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: { padding: 16, paddingBottom: 40 },

  section: { padding: 16, marginBottom: 14 },

  infoHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 14,
    gap: 12,
  },
  iconBox: {
    width: 50,
    height: 50,
    borderRadius: 12,
    backgroundColor: Colors.primary + '18',
    alignItems: 'center',
    justifyContent: 'center',
  },
  name: { fontSize: 18, fontWeight: '700', color: Colors.text, marginBottom: 5 },
  activeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 10,
    gap: 3,
  },
  activeBadgeText: { fontSize: 11, fontWeight: '600' },

  btnRow: { flexDirection: 'row', gap: 10, marginTop: 14 },
  btn: { flex: 1 },

  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: Colors.text },
  addUtilityBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: Colors.primary + '15',
  },
  addUtilityText: { fontSize: 12, fontWeight: '600', color: Colors.primary },

  utilityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  utilityLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  utilityDot: { width: 8, height: 8, borderRadius: 4 },
  utilityName: { fontSize: 14, fontWeight: '600', color: Colors.text },
  utilityCity: { fontSize: 12, color: Colors.textLight },
  unlinkBtn: {
    padding: 6,
    borderRadius: 6,
    backgroundColor: '#FFEBEE',
  },

  /* Modal */
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  modalBox: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    maxHeight: '60%',
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
  noUnassigned: {
    fontSize: 14,
    color: Colors.textLight,
    textAlign: 'center',
    paddingVertical: 20,
  },
  unassignedItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  unassignedName: { fontSize: 15, fontWeight: '600', color: Colors.text },
  unassignedCity: { fontSize: 12, color: Colors.textLight, marginTop: 1 },
});
