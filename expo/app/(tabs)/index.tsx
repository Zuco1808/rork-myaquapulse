import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Platform,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  Users, Droplet, MapPin, CreditCard, BarChart, Bell,
  ClipboardList, Settings, Building, TrendingUp,
  Clock, AlertTriangle, CheckCircle, XCircle,
} from 'lucide-react-native';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Header } from '@/components/layout/Header';
import { Drawer } from '@/components/layout/Drawer';
import { useAuthStore } from '@/store/auth-store';
import { getBills } from '@/lib/api/bills';
import { getReadings, updateReadingStatus } from '@/lib/api/readings';
import { getMeters } from '@/lib/api/meters';
import Colors from '@/constants/colors';

const LOGO_URL = 'https://i.imgur.com/Ql4jQMl.png';

export default function HomeScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [dashboardLoading, setDashboardLoading] = useState(false);
  const [stats, setStats] = useState({ activeMeters: 0, pendingReadings: 0, unpaidBills: 0, overdueAmount: 0 });
  const [pendingReadingsList, setPendingReadingsList] = useState<any[]>([]);
  const [unpaidBillsList, setUnpaidBillsList] = useState<any[]>([]);
  const [monthlyData, setMonthlyData] = useState<{ label: string; value: number }[]>([]);
  
  useEffect(() => {
    if (!user) {
      router.replace('/login');
    }
  }, [user, router]);

  useEffect(() => {
    if (user?.role === 'admin' || user?.role === 'superadmin') {
      loadDashboard();
    }
  }, [user]);

  const loadDashboard = async () => {
    setDashboardLoading(true);
    try {
      const [bills, readings, meters] = await Promise.all([
        getBills().catch(() => []),
        getReadings().catch(() => []),
        getMeters().catch(() => []),
      ]);

      const activeMeters = (meters as any[]).filter(m => m.status === 'active').length;
      const pendingR = (readings as any[]).filter(r => r.status === 'pending');
      const unpaidB = (bills as any[]).filter(b => b.status === 'pending' || b.status === 'issued' || b.status === 'overdue');
      const overdueB = (bills as any[]).filter(b => b.status === 'overdue');
      const overdueAmount = overdueB.reduce((s: number, b: any) => s + (b.amount || 0), 0);

      setStats({ activeMeters, pendingReadings: pendingR.length, unpaidBills: unpaidB.length, overdueAmount });
      setPendingReadingsList(pendingR.slice(0, 3));
      setUnpaidBillsList(unpaidB.slice(0, 3));

      // Monthly consumption — last 6 months from verified readings
      const now = new Date();
      const monthly = Array.from({ length: 6 }, (_, i) => {
        const d = new Date(now.getFullYear(), now.getMonth() - 5 + i, 1);
        const total = (readings as any[])
          .filter(r => {
            const rd = new Date(r.readingDate);
            return r.status === 'verified' && r.consumption && rd.getFullYear() === d.getFullYear() && rd.getMonth() === d.getMonth();
          })
          .reduce((s: number, r: any) => s + (r.consumption || 0), 0);
        return { label: d.toLocaleDateString('bs-BA', { month: 'short' }), value: Math.round(total) };
      });
      setMonthlyData(monthly);
    } catch {
      // keep default zeros
    } finally {
      setDashboardLoading(false);
    }
  };

  const handleDashboardVerify = async (id: string) => {
    try {
      await updateReadingStatus(id, 'verified');
      setPendingReadingsList(prev => prev.filter(r => r.id !== id));
      setStats(prev => ({ ...prev, pendingReadings: Math.max(0, prev.pendingReadings - 1) }));
    } catch {}
  };

  const handleDashboardReject = async (id: string) => {
    try {
      await updateReadingStatus(id, 'rejected');
      setPendingReadingsList(prev => prev.filter(r => r.id !== id));
      setStats(prev => ({ ...prev, pendingReadings: Math.max(0, prev.pendingReadings - 1) }));
    } catch {}
  };

  const formatDate = (ts: number) => new Date(ts).toLocaleDateString('bs-BA', { day: '2-digit', month: '2-digit' });
  
  const handleNavigate = (route: string) => {
    router.push(route as any);
  };
  
  // Define menu items based on user role
  const getMenuItems = () => {
    if (!user) return [];
    
    const commonItems = [
      {
        title: 'Računi',
        icon: <CreditCard size={24} color={Colors.primary} />,
        route: '/bills',
        description: 'Pregled i plaćanje računa',
      },
      {
        title: 'Potrošnja',
        icon: <BarChart size={24} color={Colors.primary} />,
        route: '/consumption',
        description: 'Analiza potrošnje vode',
      },
      {
        title: 'Obavještenja',
        icon: <Bell size={24} color={Colors.primary} />,
        route: '/notifications',
        description: 'Pregled obavještenja',
      },
      {
        title: 'Podrška',
        icon: <Settings size={24} color={Colors.primary} />,
        route: '/support',
        description: 'Kontakt i pomoć',
      },
    ];
    
    // Admin and superadmin see all menu items
    if (user.role === 'superadmin' || user.role === 'admin') {
      return [
        {
          title: 'Korisnici',
          icon: <Users size={24} color={Colors.primary} />,
          route: '/users',
          description: 'Upravljanje korisnicima',
        },
        {
          title: 'Vodomjeri',
          icon: <Droplet size={24} color={Colors.primary} />,
          route: '/meters',
          description: 'Upravljanje vodomjerima',
        },
        {
          title: 'Lokacije',
          icon: <MapPin size={24} color={Colors.primary} />,
          route: '/locations',
          description: 'Upravljanje lokacijama',
        },
        {
          title: 'Kompanije',
          icon: <Building size={24} color={Colors.primary} />,
          route: '/companies',
          description: 'Upravljanje kompanijama',
        },
        ...commonItems,
      ];
    }
    
    // Finance users see billing and reports filtered by permissions
    if (user.role === 'finance') {
      const items = [];
      if (user.permissions?.canManageBilling) {
        items.push({
          title: 'Računi',
          icon: <CreditCard size={24} color={Colors.primary} />,
          route: '/bills',
          description: 'Upravljanje računima',
        });
      }
      if (user.permissions?.canViewAllData) {
        items.push({
          title: 'Izvještaji',
          icon: <BarChart size={24} color={Colors.primary} />,
          route: '/reports',
          description: 'Finansijski izvještaji',
        });
      }
      if (user.permissions?.canManageUsers) {
        items.push({
          title: 'Korisnici',
          icon: <Users size={24} color={Colors.primary} />,
          route: '/users',
          description: 'Pregled korisnika',
        });
      }
      if (user.permissions?.canSendNotifications) {
        items.push({
          title: 'Obavještenja',
          icon: <Bell size={24} color={Colors.primary} />,
          route: '/notifications/send',
          description: 'Slanje obavještenja',
        });
      }
      return items;
    }

    // Workers see tasks and readings filtered by permissions
    if (user.role === 'worker') {
      const items = [];
      if (user.permissions?.canManageTasks) {
        items.push({
          title: 'Zadaci',
          icon: <ClipboardList size={24} color={Colors.primary} />,
          route: '/tasks',
          description: 'Radni zadaci',
        });
      }
      if (user.permissions?.canReadMeters) {
        items.push({
          title: 'Očitanja',
          icon: <Droplet size={24} color={Colors.primary} />,
          route: '/readings',
          description: 'Očitanje vodomjera',
        });
      }
      return [...items, ...commonItems];
    }

    // Maintenance users see tasks and meters filtered by permissions
    if (user.role === 'maintenance') {
      const items = [];
      if (user.permissions?.canManageTasks) {
        items.push({
          title: 'Zadaci',
          icon: <ClipboardList size={24} color={Colors.primary} />,
          route: '/tasks',
          description: 'Zadaci održavanja',
        });
      }
      if (user.permissions?.canReadMeters) {
        items.push({
          title: 'Vodomjeri',
          icon: <Droplet size={24} color={Colors.primary} />,
          route: '/meters',
          description: 'Pregled vodomjera',
        });
      }
      return [...items, ...commonItems];
    }

    // Citizens see basic menu items filtered by permissions
    const citizenItems = [];
    citizenItems.push({
      title: 'Moj pregled',
      icon: <Droplet size={24} color={Colors.primary} />,
      route: '/my-meters',
      description: 'Vodomjeri i dugovanja',
    });
    if (user.permissions?.canManageBilling) {
      citizenItems.push({
        title: 'Računi',
        icon: <CreditCard size={24} color={Colors.primary} />,
        route: '/bills',
        description: 'Pregled i plaćanje računa',
      });
    }
    if (user.permissions?.canReadMeters) {
      citizenItems.push({
        title: 'Potrošnja',
        icon: <BarChart size={24} color={Colors.primary} />,
        route: '/consumption',
        description: 'Analiza potrošnje vode',
      });
    }
    citizenItems.push(
      {
        title: 'Obavještenja',
        icon: <Bell size={24} color={Colors.primary} />,
        route: '/notifications',
        description: 'Pregled obavještenja',
      },
      {
        title: 'Podrška',
        icon: <Settings size={24} color={Colors.primary} />,
        route: '/support',
        description: 'Kontakt i pomoć',
      }
    );
    return citizenItems;
  };
  
  const menuItems = getMenuItems();
  
  return (
    <View style={styles.container}>
      <Header 
        title="MyAquaPulse" 
        showMenu
        onLeftPress={() => setIsDrawerOpen(true)}
      />
      
      <Drawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
      />
      
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.welcomeSection}>
          <Image
            source={{ uri: LOGO_URL }}
            style={styles.logo}
            resizeMode="contain"
          />
          <Text style={styles.welcomeText}>
            Dobrodošli, {user?.name || 'Korisniče'}!
          </Text>
          <Text style={styles.roleText}>{getRoleLabel(user?.role)}</Text>
        </View>

        {/* Dashboard for admin/superadmin */}
        {(user?.role === 'admin' || user?.role === 'superadmin') && (
          <>
            {/* Stats */}
            {dashboardLoading ? (
              <ActivityIndicator color={Colors.primary} style={{ marginBottom: 16 }} />
            ) : (
              <View style={styles.statsGrid}>
                <TouchableOpacity style={styles.statCard} onPress={() => router.push('/meters' as any)} activeOpacity={0.8}>
                  <View style={[styles.statIcon, { backgroundColor: '#e8f4ff' }]}>
                    <Droplet size={20} color={Colors.primary} />
                  </View>
                  <Text style={styles.statValue}>{stats.activeMeters}</Text>
                  <Text style={styles.statLabel}>Aktivni vodomjeri</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.statCard} onPress={() => router.push('/readings' as any)} activeOpacity={0.8}>
                  <View style={[styles.statIcon, { backgroundColor: '#fff8e1' }]}>
                    <Clock size={20} color={Colors.warning} />
                  </View>
                  <Text style={[styles.statValue, stats.pendingReadings > 0 && { color: Colors.warning }]}>
                    {stats.pendingReadings}
                  </Text>
                  <Text style={styles.statLabel}>Čekaju verifikaciju</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.statCard} onPress={() => router.push('/bills' as any)} activeOpacity={0.8}>
                  <View style={[styles.statIcon, { backgroundColor: '#fff3f3' }]}>
                    <CreditCard size={20} color={Colors.error} />
                  </View>
                  <Text style={[styles.statValue, stats.unpaidBills > 0 && { color: Colors.error }]}>
                    {stats.unpaidBills}
                  </Text>
                  <Text style={styles.statLabel}>Neplaćeni računi</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.statCard} onPress={() => router.push('/bills' as any)} activeOpacity={0.8}>
                  <View style={[styles.statIcon, { backgroundColor: '#fff3f3' }]}>
                    <AlertTriangle size={20} color={Colors.error} />
                  </View>
                  <Text style={[styles.statValue, { fontSize: 16 }, stats.overdueAmount > 0 && { color: Colors.error }]}>
                    {stats.overdueAmount.toFixed(0)} KM
                  </Text>
                  <Text style={styles.statLabel}>Prekoračeni iznos</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Monthly consumption bar chart */}
            <Card style={styles.chartCard}>
              <View style={styles.chartHeader}>
                <TrendingUp size={16} color={Colors.primary} />
                <Text style={styles.chartTitle}>Potrošnja — zadnjih 6 mjeseci (m³)</Text>
              </View>
              {monthlyData.length > 0 ? (() => {
                const maxVal = Math.max(...monthlyData.map(d => d.value), 1);
                return (
                  <View style={styles.chart}>
                    {monthlyData.map((item, i) => (
                      <View key={i} style={styles.barWrapper}>
                        {item.value > 0 && (
                          <Text style={styles.barValueLabel}>{item.value}</Text>
                        )}
                        <View style={styles.barTrack}>
                          <View style={[styles.bar, { height: Math.max((item.value / maxVal) * 100, item.value > 0 ? 4 : 2) }]} />
                        </View>
                        <Text style={styles.barMonthLabel}>{item.label}</Text>
                      </View>
                    ))}
                  </View>
                );
              })() : (
                <Text style={styles.chartEmpty}>Nema podataka o potrošnji</Text>
              )}
            </Card>

            {/* Pending readings */}
            {pendingReadingsList.length > 0 && (
              <Card style={styles.sectionCard}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>Na čekanju ({stats.pendingReadings})</Text>
                  <TouchableOpacity onPress={() => router.push('/readings' as any)}>
                    <Text style={styles.sectionLink}>Vidi sve</Text>
                  </TouchableOpacity>
                </View>
                {pendingReadingsList.map((r) => (
                  <View key={r.id} style={styles.readingRow}>
                    <View style={styles.readingInfo}>
                      <Text style={styles.readingSerial}>{r.meterSerialNumber || 'N/A'}</Text>
                      <Text style={styles.readingMeta}>
                        {formatDate(r.readingDate)} · {r.consumption?.toFixed(1) ?? '—'} m³
                      </Text>
                    </View>
                    <View style={styles.readingActions}>
                      <TouchableOpacity style={styles.verifyBtn} onPress={() => handleDashboardVerify(r.id)} activeOpacity={0.8}>
                        <CheckCircle size={14} color="#fff" />
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.rejectBtn} onPress={() => handleDashboardReject(r.id)} activeOpacity={0.8}>
                        <XCircle size={14} color="#fff" />
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
              </Card>
            )}

            {/* Unpaid bills */}
            {unpaidBillsList.length > 0 && (
              <Card style={styles.sectionCard}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>Neplaćeni računi ({stats.unpaidBills})</Text>
                  <TouchableOpacity onPress={() => router.push('/bills' as any)}>
                    <Text style={styles.sectionLink}>Vidi sve</Text>
                  </TouchableOpacity>
                </View>
                {unpaidBillsList.map((b) => (
                  <View key={b.id} style={styles.billRow}>
                    <View style={styles.billInfo}>
                      <Text style={styles.billUser}>{b.userName || 'Nepoznat korisnik'}</Text>
                      <Text style={styles.billMeta}>Rok: {formatDate(b.dueDate)}</Text>
                    </View>
                    <View style={styles.billRight}>
                      <Text style={[styles.billAmount, b.status === 'overdue' && { color: Colors.error }]}>
                        {b.amount?.toFixed(2)} KM
                      </Text>
                      <View style={[styles.billStatusBadge, b.status === 'overdue' && styles.billStatusOverdue]}>
                        <Text style={styles.billStatusText}>
                          {b.status === 'overdue' ? 'Prekoračen' : 'Izdat'}
                        </Text>
                      </View>
                    </View>
                  </View>
                ))}
              </Card>
            )}
          </>
        )}
        
        <View style={styles.menuGrid}>
          {menuItems.map((item, index) => (
            <TouchableOpacity
              key={index}
              style={styles.menuItem}
              onPress={() => handleNavigate(item.route)}
              activeOpacity={0.7}
            >
              <Card style={styles.menuCard}>
                <View style={styles.menuIconContainer}>
                  {item.icon}
                </View>
                <Text style={styles.menuTitle}>{item.title}</Text>
                <Text style={styles.menuDescription}>{item.description}</Text>
              </Card>
            </TouchableOpacity>
          ))}
        </View>
        
        {user?.role === 'citizen' &&
          (user?.permissions?.canReadMeters || user?.permissions?.canReportIssues) && (
          <Card style={styles.quickActionsCard}>
            <Text style={styles.quickActionsTitle}>Brze akcije</Text>
            <View style={styles.quickActionsButtons}>
              {user?.permissions?.canReadMeters && (
                <Button
                  title="Očitaj vodomjer"
                  onPress={() => router.push('/readings' as any)}
                  style={styles.quickActionButton}
                />
              )}
              {user?.permissions?.canReportIssues && (
                <Button
                  title="Prijavi problem"
                  variant="outline"
                  onPress={() => router.push('/support/report-issue' as any)}
                  style={styles.quickActionButton}
                />
              )}
            </View>
          </Card>
        )}
      </ScrollView>
    </View>
  );
}

const getRoleLabel = (role?: string) => {
  switch (role) {
    case 'superadmin':
      return 'Super Administrator';
    case 'admin':
      return 'Administrator';
    case 'finance':
      return 'Finansije';
    case 'worker':
      return 'Radnik';
    case 'maintenance':
      return 'Održavanje';
    case 'citizen':
      return 'Građanin';
    default:
      return '';
  }
};

const { width } = Dimensions.get('window');
const itemWidth = (width - 48) / 2; // 2 columns with 16px padding on each side and 16px gap

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: Platform.OS === 'android' ? 100 : 80, // Extra padding for Android
  },
  welcomeSection: {
    alignItems: 'center',
    marginBottom: 24,
  },
  logo: {
    width: 120,
    height: 120,
    marginBottom: 16,
  },
  welcomeText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 4,
  },
  roleText: {
    fontSize: 16,
    color: Colors.textLight,
  },
  menuGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  menuItem: {
    width: itemWidth,
    marginBottom: 16,
  },
  menuCard: {
    padding: 16,
    height: 140,
    justifyContent: 'center',
  },
  menuIconContainer: {
    marginBottom: 12,
  },
  menuTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 4,
  },
  menuDescription: {
    fontSize: 12,
    color: Colors.textLight,
  },
  quickActionsCard: {
    padding: 16,
    marginBottom: 16,
  },
  quickActionsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 16,
  },
  quickActionsButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  quickActionButton: {
    flex: 1,
    marginHorizontal: 8,
  },
  // Dashboard styles
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    minWidth: (width - 48) / 2,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  statIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 12,
    color: Colors.textLight,
  },
  chartCard: {
    padding: 16,
    marginBottom: 16,
  },
  chartHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 16,
  },
  chartTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.text,
  },
  chart: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: 130,
    gap: 6,
  },
  barWrapper: {
    flex: 1,
    alignItems: 'center',
    height: 130,
    justifyContent: 'flex-end',
  },
  barTrack: {
    width: '100%',
    height: 100,
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  bar: {
    width: '70%',
    backgroundColor: Colors.primary,
    borderRadius: 4,
    minHeight: 2,
  },
  barValueLabel: {
    fontSize: 9,
    color: Colors.textLight,
    marginBottom: 2,
  },
  barMonthLabel: {
    fontSize: 10,
    color: Colors.textLight,
    marginTop: 4,
    textTransform: 'capitalize',
  },
  chartEmpty: {
    fontSize: 13,
    color: Colors.textLight,
    textAlign: 'center',
    paddingVertical: 16,
  },
  sectionCard: {
    padding: 14,
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.text,
  },
  sectionLink: {
    fontSize: 13,
    color: Colors.primary,
    fontWeight: '500',
  },
  readingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: Colors.highlight,
  },
  readingInfo: {
    flex: 1,
  },
  readingSerial: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.text,
  },
  readingMeta: {
    fontSize: 12,
    color: Colors.textLight,
    marginTop: 2,
  },
  readingActions: {
    flexDirection: 'row',
    gap: 6,
    marginLeft: 8,
  },
  verifyBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: Colors.success,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rejectBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: Colors.error,
    alignItems: 'center',
    justifyContent: 'center',
  },
  billRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: Colors.highlight,
  },
  billInfo: {
    flex: 1,
  },
  billUser: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.text,
  },
  billMeta: {
    fontSize: 12,
    color: Colors.textLight,
    marginTop: 2,
  },
  billRight: {
    alignItems: 'flex-end',
    gap: 4,
  },
  billAmount: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.text,
  },
  billStatusBadge: {
    backgroundColor: '#e8f4ff',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  billStatusOverdue: {
    backgroundColor: '#fff3f3',
  },
  billStatusText: {
    fontSize: 10,
    color: Colors.textLight,
    fontWeight: '500',
  },
});