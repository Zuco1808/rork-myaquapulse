import React, { useState, useCallback } from 'react';
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
  ActivityIndicator,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import {
  Building,
  Search,
  Plus,
  Edit2,
  Trash2,
  MapPin,
  Users,
  Filter,
} from 'lucide-react-native';
import { Header } from '@/components/layout/Header';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { useAuthStore } from '@/store/auth-store';
import { supabase } from '@/lib/supabase';
import Colors from '@/constants/colors';
import { WaterUtility } from '@/types/user';
import { captureError } from '@/lib/sentry';

/* ── pure filter helper ──────────────────────────── */
const filterUtilities = (source: WaterUtility[], q: string, status: string): WaterUtility[] => {
  let f = source;
  if (q) {
    const ql = q.toLowerCase();
    f = f.filter(u => u.name.toLowerCase().includes(ql) || (u.city ?? '').toLowerCase().includes(ql));
  }
  if (status === 'active')   f = f.filter(u => u.is_active);
  if (status === 'inactive') f = f.filter(u => !u.is_active);
  return f;
};

export default function CompaniesScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [utilities, setUtilities]   = useState<WaterUtility[]>([]);
  const [loading, setLoading]       = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [filterStatus, setFilterStatus] = useState('all');
  const [showFilters, setShowFilters] = useState(false);

  const filtered = filterUtilities(utilities, searchQuery, filterStatus);

  useFocusEffect(
    useCallback(() => {
      if (!user || !['super_admin', 'distributor_admin'].includes(user.role)) {
        router.replace('/(tabs)');
        return;
      }
      fetchUtilities();
    }, [user])
  );

  const fetchUtilities = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('water_utilities')
        .select('*')
        .order('name');

      if (error) throw error;
      setUtilities(data || []);
    } catch (err) {
      captureError(err, { screen: 'companies', action: 'fetchUtilities' });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchUtilities();
  };

  const handleSearch       = (text: string) => setSearchQuery(text);
  const handleFilterChange = (status: string) => setFilterStatus(status);

  const handleDelete = (id: string, name: string) => {
    Alert.alert(
      'Brisanje vodovoda',
      `Da li ste sigurni da želite obrisati "${name}"?`,
      [
        { text: 'Odustani', style: 'cancel' },
        {
          text: 'Obriši',
          style: 'destructive',
          onPress: async () => {
            const { error } = await supabase
              .from('water_utilities')
              .delete()
              .eq('id', id);
            if (!error) {
              setUtilities(prev => prev.filter(u => u.id !== id));
            } else {
              Alert.alert('Greška', error.message || 'Brisanje nije uspjelo.');
            }
          }
        }
      ]
    );
  };

  const handleToggleActive = async (id: string, current: boolean) => {
    const { error } = await supabase
      .from('water_utilities')
      .update({ is_active: !current })
      .eq('id', id);

    if (!error) {
      setUtilities(prev => prev.map(u => u.id === id ? { ...u, is_active: !current } : u));
    }
  };

  const renderCard = ({ item }: { item: WaterUtility }) => (
    <Card style={styles.card}>
      <TouchableOpacity
        style={styles.cardContent}
        onPress={() => router.push(`/companies/${item.id}` as any)}
        activeOpacity={0.7}
      >
        <View style={styles.cardHeader}>
          <View style={styles.cardInfo}>
            <Text style={styles.cardName}>{item.name}</Text>
            {item.city && (
              <View style={styles.locationRow}>
                <MapPin size={14} color={Colors.textLight} />
                <Text style={styles.locationText}>{item.city}</Text>
              </View>
            )}
          </View>
          <View style={[
            styles.statusBadge,
            { backgroundColor: item.is_active ? Colors.success : Colors.error }
          ]}>
            <Text style={styles.statusText}>
              {item.is_active ? 'Aktivan' : 'Neaktivan'}
            </Text>
          </View>
        </View>

        {item.pib && (
          <Text style={styles.pib}>PIB: {item.pib}</Text>
        )}
      </TouchableOpacity>

      <View style={styles.cardActions}>
        <Button
          title="Korisnici"
          variant="outline"
          size="small"
          leftIcon={<Users size={16} color={Colors.primary} />}
          onPress={() => router.push(`/users?utilityId=${item.id}` as any)}
        />

        <View style={{ flex: 1 }} />

        <TouchableOpacity
          style={styles.iconButton}
          onPress={() => handleToggleActive(item.id, item.is_active)}
        >
          <Text style={{ fontSize: 12, color: item.is_active ? Colors.error : Colors.success }}>
            {item.is_active ? 'Deaktiviraj' : 'Aktiviraj'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.iconButton}
          onPress={() => router.push(`/companies/edit/${item.id}` as any)}
        >
          <Edit2 size={20} color={Colors.primary} />
        </TouchableOpacity>

        {user?.role === 'super_admin' && (
          <TouchableOpacity
            style={styles.iconButton}
            onPress={() => handleDelete(item.id, item.name)}
          >
            <Trash2 size={20} color={Colors.error} />
          </TouchableOpacity>
        )}
      </View>
    </Card>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.container}>
          <Header
            title="Vodovodi"
            showBack
            onLeftPress={() => router.push('/(tabs)' as any)}
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
        title="Vodovodi"
        showBack
        onLeftPress={() => router.push('/(tabs)' as any)}
      />

      <View style={styles.searchContainer}>
        <View style={styles.searchInputContainer}>
          <Search size={20} color={Colors.textLight} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Pretraži vodovode..."
            value={searchQuery}
            onChangeText={handleSearch}
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
            {['all', 'active', 'inactive'].map(s => (
              <TouchableOpacity
                key={s}
                style={[styles.filterOption, filterStatus === s && styles.filterOptionActive]}
                onPress={() => handleFilterChange(s)}
              >
                <Text style={[styles.filterOptionText, filterStatus === s && styles.filterOptionTextActive]}>
                  {s === 'all' ? 'Svi' : s === 'active' ? 'Aktivni' : 'Neaktivni'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      <FlatList
        data={filtered}
        renderItem={renderCard}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContainer}
        ListEmptyComponent={
          <EmptyState
            title="Nema vodovoda"
            message="Trenutno nema vodovoda u sistemu."
            icon={<Building size={48} color={Colors.textLight} />}
            actionLabel="Dodaj vodovod"
            onAction={() => router.push('/companies/add' as any)}
          />
        }
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      />

      {['super_admin', 'distributor_admin'].includes(user?.role || '') && (
        <TouchableOpacity
          style={styles.fab}
          onPress={() => router.push('/companies/add' as any)}
          activeOpacity={0.8}
        >
          <Plus size={24} color="#fff" />
        </TouchableOpacity>
      )}
    </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea:  { flex: 1, backgroundColor: '#fff' },
  container: { flex: 1, backgroundColor: '#fff' },
  center:    { flex: 1, alignItems: 'center', justifyContent: 'center' },
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
  searchIcon: { marginRight: 8 },
  searchInput: { flex: 1, height: 40, color: Colors.text },
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
  filtersTitle: { fontSize: 14, fontWeight: 'bold', color: Colors.text, marginBottom: 8 },
  filterOptions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  filterOption: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: Colors.highlight,
  },
  filterOptionActive: { backgroundColor: Colors.primary },
  filterOptionText: { fontSize: 12, color: Colors.text },
  filterOptionTextActive: { color: '#fff' },
  listContainer: { padding: 16, paddingBottom: Platform.OS === 'android' ? 100 : 80 },
  card: { marginBottom: 16 },
  cardContent: { padding: 16 },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  cardInfo: { flex: 1 },
  cardName: { fontSize: 18, fontWeight: 'bold', color: Colors.text, marginBottom: 4 },
  locationRow: { flexDirection: 'row', alignItems: 'center' },
  locationText: { fontSize: 14, color: Colors.textLight, marginLeft: 4 },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: { fontSize: 12, color: '#fff', fontWeight: '500' },
  pib: { fontSize: 13, color: Colors.textLight, marginTop: 4 },
  cardActions: {
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    padding: 12,
  },
  iconButton: { padding: 8, marginLeft: 8 },
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