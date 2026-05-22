import React, { useState, useEffect } from 'react';
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
  Platform
} from 'react-native';
import { useRouter } from 'expo-router';
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
  Menu
} from 'lucide-react-native';
import { Header } from '@/components/layout/Header';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { Badge } from '@/components/ui/Badge';
import { Drawer } from '@/components/layout/Drawer';
import { useAuthStore } from '@/store/auth-store';
import Colors from '@/constants/colors';
import { Location } from '@/types/location';
import { getLocations, deleteLocation } from '@/lib/api/locations';

export default function LocationsScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  
  // Locations data
  const [locations, setLocations] = useState<Location[]>([]);
  const [filteredLocations, setFilteredLocations] = useState<Location[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [filterCompany, setFilterCompany] = useState('all');
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchLocations = async () => {
    try {
      setError(null);
      const data = await getLocations();
      setLocations(data);
      setFilteredLocations(data);
    } catch (err) {
      setError('Greska pri ucitavanju lokacija');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchLocations();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchLocations();
  };

  // Drawer state
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  
  // Check if user has permission to access this screen
  useEffect(() => {
    if (!user) {
      router.replace('/login');
    }
  }, [user, router]);
  
  
  const applyFilters = () => {
    let filtered = [...locations];
    
    // Apply search query
    if (searchQuery) {
      filtered = filtered.filter(location => 
        location.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (location.address && location.address.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (location.city && location.city.toLowerCase().includes(searchQuery.toLowerCase()))
      );
    }
    
    // Apply company filter
    if (filterCompany !== 'all') {
      filtered = filtered.filter(location => location.companyId === filterCompany);
    }
    
    setFilteredLocations(filtered);
  };
  
  useEffect(() => {
    applyFilters();
  }, [searchQuery, filterCompany]);
  
  const handleSearch = (text: string) => {
    setSearchQuery(text);
  };
  
  const handleFilterChange = (companyId: string) => {
    setFilterCompany(companyId);
  };
  
  const handleAddLocation = () => {
    router.push('/locations/add');
  };
  
  const handleEditLocation = (id: string) => {
    router.push(`/locations/edit/${id}`);
  };
  
  const handleDeleteLocation = (id: string) => {
    Alert.alert(
      "Brisanje lokacije",
      "Da li ste sigurni da želite obrisati ovu lokaciju?",
      [
        {
          text: "Otkaži",
          style: "cancel"
        },
        { 
          text: "Obriši", 
          style: "destructive",
          onPress: () => {
            // In a real app, you would call an API to delete the location
            const updatedLocations = locations.filter(location => location.id !== id);
            setLocations(updatedLocations);
            setFilteredLocations(updatedLocations);
            
            Alert.alert("Uspjeh", "Lokacija je uspješno obrisana.");
          }
        }
      ]
    );
  };
  
  const handleViewLocationDetails = (id: string) => {
    // In a real app, you would navigate to location details
    Alert.alert("Info", "Detalji lokacije će biti prikazani.");
  };
  
  const getCompanyName = (companyId: string) => {
    return "Vodovod Sarajevo";
  };
  
  const renderLocationCard = ({ item }: { item: Location }) => {
    return (
      <Card style={styles.locationCard}>
        <TouchableOpacity 
          style={styles.cardContent}
          onPress={() => handleViewLocationDetails(item.id)}
          activeOpacity={0.7}
        >
          <View style={styles.locationHeader}>
            <View style={styles.locationInfo}>
              <Text style={styles.locationName}>{item.name}</Text>
              <Badge 
                label={getCompanyName(item.companyId)} 
                color={Colors.primary} 
              />
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
              <Text style={styles.detailText}>{item.buildingCount || 0} zgrada</Text>
            </View>
            
            <View style={styles.detailItem}>
              <Droplet size={16} color={Colors.textLight} />
              <Text style={styles.detailText}>{item.meterCount || 0} vodomjera</Text>
            </View>
            
            <View style={styles.detailItem}>
              <Users size={16} color={Colors.textLight} />
              <Text style={styles.detailText}>{item.userCount || 0} korisnika</Text>
            </View>
          </View>
        </TouchableOpacity>
        
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
      </Card>
    );
  };
  
  const renderEmptyState = () => {
    return (
      <EmptyState
        title="Nema lokacija"
        message="Trenutno nema lokacija koje odgovaraju vašoj pretrazi."
        icon={<MapPin size={48} color={Colors.textLight} />}
        actionLabel="Dodaj novu lokaciju"
        onAction={handleAddLocation}
      />
    );
  };
  
  const canManageLocations = user?.role === 'super_admin' || user?.role === 'utility_admin';
  
  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <Header 
          title="Lokacije"
          showBack
          showMenu
          onLeftPress={() => setIsDrawerOpen(true)}
        />
        
        <Drawer
          isOpen={isDrawerOpen}
          onClose={() => setIsDrawerOpen(false)}
        />
        
        <View style={styles.searchContainer}>
          <View style={styles.searchInputContainer}>
            <Search size={20} color={Colors.textLight} style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Pretraži lokacije..."
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
            <Text style={styles.filtersTitle}>Kompanija:</Text>
            <View style={styles.filterOptions}>
              <TouchableOpacity
                style={[
                  styles.filterOption,
                  filterCompany === 'all' && styles.filterOptionActive
                ]}
                onPress={() => handleFilterChange('all')}
              >
                <Text style={[
                  styles.filterOptionText,
                  filterCompany === 'all' && styles.filterOptionTextActive
                ]}>Sve</Text>
              </TouchableOpacity>
              
            </View>
          </View>
        )}
        
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
  listContainer: {
    padding: 16,
    paddingBottom: Platform.OS === 'android' ? 100 : 80, // Extra padding for Android
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
  detailsButton: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: Colors.highlight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fab: {
    position: 'absolute',
    bottom: Platform.OS === 'android' ? 40 : 24, // Higher position for Android
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




