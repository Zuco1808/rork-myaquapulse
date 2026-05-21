import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform, ActivityIndicator } from 'react-native';
import { CameraView as ExpoCameraView, CameraType, useCameraPermissions } from 'expo-camera';
import { Camera, X, RotateCcw, Upload } from 'lucide-react-native';
import { Button } from '../ui/Button';
import Colors from '@/constants/colors';

interface OCRCameraViewProps {
  onCapture: (imageUri: string, imageBase64: string) => void;
  onClose: () => void;
}

const WebCameraView: React.FC<OCRCameraViewProps> = ({ onCapture, onClose }) => {
  const videoRef = useRef<any>(null);
  const canvasRef = useRef<any>(null);
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    startCamera();
    return () => stopCamera();
  }, []);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } }
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
        setStreaming(true);
      }
    } catch (err) {
      setError('Kamera nije dostupna. Koristite upload slike.');
    }
  };

  const stopCamera = () => {
    if (videoRef.current?.srcObject) {
      videoRef.current.srcObject.getTracks().forEach((t: any) => t.stop());
    }
  };

  const takePicture = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d').drawImage(video, 0, 0);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
    const base64 = dataUrl.split(',')[1];
    stopCamera();
    onCapture(dataUrl, base64);
  };

  const uploadFile = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = (e: any) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev: any) => {
        const dataUrl = ev.target.result as string;
        const base64 = dataUrl.split(',')[1];
        onCapture(dataUrl, base64);
      };
      reader.readAsDataURL(file);
    };
    input.click();
  };

  return (
    <View style={styles.container}>
      <View style={styles.webHeader}>
        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
          <X size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerText}>Skenirajte vodomjer</Text>
        <View style={{ width: 40 }} />
      </View>

      {error ? (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : (
        <View style={styles.webVideoContainer}>
          <video
            ref={videoRef}
            style={{ width: '100%', maxHeight: 400, objectFit: 'cover' }}
            playsInline
            muted
          />
          <canvas ref={canvasRef} style={{ display: 'none' }} />
          <View style={styles.webTargetFrame} />
        </View>
      )}

      <View style={styles.webControls}>
        {!error && streaming && (
          <TouchableOpacity style={styles.captureButton} onPress={takePicture}>
            <View style={styles.captureButtonInner}>
              <Camera size={28} color="#fff" />
            </View>
          </TouchableOpacity>
        )}
        <TouchableOpacity style={styles.uploadButton} onPress={uploadFile}>
          <Upload size={20} color={Colors.primary} />
          <Text style={styles.uploadText}>Ucitaj sliku</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

export const OCRCameraView: React.FC<OCRCameraViewProps> = ({ onCapture, onClose }) => {
  if (Platform.OS === 'web') {
    return <WebCameraView onCapture={onCapture} onClose={onClose} />;
  }

  const [permission, requestPermission] = useCameraPermissions();
  const [facing, setFacing] = useState<CameraType>('back');
  const [capturing, setCapturing] = useState(false);
  const cameraRef = useRef<any>(null);

  if (!permission) {
    return <View style={styles.container}><ActivityIndicator color={Colors.primary} /></View>;
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
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.8, base64: true, exif: false });
      if (photo.base64) onCapture(photo.uri, photo.base64);
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
            <Text style={styles.instructionText}>Postavite brojeve vodomjera unutar okvira</Text>
          </View>
          <View style={styles.footer}>
            <TouchableOpacity style={[styles.captureButton, capturing && styles.captureButtonDisabled]} onPress={takePicture} disabled={capturing}>
              {capturing ? <ActivityIndicator color="#fff" size="large" /> : <View style={styles.captureButtonInner}><Camera size={28} color="#fff" /></View>}
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
  webHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, backgroundColor: 'rgba(0,0,0,0.8)' },
  closeButton: { padding: 8 },
  headerText: { color: '#fff', fontSize: 16, fontWeight: '500' },
  flipButton: { padding: 8 },
  targetArea: { alignItems: 'center', justifyContent: 'center' },
  targetFrame: { width: 280, height: 120, borderWidth: 2, borderColor: Colors.primary, borderRadius: 8, marginBottom: 16 },
  webVideoContainer: { position: 'relative', backgroundColor: '#111' },
  webTargetFrame: { position: 'absolute', top: '50%', left: '50%', width: 280, height: 100, marginTop: -50, marginLeft: -140, borderWidth: 2, borderColor: Colors.primary, borderRadius: 8 },
  instructionText: { color: '#fff', fontSize: 14, textAlign: 'center', marginHorizontal: 32 },
  footer: { alignItems: 'center', paddingBottom: 32 },
  webControls: { alignItems: 'center', paddingVertical: 24, gap: 16, backgroundColor: '#111' },
  captureButton: { width: 70, height: 70, borderRadius: 35, backgroundColor: 'rgba(255,255,255,0.3)', justifyContent: 'center', alignItems: 'center' },
  captureButtonDisabled: { opacity: 0.5 },
  captureButtonInner: { width: 60, height: 60, borderRadius: 30, backgroundColor: Colors.primary, justifyContent: 'center', alignItems: 'center' },
  uploadButton: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 24, paddingVertical: 12, borderWidth: 1, borderColor: Colors.primary, borderRadius: 8 },
  uploadText: { color: Colors.primary, fontSize: 14 },
  errorContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  errorText: { color: '#fff', textAlign: 'center', fontSize: 14 },
  text: { color: '#fff', fontSize: 16, textAlign: 'center', margin: 32 },
  button: { marginHorizontal: 32, marginTop: 16 },
});
