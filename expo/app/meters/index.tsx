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
  Droplet, 
  Search, 
  Plus, 
  Filter, 
  ChevronRight, 
  MapPin, 
  User, 
  Calendar,
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
import { WaterMeter, MeterReading } from '@/types/location';
import { getMeters } from '@/lib/api/meters';

// Mock meters data
const mockMeters: any[] = [
  {
    id: 'm1',
    serialNumber: 'VM-2023-001',
    type: 'standard',
    installDate: Date.now() - 365 * 24 * 60 * 60 * 1000,
    status: 'active',
    locationId: 'l1',
    userId: 'u1',
  },
  {
    id: 'm2',
    serialNumber: 'VM-2023-002',
    type: 'smart',
    installDate: Date.now() - 180 * 24 * 60 * 60 * 1000,
    status: 'active',
    locationId: 'l2',
    userId: 'u2',
  },
  {
    id: 'm3',
    serialNumber: 'VM-2023-003',
    type: 'industrial',
    installDate: Date.now() - 90 * 24 * 60 * 60 * 1000,
    status: 'inactive',
    locationId: 'l3',
    userId: 'u3',
  },
  {
    id: 'm4',
    serialNumber: 'VM-2023-004',
    type: 'standard',
    installDate: Date.now() - 45 * 24 * 60 * 60 * 1000,
    status: 'active',
    locationId: 'l4',
    userId: 'u4',
  },
  {
    id: 'm5',
    serialNumber: 'VM-2023-005',
    type: 'smart',
    installDate: Date.now() - 30 * 24 * 60 * 60 * 1000,
    status: 'active',
    locationId: 'l5',
    userId: 'u5',
  }
];

// Extended meter data for UI
interface ExtendedMeter {
  id: string;
  serialNumber: string;
  type: 'standard' | 'smart' | 'industrial';
  installDate: number;
  status: 'active' | 'inactive';
  locationId: string;
  userId: string;
  userName: string;
  locationName: string;
  address: string;
  lastReadingValue?: number;
  lastReadingDate?: string;
  lastReading?: MeterReading;
}


export default function MetersScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  
  // Meters data
  const [meters, setMeters] = useState<any[]>([]);
  const [filteredMeters, setFilteredMeters] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [filterType, setFilterType] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterLocation, setFilterLocation] = useState('all');
  
  const fetchMeters = async () => {
    try {
      const data = await getMeters();
      console.log("Meters data:", JSON.stringify(data));
      setMeters(data);
      setFilteredMeters(data);
    } catch (err) {
      console.error("Greska pri ucitavanju vodomjera:", err);
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchMeters();
  }, []);

  // Drawer state
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  
  // Check if user has permission to access this screen
  useEffect(() => {
    if (!user) {
      router.replace('/login');
    }
  }, [user, router]);
  
  const onRefresh = () => {
    setRefreshing(true);
    // In a real app, you would fetch meters from an API
    setRefreshing(false);
  };
  
  const applyFilters = () => {
    let filtered = [...meters];
    
    // Apply search query
    if (searchQuery) {
      filtered = filtered.filter(meter => 
        meter.serialNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        meter.userName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        meter.address.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    
    // Apply type filter
    if (filterType !== 'all') {
      filtered = filtered.filter(meter => meter.type === filterType);
    }
    
    // Apply status filter
    if (filterStatus !== 'all') {
      filtered = filtered.filter(meter => meter.status === filterStatus);
    }
    
    // Apply location filter
    if (filterLocation !== 'all') {
      filtered = filtered.filter(meter => meter.locationId === filterLocation);
    }
    
    // Filter by user role
    if (user?.role === 'citizen') {
      // Citizens can only see their own meters
      filtered = filtered.filter(meter => meter.userId === user.id);
    }
    
    setFilteredMeters(filtered);
  };
  
  useEffect(() => {
    applyFilters();
  }, [searchQuery, filterType, filterStatus, filterLocation, user]);
  
  const handleSearch = (text: string) => {
    setSearchQuery(text);
  };
  
  const handleTypeChange = (type: string) => {
    setFilterType(type);
  };
  
  const handleStatusChange = (status: string) => {
    setFilterStatus(status);
  };
  
  const handleLocationChange = (location: string) => {
    setFilterLocation(location);
  };
  
  const handleAddMeter = () => {
    router.push('/meters/add' as any);
  };
  
  const handleEditMeter = (id: string) => {
    router.push(`/meters/edit/${id}` as any);
  };
  
  const handleDeleteMeter = (id: string) => {
    Alert.alert(
      "Brisanje vodomjera",
      "Da li ste sigurni da želite obrisati ovaj vodomjer?",
      [
        {
          text: "Otkaži",
          style: "cancel"
        },
        { 
          text: "Obriši", 
          style: "destructive",
          onPress: () => {
            // In a real app, you would call an API to delete the meter
            const updatedMeters = meters.filter(meter => meter.id !== id);
            setMeters(updatedMeters);
            setFilteredMeters(updatedMeters);
            
            Alert.alert("Uspjeh", "Vodomjer je uspješno obrisan.");
          }
        }
      ]
    );
  };
  
  const handleViewMeterDetails = (id: string) => {
    router.push(`/meters/${id}` as any);
  };
  
  const getMeterTypeLabel = (type: string) => {
    switch (type) {
      case 'standard':
        return 'Standardni';
      case 'smart':
        return 'Pametni';
      case 'industrial':
        return 'Industrijski';
      default:
        return type;
    }
  };
  
  const getMeterTypeColor = (type: string) => {
    switch (type) {
      case 'standard':
        return Colors.primary;
      case 'smart':
        return '#4CAF50'; // Green
      case 'industrial':
        return '#FF9800'; // Orange
      default:
        return Colors.primary;
    }
  };
  
  const renderMeterCard = ({ item }: { item: any }) => {
    const isActive = item.status === 'active';
    
    return (
      <Card style={styles.meterCard}>
        <TouchableOpacity 
          style={styles.cardContent}
          onPress={() => handleViewMeterDetails(item.id)}
          activeOpacity={0.7}
        >
          <View style={styles.meterHeader}>
            <View style={styles.meterInfo}>
              <Text style={styles.meterSerialNumber}>{item.serialNumber}</Text>
              <Badge 
                label={getMeterTypeLabel(item.type)} 
                color={getMeterTypeColor(item.type)} 
              />
            </View>
            <View style={styles.statusContainer}>
              <View style={[
                styles.statusIndicator, 
                { backgroundColor: isActive ? Colors.success : Colors.error }
              ]} />
              <Text style={styles.statusText}>
                {isActive ? 'Aktivan' : 'Neaktivan'}
              </Text>
            </View>
          </View>
          
          <View style={styles.meterDetails}>
            <View style={styles.detailItem}>
              <User size={16} color={Colors.textLight} />
              <Text style={styles.detailText}>{item.userName}</Text>
            </View>
            
            <View style={styles.detailItem}>
              <MapPin size={16} color={Colors.textLight} />
              <Text style={styles.detailText}>{item.address}</Text>
            </View>
            
            <View style={styles.detailItem}>
              <Droplet size={16} color={Colors.textLight} />
              <Text style={styles.detailText}>
                Posljednje očitanje: {item.lastReadingValue} m³
              </Text>
            </View>
            
            <View style={styles.detailItem}>
              <Calendar size={16} color={Colors.textLight} />
              <Text style={styles.detailText}>
                Datum očitanja: {item.lastReadingDate}
              </Text>
            </View>
          </View>
        </TouchableOpacity>
        
        <View style={styles.cardActions}>
          {(user?.role === 'superadmin' || user?.role === 'admin' || user?.role === 'finance') && (
            <>
              <Button
                title="Uredi"
                variant="outline"
                size="small"
                leftIcon={<Edit size={16} color={Colors.primary} />}
                onPress={() => handleEditMeter(item.id)}
                style={styles.actionButton}
              />
              
              <Button
                title="Obriši"
                variant="outline"
                size="small"
                leftIcon={<Trash2 size={16} color={Colors.error} />}
                onPress={() => handleDeleteMeter(item.id)}
                style={[styles.actionButton, styles.deleteButton]}
              />
            </>
          )}
          
          <TouchableOpacity
            style={styles.detailsButton}
            onPress={() => handleViewMeterDetails(item.id)}
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
        title="Nema vodomjera"
        message="Trenutno nema vodomjera koji odgovaraju vašoj pretrazi."
        icon={<Droplet size={48} color={Colors.textLight} />}
        actionLabel="Dodaj novi vodomjer"
        onAction={handleAddMeter}
      />
    );
  };
  
  // Get unique locations for filter
  const locations = [...new Set(meters.map(meter => meter.locationId))].map(
    locationId => {
      const meter = meters.find(m => m.locationId === locationId);
      return {
        id: locationId,
        name: meter ? meter.locationName : 'Nepoznata lokacija'
      };
    }
  );
  
  const canManageMeters = user?.role === 'superadmin' || user?.role === 'admin' || user?.role === 'finance';
  
  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <Header 
          title="Vodomjeri"
          showBack
          showMenu={false}
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
              placeholder="Pretraži vodomjere..."
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
            <Text style={styles.filtersTitle}>Tip vodomjera:</Text>
            <View style={styles.filterOptions}>
              <TouchableOpacity
                style={[
                  styles.filterOption,
                  filterType === 'all' && styles.filterOptionActive
                ]}
                onPress={() => handleTypeChange('all')}
              >
                <Text style={[
                  styles.filterOptionText,
                  filterType === 'all' && styles.filterOptionTextActive
                ]}>Svi</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[
                  styles.filterOption,
                  filterType === 'standard' && styles.filterOptionActive
                ]}
                onPress={() => handleTypeChange('standard')}
              >
                <Text style={[
                  styles.filterOptionText,
                  filterType === 'standard' && styles.filterOptionTextActive
                ]}>Standardni</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[
                  styles.filterOption,
                  filterType === 'smart' && styles.filterOptionActive
                ]}
                onPress={() => handleTypeChange('smart')}
              >
                <Text style={[
                  styles.filterOptionText,
                  filterType === 'smart' && styles.filterOptionTextActive
                ]}>Pametni</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[
                  styles.filterOption,
                  filterType === 'industrial' && styles.filterOptionActive
                ]}
                onPress={() => handleTypeChange('industrial')}
              >
                <Text style={[
                  styles.filterOptionText,
                  filterType === 'industrial' && styles.filterOptionTextActive
                ]}>Industrijski</Text>
              </TouchableOpacity>
            </View>
            
            <Text style={styles.filtersTitle}>Status:</Text>
            <View style={styles.filterOptions}>
              <TouchableOpacity
                style={[
                  styles.filterOption,
                  filterStatus === 'all' && styles.filterOptionActive
                ]}
                onPress={() => handleStatusChange('all')}
              >
                <Text style={[
                  styles.filterOptionText,
                  filterStatus === 'all' && styles.filterOptionTextActive
                ]}>Svi</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[
                  styles.filterOption,
                  filterStatus === 'active' && styles.filterOptionActive
                ]}
                onPress={() => handleStatusChange('active')}
              >
                <Text style={[
                  styles.filterOptionText,
                  filterStatus === 'active' && styles.filterOptionTextActive
                ]}>Aktivni</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[
                  styles.filterOption,
                  filterStatus === 'inactive' && styles.filterOptionActive
                ]}
                onPress={() => handleStatusChange('inactive')}
              >
                <Text style={[
                  styles.filterOptionText,
                  filterStatus === 'inactive' && styles.filterOptionTextActive
                ]}>Neaktivni</Text>
              </TouchableOpacity>
            </View>
            
            <Text style={styles.filtersTitle}>Lokacija:</Text>
            <View style={styles.filterOptions}>
              <TouchableOpacity
                style={[
                  styles.filterOption,
                  filterLocation === 'all' && styles.filterOptionActive
                ]}
                onPress={() => handleLocationChange('all')}
              >
                <Text style={[
                  styles.filterOptionText,
                  filterLocation === 'all' && styles.filterOptionTextActive
                ]}>Sve</Text>
              </TouchableOpacity>
              
              {locations.map(location => (
                <TouchableOpacity
                  key={location.id}
                  style={[
                    styles.filterOption,
                    filterLocation === location.id && styles.filterOptionActive
                  ]}
                  onPress={() => handleLocationChange(location.id)}
                >
                  <Text style={[
                    styles.filterOptionText,
                    filterLocation === location.id && styles.filterOptionTextActive
                  ]}>{location.name}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}
        
        <FlatList
          data={filteredMeters}
          renderItem={renderMeterCard}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContainer}
          ListEmptyComponent={renderEmptyState}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        />
        
        {canManageMeters && (
          <TouchableOpacity
            style={styles.fab}
            onPress={handleAddMeter}
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
    marginTop: 8,
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
  meterCard: {
    marginBottom: 16,
  },
  cardContent: {
    padding: 16,
  },
  meterHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  meterInfo: {
    flex: 1,
  },
  meterSerialNumber: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 4,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  statusText: {
    fontSize: 12,
    color: Colors.textLight,
  },
  meterDetails: {
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





