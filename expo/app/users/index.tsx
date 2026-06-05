import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  TextInput, RefreshControl, Alert, SafeAreaView, Platform,
  ActivityIndicator,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useFreshFocus } from '@/lib/use-fresh-focus';
import {
  Users, Search, Plus, Filter, ChevronRight,
  Mail, Phone, Edit, Trash2
} from 'lucide-react-native';
import { Header } from '@/components/layout/Header';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { Badge } from '@/components/ui/Badge';
import { Avatar } from '@/components/ui/Avatar';
import { useAuthStore } from '@/store/auth-store';
import { usePermissions } from '@/lib/use-permissions';
import Colors from '@/constants/colors';
import { supabase } from '@/lib/supabase';
import { Profile } from '@/types/user';
import { captureError } from '@/lib/sentry';

/* ── pure filter helper ──────────────────────────── */
const filterUsers = (source: Profile[], q: string, role: string, status: string): Profile[] => {
  let f = source;
  if (q) {
    const ql = q.toLowerCase();
    f = f.filter(u =>
      u.full_name.toLowerCase().includes(ql) ||
      u.email.toLowerCase().includes(ql) ||
      (u.phone ? u.phone.includes(q) : false),
    );
  }
  if (role   !== 'all')      f = f.filter(u => u.role === role);
  if (status === 'active')   f = f.filter(u => u.is_active);
  if (status === 'inactive') f = f.filter(u => !u.is_active);
  return f;
};

export default function UsersScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { canManageUsers } = usePermissions();
  const { utilityId } = useLocalSearchParams<{ utilityId?: string }>();

  const [users, setUsers]           = useState<Profile[]>([]);
  const [loading, setLoading]       = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [filterRole, setFilterRole] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');

  // Derived — always consistent with users + filter state
  const filteredUsers = filterUsers(users, searchQuery, filterRole, filterStatus);

  useEffect(() => {
    if (!user || !canManageUsers) {
      router.replace('/login');
    }
  }, [user, canManageUsers]);

  useFreshFocus(() => { if (user) fetchUsers(); });

  const fetchUsers = async () => {
    setLoading(true);
    try {
      let query = supabase.from('profiles').select('*').order('full_name');

      // Ako je utilityId u URL-u — filtriraj po njemu
      if (utilityId) {
        query = query.eq('utility_id', utilityId);
      } else if (user?.role === 'utility_admin' && user.utility_id) {
        // utility_admin vidi samo korisnike svog vodovoda
        query = query.eq('utility_id', user.utility_id);
      }
      // super_admin bez utilityId vidi sve

      const { data, error } = await query;
      if (error) throw error;
      setUsers(data || []);
    } catch (err) {
      captureError(err, { screen: 'users', action: 'fetchUsers' });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchUsers();
  };

  const handleDeleteUser = (id: string) => {
    Alert.alert(
      'Brisanje korisnika',
      'Da li ste sigurni da želite obrisati ovog korisnika?',
      [
        { text: 'Otkaži', style: 'cancel' },
        {
          text: 'Obriši',
          style: 'destructive',
          onPress: async () => {
            const { error } = await supabase.from('profiles').delete().eq('id', id);
            if (!error) {
              const updated = users.filter(u => u.id !== id);
              setUsers(updated);
            }
          }
        }
      ]
    );
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'super_admin': return '#9C27B0';
      case 'distributor_admin': return '#E91E63';
      case 'utility_admin': return '#2196F3';
      case 'finance': return '#4CAF50';
      case 'worker': return '#FF9800';
      default: return '#607D8B';
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'super_admin': return 'Super Admin';
      case 'distributor_admin': return 'Distributer';
      case 'utility_admin': return 'Administrator';
      case 'finance': return 'Finansije';
      case 'worker': return 'Radnik';
      case 'end_user': return 'Korisnik';
      default: return role;
    }
  };

  const screenTitle = utilityId
    ? 'Korisnici vodovoda'
    : 'Svi korisnici';

  const renderUserCard = ({ item }: { item: Profile }) => (
    <Card style={styles.userCard}>
      <TouchableOpacity
        style={styles.cardContent}
        onPress={() => router.push(`/users/reports/${item.id}` as any)}
        activeOpacity={0.7}
      >
        <View style={styles.userHeader}>
          <View style={styles.userInfo}>
            <Avatar source={item.avatar_url} name={item.full_name} size={50} />
            <View style={styles.userDetails}>
              <Text style={styles.userName}>{item.full_name}</Text>
              <Badge label={getRoleLabel(item.role)} color={getRoleBadgeColor(item.role)} />
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
        </View>
      </TouchableOpacity>

      <View style={styles.cardActions}>
        <Button
          title="Uredi"
          variant="outline"
          size="small"
          leftIcon={<Edit size={16} color={Colors.primary} />}
          onPress={() => router.push(`/users/edit/${item.id}` as any)}
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
          onPress={() => router.push(`/users/reports/${item.id}` as any)}
        >
          <ChevronRight size={20} color={Colors.primary} />
        </TouchableOpacity>
      </View>
    </Card>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.container}>
          <Header title={screenTitle} showBack onLeftPress={() => router.back()} />
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
        <Header title={screenTitle} showBack onLeftPress={() => router.back()} />

        <View style={styles.searchContainer}>
          <View style={styles.searchInputContainer}>
            <Search size={20} color={Colors.textLight} style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Pretraži korisnike..."
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
            <Text style={styles.filtersTitle}>Uloga:</Text>
            <View style={styles.filterOptions}>
              {['all', 'utility_admin', 'finance', 'worker', 'end_user'].map(role => (
                <TouchableOpacity
                  key={role}
                  style={[styles.filterOption, filterRole === role && styles.filterOptionActive]}
                  onPress={() => setFilterRole(role)}
                >
                  <Text style={[styles.filterOptionText, filterRole === role && styles.filterOptionTextActive]}>
                    {role === 'all' ? 'Svi' : getRoleLabel(role)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.filtersTitle}>Status:</Text>
            <View style={styles.filterOptions}>
              {['all', 'active', 'inactive'].map(s => (
                <TouchableOpacity
                  key={s}
                  style={[styles.filterOption, filterStatus === s && styles.filterOptionActive]}
                  onPress={() => setFilterStatus(s)}
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
          data={filteredUsers}
          renderItem={renderUserCard}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.listContainer}
          ListEmptyComponent={
            <EmptyState
              title="Nema korisnika"
              message="Trenutno nema korisnika koji odgovaraju vašoj pretrazi."
              icon={<Users size={48} color={Colors.textLight} />}
              actionLabel="Dodaj novog korisnika"
              onAction={() => router.push('/users/add' as any)}
            />
          }
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        />

        <TouchableOpacity
          style={styles.fab}
          onPress={() => router.push('/users/add' as any)}
          activeOpacity={0.8}
        >
          <Plus size={24} color="#fff" />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#fff' },
  container: { flex: 1, backgroundColor: '#fff' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
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
  filtersContainer: { padding: 16, borderBottomWidth: 1, borderBottomColor: Colors.border },
  filtersTitle: { fontSize: 14, fontWeight: 'bold', color: Colors.text, marginBottom: 8, marginTop: 8 },
  filterOptions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  filterOption: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, backgroundColor: Colors.highlight },
  filterOptionActive: { backgroundColor: Colors.primary },
  filterOptionText: { fontSize: 12, color: Colors.text },
  filterOptionTextActive: { color: '#fff' },
  listContainer: { padding: 16, paddingBottom: Platform.OS === 'android' ? 100 : 80 },
  userCard: { marginBottom: 16 },
  cardContent: { padding: 16 },
  userHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
  userInfo: { flexDirection: 'row', alignItems: 'center' },
  userDetails: { marginLeft: 12 },
  userName: { fontSize: 16, fontWeight: 'bold', color: Colors.text, marginBottom: 4 },
  statusContainer: { flexDirection: 'row', alignItems: 'center' },
  statusIndicator: { width: 8, height: 8, borderRadius: 4, marginRight: 6 },
  statusText: { fontSize: 12, color: Colors.textLight },
  contactInfo: { marginBottom: 8 },
  contactItem: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  contactText: { fontSize: 14, color: Colors.text, marginLeft: 8 },
  cardActions: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: Colors.border, padding: 12 },
  actionButton: { flex: 1, marginRight: 8 },
  deleteButton: { borderColor: Colors.error },
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
