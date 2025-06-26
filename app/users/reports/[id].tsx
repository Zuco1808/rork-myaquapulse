import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { 
  ArrowLeft, 
  BarChart3, 
  FileText, 
  Droplet, 
  CreditCard,
  ClipboardList,
  Calendar,
  Download,
  Filter,
  TrendingUp,
  TrendingDown
} from 'lucide-react-native';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Avatar } from '@/components/ui/Avatar';
import { mockUsers } from '@/mocks/users';
import { mockReadings, mockWaterMeters, mockBills } from '@/mocks/locations';
import { getTasksByUser } from '@/mocks/tasks';
import { User } from '@/types/user';
import Colors from '@/constants/colors';

export default function UserReportsScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState('month');
  
  const [stats, setStats] = useState({
    totalReadings: 0,
    totalConsumption: 0,
    totalBills: 0,
    totalPaid: 0,
    totalUnpaid: 0,
    completedTasks: 0,
    pendingTasks: 0,
  });
  
  useEffect(() => {
    loadUserData();
  }, [id]);
  
  const loadUserData = () => {
    setIsLoading(true);
    
    // Simulate API call
    setTimeout(() => {
      const foundUser = mockUsers.find(u => u.id === id);
      
      if (foundUser) {
        setUser(foundUser);
        calculateStats(foundUser);
      } else {
        // User not found
        router.back();
      }
      
      setIsLoading(false);
    }, 1000);
  };
  
  const calculateStats = (user: User) => {
    // Calculate different stats based on user role
    let totalReadings = 0;
    let totalConsumption = 0;
    let totalBills = 0;
    let totalPaid = 0;
    let totalUnpaid = 0;
    let completedTasks = 0;
    let pendingTasks = 0;
    
    if (user.role === 'worker') {
      // For workers, count readings they've taken and tasks
      totalReadings = mockReadings.filter(r => r.readBy === user.id).length;
      
      const userTasks = getTasksByUser(user.id);
      completedTasks = userTasks.filter(t => t.status === 'completed').length;
      pendingTasks = userTasks.filter(t => t.status === 'pending' || t.status === 'in_progress').length;
      
      // Calculate total consumption from readings
      totalConsumption = mockReadings
        .filter(r => r.readBy === user.id && r.consumption)
        .reduce((sum, reading) => sum + (reading.consumption || 0), 0);
    } 
    else if (user.role === 'citizen') {
      // For citizens, get their meters and related readings/bills
      const userMeters = mockWaterMeters.filter(m => m.userId === user.id);
      const meterIds = userMeters.map(m => m.id);
      
      totalReadings = mockReadings.filter(r => meterIds.includes(r.meterId)).length;
      
      // Calculate consumption
      totalConsumption = mockReadings
        .filter(r => meterIds.includes(r.meterId) && r.consumption)
        .reduce((sum, reading) => sum + (reading.consumption || 0), 0);
      
      // Calculate bills
      const userBills = mockBills.filter(b => b.userId === user.id);
      totalBills = userBills.length;
      totalPaid = userBills.filter(b => b.status === 'paid').length;
      totalUnpaid = userBills.filter(b => b.status === 'pending' || b.status === 'overdue').length;
    }
    else if (user.role === 'finance') {
      // For finance, show billing stats
      totalBills = mockBills.length;
      totalPaid = mockBills.filter(b => b.status === 'paid').length;
      totalUnpaid = mockBills.filter(b => b.status === 'pending' || b.status === 'overdue').length;
      
      // Calculate total consumption
      totalConsumption = mockReadings
        .filter(r => r.consumption)
        .reduce((sum, reading) => sum + (reading.consumption || 0), 0);
    }
    else {
      // For admin and superadmin, show all stats
      totalReadings = mockReadings.length;
      
      // Calculate total consumption
      totalConsumption = mockReadings
        .filter(r => r.consumption)
        .reduce((sum, reading) => sum + (reading.consumption || 0), 0);
      
      // Calculate bills
      totalBills = mockBills.length;
      totalPaid = mockBills.filter(b => b.status === 'paid').length;
      totalUnpaid = mockBills.filter(b => b.status === 'pending' || b.status === 'overdue').length;
      
      // Calculate tasks
      const allTasks = getTasksByUser(user.id);
      completedTasks = allTasks.filter(t => t.status === 'completed').length;
      pendingTasks = allTasks.filter(t => t.status === 'pending' || t.status === 'in_progress').length;
    }
    
    setStats({
      totalReadings,
      totalConsumption,
      totalBills,
      totalPaid,
      totalUnpaid,
      completedTasks,
      pendingTasks,
    });
  };
  
  const onRefresh = () => {
    setRefreshing(true);
    loadUserData();
    setRefreshing(false);
  };
  
  const handleBack = () => {
    router.back();
  };
  
  const renderUserHeader = () => {
    if (!user) return null;
    
    return (
      <Card style={styles.userCard}>
        <View style={styles.userInfo}>
          <Avatar source={user.avatar} name={user.name} size={60} />
          <View style={styles.userDetails}>
            <Text style={styles.userName}>{user.name}</Text>
            <Text style={styles.userRole}>
              {user.role === 'superadmin' ? 'Super Administrator' : 
               user.role === 'admin' ? 'Administrator' :
               user.role === 'finance' ? 'Finansije' :
               user.role === 'worker' ? 'Radnik' : 'Korisnik'}
            </Text>
            <Text style={styles.userEmail}>{user.email}</Text>
          </View>
        </View>
      </Card>
    );
  };
  
  const renderConsumptionChart = () => {
    // Only show for relevant roles
    if (user?.role === 'worker' && stats.totalConsumption === 0) {
      return null;
    }
    
    return (
      <Card style={styles.chartCard}>
        <View style={styles.chartHeader}>
          <Text style={styles.chartTitle}>Potrošnja vode</Text>
          <View style={styles.periodSelector}>
            <TouchableOpacity
              style={[
                styles.periodButton,
                selectedPeriod === 'week' && styles.periodButtonActive,
              ]}
              onPress={() => setSelectedPeriod('week')}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.periodButtonText,
                  selectedPeriod === 'week' && styles.periodButtonTextActive,
                ]}
              >
                Sedmica
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[
                styles.periodButton,
                selectedPeriod === 'month' && styles.periodButtonActive,
              ]}
              onPress={() => setSelectedPeriod('month')}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.periodButtonText,
                  selectedPeriod === 'month' && styles.periodButtonTextActive,
                ]}
              >
                Mjesec
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[
                styles.periodButton,
                selectedPeriod === 'year' && styles.periodButtonActive,
              ]}
              onPress={() => setSelectedPeriod('year')}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.periodButtonText,
                  selectedPeriod === 'year' && styles.periodButtonTextActive,
                ]}
              >
                Godina
              </Text>
            </TouchableOpacity>
          </View>
        </View>
        
        {/* Mock chart - in a real app, replace with actual chart component */}
        <View style={styles.mockChart}>
          <View style={[styles.mockBar, { height: 80 }]} />
          <View style={[styles.mockBar, { height: 120 }]} />
          <View style={[styles.mockBar, { height: 60 }]} />
          <View style={[styles.mockBar, { height: 150 }]} />
          <View style={[styles.mockBar, { height: 100 }]} />
          <View style={[styles.mockBar, { height: 90 }]} />
          <View style={[styles.mockBar, { height: 130 }]} />
        </View>
        
        <View style={styles.chartFooter}>
          <View style={styles.chartStat}>
            <Text style={styles.chartStatValue}>{stats.totalConsumption} m³</Text>
            <Text style={styles.chartStatLabel}>Ukupno</Text>
          </View>
          
          <View style={styles.chartStat}>
            <Text style={styles.chartStatValue}>
              {stats.totalConsumption > 0 && stats.totalReadings > 0 
                ? (stats.totalConsumption / stats.totalReadings).toFixed(1) 
                : '0'} m³
            </Text>
            <Text style={styles.chartStatLabel}>Prosjek</Text>
          </View>
          
          <View style={styles.chartStat}>
            <View style={styles.trendContainer}>
              <TrendingUp size={16} color={Colors.error} />
              <Text style={[styles.trendText, styles.trendUp]}>+5.2%</Text>
            </View>
            <Text style={styles.chartStatLabel}>Trend</Text>
          </View>
        </View>
      </Card>
    );
  };
  
  const renderReadingsStats = () => {
    // Only show for relevant roles
    if (user?.role === 'finance') {
      return null;
    }
    
    return (
      <Card style={styles.statsCard}>
        <View style={styles.statsHeader}>
          <FileText size={24} color={Colors.primary} />
          <Text style={styles.statsTitle}>Očitanja</Text>
        </View>
        
        <View style={styles.statsContent}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{stats.totalReadings}</Text>
            <Text style={styles.statLabel}>Ukupno očitanja</Text>
          </View>
          
          {user?.role === 'worker' && (
            <>
              <View style={styles.statDivider} />
              
              <View style={styles.statItem}>
                <Text style={styles.statValue}>
                  {stats.totalReadings > 0 
                    ? (stats.totalConsumption / stats.totalReadings).toFixed(1) 
                    : '0'} m³
                </Text>
                <Text style={styles.statLabel}>Prosječna potrošnja</Text>
              </View>
            </>
          )}
          
          {(user?.role === 'citizen' || user?.role === 'admin' || user?.role === 'superadmin') && (
            <>
              <View style={styles.statDivider} />
              
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{stats.totalConsumption} m³</Text>
                <Text style={styles.statLabel}>Ukupna potrošnja</Text>
              </View>
            </>
          )}
        </View>
        
        <Button
          title="Pregled svih očitanja"
          variant="outline"
          leftIcon={<FileText size={16} color={Colors.primary} />}
          onPress={() => console.log('View all readings')}
          style={styles.statsButton}
        />
      </Card>
    );
  };
  
  const renderBillingStats = () => {
    // Only show for relevant roles
    if (user?.role === 'worker') {
      return null;
    }
    
    return (
      <Card style={styles.statsCard}>
        <View style={styles.statsHeader}>
          <CreditCard size={24} color={Colors.primary} />
          <Text style={styles.statsTitle}>Računi</Text>
        </View>
        
        <View style={styles.statsContent}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{stats.totalBills}</Text>
            <Text style={styles.statLabel}>Ukupno računa</Text>
          </View>
          
          <View style={styles.statDivider} />
          
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{stats.totalPaid}</Text>
            <Text style={styles.statLabel}>Plaćeno</Text>
          </View>
          
          <View style={styles.statDivider} />
          
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{stats.totalUnpaid}</Text>
            <Text style={styles.statLabel}>Neplaćeno</Text>
          </View>
        </View>
        
        <Button
          title="Pregled svih računa"
          variant="outline"
          leftIcon={<CreditCard size={16} color={Colors.primary} />}
          onPress={() => console.log('View all bills')}
          style={styles.statsButton}
        />
      </Card>
    );
  };
  
  const renderTasksStats = () => {
    // Only show for workers
    if (user?.role !== 'worker' && user?.role !== 'admin' && user?.role !== 'superadmin') {
      return null;
    }
    
    return (
      <Card style={styles.statsCard}>
        <View style={styles.statsHeader}>
          <ClipboardList size={24} color={Colors.primary} />
          <Text style={styles.statsTitle}>Zadaci</Text>
        </View>
        
        <View style={styles.statsContent}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{stats.completedTasks + stats.pendingTasks}</Text>
            <Text style={styles.statLabel}>Ukupno zadataka</Text>
          </View>
          
          <View style={styles.statDivider} />
          
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{stats.completedTasks}</Text>
            <Text style={styles.statLabel}>Završeno</Text>
          </View>
          
          <View style={styles.statDivider} />
          
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{stats.pendingTasks}</Text>
            <Text style={styles.statLabel}>U toku</Text>
          </View>
        </View>
        
        <Button
          title="Pregled svih zadataka"
          variant="outline"
          leftIcon={<ClipboardList size={16} color={Colors.primary} />}
          onPress={() => console.log('View all tasks')}
          style={styles.statsButton}
        />
      </Card>
    );
  };
  
  const renderReportsList = () => {
    const reports = [
      {
        id: '1',
        title: 'Mjesečni izvještaj aktivnosti',
        description: 'Detaljan pregled aktivnosti korisnika za juni 2023.',
        date: '01.07.2023',
      },
      {
        id: '2',
        title: 'Izvještaj o potrošnji',
        description: 'Pregled potrošnje vode po mjesecima.',
        date: '15.06.2023',
      },
      {
        id: '3',
        title: 'Finansijski izvještaj',
        description: 'Pregled naplate i dugovanja.',
        date: '01.06.2023',
      },
    ];
    
    return (
      <View style={styles.reportsContainer}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Izvještaji</Text>
          <TouchableOpacity 
            style={styles.filterButton}
            activeOpacity={0.7}
          >
            <Filter size={20} color={Colors.text} />
          </TouchableOpacity>
        </View>
        
        {reports.map(report => (
          <Card key={report.id} style={styles.reportCard}>
            <View style={styles.reportHeader}>
              <FileText size={24} color={Colors.primary} />
              <View style={styles.reportTitleContainer}>
                <Text style={styles.reportTitle}>{report.title}</Text>
                <Text style={styles.reportDate}>
                  <Calendar size={12} color={Colors.textLight} style={styles.reportDateIcon} />
                  {' '}{report.date}
                </Text>
              </View>
            </View>
            
            <Text style={styles.reportDescription}>
              {report.description}
            </Text>
            
            <View style={styles.reportActions}>
              <Button
                title="Preuzmi PDF"
                variant="outline"
                size="small"
                leftIcon={<Download size={16} color={Colors.primary} />}
                style={styles.reportButton}
                onPress={() => console.log('Download PDF', report.id)}
              />
              
              <Button
                title="Pregled"
                size="small"
                style={styles.reportButton}
                onPress={() => console.log('View report', report.id)}
              />
            </View>
          </Card>
        ))}
      </View>
    );
  };
  
  if (isLoading && !refreshing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>Učitavanje izvještaja...</Text>
      </View>
    );
  }
  
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={handleBack}
          activeOpacity={0.7}
        >
          <ArrowLeft size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Izvještaji korisnika</Text>
        <View style={styles.placeholder} />
      </View>
      
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {renderUserHeader()}
        {renderConsumptionChart()}
        {renderReadingsStats()}
        {renderBillingStats()}
        {renderTasksStats()}
        {renderReportsList()}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  backButton: {
    padding: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.text,
  },
  placeholder: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: Colors.textLight,
  },
  userCard: {
    marginBottom: 16,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  userDetails: {
    marginLeft: 16,
  },
  userName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 4,
  },
  userRole: {
    fontSize: 14,
    color: Colors.primary,
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 14,
    color: Colors.textLight,
  },
  chartCard: {
    marginBottom: 16,
  },
  chartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  chartTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.text,
  },
  periodSelector: {
    flexDirection: 'row',
    backgroundColor: Colors.card,
    borderRadius: 8,
    overflow: 'hidden',
  },
  periodButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  periodButtonActive: {
    backgroundColor: Colors.primary,
  },
  periodButtonText: {
    fontSize: 12,
    color: Colors.textLight,
  },
  periodButtonTextActive: {
    color: '#fff',
    fontWeight: '500',
  },
  mockChart: {
    height: 180,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  mockBar: {
    width: 30,
    backgroundColor: Colors.primary,
    borderRadius: 4,
    marginHorizontal: 4,
  },
  chartFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  chartStat: {
    alignItems: 'center',
  },
  chartStatValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 4,
  },
  chartStatLabel: {
    fontSize: 12,
    color: Colors.textLight,
  },
  trendContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  trendText: {
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 4,
  },
  trendUp: {
    color: Colors.error,
  },
  trendDown: {
    color: Colors.success,
  },
  statsCard: {
    marginBottom: 16,
  },
  statsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  statsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.text,
    marginLeft: 12,
  },
  statsContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: Colors.textLight,
    textAlign: 'center',
  },
  statDivider: {
    width: 1,
    height: '100%',
    backgroundColor: Colors.border,
  },
  statsButton: {
    alignSelf: 'center',
  },
  reportsContainer: {
    marginTop: 8,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.text,
  },
  filterButton: {
    padding: 8,
  },
  reportCard: {
    marginBottom: 16,
  },
  reportHeader: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  reportTitleContainer: {
    flex: 1,
    marginLeft: 12,
  },
  reportTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 4,
  },
  reportDate: {
    fontSize: 12,
    color: Colors.textLight,
    flexDirection: 'row',
    alignItems: 'center',
  },
  reportDateIcon: {
    marginRight: 4,
  },
  reportDescription: {
    fontSize: 14,
    color: Colors.textLight,
    marginBottom: 16,
  },
  reportActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  reportButton: {
    marginLeft: 8,
  },
});