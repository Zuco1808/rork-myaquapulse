import React, { useRef, useState } from 'react';
import { Modal, View, Text, StyleSheet, TouchableOpacity, Platform, SafeAreaView } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { X, ScanLine } from 'lucide-react-native';
import { Button } from '@/components/ui/Button';
import Colors from '@/constants/colors';

interface Props {
  visible: boolean;
  onClose: () => void;
  /** Poziva se s pročitanim serijskim brojem (QR ili barcode). */
  onScanned: (serial: string) => void;
}

/**
 * Skener QR/barcode naljepnice vodomjera (spec §5.2 — smanjuje greške unosa).
 * Koristi expo-camera ugrađeni barcode skener; na webu nije podržan pa se
 * prikazuje uputa za ručni odabir.
 */
export function SerialScanner({ visible, onClose, onScanned }: Props) {
  const [permission, requestPermission] = useCameraPermissions();
  const scannedRef = useRef(false);
  const [torch, setTorch] = useState(false);

  const handleBarcode = ({ data }: { data: string }) => {
    if (scannedRef.current || !data) return;
    scannedRef.current = true;
    onScanned(data.trim());
    onClose();
    // dozvoli novi sken pri sljedećem otvaranju
    setTimeout(() => { scannedRef.current = false; }, 800);
  };

  const renderBody = () => {
    if (Platform.OS === 'web') {
      return (
        <View style={styles.center}>
          <ScanLine size={48} color={Colors.textLight} />
          <Text style={styles.infoText}>
            Skeniranje barkoda nije podržano u web pregledniku.{'\n'}Odaberite vodomjer ručno iz liste.
          </Text>
          <Button title="Zatvori" variant="outline" onPress={onClose} style={{ marginTop: 16 }} />
        </View>
      );
    }
    if (!permission) {
      return <View style={styles.center}><Text style={styles.infoText}>Provjera dozvole kamere…</Text></View>;
    }
    if (!permission.granted) {
      return (
        <View style={styles.center}>
          <Text style={styles.infoText}>Za skeniranje je potrebna dozvola za kameru.</Text>
          <Button title="Dozvoli kameru" onPress={requestPermission} style={{ marginTop: 16 }} />
        </View>
      );
    }
    return (
      <View style={{ flex: 1 }}>
        <CameraView
          style={StyleSheet.absoluteFill}
          facing="back"
          enableTorch={torch}
          barcodeScannerSettings={{
            barcodeTypes: [
              'qr', 'ean13', 'ean8', 'code128', 'code39', 'code93',
              'codabar', 'itf14', 'upc_a', 'upc_e', 'datamatrix', 'pdf417',
            ],
          }}
          onBarcodeScanned={handleBarcode}
        />
        {/* Okvir za ciljanje */}
        <View style={styles.overlay} pointerEvents="none">
          <View style={styles.frame} />
          <Text style={styles.hint}>Usmjerite kameru na QR kod ili barkod vodomjera</Text>
        </View>
        <TouchableOpacity style={styles.torchBtn} onPress={() => setTorch(t => !t)}>
          <Text style={styles.torchText}>{torch ? '💡 Isključi lampu' : '🔦 Uključi lampu'}</Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={styles.safe}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} hitSlop={8}><X size={24} color="#fff" /></TouchableOpacity>
          <Text style={styles.title}>Skeniraj vodomjer</Text>
          <View style={{ width: 24 }} />
        </View>
        {renderBody()}
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: '#000' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 14, backgroundColor: '#000',
  },
  title:  { fontSize: 17, fontWeight: 'bold', color: '#fff' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, backgroundColor: '#111' },
  infoText: { fontSize: 14, color: '#ccc', textAlign: 'center', marginTop: 12, lineHeight: 21 },

  overlay: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
  frame: {
    width: 240, height: 240, borderRadius: 16,
    borderWidth: 3, borderColor: '#0ea5e9',
  },
  hint: { color: '#fff', fontSize: 13, marginTop: 18, textAlign: 'center', paddingHorizontal: 32, textShadowColor: '#000', textShadowRadius: 4 },

  torchBtn: {
    position: 'absolute', bottom: 36, alignSelf: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)', paddingHorizontal: 18, paddingVertical: 10, borderRadius: 22,
  },
  torchText: { color: '#fff', fontSize: 14, fontWeight: '600' },
});
