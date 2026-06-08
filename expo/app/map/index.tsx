import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Droplet, MapPin } from 'lucide-react-native';
import { Header } from '@/components/layout/Header';
import { EmptyState } from '@/components/ui/EmptyState';
import { LeafletMap, MapMarker } from '@/components/ui/LeafletMap';
import { useAuthStore } from '@/store/auth-store';
import { usePermissions } from '@/lib/use-permissions';
import { getMeters, getMetersByUser } from '@/lib/api/meters';
import { getLocations } from '@/lib/api/locations';
import { captureError } from '@/lib/sentry';
import Colors from '@/constants/colors';

type Filter = 'all' | 'meters' | 'locations';

const METER_COLOR    = '#0ea5e9';
const LOCATION_COLOR = '#f59e0b';

export default function MapScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { isEndUser } = usePermissions();

  const [meterMarkers, setMeterMarkers]       = useState<MapMarker[]>([]);
  const [locationMarkers, setLocationMarkers] = useState<MapMarker[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(false);
  const [filter, setFilter] = useState<Filter>('all');

  const fetchData = async () => {
    if (!user) return;
    setFetchError(false);
    setLoading(true);
    try {
      const meters = isEndUser
        ? await getMetersByUser(user.id, { limit: 500 })
        : await getMeters({ limit: 500 });

      const mMarkers: MapMarker[] = meters
        .filter((m: any) => m.latitude != null && m.longitude != null)
        .map((m: any) => ({
          id: `meter:${m.id}`,
          latitude: m.latitude,
          longitude: m.longitude,
          title: m.serialNumber || 'Vodomjer',
          subtitle: m.address || m.userName || '',
          color: METER_COLOR,
        }));
      setMeterMarkers(mMarkers);

      // Lokacije samo za ne-end-usere
      if (!isEndUser) {
        const locs = await getLocations(user.utility_id ?? undefined);
        const lMarkers: MapMarker[] = locs
          .filter((l) => l.coordinates)
          .map((l) => ({
            id: `location:${l.id}`,
            latitude: l.coordinates!.latitude,
            longitude: l.coordinates!.longitude,
            title: l.name,
            subtitle: [l.address, l.city].filter(Boolean).join(', '),
            color: LOCATION_COLOR,
          }));
        setLocationMarkers(lMarkers);
      }
    } catch (err) {
      captureError(err, { screen: 'map', action: 'fetchMapData' });
      setFetchError(true);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(useCallback(() => { fetchData(); }, [user?.id]));

  const handleMarkerPress = (markerId: string) => {
    const [kind, id] = markerId.split(':');
    if (kind === 'meter') router.push(`/meters/${id}` as any);
    else if (kind === 'location') router.push(`/locations/edit/${id}` as any);
  };

  const visibleMarkers =
    filter === 'meters'    ? meterMarkers :
    filter === 'locations' ? locationMarkers :
    [...meterMarkers, ...locationMarkers];

  const totalMarkers = meterMarkers.length + locationMarkers.length;

  return (
    <SafeAreaView style={styles.safe}>
      <Header title="Mapa" showBack onLeftPress={() => router.back()} />

      {/* Filteri */}
      {!isEndUser && (
        <View style={styles.filterRow}>
          <FilterChip label={`Sve (${totalMarkers})`} active={filter === 'all'} onPress={() => setFilter('all')} />
          <FilterChip
            label={`Vodomjeri (${meterMarkers.length})`}
            active={filter === 'meters'}
            color={METER_COLOR}
            onPress={() => setFilter('meters')}
          />
          <FilterChip
            label={`Lokacije (${locationMarkers.length})`}
            active={filter === 'locations'}
            color={LOCATION_COLOR}
            onPress={() => setFilter('locations')}
          />
        </View>
      )}

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : fetchError ? (
        <EmptyState
          icon={<MapPin size={48} color={Colors.textLight} />}
          title="Greška pri učitavanju"
          message="Podatke za mapu nije moguće učitati."
        />
      ) : visibleMarkers.length === 0 ? (
        <EmptyState
          icon={<Droplet size={48} color={Colors.textLight} />}
          title="Nema lokacija na mapi"
          message="Nijedan vodomjer ili lokacija nema postavljene GPS koordinate."
        />
      ) : (
        <LeafletMap markers={visibleMarkers} onMarkerPress={handleMarkerPress} style={styles.map} />
      )}
    </SafeAreaView>
  );
}

function FilterChip({
  label, active, color, onPress,
}: { label: string; active: boolean; color?: string; onPress: () => void }) {
  return (
    <TouchableOpacity
      style={[styles.chip, active && styles.chipActive]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      {color && <View style={[styles.dot, { backgroundColor: color }]} />}
      <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: '#f4f6f9' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  map:    { flex: 1 },

  filterRow: {
    flexDirection: 'row', gap: 8, flexWrap: 'wrap',
    paddingHorizontal: 16, paddingVertical: 10,
    backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 12, paddingVertical: 7,
    borderRadius: 18, borderWidth: 1, borderColor: Colors.border,
    backgroundColor: '#fff',
  },
  chipActive:     { backgroundColor: Colors.primary, borderColor: Colors.primary },
  chipText:       { fontSize: 12, color: Colors.text, fontWeight: '500' },
  chipTextActive: { color: '#fff', fontWeight: '600' },
  dot:            { width: 10, height: 10, borderRadius: 5 },
});
