import { useState, useCallback } from 'react';
import { Platform, Alert } from 'react-native';
import * as Location from 'expo-location';

export interface GpsCoords {
  latitude: number;
  longitude: number;
}

export function useGpsLocation() {
  const [loading, setLoading] = useState(false);

  const getLocation = useCallback(async (): Promise<GpsCoords | null> => {
    setLoading(true);
    try {
      if (Platform.OS === 'web') {
        return await getWebLocation();
      }
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Dozvola odbijena', 'Pristup lokaciji nije odobren. Dozvolu možete promijeniti u postavkama uređaja.');
        return null;
      }
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      return { latitude: loc.coords.latitude, longitude: loc.coords.longitude };
    } catch (e: any) {
      Alert.alert('Greška lokacije', e?.message || 'Nije moguće dobiti lokaciju.');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  return { loading, getLocation };
}

function getWebLocation(): Promise<GpsCoords> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolokacija nije podržana u ovom pregledaču.'));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }),
      (err) => reject(new Error(err.message)),
      { enableHighAccuracy: true, timeout: 10000 },
    );
  });
}
