// app/(tabs)/index.tsx
import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Image, Platform, Dimensions, ActivityIndicator
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import {
  Users, Droplet, MapPin, CreditCard, BarChart,
  Bell, ClipboardList, Settings, Building,
  CheckCircle, AlertCircle, FileText, Zap
} from 'lucide-react-native';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useAuthStore } from '@/store/auth-store';
import { usePermissions } from '@/lib/use-permissions';
import { supabase } from '@/lib/supabase';
import Colors from '@/constants/colors';

const LOGO_URL = 'https://i.imgur.com/Ql4jQMl.png';

interface StatCard {
  label: string;
  value: number | string;
  icon: React.ReactNode;
  color: string;
  route?: string;
}

export default function HomeScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { isEndUser } = usePermissions();
  const [stats, setStats] = useState<StatCard[]>([]);
  const [utilityName, setUtilityName] = useState('');
  const [statsLoading, setStatsLoading] = useState(false);

  useEffect(() => {
    if (!user) router.replace('/login');
  }, [user, router]);

  useFocusEffect(
    useCallback(() => {
      if (user) loadStats();
    }, [user])
  );

  const loadStats = async () => {
    if (!user) return;
    setStatsLoading(true);
    try {
      const roleStats = await fetchStatsByRole(user.role, user.utility_id, user.id);
      setStats(roleStats);

      if (user.utility_id && ['utility_admin', 'finance', 'worker'].includes(user.role)) {
        const { data } = await supabase
          .from('water_utilities')
          .select('name')
          .eq('id', user.utility_id)
          .single();
        setUtilityName(data?.name || '');
      }
    } finally {
      setStatsLoading(false);
    }
  };

  const fetchStatsByRole = async (
    role: string,
    utilityId?: string,
    userId?: string
  ): Promise<StatCard[]> => {
    switch (role) {
      case 'super_admin': {
        const [{ count: usersCount }, { count: utilitiesCount }, { count: connectionsCount }, { count: pendingCount }, { count: distributorsCount }] =
          await Promise.all([
            supabase.from('profiles').select('*', { count: 'exact', head: true }),
            supabase.from('water_utilities').select('*', { count: 'exact', head: true }).eq('is_active', true),
            supabase.from('connections').select('*', { count: 'exact', head: true }).eq('is_active', true),
            supabase.from('invoices').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
            supabase.from('distributors').select('*', { count: 'exact', head: true }).eq('is_active', true),
          ]);
        return [
          { label: 'Distributeri', value: distributorsCount ?? 0, icon: <Building size={20} color="#fff" />, color: '#673AB7', route: '/distributors' },
          { label: 'Aktivnih vodovoda', value: utilitiesCount ?? 0, icon: <Zap size={20} color="#fff" />, color: '#9C27B0', route: '/companies' },
          { label: 'Ukupno korisnika', value: usersCount ?? 0, icon: <Users size={20} color="#fff" />, color: Colors.primary, route: '/users' },
          { label: 'Aktivnih priključaka', value: connectionsCount ?? 0, icon: <Droplet size={20} color="#fff" />, color: '#2196F3', route: '/meters' },
          { label: 'Na čekanju (računi)', value: pendingCount ?? 0, icon: <FileText size={20} color="#fff" />, color: '#FF9800', route: '/bills' },
        ];
      }

      case 'distributor_admin': {
        const [{ count: utilitiesCount }, { count: usersCount }] = await Promise.all([
          supabase.from('water_utilities').select('*', { count: 'exact', head: true }).eq('is_active', true),
          supabase.from('profiles').select('*', { count: 'exact', head: true }),
        ]);
        return [
          { label: 'Vodovodi', value: utilitiesCount ?? 0, icon: <Building size={20} color="#fff" />, color: '#9C27B0', route: '/companies' },
          { label: 'Korisnici', value: usersCount ?? 0, icon: <Users size={20} color="#fff" />, color: Colors.primary, route: '/users' },
        ];
      }

      case 'utility_admin': {
        const [{ count: usersCount }, { count: connectionsCount }, { count: tasksCount }, { count: invoicesCount }] =
          await Promise.all([
            supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('utility_id', utilityId!),
            supabase.from('connections').select('*', { count: 'exact', head: true }).eq('utility_id', utilityId!).eq('is_active', true),
            supabase.from('tasks').select('*', { count: 'exact', head: true }).eq('utility_id', utilityId!).in('status', ['open', 'in_progress']),
            supabase.from('invoices').select('*', { count: 'exact', head: true }).eq('utility_id', utilityId!).eq('status', 'pending'),
          ]);
        return [
          { label: 'Korisnici', value: usersCount ?? 0, icon: <Users size={20} color="#fff" />, color: Colors.primary, route: '/users' },
          { label: 'Priključci', value: connectionsCount ?? 0, icon: <Droplet size={20} color="#fff" />, color: '#2196F3' },
          { label: 'Otvoreni zadaci', value: tasksCount ?? 0, icon: <ClipboardList size={20} color="#fff" />, color: '#FF9800', route: '/tasks' },
          { label: 'Neplaćeni računi', value: invoicesCount ?? 0, icon: <CreditCard size={20} color="#fff" />, color: Colors.error, route: '/bills' },
        ];
      }

      case 'finance': {
        const today = new Date();
        const firstOfMonth = new Date(today.getFullYear(), today.getMonth(), 1).toISOString();
        const [{ count: pendingCount }, { count: paidCount }, { count: overdueCount }] =
          await Promise.all([
            supabase.from('invoices').select('*', { count: 'exact', head: true }).eq('utility_id', utilityId!).eq('status', 'pending'),
            supabase.from('invoices').select('*', { count: 'exact', head: true }).eq('utility_id', utilityId!).eq('status', 'paid').gte('paid_at', firstOfMonth),
            supabase.from('invoices').select('*', { count: 'exact', head: true }).eq('utility_id', utilityId!).eq('status', 'overdue'),
          ]);
        return [
          { label: 'Na čekanju', value: pendingCount ?? 0, icon: <FileText size={20} color="#fff" />, color: '#FF9800', route: '/bills' },
          { label: 'Plaćeno ovaj mj.', value: paidCount ?? 0, icon: <CheckCircle size={20} color="#fff" />, color: Colors.success, route: '/bills' },
          { label: 'Kašnjenje', value: overdueCount ?? 0, icon: <AlertCircle size={20} color="#fff" />, color: Colors.error, route: '/bills' },
        ];
      }

      case 'worker': {
        const today = new Date().toISOString().split('T')[0];
        const [{ count: myTasksCount }, { count: doneToday }, { count: readingsToday }] =
          await Promise.all([
            supabase.from('tasks').select('*', { count: 'exact', head: true }).eq('assigned_to', userId!).in('status', ['open', 'in_progress']),
            supabase.from('tasks').select('*', { count: 'exact', head: true }).eq('assigned_to', userId!).eq('status', 'done').gte('completed_at', today),
            supabase.from('meter_readings').select('*', { count: 'exact', head: true }).eq('worker_id', userId!).gte('created_at', today),
          ]);
        return [
          { label: 'Moji zadaci', value: myTasksCount ?? 0, icon: <ClipboardList size={20} color="#fff" />, color: Colors.primary, route: '/tasks' },
          { label: 'Završeno danas', value: doneToday ?? 0, icon: <CheckCircle size={20} color="#fff" />, color: Colors.success },
          { label: 'Očitanja danas', value: readingsToday ?? 0, icon: <Droplet size={20} color="#fff" />, color: '#2196F3', route: '/(tabs)/readings' },
        ];
      }

      case 'end_user': {
        // First get user's connection IDs, then count THEIR invoices
        const { data: userConns } = await supabase
          .from('connections').select('id').eq('user_id', userId!).eq('is_active', true);
        const connIds = (userConns ?? []).map((c: any) => c.id);
        const [{ count: unpaidCount }, { count: connectionsCount }] = await Promise.all([
          connIds.length > 0
            ? supabase.from('invoices').select('*', { count: 'exact', head: true })
                .in('connection_id', connIds).in('status', ['pending', 'overdue'])
            : Promise.resolve({ count: 0 }),
          supabase.from('connections').select('*', { count: 'exact', head: true })
            .eq('user_id', userId!).eq('is_active', true),
        ]);
        return [
          { label: 'Neplaćeni računi', value: unpaidCount ?? 0, icon: <CreditCard size={20} color="#fff" />, color: unpaidCount ? Colors.error : Colors.success, route: '/bills' },
          { label: 'Moji priključci', value: connectionsCount ?? 0, icon: <Droplet size={20} color="#fff" />, color: '#2196F3', route: '/meters' },
        ];
      }

      default:
        return [];
    }
  };

  const getMenuItems = () => {
    if (!user) return [];

    const commonItems = [
      { title: 'Obavještenja', icon: <Bell size={24} color={Colors.primary} />, route: '/notifications', description: 'Pregled obavještenja' },
      { title: 'Podrška', icon: <Settings size={24} color={Colors.primary} />, route: '/support', description: 'Kontakt i pomoć' },
    ];

    switch (user.role) {
      case 'super_admin':
        return [
          { title: 'Distributeri', icon: <Building size={24} color={Colors.primary} />, route: '/distributors', description: 'Upravljanje distributerima' },
          { title: 'Vodovodi', icon: <Zap size={24} color={Colors.primary} />, route: '/companies', description: 'Upravljanje vodovodima' },
          { title: 'Korisnici', icon: <Users size={24} color={Colors.primary} />, route: '/users', description: 'Upravljanje korisnicima' },
          { title: 'Vodomjeri', icon: <Droplet size={24} color={Colors.primary} />, route: '/meters', description: 'Upravljanje vodomjerima' },
          { title: 'Računi', icon: <CreditCard size={24} color={Colors.primary} />, route: '/bills', description: 'Pregled računa' },
          { title: 'Zadaci', icon: <ClipboardList size={24} color={Colors.primary} />, route: '/tasks', description: 'Svi zadaci' },
          { title: 'Izvještaji', icon: <BarChart size={24} color={Colors.primary} />, route: '/(tabs)/reports', description: 'Statistike i izvještaji' },
          ...commonItems,
        ];
      case 'distributor_admin':
        return [
          { title: 'Vodovodi', icon: <Building size={24} color={Colors.primary} />, route: '/companies', description: 'Pregled vodovoda' },
          { title: 'Korisnici', icon: <Users size={24} color={Colors.primary} />, route: '/users', description: 'Pregled korisnika' },
          { title: 'Izvještaji', icon: <BarChart size={24} color={Colors.primary} />, route: '/(tabs)/reports', description: 'Izvještaji distributera' },
          ...commonItems,
        ];
      case 'utility_admin':
        return [
          { title: 'Korisnici', icon: <Users size={24} color={Colors.primary} />, route: '/users', description: 'Upravljanje korisnicima' },
          { title: 'Vodomjeri', icon: <Droplet size={24} color={Colors.primary} />, route: '/meters', description: 'Upravljanje vodomjerima' },
          { title: 'Zadaci', icon: <ClipboardList size={24} color={Colors.primary} />, route: '/tasks', description: 'Radni zadaci' },
          { title: 'Računi', icon: <CreditCard size={24} color={Colors.primary} />, route: '/bills', description: 'Upravljanje računima' },
          { title: 'Lokacije', icon: <MapPin size={24} color={Colors.primary} />, route: '/locations', description: 'Upravljanje lokacijama' },
          { title: 'Izvještaji', icon: <BarChart size={24} color={Colors.primary} />, route: '/(tabs)/reports', description: 'Statistike' },
          ...commonItems,
        ];
      case 'finance':
        return [
          { title: 'Računi', icon: <CreditCard size={24} color={Colors.primary} />, route: '/bills', description: 'Upravljanje računima' },
          { title: 'Izvještaji', icon: <BarChart size={24} color={Colors.primary} />, route: '/(tabs)/reports', description: 'Finansijski izvještaji' },
          { title: 'Korisnici', icon: <Users size={24} color={Colors.primary} />, route: '/users', description: 'Pregled korisnika' },
          ...commonItems,
        ];
      case 'worker':
        return [
          { title: 'Zadaci', icon: <ClipboardList size={24} color={Colors.primary} />, route: '/tasks', description: 'Radni zadaci' },
          { title: 'Očitanja', icon: <Droplet size={24} color={Colors.primary} />, route: '/(tabs)/readings', description: 'Očitanje vodomjera' },
          ...commonItems,
        ];
      default: // end_user
        return [
          { title: 'Moji priključci', icon: <Droplet size={24} color={Colors.primary} />, route: '/meters', description: 'Vaši vodomjeri' },
          { title: 'Računi', icon: <CreditCard size={24} color={Colors.primary} />, route: '/bills', description: 'Pregled i plaćanje računa' },
          { title: 'Historija očitanja', icon: <BarChart size={24} color={Colors.primary} />, route: '/consumption', description: 'Očitanja vodomjera' },
          { title: 'Prijava kvara', icon: <AlertCircle size={24} color={Colors.primary} />, route: '/support/report-issue', description: 'Prijavite kvar' },
          ...commonItems,
        ];
    }
  };

  const menuItems = getMenuItems();

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <View style={styles.welcomeSection}>
          <Image source={{ uri: LOGO_URL }} style={styles.logo} resizeMode="contain" />
          <Text style={styles.welcomeText}>Dobrodošli, {user?.full_name?.split(' ')[0] || 'Korisniku'}!</Text>
          <Text style={styles.roleText}>{getRoleLabel(user?.role)}</Text>
          {utilityName ? <Text style={styles.utilityName}>{utilityName}</Text> : null}
        </View>

        {/* Stats */}
        <View style={styles.statsSection}>
          {statsLoading ? (
            <ActivityIndicator color={Colors.primary} style={{ marginVertical: 16 }} />
          ) : stats.length > 0 ? (
            <View style={styles.statsGrid}>
              {stats.map((stat, i) => (
                <TouchableOpacity
                  key={i}
                  style={styles.statCard}
                  onPress={() => stat.route && router.push(stat.route as any)}
                  activeOpacity={stat.route ? 0.7 : 1}
                >
                  <View style={[styles.statIconBg, { backgroundColor: stat.color }]}>
                    {stat.icon}
                  </View>
                  <Text style={styles.statValue}>{stat.value}</Text>
                  <Text style={styles.statLabel}>{stat.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          ) : null}
        </View>

        {/* Menu grid */}
        <View style={styles.menuGrid}>
          {menuItems.map((item, index) => (
            <TouchableOpacity
              key={index}
              style={styles.menuItem}
              onPress={() => router.push(item.route as any)}
              activeOpacity={0.7}
            >
              <Card style={styles.menuCard}>
                <View style={styles.menuIconContainer}>{item.icon}</View>
                <Text style={styles.menuTitle}>{item.title}</Text>
                <Text style={styles.menuDescription}>{item.description}</Text>
              </Card>
            </TouchableOpacity>
          ))}
        </View>

        {isEndUser && (
          <Card style={styles.quickActionsCard}>
            <Text style={styles.quickActionsTitle}>Brze akcije</Text>
            <View style={styles.quickActionsButtons}>
              <Button
                title="Očitaj vodomjer"
                onPress={() => router.push('/(tabs)/readings' as any)}
                style={styles.quickActionButton}
              />
              <Button
                title="Prijavi problem"
                variant="outline"
                onPress={() => router.push('/support/report-issue' as any)}
                style={styles.quickActionButton}
              />
            </View>
          </Card>
        )}
      </ScrollView>
    </View>
  );
}

const getRoleLabel = (role?: string) => {
  switch (role) {
    case 'super_admin':       return 'Super Administrator';
    case 'distributor_admin': return 'Administrator Distributera';
    case 'utility_admin':     return 'Administrator Vodovoda';
    case 'finance':           return 'Finansije';
    case 'worker':            return 'Radnik';
    case 'end_user':          return 'Korisnik';
    default:                  return '';
  }
};

const { width } = Dimensions.get('window');
const itemWidth = (width - 48) / 2;
const statWidth = (width - 64) / 2;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  scrollView: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: Platform.OS === 'android' ? 100 : 80 },
  welcomeSection: { alignItems: 'center', marginBottom: 20 },
  logo: { width: 100, height: 100, marginBottom: 12 },
  welcomeText: { fontSize: 22, fontWeight: 'bold', color: Colors.text, marginBottom: 2 },
  roleText: { fontSize: 15, color: Colors.textLight },
  utilityName: { fontSize: 13, color: Colors.primary, marginTop: 2, fontWeight: '500' },
  statsSection: { marginBottom: 20 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  statCard: {
    width: statWidth,
    backgroundColor: Colors.highlight,
    borderRadius: 12,
    padding: 16,
    alignItems: 'flex-start',
  },
  statIconBg: {
    width: 40, height: 40, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 10,
  },
  statValue: { fontSize: 26, fontWeight: 'bold', color: Colors.text, marginBottom: 2 },
  statLabel: { fontSize: 12, color: Colors.textLight },
  menuGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginBottom: 24 },
  menuItem: { width: itemWidth, marginBottom: 16 },
  menuCard: { padding: 16, height: 130, justifyContent: 'center' },
  menuIconContainer: { marginBottom: 10 },
  menuTitle: { fontSize: 15, fontWeight: 'bold', color: Colors.text, marginBottom: 2 },
  menuDescription: { fontSize: 11, color: Colors.textLight },
  quickActionsCard: { padding: 16, marginBottom: 16 },
  quickActionsTitle: { fontSize: 18, fontWeight: 'bold', color: Colors.text, marginBottom: 16 },
  quickActionsButtons: { flexDirection: 'row', justifyContent: 'space-between' },
  quickActionButton: { flex: 1, marginHorizontal: 8 },
});
