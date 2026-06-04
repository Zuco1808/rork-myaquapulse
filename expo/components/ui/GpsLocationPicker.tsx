import React from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native';
import { MapPin, Navigation, X } from 'lucide-react-native';
import Colors from '@/constants/colors';
import { useGpsLocation, GpsCoords } from '@/lib/use-gps-location';

interface Props {
  value: GpsCoords | null;
  onChange: (coords: GpsCoords | null) => void;
  label?: string;
}

export function GpsLocationPicker({ value, onChange, label = 'GPS koordinate' }: Props) {
  const { loading, getLocation } = useGpsLocation();

  const handleCapture = async () => {
    const coords = await getLocation();
    if (coords) onChange(coords);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>

      {value ? (
        <View style={styles.coordsCard}>
          <MapPin size={16} color={Colors.primary} style={styles.pin} />
          <View style={styles.coordsText}>
            <Text style={styles.coordLine}>
              {value.latitude.toFixed(6)}, {value.longitude.toFixed(6)}
            </Text>
          </View>
          <TouchableOpacity onPress={() => onChange(null)} hitSlop={8} style={styles.clearBtn}>
            <X size={16} color={Colors.textLight} />
          </TouchableOpacity>
        </View>
      ) : (
        <Text style={styles.emptyNote}>Nije postavljeno</Text>
      )}

      <TouchableOpacity
        style={[styles.btn, loading && styles.btnDisabled]}
        onPress={handleCapture}
        disabled={loading}
        activeOpacity={0.7}
      >
        {loading ? (
          <ActivityIndicator size="small" color={Colors.primary} />
        ) : (
          <Navigation size={16} color={Colors.primary} />
        )}
        <Text style={styles.btnText}>
          {loading ? 'Dobijanje lokacije…' : value ? 'Ažuriraj lokaciju' : 'Uhvati lokaciju'}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container:  { marginBottom: 16 },
  label:      { fontSize: 14, fontWeight: '600', color: Colors.text, marginBottom: 8 },
  emptyNote:  { fontSize: 13, color: Colors.textLight, fontStyle: 'italic', marginBottom: 10 },

  coordsCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.primary + '12',
    borderRadius: 8, padding: 10, marginBottom: 10,
  },
  pin:        { marginRight: 8 },
  coordsText: { flex: 1 },
  coordLine:  { fontSize: 13, color: Colors.text, fontFamily: 'monospace' },
  clearBtn:   { padding: 4 },

  btn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    paddingVertical: 10, paddingHorizontal: 16,
    borderRadius: 8, borderWidth: 1.5, borderColor: Colors.primary,
    backgroundColor: Colors.primary + '10',
  },
  btnDisabled: { opacity: 0.6 },
  btnText:     { fontSize: 14, fontWeight: '600', color: Colors.primary },
});
