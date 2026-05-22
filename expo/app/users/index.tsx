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
  Users, 
  Search, 
  Plus, 
  Filter, 
  ChevronRight, 
  Mail, 
  Phone, 
  MapPin,
  Edit,
  Trash2,
  Menu
} from 'lucide-react-native';
import { Header } from '@/components/layout/Header';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { Badge } from '@/components/ui/Badge';
import { Avatar } from '@/components/ui/Avatar';
import { Drawer } from '@/components/layout/Drawer';
import { useAuthStore } from '@/store/auth-store';
import Colors from '@/constants/colors';
import { getUsers } from '@/lib/api/users';
import { User } from '@/types/user';

export default function UsersScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  
  // Users data
  const [users, setUsers] = useState<any[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [filterRole, setFilterRole] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  
  const fetchUsers = async () => {
    try {
      const data = await getUsers();
      setUsers(data);
      setFilteredUsers(data);
    } catch (err) {
      console.error('Greska pri ucitavanju korisnika:', err);
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  // Drawer state
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  
  // Check if user has permission to access this screen
  useEffect(() => {
    if (!user || (user.role !== 'super_admin' && user.role !== 'utility_admin')) {
      router.replace('/login');
    }
  }, [user, router]);
  
  const onRefresh = () => {
    setRefreshing(true);
    // In a real app, you would fetch users from an API
    setRefreshing(false);
  };
  
  const applyFilters = () => {
    let filtered = [...users];
    
    // Apply search query
    if (searchQuery) {
      filtered = filtered.filter(user => 
        user.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (user.phone && user.phone.includes(searchQuery))
      );
    }
    
    // Apply role filter
    if (filterRole !== 'all') {
      filtered = filtered.filter(user => user.role === filterRole);
    }
    
    // Apply status filter
    if (filterStatus !== 'all') {
      filtered = filtered.filter(user => 
        filterStatus === 'active' ? user.is_active : !user.is_active
      );
    }
    
    setFilteredUsers(filtered);
  };
  
  useEffect(() => {
    applyFilters();
  }, [searchQuery, filterRole, filterStatus]);
  
  const handleSearch = (text: string) => {
    setSearchQuery(text);
  };
  
  const handleFilterChange = (role: string) => {
    setFilterRole(role);
  };
  
  const handleStatusChange = (status: string) => {
    setFilterStatus(status);
  };
  
  const handleAddUser = () => {
    router.push('/users/add');
  };
  
  const handleEditUser = (id: string) => {
    router.push(`/users/edit/${id}`);
  };
  
  const handleDeleteUser = (id: string) => {
    Alert.alert(
      "Brisanje korisnika",
      "Da li ste sigurni da želite obrisati ovog korisnika?",
      [
        {
          text: "Otkaži",
          style: "cancel"
        },
        { 
          text: "Obriši", 
          style: "destructive",
          onPress: () => {
            // In a real app, you would call an API to delete the user
            const updatedUsers = users.filter(user => user.id !== id);
            setUsers(updatedUsers);
            setFilteredUsers(updatedUsers);
            
            Alert.alert("Uspjeh", "Korisnik je uspješno obrisan.");
          }
        }
      ]
    );
  };
  
  const handleViewUserDetails = (id: string) => {
    router.push(`/users/reports/${id}`);
  };
  
  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'super_admin':
        return '#9C27B0'; // Purple
      case 'utility_admin':
        return '#2196F3'; // Blue
      case 'finance':
        return '#4CAF50'; // Green
      case 'worker':
        return '#FF9800'; // Orange
      case 'worker':
        return '#795548'; // Brown
      case 'end_user':
      default:
        return '#607D8B'; // Blue Grey
    }
  };
  
  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'super_admin':
        return 'Super Admin';
      case 'utility_admin':
        return 'Administrator';
      case 'finance':
        return 'Finansije';
      case 'worker':
        return 'Radnik';
      case 'worker':
        return 'Održavanje';
      case 'end_user':
        return 'Građanin';
      default:
        return role;
    }
  };
  
  const renderUserCard = ({ item }: { item: User }) => {
    return (
      <Card style={styles.userCard}>
        <TouchableOpacity 
          style={styles.cardContent}
          onPress={() => handleViewUserDetails(item.id)}
          activeOpacity={0.7}
        >
          <View style={styles.userHeader}>
            <View style={styles.userInfo}>
              <Avatar 
                source={item.avatar} 
                name={item.full_name} 
                size={50} 
              />
              <View style={styles.userDetails}>
                <Text style={styles.userName}>{item.full_name}</Text>
                <Badge 
                  label={getRoleLabel(item.role)} 
                  color={getRoleBadgeColor(item.role)} 
                />
              </View>
            </View>
            <View style={styles.statusContainer}>
              <View style={[
                styles.statusIndicator, 
                { backgroundColor: item.is_active ? Colors.success : Colors.error }
              ]} />
              <Text style={styles.statusText}>
                {item.is_active ? 'Aktivan' : 'Neaktivan'}
              </Text>
            </View>
          </View>
          
          <View style={styles.contactInfo}>
            <View style={styles.contactItem}>
              <Mail size={16} color={Colors.textLight} />
              <Text style={styles.contactText}>{item.email}</Text>
            </View>
            
            {item.phone && (
              <View style={styles.contactItem}>
                <Phone size={16} color={Colors.textLight} />
                <Text style={styles.contactText}>{item.phone}</Text>
              </View>
            )}
            
            {item.address && (
              <View style={styles.contactItem}>
                <MapPin size={16} color={Colors.textLight} />
                <Text style={styles.contactText}>{item.address}</Text>
              </View>
            )}
          </View>
        </TouchableOpacity>
        
        <View style={styles.cardActions}>
          <Button
            title="Uredi"
            variant="outline"
            size="small"
            leftIcon={<Edit size={16} color={Colors.primary} />}
            onPress={() => handleEditUser(item.id)}
            style={styles.actionButton}
          />
          
          <Button
            title="Obriši"
            variant="outline"
            size="small"
            leftIcon={<Trash2 size={16} color={Colors.error} />}
            onPress={() => handleDeleteUser(item.id)}
            style={[styles.actionButton, styles.deleteButton]}
          />
          
          <TouchableOpacity
            style={styles.detailsButton}
            onPress={() => handleViewUserDetails(item.id)}
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
        title="Nema korisnika"
        message="Trenutno nema korisnika koji odgovaraju vašoj pretrazi."
        icon={<Users size={48} color={Colors.textLight} />}
        actionLabel="Dodaj novog korisnika"
        onAction={handleAddUser}
      />
    );
  };
  
  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <Header 
          title="Korisnici"
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
              placeholder="Pretraži korisnike..."
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
            <Text style={styles.filtersTitle}>Uloga:</Text>
            <View style={styles.filterOptions}>
              <TouchableOpacity
                style={[
                  styles.filterOption,
                  filterRole === 'all' && styles.filterOptionActive
                ]}
                onPress={() => handleFilterChange('all')}
              >
                <Text style={[
                  styles.filterOptionText,
                  filterRole === 'all' && styles.filterOptionTextActive
                ]}>Svi</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[
                  styles.filterOption,
                  filterRole === 'utility_admin' && styles.filterOptionActive
                ]}
                onPress={() => handleFilterChange('utility_admin')}
              >
                <Text style={[
                  styles.filterOptionText,
                  filterRole === 'utility_admin' && styles.filterOptionTextActive
                ]}>Administratori</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[
                  styles.filterOption,
                  filterRole === 'finance' && styles.filterOptionActive
                ]}
                onPress={() => handleFilterChange('finance')}
              >
                <Text style={[
                  styles.filterOptionText,
                  filterRole === 'finance' && styles.filterOptionTextActive
                ]}>Finansije</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[
                  styles.filterOption,
                  filterRole === 'worker' && styles.filterOptionActive
                ]}
                onPress={() => handleFilterChange('worker')}
              >
                <Text style={[
                  styles.filterOptionText,
                  filterRole === 'worker' && styles.filterOptionTextActive
                ]}>Radnici</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[
                  styles.filterOption,
                  filterRole === 'worker' && styles.filterOptionActive
                ]}
                onPress={() => handleFilterChange('worker')}
              >
                <Text style={[
                  styles.filterOptionText,
                  filterRole === 'worker' && styles.filterOptionTextActive
                ]}>Održavanje</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[
                  styles.filterOption,
                  filterRole === 'end_user' && styles.filterOptionActive
                ]}
                onPress={() => handleFilterChange('end_user')}
              >
                <Text style={[
                  styles.filterOptionText,
                  filterRole === 'end_user' && styles.filterOptionTextActive
                ]}>Građani</Text>
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
          </View>
        )}
        
        <FlatList
          data={filteredUsers}
          renderItem={renderUserCard}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContainer}
          ListEmptyComponent={renderEmptyState}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        />
        
        <TouchableOpacity
          style={styles.fab}
          onPress={handleAddUser}
          activeOpacity={0.8}
        >
          <Plus size={24} color="#fff" />
        </TouchableOpacity>
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
  userCard: {
    marginBottom: 16,
  },
  cardContent: {
    padding: 16,
  },
  userHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  userDetails: {
    marginLeft: 12,
  },
  userName: {
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
  contactInfo: {
    marginBottom: 8,
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  contactText: {
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


