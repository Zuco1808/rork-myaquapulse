import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform, ActivityIndicator } from 'react-native';
import { CameraView as ExpoCameraView, CameraType, useCameraPermissions } from 'expo-camera';
import { Camera, X, RotateCcw } from 'lucide-react-native';
import { Button } from '../ui/Button';
import Colors from '@/constants/colors';

interface OCRCameraViewProps {
  onCapture: (imageUri: string, imageBase64: string) => void;
  onClose: () => void;
}

export const OCRCameraView: React.FC<OCRCameraViewProps> = ({ onCapture, onClose }) => {
  const [permission, requestPermission] = useCameraPermissions();
  const [facing, setFacing] = useState<CameraType>('back');
  const [capturing, setCapturing] = useState(false);
  const cameraRef = useRef<any>(null);

  if (!permission) {
    return (
      <View style={styles.container}>
        <ActivityIndicator color={Colors.primary} />
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <Text style={styles.text}>Potrebna je dozvola za pristup kameri.</Text>
        <Button title="Dozvoli pristup kameri" onPress={requestPermission} style={styles.button} />
        <Button title="Odustani" onPress={onClose} variant="outline" style={styles.button} />
      </View>
    );
  }

  const takePicture = async () => {
    if (!cameraRef.current || capturing) return;
    
    setCapturing(true);
    try {
      if (Platform.OS === 'web') {
        // Web fallback - koristimo file input
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.onchange = async (e: any) => {
          const file = e.target.files[0];
          if (!file) return;
          
          const reader = new FileReader();
          reader.onload = (ev: any) => {
            const dataUrl = ev.target.result as string;
            const base64 = dataUrl.split(',')[1];
            const uri = dataUrl;
            onCapture(uri, base64);
          };
          reader.readAsDataURL(file);
        };
        input.click();
        setCapturing(false);
        return;
      }

      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.8,
        base64: true,
        exif: false,
      });

      if (photo.base64) {
        onCapture(photo.uri, photo.base64);
      }
    } catch (error) {
      console.error('Failed to take picture:', error);
    } finally {
      setCapturing(false);
    }
  };

  return (
    <View style={styles.container}>
      <ExpoCameraView ref={cameraRef} style={styles.camera} facing={facing}>
        <View style={styles.overlay}>
          <View style={styles.header}>
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <X size={24} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.headerText}>Skenirajte vodomjer</Text>
            <TouchableOpacity style={styles.flipButton} onPress={() => setFacing(f => f === 'back' ? 'front' : 'back')}>
              <RotateCcw size={24} color="#fff" />
            </TouchableOpacity>
          </View>

          <View style={styles.targetArea}>
            <View style={styles.targetFrame} />
            <Text style={styles.instructionText}>
              Postavite brojeve vodomjera unutar okvira
            </Text>
          </View>

          <View style={styles.footer}>
            <TouchableOpacity
              style={[styles.captureButton, capturing && styles.captureButtonDisabled]}
              onPress={takePicture}
              disabled={capturing}
            >
              {capturing
                ? <ActivityIndicator color="#fff" size="large" />
                : <View style={styles.captureButtonInner}><Camera size={28} color="#fff" /></View>
              }
            </TouchableOpacity>
          </View>
        </View>
      </ExpoCameraView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  camera: { flex: 1 },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.3)', justifyContent: 'space-between' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16 },
  closeButton: { padding: 8 },
  headerText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  flipButton: { padding: 8 },
  targetArea: { alignItems: 'center', justifyContent: 'center' },
  targetFrame: { width: 280, height: 120, borderWidth: 2, borderColor: Colors.primary, borderRadius: 8, marginBottom: 16 },
  instructionText: { color: '#fff', fontSize: 14, textAlign: 'center', marginHorizontal: 32 },
  footer: { alignItems: 'center', paddingBottom: 32 },
  captureButton: { width: 70, height: 70, borderRadius: 35, backgroundColor: 'rgba(255,255,255,0.3)', justifyContent: 'center', alignItems: 'center' },
  captureButtonDisabled: { opacity: 0.5 },
  captureButtonInner: { width: 60, height: 60, borderRadius: 30, backgroundColor: Colors.primary, justifyContent: 'center', alignItems: 'center' },
  text: { color: '#fff', fontSize: 16, textAlign: 'center', margin: 32 },
  button: { marginHorizontal: 32, marginTop: 16 },
});
