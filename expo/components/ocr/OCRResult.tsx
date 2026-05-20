import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Image, ActivityIndicator, TouchableOpacity } from 'react-native';
import { CheckCircle, XCircle, AlertTriangle, RefreshCw } from 'lucide-react-native';
import { Button } from '../ui/Button';
import Colors from '@/constants/colors';
import { readMeterFromImage, OCRResult as OCRResultType } from '@/lib/api/ocr';

interface OCRResultProps {
  imageUri: string;
  imageBase64: string;
  onConfirm: (value: number, imageUri: string) => void;
  onRetry: () => void;
  onCancel: () => void;
}

export const OCRResult: React.FC<OCRResultProps> = ({
  imageUri,
  imageBase64,
  onConfirm,
  onRetry,
  onCancel,
}) => {
  const [loading, setLoading] = useState(true);
  const [result, setResult] = useState<OCRResultType | null>(null);
  const [manualValue, setManualValue] = useState('');

  useEffect(() => {
    processImage();
  }, [imageBase64]);

  const processImage = async () => {
    setLoading(true);
    const ocrResult = await readMeterFromImage(imageBase64);
    setResult(ocrResult);
    if (ocrResult.value) {
      setManualValue(String(ocrResult.value));
    }
    setLoading(false);
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <Image source={{ uri: imageUri }} style={styles.image} resizeMode="contain" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Citanje vodomjera...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Image source={{ uri: imageUri }} style={styles.image} resizeMode="contain" />
      
      <View style={styles.resultContainer}>
        {result?.readable ? (
          <>
            <View style={styles.successRow}>
              <CheckCircle size={24} color={Colors.success} />
              <Text style={styles.successText}>Broj uspješno procitan</Text>
            </View>
            <Text style={styles.valueText}>{result.value} m³</Text>
            <Text style={styles.confidenceText}>
              Pouzdanost: {result.confidence === 'high' ? 'Visoka' : result.confidence === 'medium' ? 'Srednja' : 'Niska'}
            </Text>
          </>
        ) : (
          <View style={styles.errorRow}>
            <XCircle size={24} color={Colors.error} />
            <Text style={styles.errorText}>Nije moguce procitati broj</Text>
          </View>
        )}

        <View style={styles.actions}>
          {result?.readable && result.value && (
            <Button
              title={`Potvrdi: ${result.value} m\u00b3`}
              onPress={() => onConfirm(result.value!, imageUri)}
              style={styles.button}
            />
          )}
          <Button title="Ponovi snimanje" onPress={onRetry} variant="outline" style={styles.button} />
          <Button title="Odustani" onPress={onCancel} variant="outline" style={styles.button} />
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  image: { width: '100%', height: 250 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { color: '#fff', marginTop: 16, fontSize: 16 },
  resultContainer: { flex: 1, padding: 24, backgroundColor: '#fff' },
  successRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  successText: { color: Colors.success, fontSize: 16, marginLeft: 8, fontWeight: 'bold' },
  valueText: { fontSize: 36, fontWeight: 'bold', color: Colors.text, textAlign: 'center', marginVertical: 16 },
  confidenceText: { color: Colors.textLight, textAlign: 'center', marginBottom: 24 },
  errorRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 24 },
  errorText: { color: Colors.error, fontSize: 16, marginLeft: 8, fontWeight: 'bold' },
  actions: { gap: 12 },
  button: { marginTop: 8 },
});
