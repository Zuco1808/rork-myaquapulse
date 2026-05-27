import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, SafeAreaView, ActivityIndicator } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Building, MapPin, Users, FileText, Edit2 } from 'lucide-react-native';
import { Header } from '@/components/layout/Header';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useAuthStore } from '@/store/auth-store';
import { supabase } from '@/lib/supabase';
import Colors from '@/constants/colors';
import { WaterUtility } from '@/types/user';

export default function CompanyDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuthStore();
  const [utility, setUtility] = useState<WaterUtility | null>(null);
  const [usersCount, setUsersCount] = useState(0);
  const [connectionsCount, setConnectionsCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (id) fetchData();
  }, [id]);

  const fetchData = async () => {
    try {
      const [utilityRes, usersRes, connectionsRes] = await Promise.all([
        supabase.from('water_utilities').select('*').eq('id', id).single(),
        supabase.from('profiles').select('id', { count: 'exact' }).eq('utility_id', id),
        supabase.from('connections').select('id', { count: 'exact' }).eq('utility_id', id),
      ]);

      if (utilityRes.error) throw utilityRes.error;
      setUtility(utilityRes.data);
      setUsersCount(usersRes.count || 0);
      setConnectionsCount(connectionsRes.count || 0);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleActive = async () => {
    if (!utility) return;
    const { error } = await supabase
      .from('water_utilities')
      .update({ is_active: !utility.is_active })
      .eq('id', id);

    if (!error) setUtility({ ...utility, is_active: !utility.is_active });
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.container}>
          <Header title="Detalji vodovoda" showBack onLeftPress={() => router.back()} />
          <View style={styles.centered}>
            <ActivityIndicator size="large" color={Colors.primary} />
          </View>
        </View>
      </SafeAreaView>
    );
  }

  if (!utility) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.container}>
          <Header title="Detalji vodovoda" showBack onLeftPress={() => router.back()} />
          <View style={styles.centered}>
            <Text style={styles.loadingText}>Vodovod nije pronađen.</Text>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
    <View style={styles.container}>
      <Header title={utility.name} showBack onLeftPress={() => router.back()} />
      <ScrollView contentContainerStyle={styles.content}>

        <View style={styles.statusRow}>
          <View style={[
            styles.statusBadge,
            { backgroundColor: utility.is_active ? Colors.success : Colors.error }
          ]}>
            <Text style={styles.statusText}>
              {utility.is_active ? 'Aktivan' : 'Neaktivan'}
            </Text>
          </View>
        </View>

        <Card style={styles.card}>
          <Text style={styles.sectionTitle}>Osnovne informacije</Text>

          <View style={styles.infoRow}>
            <Building size={18} color={Colors.primary} />
            <Text style={styles.infoLabel}>Naziv:</Text>
            <Text style={styles.infoValue}>{utility.name}</Text>
          </View>

          {utility.city && (
            <View style={styles.infoRow}>
              <MapPin size={18} color={Colors.primary} />
              <Text style={styles.infoLabel}>Grad:</Text>
              <Text style={styles.infoValue}>{utility.city}</Text>
            </View>
          )}

          {utility.address && (
            <View style={styles.infoRow}>
              <MapPin size={18} color={Colors.primary} />
              <Text style={styles.infoLabel}>Adresa:</Text>
              <Text style={styles.infoValue}>{utility.address}</Text>
            </View>
          )}

          {utility.pib && (
            <View style={styles.infoRow}>
              <FileText size={18} color={Colors.primary} />
              <Text style={styles.infoLabel}>PIB:</Text>
              <Text style={styles.infoValue}>{utility.pib}</Text>
            </View>
          )}
        </Card>

        <Card style={styles.card}>
          <Text style={styles.sectionTitle}>Statistike</Text>
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Users size={24} color={Colors.primary} />
              <Text style={styles.statValue}>{usersCount}</Text>
              <Text style={styles.statLabel}>Korisnika</Text>
            </View>
            <View style={styles.statItem}>
              <Building size={24} color={Colors.secondary} />
              <Text style={styles.statValue}>{connectionsCount}</Text>
              <Text style={styles.statLabel}>Priključaka</Text>
            </View>
          </View>
        </Card>

        <Card style={styles.card}>
          <Text style={styles.sectionTitle}>Akcije</Text>
          <Button
            title="Pregled korisnika"
            variant="outline"
            leftIcon={<Users size={18} color={Colors.primary} />}
            onPress={() => router.push(`/users?utilityId=${id}` as any)}
            style={styles.actionButton}
          />
          {['super_admin', 'distributor_admin'].includes(user?.role || '') && (
            <>
              <Button
                title="Uredi vodovod"
                variant="outline"
                leftIcon={<Edit2 size={18} color={Colors.primary} />}
                onPress={() => router.push(`/companies/edit/${id}` as any)}
                style={styles.actionButton}
              />
              <Button
                title={utility.is_active ? 'Deaktiviraj' : 'Aktiviraj'}
                variant="outline"
                onPress={handleToggleActive}
                style={[
                  styles.actionButton,
                  { borderColor: utility.is_active ? Colors.error : Colors.success }
                ]}
              />
            </>
          )}
        </Card>
      </ScrollView>
    </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea:  { flex: 1, backgroundColor: '#fff' },
  container: { flex: 1, backgroundColor: '#fff' },
  content: { padding: 16, paddingBottom: 32 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  loadingText: { fontSize: 16, color: Colors.textLight },
  statusRow: { flexDirection: 'row', marginBottom: 16 },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  statusText: { fontSize: 14, color: '#fff', fontWeight: '600' },
  card: { marginBottom: 16, padding: 16 },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  infoLabel: {
    fontSize: 14,
    color: Colors.textLight,
    marginLeft: 8,
    marginRight: 4,
    width: 60,
  },
  infoValue: {
    fontSize: 14,
    color: Colors.text,
    flex: 1,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: { alignItems: 'center' },
  statValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: Colors.text,
    marginTop: 8,
    marginBottom: 4,
  },
  statLabel: { fontSize: 13, color: Colors.textLight },
  actionButton: { marginBottom: 12 },
});