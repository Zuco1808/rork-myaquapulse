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
  AlertTriangle, 
  Search, 
  Filter, 
  ChevronRight, 
  Droplet,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  Menu
} from 'lucide-react-native';
import { Header } from '@/components/layout/Header';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { useAuthStore } from '@/store/auth-store';
import { WaterAlert } from '@/types/location';
import Colors from '@/constants/colors';

// Mock alerts data
const mockAlerts: WaterAlert[] = [
  {
    id: 'a1',
    title: 'Visoka potrošnja',
    message: 'Detektovana neuobičajeno visoka potrošnja na vodomjeru SJV-12345.',
    type: 'high_consumption',
    severity: 'warning',
    meterId: 'm1',
    meterName: 'SJV-12345',
    locationName: 'Zmaja od Bosne 8, Sarajevo',
    companyId: 'c1',
    companyName: 'Vodovod Sarajevo',
    value: 45.2,
    threshold: 30,
    unit: 'm³',
    createdAt: '2023-05-15T08:30:00Z',
    isResolved: false
  },
  {
    id: 'a2',
    title: 'Curenje vode',
    message: 'Detektovano moguće curenje na vodomjeru SJV-23456.',
    type: 'leak',
    severity: 'critical',
    meterId: 'm2',
    meterName: 'SJV-23456',
    locationName: 'Ferhadija 12, Sarajevo',
    companyId: 'c1',
    companyName: 'Vodovod Sarajevo',
    value: null,
    threshold: null,
    unit: null,
    createdAt: '2023-05-14T14:15:00Z',
    isResolved: true
  },
  {
    id: 'a3',
    title: 'Niska potrošnja',
    message: 'Detektovana neuobičajeno niska potrošnja na vodomjeru SJV-34567.',
    type: 'low_consumption',
    severity: 'info',
    meterId: 'm3',
    meterName: 'SJV-34567',
    locationName: 'Titova 18, Sarajevo',
    companyId: 'c1',
    companyName: 'Vodovod Sarajevo',
    value: 0.5,
    threshold: 2,
    unit: 'm³',
    createdAt: '2023-05-13T10:45:00Z',
    isResolved: false
  },
  {
    id: 'a4',
    title: 'Prekid očitanja',
    message: 'Vodomjer SJV-45678 nije poslao očitanje u posljednjih 48 sati.',
    type: 'no_reading',
    severity: 'warning',
    meterId: 'm4',
    meterName: 'SJV-45678',
    locationName: 'Alipašina 22, Sarajevo',
    companyId: 'c1',
    companyName: 'Vodovod Sarajevo',
    value: 48,
    threshold: 24,
    unit: 'h',
    createdAt: '2023-05-12T22:10:00Z',
    isResolved: false
  },
  {
    id: 'a5',
    title: 'Kvar na vodomjeru',
    message: 'Detektovan mogući kvar na vodomjeru SJV-56789.',
    type: 'meter_fault',
    severity: 'critical',
    meterId: 'm5',
    meterName: 'SJV-56789',
    locationName: 'Koševo 5, Sarajevo',
    companyId: 'c1',
    companyName: 'Vodovod Sarajevo',
    value: null,
    threshold: null,
    unit: null,
    createdAt: '2023-05-11T16:20:00Z',
    isResolved: true
  }
];

export default function AlertsScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  
  // Alerts data
  const [alerts, setAlerts] = useState<WaterAlert[]>(mockAlerts);
  const [filteredAlerts, setFilteredAlerts] = useState<WaterAlert[]>(mockAlerts);
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [filterSeverity, setFilterSeverity] = useState('all');
  const [filterResolved, setFilterResolved] = useState('all');
  
  // Check if user has permission to access this screen
  useEffect(() => {
    if (!user) {
      router.replace('/login');
    }
  }, [user, router]);
  
  // Load alerts based on user role
  useEffect(() => {
    loadAlerts();
  }, [user]);
  
  const loadAlerts = () => {
    let filteredData = [...mockAlerts];
    
    // Filter by user role
    if (user && user.role === 'citizen') {
      // Citizens can only see alerts for their meters
      // In a real app, this would filter by user's meter IDs
      filteredData = filteredData.filter(alert => alert.meterId === 'm1');
    } else if (user && user.role === 'admin') {
      // Admins can only see alerts for their company
      filteredData = filteredData.filter(alert => alert.companyId === user.companyId);
    }
    
    setAlerts(filteredData);
    setFilteredAlerts(filteredData);
  };
  
  const onRefresh = () => {
    setRefreshing(true);
    loadAlerts();
    setRefreshing(false);
  };
  
  const applyFilters = () => {
    let filtered = [...alerts];
    
    // Apply search query
    if (searchQuery) {
      filtered = filtered.filter(alert => 
        alert.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        alert.message.toLowerCase().includes(searchQuery.toLowerCase()) ||
        alert.meterName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        alert.locationName.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    
    // Apply severity filter
    if (filterSeverity !== 'all') {
      filtered = filtered.filter(alert => alert.severity === filterSeverity);
    }
    
    // Apply resolved filter
    if (filterResolved !== 'all') {
      const isResolved = filterResolved === 'resolved';
      filtered = filtered.filter(alert => alert.isResolved === isResolved);
    }
    
    setFilteredAlerts(filtered);
  };
  
  useEffect(() => {
    applyFilters();
  }, [searchQuery, filterSeverity, filterResolved]);
  
  const handleSearch = (text: string) => {
    setSearchQuery(text);
  };
  
  const handleFilterSeverityChange = (severity: string) => {
    setFilterSeverity(severity);
  };
  
  const handleFilterResolvedChange = (resolved: string) => {
    setFilterResolved(resolved);
  };
  
  const handleViewAlert = (id: string) => {
    router.push(`/alerts/${id}`);
  };
  
  const handleResolveAlert = (id: string) => {
    Alert.alert(
      "Rješavanje alarma",
      "Da li ste sigurni da želite označiti ovaj alarm kao riješen?",
      [
        {
          text: "Odustani",
          style: "cancel"
        },
        { 
          text: "Riješi", 
          onPress: () => {
            // Update alert status
            const updatedAlerts = alerts.map(alert => 
              alert.id === id 
                ? { ...alert, isResolved: true } 
                : alert
            );
            setAlerts(updatedAlerts);
            applyFilters();
            
            Alert.alert("Uspjeh", "Alarm je označen kao riješen.");
          }
        }
      ]
    );
  };
  
  const renderAlertIcon = (type: WaterAlert['type'], severity: WaterAlert['severity']) => {
    const color = severity === 'critical' ? Colors.error : 
                 severity === 'warning' ? Colors.warning : 
                 Colors.info;
    
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
  
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('bs-BA') + ' ' + date.toLocaleTimeString('bs-BA', { hour: '2-digit', minute: '2-digit' });
  };
  
  const renderAlertCard = ({ item }: { item: WaterAlert }) => {
    const isResolved = item.isResolved;
    
    return (
      <Card style={[styles.alertCard, isResolved && styles.resolvedCard]}>
        <TouchableOpacity 
          style={styles.cardContent}
          onPress={() => handleViewAlert(item.id)}
          activeOpacity={0.7}
        >
          <View style={styles.alertHeader}>
            {renderAlertIcon(item.type, item.severity)}
            <View style={styles.alertInfo}>
              <Text style={styles.alertTitle}>{item.title}</Text>
              <Text style={styles.alertDate}>{formatDate(item.createdAt)}</Text>
            </View>
            {isResolved ? (
              <View style={styles.resolvedBadge}>
                <Text style={styles.resolvedText}>Riješeno</Text>
              </View>
            ) : (
              <ChevronRight size={20} color={Colors.textLight} />
            )}
          </View>
          
          <Text style={styles.alertMessage}>{item.message}</Text>
          
          <View style={styles.alertDetails}>
            <Text style={styles.alertLocation}>
              <Text style={styles.alertDetailLabel}>Lokacija: </Text>
              {item.locationName}
            </Text>
            <Text style={styles.alertMeter}>
              <Text style={styles.alertDetailLabel}>Vodomjer: </Text>
              {item.meterName}
            </Text>
            {item.value !== null && item.threshold !== null && item.unit !== null && (
              <Text style={styles.alertValue}>
                <Text style={styles.alertDetailLabel}>Vrijednost: </Text>
                {item.value} {item.unit} (prag: {item.threshold} {item.unit})
              </Text>
            )}
          </View>
        </TouchableOpacity>
        
        {!isResolved && (user?.role === 'superadmin' || user?.role === 'admin' || user?.role === 'worker') && (
          <View style={styles.cardActions}>
            <TouchableOpacity
              style={styles.resolveButton}
              onPress={() => handleResolveAlert(item.id)}
            >
              <Text style={styles.resolveButtonText}>Označi kao riješeno</Text>
            </TouchableOpacity>
          </View>
        )}
      </Card>
    );
  };
  
  const renderEmptyState = () => {
    return (
      <EmptyState
        title="Nema alarma"
        message="Trenutno nema alarma koji odgovaraju vašoj pretrazi."
        icon={<AlertTriangle size={48} color={Colors.textLight} />}
      />
    );
  };
  
  return (
    <View style={styles.container}>
      <Header 
        title="Alarmi"
        showBack
        leftIcon={<Menu size={24} color={Colors.text} />}
        onLeftPress={() => router.push('/(tabs)')}
      />
      
      <View style={styles.searchContainer}>
        <View style={styles.searchInputContainer}>
          <Search size={20} color={Colors.textLight} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Pretraži alarme..."
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
          <Text style={styles.filtersTitle}>Ozbiljnost:</Text>
          <View style={styles.filterOptions}>
            <TouchableOpacity
              style={[
                styles.filterOption,
                filterSeverity === 'all' && styles.filterOptionActive
              ]}
              onPress={() => handleFilterSeverityChange('all')}
            >
              <Text style={[
                styles.filterOptionText,
                filterSeverity === 'all' && styles.filterOptionTextActive
              ]}>Svi</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[
                styles.filterOption,
                filterSeverity === 'critical' && styles.filterOptionActive,
                styles.criticalOption
              ]}
              onPress={() => handleFilterSeverityChange('critical')}
            >
              <Text style={[
                styles.filterOptionText,
                filterSeverity === 'critical' && styles.filterOptionTextActive
              ]}>Kritični</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[
                styles.filterOption,
                filterSeverity === 'warning' && styles.filterOptionActive,
                styles.warningOption
              ]}
              onPress={() => handleFilterSeverityChange('warning')}
            >
              <Text style={[
                styles.filterOptionText,
                filterSeverity === 'warning' && styles.filterOptionTextActive
              ]}>Upozorenja</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[
                styles.filterOption,
                filterSeverity === 'info' && styles.filterOptionActive,
                styles.infoOption
              ]}
              onPress={() => handleFilterSeverityChange('info')}
            >
              <Text style={[
                styles.filterOptionText,
                filterSeverity === 'info' && styles.filterOptionTextActive
              ]}>Informacije</Text>
            </TouchableOpacity>
          </View>
          
          <Text style={styles.filtersTitle}>Status:</Text>
          <View style={styles.filterOptions}>
            <TouchableOpacity
              style={[
                styles.filterOption,
                filterResolved === 'all' && styles.filterOptionActive
              ]}
              onPress={() => handleFilterResolvedChange('all')}
            >
              <Text style={[
                styles.filterOptionText,
                filterResolved === 'all' && styles.filterOptionTextActive
              ]}>Svi</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[
                styles.filterOption,
                filterResolved === 'active' && styles.filterOptionActive
              ]}
              onPress={() => handleFilterResolvedChange('active')}
            >
              <Text style={[
                styles.filterOptionText,
                filterResolved === 'active' && styles.filterOptionTextActive
              ]}>Aktivni</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[
                styles.filterOption,
                filterResolved === 'resolved' && styles.filterOptionActive
              ]}
              onPress={() => handleFilterResolvedChange('resolved')}
            >
              <Text style={[
                styles.filterOptionText,
                filterResolved === 'resolved' && styles.filterOptionTextActive
              ]}>Riješeni</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
      
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
  resolveButtonText: {
    color: '#fff',
    fontWeight: '500',
    fontSize: 14,
  },
});