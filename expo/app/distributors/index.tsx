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
  Alert,
  TextInput,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import {
  Building2,
  Plus,
  Search,
  Mail,
  Phone,
  MapPin,
  ChevronRight,
  CheckCircle,
  XCircle,
} from 'lucide-react-native';
import { Header } from '@/components/layout/Header';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { useAuthStore } from '@/store/auth-store';
import {
  getDistributors,
  updateDistributor,
} from '@/lib/api/distributors';
import { Distributor } from '@/types/user';
import Colors from '@/constants/colors';

export default function DistributorsScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [distributors, setDistributors] = useState<Distributor[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = async () => {
    try {
      const data = await getDistributors();
      setDistributors(data);
    } catch (err) {
      console.error('Greška pri učitavanju distributera:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(useCallback(() => { fetchData(); }, []));

  const onRefresh = () => { setRefreshing(true); fetchData(); };

  const handleToggleActive = (item: Distributor) => {
    Alert.alert(
      item.is_active ? 'Deaktivacija' : 'Aktivacija',
      `Da li želite ${item.is_active ? 'deaktivirati' : 'aktivirati'} distributera "${item.name}"?`,
      [
        { text: 'Otkaži', style: 'cancel' },
        {
          text: 'Potvrdi',
          onPress: async () => {
            try {
              await updateDistributor(item.id, { is_active: !item.is_active });
              fetchData();
            } catch {
              Alert.alert('Greška', 'Promjena statusa nije uspjela.');
            }
          },
        },
      ],
    );
  };

  const filtered = distributors.filter((d) =>
    !search ||
    d.name.toLowerCase().includes(search.toLowerCase()) ||
    (d.contact_email || '').toLowerCase().includes(search.toLowerCase()),
  );

  const renderCard = ({ item }: { item: Distributor }) => (
    <Card style={styles.card}>
      {/* Header */}
      <TouchableOpacity
        style={styles.cardContent}
        onPress={() => router.push(`/distributors/${item.id}` as any)}
        activeOpacity={0.8}
      >
        <View style={styles.cardTop}>
          <View style={styles.iconBox}>
            <Building2 size={22} color={Colors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.cardName}>{item.name}</Text>
            <View style={[styles.activeBadge, { backgroundColor: item.is_active ? '#E8F5E9' : '#FFEBEE' }]}>
              {item.is_active
                ? <CheckCircle size={11} color="#4CAF50" />
                : <XCircle size={11} color={Colors.error} />}
              <Text style={[styles.activeBadgeText, { color: item.is_active ? '#4CAF50' : Colors.error }]}>
                {item.is_active ? 'Aktivan' : 'Neaktivan'}
              </Text>
            </View>
          </View>
          <ChevronRight size={20} color={Colors.textLight} />
        </View>

        {/* Contact info */}
        {item.contact_email && (
          <View style={styles.detailRow}>
            <Mail size={13} color={Colors.textLight} />
            <Text style={styles.detailText}>{item.contact_email}</Text>
          </View>
        )}
        {item.contact_phone && (
          <View style={styles.detailRow}>
            <Phone size={13} color={Colors.textLight} />
            <Text style={styles.detailText}>{item.contact_phone}</Text>
          </View>
        )}
        {item.address && (
          <View style={styles.detailRow}>
            <MapPin size={13} color={Colors.textLight} />
            <Text style={styles.detailText}>{item.address}</Text>
          </View>
        )}
      </TouchableOpacity>

      {/* Actions */}
      <View style={styles.cardActions}>
        <TouchableOpacity
          style={styles.actionBtn}
          onPress={() => router.push(`/distributors/${item.id}` as any)}
        >
          <Text style={styles.actionBtnText}>Detalji</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionBtn, { borderLeftWidth: 1, borderLeftColor: Colors.border }]}
          onPress={() => router.push(`/distributors/edit/${item.id}` as any)}
        >
          <Text style={styles.actionBtnText}>Uredi</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.actionBtn,
            { borderLeftWidth: 1, borderLeftColor: Colors.border },
            item.is_active && { backgroundColor: '#FFF3F3' },
          ]}
          onPress={() => handleToggleActive(item)}
        >
          <Text
            style={[
              styles.actionBtnText,
              { color: item.is_active ? Colors.error : Colors.success },
            ]}
          >
            {item.is_active ? 'Deaktiviraj' : 'Aktiviraj'}
          </Text>
        </TouchableOpacity>
      </View>
    </Card>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <Header title="Distributeri" showBack onLeftPress={() => router.back()} />
        <View style={styles.center}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <Header title="Distributeri" showBack onLeftPress={() => router.back()} />

      {/* Search */}
      <View style={styles.searchBar}>
        <Search size={18} color={Colors.textLight} />
        <TextInput
          style={styles.searchInput}
          placeholder="Pretraži distributere..."
          value={search}
          onChangeText={setSearch}
        />
      </View>

      {/* Summary */}
      <View style={styles.summary}>
        <Text style={styles.summaryText}>
          {filtered.length} / {distributors.length} distributera ·{' '}
          {distributors.filter((d) => d.is_active).length} aktivnih
        </Text>
      </View>

      <FlatList
        data={filtered}
        renderItem={renderCard}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <EmptyState
            title="Nema distributera"
            message="Dodajte prvog distributera pomoću dugmeta +."
            icon={<Building2 size={48} color={Colors.textLight} />}
          />
        }
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      />

      {/* FAB */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => router.push('/distributors/add' as any)}
        activeOpacity={0.85}
      >
        <Plus size={24} color="#fff" />
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#fff' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: Colors.highlight,
    borderRadius: 10,
    gap: 8,
  },
  searchInput: { flex: 1, fontSize: 14, color: Colors.text },

  summary: { paddingHorizontal: 16, paddingVertical: 6 },
  summaryText: { fontSize: 12, color: Colors.textLight },

  list: {
    padding: 16,
    paddingBottom: Platform.OS === 'android' ? 100 : 80,
  },
  card: { marginBottom: 14 },

  cardContent: { padding: 14 },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 10,
    gap: 10,
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: Colors.primary + '18',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardName: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 4,
  },
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

  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
    gap: 6,
  },
  detailText: { fontSize: 13, color: Colors.textLight },

  cardActions: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  actionBtn: {
    flex: 1,
    paddingVertical: 11,
    alignItems: 'center',
  },
  actionBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.primary,
  },

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
});
