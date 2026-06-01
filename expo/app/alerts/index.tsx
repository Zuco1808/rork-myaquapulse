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
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  AlertTriangle,
  Search,
  Filter,
  Droplet,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  Menu,
} from 'lucide-react-native';
import { Header } from '@/components/layout/Header';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { useAuthStore } from '@/store/auth-store';
import { WaterAlert } from '@/types/location';
import {
  getAlerts,
  getAlertsByCompany,
  getAlertsByUser,
  resolveAlert,
} from '@/lib/api/alerts';
import Colors from '@/constants/colors';

const formatDate = (timestamp: number): string => {
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return '—';
  return (
    date.toLocaleDateString('bs-BA') +
    ' ' +
    date.toLocaleTimeString('bs-BA', { hour: '2-digit', minute: '2-digit' })
  );
};

export default function AlertsScreen() {
  const router = useRouter();
  const { user } = useAuthStore();

  // Alerts data
  const [alerts, setAlerts] = useState<WaterAlert[]>([]);
  const [filteredAlerts, setFilteredAlerts] = useState<WaterAlert[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [resolvingId, setResolvingId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [filterSeverity, setFilterSeverity] = useState('all');
  const [filterResolved, setFilterResolved] = useState('all');

  const loadAlerts = useCallback(async () => {
    if (!user) return;
    try {
      let data: WaterAlert[];
      if (user.role === 'citizen') {
        data = await getAlertsByUser(user.id);
      } else if (user.role === 'admin' && user.companyId) {
        data = await getAlertsByCompany(user.companyId);
      } else {
        data = await getAlerts();
      }
      setAlerts(data);
    } catch (error) {
      console.error('Greška pri učitavanju alarma:', error);
      Alert.alert('Greška', 'Nije moguće učitati alarme. Pokušajte ponovo.');
    }
  }, [user]);

  // Redirect unauthenticated users and load alerts
  useEffect(() => {
    if (!user) {
      router.replace('/login');
      return;
    }

    let isMounted = true;
    setIsLoading(true);
    loadAlerts().finally(() => {
      if (isMounted) setIsLoading(false);
    });

    return () => {
      isMounted = false;
    };
  }, [user, router, loadAlerts]);

  const applyFilters = useCallback(() => {
    let filtered = [...alerts];

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (alert) =>
          (alert.title || '').toLowerCase().includes(query) ||
          alert.message.toLowerCase().includes(query) ||
          (alert.meterName || '').toLowerCase().includes(query) ||
          (alert.locationName || '').toLowerCase().includes(query),
      );
    }

    if (filterSeverity !== 'all') {
      filtered = filtered.filter((alert) => alert.severity === filterSeverity);
    }

    if (filterResolved !== 'all') {
      const wantResolved = filterResolved === 'resolved';
      filtered = filtered.filter((alert) => alert.isResolved === wantResolved);
    }

    setFilteredAlerts(filtered);
  }, [alerts, searchQuery, filterSeverity, filterResolved]);

  useEffect(() => {
    applyFilters();
  }, [applyFilters]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadAlerts();
    setRefreshing(false);
  };

  const handleResolveAlert = (id: string) => {
    Alert.alert(
      'Rješavanje alarma',
      'Da li ste sigurni da želite označiti ovaj alarm kao riješen?',
      [
        { text: 'Odustani', style: 'cancel' },
        {
          text: 'Riješi',
          onPress: async () => {
            setResolvingId(id);
            try {
              const updated = await resolveAlert(id);
              setAlerts((prev) =>
                prev.map((alert) => (alert.id === updated.id ? updated : alert)),
              );
              Alert.alert('Uspjeh', 'Alarm je označen kao riješen.');
            } catch (error) {
              console.error('Greška pri rješavanju alarma:', error);
              Alert.alert(
                'Greška',
                'Nije moguće označiti alarm kao riješen. Pokušajte ponovo.',
              );
            } finally {
              setResolvingId(null);
            }
          },
        },
      ],
    );
  };

  const renderAlertIcon = (
    type: WaterAlert['type'],
    severity: WaterAlert['severity'],
  ) => {
    const color =
      severity === 'critical' || severity === 'high'
        ? Colors.error
        : severity === 'warning' || severity === 'medium'
          ? Colors.warning
          : Colors.info;

    switch (type) {
      case 'high_consumption':
        return <ArrowUpRight size={24} color={color} />;
      case 'low_consumption':
        return <ArrowDownRight size={24} color={color} />;
      case 'leak':
        return <Droplet size={24} color={color} />;
      case 'no_reading':
        return <Clock size={24} color={color} />;
      default:
        return <AlertTriangle size={24} color={color} />;
    }
  };

  const canResolve =
    user?.role === 'superadmin' ||
    user?.role === 'admin' ||
    user?.role === 'worker';

  const renderAlertCard = ({ item }: { item: WaterAlert }) => {
    const isResolved = item.isResolved;
    const hasValue =
      item.value != null && item.threshold != null && item.unit != null;

    return (
      <Card style={[styles.alertCard, isResolved && styles.resolvedCard]}>
        <View style={styles.cardContent}>
          <View style={styles.alertHeader}>
            {renderAlertIcon(item.type, item.severity)}
            <View style={styles.alertInfo}>
              <Text style={styles.alertTitle}>{item.title}</Text>
              <Text style={styles.alertDate}>{formatDate(item.createdAt)}</Text>
            </View>
            {isResolved && (
              <View style={styles.resolvedBadge}>
                <Text style={styles.resolvedText}>Riješeno</Text>
              </View>
            )}
          </View>

          <Text style={styles.alertMessage}>{item.message}</Text>

          <View style={styles.alertDetails}>
            {!!item.locationName && (
              <Text style={styles.alertLocation}>
                <Text style={styles.alertDetailLabel}>Lokacija: </Text>
                {item.locationName}
              </Text>
            )}
            {!!item.meterName && (
              <Text style={styles.alertMeter}>
                <Text style={styles.alertDetailLabel}>Vodomjer: </Text>
                {item.meterName}
              </Text>
            )}
            {hasValue && (
              <Text style={styles.alertValue}>
                <Text style={styles.alertDetailLabel}>Vrijednost: </Text>
                {item.value} {item.unit} (prag: {item.threshold} {item.unit})
              </Text>
            )}
          </View>
        </View>

        {!isResolved && canResolve && (
          <View style={styles.cardActions}>
            <TouchableOpacity
              style={[
                styles.resolveButton,
                resolvingId === item.id && styles.resolveButtonDisabled,
              ]}
              onPress={() => handleResolveAlert(item.id)}
              disabled={resolvingId === item.id}
            >
              {resolvingId === item.id ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.resolveButtonText}>Označi kao riješeno</Text>
              )}
            </TouchableOpacity>
          </View>
        )}
      </Card>
    );
  };

  const renderEmptyState = () => (
    <EmptyState
      title="Nema alarma"
      message="Trenutno nema alarma koji odgovaraju vašoj pretrazi."
      icon={<AlertTriangle size={48} color={Colors.textLight} />}
    />
  );

  return (
    <View style={styles.container}>
      <Header
        title="Alarmi"
        showBack
        leftIcon={<Menu size={24} color={Colors.text} />}
        onLeftPress={() => router.push('/(tabs)' as any)}
      />

      <View style={styles.searchContainer}>
        <View style={styles.searchInputContainer}>
          <Search size={20} color={Colors.textLight} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Pretraži alarme..."
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
          <Text style={styles.filtersTitle}>Ozbiljnost:</Text>
          <View style={styles.filterOptions}>
            <TouchableOpacity
              style={[
                styles.filterOption,
                filterSeverity === 'all' && styles.filterOptionActive,
              ]}
              onPress={() => setFilterSeverity('all')}
            >
              <Text
                style={[
                  styles.filterOptionText,
                  filterSeverity === 'all' && styles.filterOptionTextActive,
                ]}
              >
                Svi
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.filterOption,
                styles.criticalOption,
                filterSeverity === 'critical' && styles.filterOptionActive,
              ]}
              onPress={() => setFilterSeverity('critical')}
            >
              <Text
                style={[
                  styles.filterOptionText,
                  filterSeverity === 'critical' && styles.filterOptionTextActive,
                ]}
              >
                Kritični
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.filterOption,
                styles.warningOption,
                filterSeverity === 'warning' && styles.filterOptionActive,
              ]}
              onPress={() => setFilterSeverity('warning')}
            >
              <Text
                style={[
                  styles.filterOptionText,
                  filterSeverity === 'warning' && styles.filterOptionTextActive,
                ]}
              >
                Upozorenja
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.filterOption,
                styles.infoOption,
                filterSeverity === 'info' && styles.filterOptionActive,
              ]}
              onPress={() => setFilterSeverity('info')}
            >
              <Text
                style={[
                  styles.filterOptionText,
                  filterSeverity === 'info' && styles.filterOptionTextActive,
                ]}
              >
                Informacije
              </Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.filtersTitle}>Status:</Text>
          <View style={styles.filterOptions}>
            <TouchableOpacity
              style={[
                styles.filterOption,
                filterResolved === 'all' && styles.filterOptionActive,
              ]}
              onPress={() => setFilterResolved('all')}
            >
              <Text
                style={[
                  styles.filterOptionText,
                  filterResolved === 'all' && styles.filterOptionTextActive,
                ]}
              >
                Svi
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.filterOption,
                filterResolved === 'active' && styles.filterOptionActive,
              ]}
              onPress={() => setFilterResolved('active')}
            >
              <Text
                style={[
                  styles.filterOptionText,
                  filterResolved === 'active' && styles.filterOptionTextActive,
                ]}
              >
                Aktivni
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.filterOption,
                filterResolved === 'resolved' && styles.filterOptionActive,
              ]}
              onPress={() => setFilterResolved('resolved')}
            >
              <Text
                style={[
                  styles.filterOptionText,
                  filterResolved === 'resolved' && styles.filterOptionTextActive,
                ]}
              >
                Riješeni
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Učitavanje alarma...</Text>
        </View>
      ) : (
        <FlatList
          data={filteredAlerts}
          renderItem={renderAlertCard}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContainer}
          ListEmptyComponent={renderEmptyState}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        />
      )}
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
  criticalOption: {
    borderColor: Colors.error,
    borderWidth: 1,
  },
  warningOption: {
    borderColor: Colors.warning,
    borderWidth: 1,
  },
  infoOption: {
    borderColor: Colors.info,
    borderWidth: 1,
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
    paddingBottom: 32,
  },
  alertCard: {
    marginBottom: 16,
  },
  resolvedCard: {
    opacity: 0.7,
  },
  cardContent: {
    padding: 16,
  },
  alertHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  alertInfo: {
    flex: 1,
    marginLeft: 12,
  },
  alertTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 2,
  },
  alertDate: {
    fontSize: 12,
    color: Colors.textLight,
  },
  resolvedBadge: {
    backgroundColor: Colors.success,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 4,
  },
  resolvedText: {
    fontSize: 12,
    color: '#fff',
    fontWeight: '500',
  },
  alertMessage: {
    fontSize: 14,
    color: Colors.text,
    marginBottom: 12,
  },
  alertDetails: {
    backgroundColor: Colors.highlight,
    padding: 12,
    borderRadius: 8,
  },
  alertLocation: {
    fontSize: 14,
    color: Colors.text,
    marginBottom: 4,
  },
  alertMeter: {
    fontSize: 14,
    color: Colors.text,
    marginBottom: 4,
  },
  alertValue: {
    fontSize: 14,
    color: Colors.text,
  },
  alertDetailLabel: {
    fontWeight: 'bold',
  },
  cardActions: {
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    padding: 12,
  },
  resolveButton: {
    backgroundColor: Colors.success,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  resolveButtonDisabled: {
    opacity: 0.6,
  },
  resolveButtonText: {
    color: '#fff',
    fontWeight: '500',
    fontSize: 14,
  },
});
