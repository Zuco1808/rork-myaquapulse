import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  TouchableOpacity, 
  TextInput,
  RefreshControl,
  Alert
} from 'react-native';
import { useRouter } from 'expo-router';
import { 
  Building, 
  Search, 
  Plus, 
  Edit2, 
  Trash2, 
  MapPin, 
  Users, 
  Filter,
  Menu
} from 'lucide-react-native';
import { Header } from '@/components/layout/Header';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { StatusIndicator } from '@/components/ui/StatusIndicator';
import { useAuthStore } from '@/store/auth-store';
import { mockCompanies } from '@/mocks/companies';
import { getCompanies } from '@/lib/api/companies';
import Colors from '@/constants/colors';
import { Company } from '@/types/user';

// Extended Company type with status
interface CompanyWithStatus extends Company {
  status: 'active' | 'inactive' | 'pending';
}

// Fallback mock with status (used if Supabase fetch fails)
const fallbackCompanies: CompanyWithStatus[] = mockCompanies.map((company: any) => ({
  ...company,
  status: company.id.includes('1') ? 'active' :
          company.id.includes('2') ? 'inactive' : 'pending'
}));

export default function CompaniesScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [companies, setCompanies] = useState<CompanyWithStatus[]>([]);
  const [filteredCompanies, setFilteredCompanies] = useState<CompanyWithStatus[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [filterStatus, setFilterStatus] = useState('all');

  const fetchCompanies = async () => {
    try {
      const data = await getCompanies();
      const withStatus: CompanyWithStatus[] = data.map((c) => ({
        ...c,
        status: c.isActive === false ? 'inactive' : 'active',
      } as CompanyWithStatus));
      setCompanies(withStatus);
      setFilteredCompanies(withStatus);
    } catch {
      setCompanies(fallbackCompanies);
      setFilteredCompanies(fallbackCompanies);
    }
  };

  useEffect(() => {
    fetchCompanies();
  }, []);

  // Check if user has permission to access this screen
  useEffect(() => {
    if (!user || user.role !== 'superadmin') {
      router.replace('/(tabs)');
    }
  }, [user, router]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchCompanies();
    applyFilters(searchQuery, filterStatus);
    setRefreshing(false);
  };
  
  const applyFilters = (query: string, status: string) => {
    let filtered = [...companies];
    
    // Apply search query
    if (query) {
      filtered = filtered.filter(company => 
        company.name.toLowerCase().includes(query.toLowerCase()) ||
        company.city.toLowerCase().includes(query.toLowerCase())
      );
    }
    
    // Apply status filter
    if (status !== 'all') {
      filtered = filtered.filter(company => company.status === status);
    }
    
    setFilteredCompanies(filtered);
  };
  
  const handleSearch = (text: string) => {
    setSearchQuery(text);
    applyFilters(text, filterStatus);
  };
  
  const handleFilterChange = (status: string) => {
    setFilterStatus(status);
    applyFilters(searchQuery, status);
  };
  
  const handleAddCompany = () => {
    router.push('/companies/add' as any);
  };
  
  const handleEditCompany = (id: string) => {
    router.push(`/companies/edit/${id}` as any);
  };
  
  const handleViewCompany = (id: string) => {
    router.push(`/companies/${id}` as any);
  };
  
  const handleViewLocations = (id: string) => {
    router.push(`/locations?companyId=${id}` as any);
  };
  
  const handleViewUsers = (id: string) => {
    router.push(`/users?companyId=${id}` as any);
  };
  
  const handleDeleteCompany = (id: string, name: string) => {
    Alert.alert(
      "Brisanje kompanije",
      `Da li ste sigurni da želite obrisati kompaniju "${name}"?`,
      [
        {
          text: "Odustani",
          style: "cancel"
        },
        { 
          text: "Obriši", 
          onPress: () => {
            // Delete company logic
            const updatedCompanies = companies.filter(company => company.id !== id);
            setCompanies(updatedCompanies);
            applyFilters(searchQuery, filterStatus);
          },
          style: "destructive"
        }
      ]
    );
  };
  
  const renderCompanyCard = ({ item }: { item: CompanyWithStatus }) => {
    return (
      <Card style={styles.companyCard}>
        <TouchableOpacity 
          style={styles.cardContent}
          onPress={() => handleViewCompany(item.id)}
          activeOpacity={0.7}
        >
          <View style={styles.companyHeader}>
            <View style={styles.companyInfo}>
              <Text style={styles.companyName}>{item.name}</Text>
              <View style={styles.locationContainer}>
                <MapPin size={14} color={Colors.textLight} />
                <Text style={styles.locationText}>{item.city}</Text>
              </View>
            </View>
            <StatusIndicator 
              status={item.status}
              labels={{
                active: "Aktivna",
                inactive: "Neaktivna",
                pending: "Na čekanju"
              }}
            />
          </View>
          
          <View style={styles.statsContainer}>
            <View style={styles.statItem}>
              <Users size={16} color={Colors.primary} />
              <Text style={styles.statValue}>{item.usersCount}</Text>
              <Text style={styles.statLabel}>Korisnika</Text>
            </View>
            
            <View style={styles.statItem}>
              <MapPin size={16} color={Colors.secondary} />
              <Text style={styles.statValue}>{item.locationsCount}</Text>
              <Text style={styles.statLabel}>Lokacija</Text>
            </View>
            
            <View style={styles.statItem}>
              <Building size={16} color={Colors.info} />
              <Text style={styles.statValue}>{item.metersCount}</Text>
              <Text style={styles.statLabel}>Vodomjera</Text>
            </View>
          </View>
        </TouchableOpacity>
        
        <View style={styles.cardActions}>
          <Button
            title="Lokacije"
            variant="outline"
            size="small"
            leftIcon={<MapPin size={16} color={Colors.primary} />}
            onPress={() => handleViewLocations(item.id)}
          />
          
          <Button
            title="Korisnici"
            variant="outline"
            size="small"
            leftIcon={<Users size={16} color={Colors.primary} />}
            style={{ marginLeft: 8 }}
            onPress={() => handleViewUsers(item.id)}
          />
          
          <View style={{ flex: 1 }} />
          
          <TouchableOpacity
            style={styles.iconButton}
            onPress={() => handleEditCompany(item.id)}
          >
            <Edit2 size={20} color={Colors.primary} />
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.iconButton}
            onPress={() => handleDeleteCompany(item.id, item.name)}
          >
            <Trash2 size={20} color={Colors.error} />
          </TouchableOpacity>
        </View>
      </Card>
    );
  };
  
  const renderEmptyState = () => {
    return (
      <EmptyState
        title="Nema kompanija"
        message="Trenutno nema kompanija koje odgovaraju vašoj pretrazi."
        icon={<Building size={48} color={Colors.textLight} />}
        actionLabel="Dodaj novu kompaniju"
        onAction={handleAddCompany}
      />
    );
  };
  
  return (
    <View style={styles.container}>
      <Header 
        title="Kompanije"
        showBack
        leftIcon={<Menu size={24} color={Colors.text} />}
        onLeftPress={() => router.push('/(tabs)' as any)}
      />
      
      <View style={styles.searchContainer}>
        <View style={styles.searchInputContainer}>
          <Search size={20} color={Colors.textLight} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Pretraži kompanije..."
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
            <TouchableOpacity
              style={[
                styles.filterOption,
                filterStatus === 'all' && styles.filterOptionActive
              ]}
              onPress={() => handleFilterChange('all')}
            >
              <Text style={[
                styles.filterOptionText,
                filterStatus === 'all' && styles.filterOptionTextActive
              ]}>Sve</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[
                styles.filterOption,
                filterStatus === 'active' && styles.filterOptionActive
              ]}
              onPress={() => handleFilterChange('active')}
            >
              <Text style={[
                styles.filterOptionText,
                filterStatus === 'active' && styles.filterOptionTextActive
              ]}>Aktivne</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[
                styles.filterOption,
                filterStatus === 'inactive' && styles.filterOptionActive
              ]}
              onPress={() => handleFilterChange('inactive')}
            >
              <Text style={[
                styles.filterOptionText,
                filterStatus === 'inactive' && styles.filterOptionTextActive
              ]}>Neaktivne</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[
                styles.filterOption,
                filterStatus === 'pending' && styles.filterOptionActive
              ]}
              onPress={() => handleFilterChange('pending')}
            >
              <Text style={[
                styles.filterOptionText,
                filterStatus === 'pending' && styles.filterOptionTextActive
              ]}>Na čekanju</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
      
      <FlatList
        data={filteredCompanies}
        renderItem={renderCompanyCard}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
        ListEmptyComponent={renderEmptyState}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      />
      
      <TouchableOpacity
        style={styles.fab}
        onPress={handleAddCompany}
        activeOpacity={0.8}
      >
        <Plus size={24} color="#fff" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
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
    paddingBottom: 80,
  },
  companyCard: {
    marginBottom: 16,
  },
  cardContent: {
    padding: 16,
  },
  companyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  companyInfo: {
    flex: 1,
  },
  companyName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 4,
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  locationText: {
    fontSize: 14,
    color: Colors.textLight,
    marginLeft: 4,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.text,
    marginTop: 4,
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 12,
    color: Colors.textLight,
  },
  cardActions: {
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    padding: 12,
  },
  iconButton: {
    padding: 8,
    marginLeft: 8,
  },
  fab: {
    position: 'absolute',
    bottom: 24,
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
