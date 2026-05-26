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
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import {
  MapPin,
  Search,
  Plus,
  Filter,
  ChevronRight,
  Building,
  Droplet,
  Users,
  Edit,
  Trash2,
} from 'lucide-react-native';
import { Header } from '@/components/layout/Header';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { Badge } from '@/components/ui/Badge';
import { useAuthStore } from '@/store/auth-store';
import Colors from '@/constants/colors';
import { Location } from '@/types/user';
import { getLocations, deleteLocation } from '@/lib/api/locations';

/* ── pure filter helper ─────────────────────────────── */
const filterData = (data: Location[], query: string, company: string) => {
  let result = data;
  if (query) {
    const q = query.toLowerCase();
    result = result.filter(
      (l) =>
        l.name.toLowerCase().includes(q) ||
        (l.address && l.address.toLowerCase().includes(q)) ||
        (l.city && l.city.toLowerCase().includes(q)),
    );
  }
  if (company !== 'all') {
    result = result.filter((l) => l.companyId === company);
  }
  return result;
};

/* ── component ─────────────────────────────────────── */
export default function LocationsScreen() {
  const router  = useRouter();
  const { user } = useAuthStore();

  const [locations, setLocations]   = useState<Location[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing]   = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [filterCompany, setFilterCompany] = useState('all');
  const [loading, setLoading]         = useState(true);

  /* derived filtered list — no separate filteredLocations state */
  const filteredLocations = filterData(locations, searchQuery, filterCompany);

  /* ── fetch ──────────────────────────────────────── */
  const fetchLocations = async () => {
    try {
      const data = await getLocations();
      setLocations(data ?? []);
    } catch {
      Alert.alert('Greška', 'Greška pri učitavanju lokacija.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(useCallback(() => { fetchLocations(); }, []));

  const onRefresh = () => { setRefreshing(true); fetchLocations(); };

  /* ── delete ─────────────────────────────────────── */
  const handleDeleteLocation = (id: string) => {
    Alert.alert(
      'Brisanje lokacije',
      'Da li ste sigurni da želite obrisati ovu lokaciju?',
      [
        { text: 'Otkaži', style: 'cancel' },
        {
          text: 'Obriši',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteLocation(id);
              setLocations((prev) => prev.filter((l) => l.id !== id));
              Alert.alert('Uspjeh', 'Lokacija je uspješno obrisana.');
            } catch (e: any) {
              Alert.alert('Greška', e?.message || 'Brisanje nije uspjelo.');
            }
          },
        },
      ],
    );
  };

  /* ── handlers ───────────────────────────────────── */
  const handleAddLocation      = () => router.push('/locations/add');
  const handleEditLocation     = (id: string) => router.push(`/locations/edit/${id}` as any);
  const handleViewLocationDetails = (locationId: string) => {
    if (canManageLocations) router.push(`/locations/edit/${locationId}` as any);
  };

  const canManageLocations = user?.role === 'super_admin' || user?.role === 'utility_admin';

  /* ── card ───────────────────────────────────────── */
  const renderLocationCard = ({ item }: { item: Location }) => (
    <Card style={styles.locationCard}>
      <TouchableOpacity
        style={styles.cardContent}
        onPress={() => handleViewLocationDetails(item.id)}
        activeOpacity={0.7}
      >
        <View style={styles.locationHeader}>
          <View style={styles.locationInfo}>
            <Text style={styles.locationName}>{item.name}</Text>
            {item.companyId ? (
              <Badge label={item.companyId} color={Colors.primary} />
            ) : null}
          </View>
        </View>

        <View style={styles.locationDetails}>
          {item.address ? (
            <View style={styles.detailItem}>
              <MapPin size={16} color={Colors.textLight} />
              <Text style={styles.detailText}>
                {item.address}{item.city ? `, ${item.city}` : ''}
              </Text>
            </View>
          ) : null}
          {item.buildingCount != null ? (
            <View style={styles.detailItem}>
              <Building size={16} color={Colors.textLight} />
              <Text style={styles.detailText}>{item.buildingCount} zgrada</Text>
            </View>
          ) : null}
          {item.meterCount != null ? (
            <View style={styles.detailItem}>
              <Droplet size={16} color={Colors.textLight} />
              <Text style={styles.detailText}>{item.meterCount} vodomjera</Text>
            </View>
          ) : null}
          {item.userCount != null ? (
            <View style={styles.detailItem}>
              <Users size={16} color={Colors.textLight} />
              <Text style={styles.detailText}>{item.userCount} korisnika</Text>
            </View>
          ) : null}
        </View>
      </TouchableOpacity>

      {canManageLocations && (
        <View style={styles.cardActions}>
          <Button
            title="Uredi"
            variant="outline"
            size="small"
            leftIcon={<Edit size={16} color={Colors.primary} />}
            onPress={() => handleEditLocation(item.id)}
            style={styles.actionButton}
          />
          <Button
            title="Obriši"
            variant="outline"
            size="small"
            leftIcon={<Trash2 size={16} color={Colors.error} />}
            onPress={() => handleDeleteLocation(item.id)}
            style={[styles.actionButton, styles.deleteButton]}
          />
          <TouchableOpacity
            style={styles.detailsButton}
            onPress={() => handleViewLocationDetails(item.id)}
          >
            <ChevronRight size={20} color={Colors.primary} />
          </TouchableOpacity>
        </View>
      )}
    </Card>
  );

  /* ── render ─────────────────────────────────────── */
  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <Header
          title="Lokacije"
          showBack
          onLeftPress={() => router.back()}
        />

        {/* Search + Filter row */}
        <View style={styles.searchContainer}>
          <View style={styles.searchInputContainer}>
            <Search size={20} color={Colors.textLight} style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Pretraži lokacije..."
              value={searchQuery}
              onChangeText={setSearchQuery}
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
            <Text style={styles.filtersTitle}>Filter:</Text>
            <View style={styles.filterOptions}>
              <TouchableOpacity
                style={[styles.filterOption, filterCompany === 'all' && styles.filterOptionActive]}
                onPress={() => setFilterCompany('all')}
              >
                <Text style={[styles.filterOptionText, filterCompany === 'all' && styles.filterOptionTextActive]}>
                  Sve
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        <FlatList
          data={filteredLocations}
          renderItem={renderLocationCard}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContainer}
          ListEmptyComponent={
            <EmptyState
              title="Nema lokacija"
              message="Trenutno nema lokacija koje odgovaraju vašoj pretrazi."
              icon={<MapPin size={48} color={Colors.textLight} />}
              actionLabel={canManageLocations ? 'Dodaj novu lokaciju' : undefined}
              onAction={canManageLocations ? handleAddLocation : undefined}
            />
          }
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        />

        {canManageLocations && (
          <TouchableOpacity
            style={styles.fab}
            onPress={handleAddLocation}
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
  safeArea:   { flex: 1, backgroundColor: '#fff' },
  container:  { flex: 1, backgroundColor: '#fff' },

  searchContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  searchInputContainer: {
    flex: 1, flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.highlight, borderRadius: 8, paddingHorizontal: 12,
  },
  searchIcon:  { marginRight: 8 },
  searchInput: { flex: 1, height: 40, color: Colors.text },
  filterButton: {
    marginLeft: 12, width: 40, height: 40, borderRadius: 8,
    backgroundColor: Colors.highlight, alignItems: 'center', justifyContent: 'center',
  },

  filtersContainer: {
    padding: 16, borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  filtersTitle: { fontSize: 14, fontWeight: 'bold', color: Colors.text, marginBottom: 8 },
  filterOptions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  filterOption: {
    paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: 16, backgroundColor: Colors.highlight,
  },
  filterOptionActive:     { backgroundColor: Colors.primary },
  filterOptionText:       { fontSize: 12, color: Colors.text },
  filterOptionTextActive: { color: '#fff' },

  listContainer: {
    padding: 16,
    paddingBottom: Platform.OS === 'android' ? 100 : 80,
  },
  locationCard: { marginBottom: 16 },
  cardContent:  { padding: 16 },

  locationHeader: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'flex-start', marginBottom: 12,
  },
  locationInfo: { flex: 1 },
  locationName: {
    fontSize: 16, fontWeight: 'bold', color: Colors.text, marginBottom: 4,
  },

  locationDetails: { marginBottom: 8 },
  detailItem: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  detailText:  { fontSize: 14, color: Colors.text, marginLeft: 8 },

  cardActions: {
    flexDirection: 'row', borderTopWidth: 1, borderTopColor: Colors.border, padding: 12,
  },
  actionButton:  { flex: 1, marginRight: 8 },
  deleteButton:  { borderColor: Colors.error },
  detailsButton: {
    width: 40, height: 40, borderRadius: 8,
    backgroundColor: Colors.highlight, alignItems: 'center', justifyContent: 'center',
  },

  fab: {
    position: 'absolute',
    bottom: Platform.OS === 'android' ? 40 : 24,
    right: 24,
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: Colors.primary,
    alignItems: 'center', justifyContent: 'center',
    elevation: 4,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25, shadowRadius: 3.84,
  },
});
