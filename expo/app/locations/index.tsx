import React, { useState, useEffect, useCallback } from 'react';
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
import { useRouter } from 'expo-router';
import {
  MapPin,
  Search,
  Plus,
  Filter,
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
import { Drawer } from '@/components/layout/Drawer';
import { useAuthStore } from '@/store/auth-store';
import { useCompanies } from '@/lib/hooks/useCompanies';
import Colors from '@/constants/colors';
import {
  getLocationsWithStats,
  deleteLocation,
  type LocationWithStats,
} from '@/lib/api/locations';

export default function LocationsScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { companies } = useCompanies();

  const [locations, setLocations] = useState<LocationWithStats[]>([]);
  const [filteredLocations, setFilteredLocations] = useState<LocationWithStats[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [filterCompany, setFilterCompany] = useState('all');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const fetchLocations = useCallback(async () => {
    try {
      setError(null);
      const data = await getLocationsWithStats();
      setLocations(data);
    } catch (err) {
      console.error('Greška pri učitavanju lokacija:', err);
      setError('Greška pri učitavanju lokacija');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (!user) {
      router.replace('/login');
      return;
    }
    fetchLocations();
  }, [user, router, fetchLocations]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchLocations();
  };

  const applyFilters = useCallback(() => {
    let filtered = [...locations];

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (location) =>
          location.name.toLowerCase().includes(query) ||
          (location.address && location.address.toLowerCase().includes(query)) ||
          (location.city && location.city.toLowerCase().includes(query)),
      );
    }

    if (filterCompany !== 'all') {
      filtered = filtered.filter((location) => location.companyId === filterCompany);
    }

    setFilteredLocations(filtered);
  }, [locations, searchQuery, filterCompany]);

  useEffect(() => {
    applyFilters();
  }, [applyFilters]);

  const handleAddLocation = () => {
    router.push('/locations/add');
  };

  const handleEditLocation = (id: string) => {
    router.push(`/locations/edit/${id}`);
  };

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
            setDeletingId(id);
            try {
              await deleteLocation(id);
              setLocations((prev) => prev.filter((location) => location.id !== id));
              Alert.alert('Uspjeh', 'Lokacija je uspješno obrisana.');
            } catch (err) {
              console.error('Greška pri brisanju lokacije:', err);
              Alert.alert(
                'Greška',
                'Nije moguće obrisati lokaciju. Provjerite da nema povezanih vodomjera.',
              );
            } finally {
              setDeletingId(null);
            }
          },
        },
      ],
    );
  };

  const getCompanyName = (companyId: string) => {
    if (!companyId) return 'Bez kompanije';
    return companies.find((c) => c.id === companyId)?.name || 'Nepoznata kompanija';
  };

  const canManageLocations = user?.role === 'superadmin' || user?.role === 'admin';

  const renderLocationCard = ({ item }: { item: LocationWithStats }) => (
    <Card style={styles.locationCard}>
      <View style={styles.cardContent}>
        <View style={styles.locationHeader}>
          <View style={styles.locationInfo}>
            <Text style={styles.locationName}>{item.name}</Text>
            <Badge label={getCompanyName(item.companyId)} color={Colors.primary} />
          </View>
        </View>

        <View style={styles.locationDetails}>
          <View style={styles.detailItem}>
            <MapPin size={16} color={Colors.textLight} />
            <Text style={styles.detailText}>
              {item.address || 'Adresa nije dostupna'}
              {item.city ? `, ${item.city}` : ''}
            </Text>
          </View>

          <View style={styles.detailItem}>
            <Building size={16} color={Colors.textLight} />
            <Text style={styles.detailText}>{item.buildingCount} podlokacija</Text>
          </View>

          <View style={styles.detailItem}>
            <Droplet size={16} color={Colors.textLight} />
            <Text style={styles.detailText}>{item.meterCount} vodomjera</Text>
          </View>

          <View style={styles.detailItem}>
            <Users size={16} color={Colors.textLight} />
            <Text style={styles.detailText}>{item.userCount} korisnika</Text>
          </View>
        </View>
      </View>

      {canManageLocations && (
        <View style={styles.cardActions}>
          <Button
            title="Uredi"
            variant="outline"
            size="small"
            leftIcon={<Edit size={16} color={Colors.primary} />}
            onPress={() => handleEditLocation(item.id)}
            style={styles.actionButton}
            disabled={deletingId === item.id}
          />

          <Button
            title="Obriši"
            variant="outline"
            size="small"
            leftIcon={<Trash2 size={16} color={Colors.error} />}
            onPress={() => handleDeleteLocation(item.id)}
            style={[styles.actionButton, styles.deleteButton]}
            isLoading={deletingId === item.id}
            disabled={deletingId === item.id}
          />
        </View>
      )}
    </Card>
  );

  const renderEmptyState = () => {
    if (error) {
      return (
        <EmptyState
          title="Greška"
          message={error}
          icon={<MapPin size={48} color={Colors.error} />}
          actionLabel="Pokušaj ponovo"
          onAction={fetchLocations}
        />
      );
    }
    return (
      <EmptyState
        title="Nema lokacija"
        message="Trenutno nema lokacija koje odgovaraju vašoj pretrazi."
        icon={<MapPin size={48} color={Colors.textLight} />}
        actionLabel={canManageLocations ? 'Dodaj novu lokaciju' : undefined}
        onAction={canManageLocations ? handleAddLocation : undefined}
      />
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <Header
          title="Lokacije"
          showBack
          showMenu
          onLeftPress={() => setIsDrawerOpen(true)}
        />

        <Drawer isOpen={isDrawerOpen} onClose={() => setIsDrawerOpen(false)} />

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
            <Text style={styles.filtersTitle}>Kompanija:</Text>
            <View style={styles.filterOptions}>
              <TouchableOpacity
                style={[
                  styles.filterOption,
                  filterCompany === 'all' && styles.filterOptionActive,
                ]}
                onPress={() => setFilterCompany('all')}
              >
                <Text
                  style={[
                    styles.filterOptionText,
                    filterCompany === 'all' && styles.filterOptionTextActive,
                  ]}
                >
                  Sve
                </Text>
              </TouchableOpacity>

              {companies.map((company) => (
                <TouchableOpacity
                  key={company.id}
                  style={[
                    styles.filterOption,
                    filterCompany === company.id && styles.filterOptionActive,
                  ]}
                  onPress={() => setFilterCompany(company.id)}
                >
                  <Text
                    style={[
                      styles.filterOptionText,
                      filterCompany === company.id && styles.filterOptionTextActive,
                    ]}
                  >
                    {company.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={Colors.primary} />
            <Text style={styles.loadingText}>Učitavanje lokacija...</Text>
          </View>
        ) : (
          <FlatList
            data={filteredLocations}
            renderItem={renderLocationCard}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContainer}
            ListEmptyComponent={renderEmptyState}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
          />
        )}

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
  safeArea: {
    flex: 1,
    backgroundColor: '#fff',
  },
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
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
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: 40,
    color: Colors.text,
  },
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
  filtersTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 8,
  },
  filterOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  filterOption: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: Colors.highlight,
  },
  filterOptionActive: {
    backgroundColor: Colors.primary,
  },
  filterOptionText: {
    fontSize: 12,
    color: Colors.text,
  },
  filterOptionTextActive: {
    color: '#fff',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: Colors.textLight,
  },
  listContainer: {
    padding: 16,
    paddingBottom: Platform.OS === 'android' ? 100 : 80,
  },
  locationCard: {
    marginBottom: 16,
  },
  cardContent: {
    padding: 16,
  },
  locationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  locationInfo: {
    flex: 1,
  },
  locationName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 4,
  },
  locationDetails: {
    marginBottom: 8,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  detailText: {
    fontSize: 14,
    color: Colors.text,
    marginLeft: 8,
  },
  cardActions: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    padding: 12,
  },
  actionButton: {
    flex: 1,
    marginRight: 8,
  },
  deleteButton: {
    borderColor: Colors.error,
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
