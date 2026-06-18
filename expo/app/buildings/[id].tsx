import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, SafeAreaView, ActivityIndicator, RefreshControl, TouchableOpacity,
} from 'react-native';
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
import { Droplet, AlertTriangle, CheckCircle, Building } from 'lucide-react-native';
import { Header } from '@/components/layout/Header';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { getMetersByLocation } from '@/lib/api/meters';
import { supabase } from '@/lib/supabase';
import { captureError } from '@/lib/sentry';
import Colors from '@/constants/colors';

interface MeterRow {
  id: string;
  serial: string;
  isShared: boolean;
  userName: string;
  lastValue: number | null;
}

export default function BuildingDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [name, setName]   = useState('');
  const [meters, setMeters] = useState<MeterRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = async () => {
    if (!id) return;
    try {
      const [{ data: loc }, conns] = await Promise.all([
        supabase.from('locations').select('name').eq('id', id).single(),
        getMetersByLocation(id),
      ]);
      setName((loc as any)?.name ?? 'Zgrada');

      // Posljednje očitanje po priključku (jedan upit, grupiraj u JS)
      const ids = conns.map((c: any) => c.id);
      const lastByConn = new Map<string, number>();
      if (ids.length) {
        const { data: readings } = await supabase
          .from('meter_readings')
          .select('connection_id, reading_value, reading_date, created_at')
          .in('connection_id', ids)
          .order('reading_date', { ascending: false })
          .order('created_at', { ascending: false });
        for (const r of (readings ?? []) as any[]) {
          if (!lastByConn.has(r.connection_id)) lastByConn.set(r.connection_id, Number(r.reading_value));
        }
      }

      setMeters(conns.map((c: any) => ({
        id: c.id, serial: c.serialNumber, isShared: c.isShared,
        userName: c.userName || '', lastValue: lastByConn.has(c.id) ? lastByConn.get(c.id)! : null,
      })));
    } catch (e) {
      captureError(e, { screen: 'building', action: 'fetch' });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(useCallback(() => { fetchData(); }, [id]));

  const shared = meters.filter((m) => m.isShared);
  const individual = meters.filter((m) => !m.isShared);

  const sharedTotal = shared.reduce((s, m) => s + (m.lastValue ?? 0), 0);
  const individualTotal = individual.reduce((s, m) => s + (m.lastValue ?? 0), 0);
  const hasSharedReading = shared.some((m) => m.lastValue != null);
  const hasIndividualReadings = individual.some((m) => m.lastValue != null);
  const diff = sharedTotal - individualTotal;
  // Tolerancija: 5% zajedničkog ili min 1 m³ (gubici u mreži su normalni)
  const tolerance = Math.max(1, sharedTotal * 0.05);
  const mismatch = hasSharedReading && hasIndividualReadings && Math.abs(diff) > tolerance;

  const renderMeter = (m: MeterRow) => (
    <TouchableOpacity key={m.id} style={styles.meterRow} onPress={() => router.push(`/meters/${m.id}` as any)} activeOpacity={0.7}>
      <Droplet size={16} color={Colors.primary} />
      <View style={{ flex: 1 }}>
        <Text style={styles.meterSerial}>{m.serial}</Text>
        {m.userName ? <Text style={styles.meterUser}>{m.userName}</Text> : null}
      </View>
      <Text style={styles.meterValue}>{m.lastValue != null ? `${m.lastValue} m³` : '—'}</Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.safe}>
      <Header title="Zgrada" showBack onLeftPress={() => router.back()} />
      {loading ? (
        <View style={styles.center}><ActivityIndicator size="large" color={Colors.primary} /></View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.content}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchData(); }} />}
        >
          <View style={styles.titleRow}>
            <Building size={20} color={Colors.primary} />
            <Text style={styles.title}>{name}</Text>
          </View>

          {/* Mismatch indikator */}
          {hasSharedReading && hasIndividualReadings && (
            <Card style={[styles.matchCard, mismatch ? styles.matchBad : styles.matchOk]}>
              <View style={styles.matchHeader}>
                {mismatch ? <AlertTriangle size={20} color={Colors.error} /> : <CheckCircle size={20} color="#4CAF50" />}
                <Text style={[styles.matchTitle, { color: mismatch ? Colors.error : '#4CAF50' }]}>
                  {mismatch ? 'Neusklađenost brojila' : 'Brojila usklađena'}
                </Text>
              </View>
              <Text style={styles.matchRow}>Zajedničko (kontrolno): <Text style={styles.matchVal}>{sharedTotal} m³</Text></Text>
              <Text style={styles.matchRow}>Suma individualnih: <Text style={styles.matchVal}>{individualTotal} m³</Text></Text>
              <Text style={styles.matchRow}>Razlika: <Text style={[styles.matchVal, mismatch && { color: Colors.error }]}>{diff > 0 ? '+' : ''}{Math.round(diff * 100) / 100} m³</Text></Text>
              {mismatch && (
                <Text style={styles.matchHint}>
                  Razlika prelazi toleranciju (5%) — provjerite moguće curenje, neovlašteno korištenje ili neočitano individualno brojilo.
                </Text>
              )}
            </Card>
          )}

          {/* Zajedničko brojilo */}
          <Text style={styles.sectionLabel}>Zajedničko (kontrolno) brojilo</Text>
          <Card style={styles.listCard}>
            {shared.length === 0 ? (
              <Text style={styles.empty}>Nema zajedničkog brojila.</Text>
            ) : shared.map(renderMeter)}
          </Card>

          {/* Individualna */}
          <View style={styles.indHeader}>
            <Text style={styles.sectionLabel}>Individualna brojila</Text>
            <Badge label={`${individual.length}`} color={Colors.primary} size="small" />
          </View>
          <Card style={styles.listCard}>
            {individual.length === 0 ? (
              <Text style={styles.empty}>Nema individualnih brojila.</Text>
            ) : individual.map(renderMeter)}
          </Card>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:    { flex: 1, backgroundColor: '#f4f6f9' },
  center:  { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: { padding: 16, paddingBottom: 40 },

  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 },
  title:    { fontSize: 18, fontWeight: '800', color: Colors.text },

  matchCard:   { padding: 16, marginBottom: 16, borderWidth: 1 },
  matchOk:     { borderColor: '#4CAF5055', backgroundColor: '#F1F8F2' },
  matchBad:    { borderColor: Colors.error + '55', backgroundColor: '#FFF3F3' },
  matchHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  matchTitle:  { fontSize: 15, fontWeight: '700' },
  matchRow:    { fontSize: 13, color: Colors.text, marginTop: 3 },
  matchVal:    { fontWeight: '700' },
  matchHint:   { fontSize: 12, color: Colors.error, marginTop: 10, lineHeight: 18 },

  sectionLabel: { fontSize: 13, fontWeight: '700', color: Colors.textLight, marginBottom: 8, textTransform: 'uppercase' },
  indHeader:    { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 16 },
  listCard:     { padding: 6, marginBottom: 6 },
  empty:        { fontSize: 13, color: Colors.textLight, fontStyle: 'italic', padding: 12 },

  meterRow:    { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 11, paddingHorizontal: 10, borderBottomWidth: 1, borderBottomColor: Colors.border },
  meterSerial: { fontSize: 14, fontWeight: '600', color: Colors.text },
  meterUser:   { fontSize: 12, color: Colors.textLight, marginTop: 1 },
  meterValue:  { fontSize: 13, fontWeight: '600', color: Colors.primary },
});
