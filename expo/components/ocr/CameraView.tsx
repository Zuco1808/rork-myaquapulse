import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform, ActivityIndicator } from 'react-native';
import { CameraView as ExpoCameraView, CameraType, useCameraPermissions, FlashMode } from 'expo-camera';
import { Camera, X, RotateCcw, Upload, ZoomIn, ZoomOut, Zap, ZapOff } from 'lucide-react-native';
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
  const [zoom, setZoom] = useState(1);
  const [torchOn, setTorchOn] = useState(false);
  const streamRef = useRef<any>(null);

  useEffect(() => {
    startCamera();
    return () => stopCamera();
  }, []);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } }
      });
      streamRef.current = stream;
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
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t: any) => t.stop());
    }
  };

  const handleZoom = (direction: 'in' | 'out') => {
    const newZoom = direction === 'in' ? Math.min(zoom + 0.5, 4) : Math.max(zoom - 0.5, 1);
    setZoom(newZoom);
    if (videoRef.current) {
      videoRef.current.style.transform = `scale(${newZoom})`;
      videoRef.current.style.transformOrigin = 'center center';
    }
  };

  const toggleTorch = async () => {
    if (streamRef.current) {
      const track = streamRef.current.getVideoTracks()[0];
      try {
        await track.applyConstraints({ advanced: [{ torch: !torchOn }] });
        setTorchOn(!torchOn);
      } catch {
        // Torch not supported on this device
      }
    }
  };

  const takePicture = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (zoom > 1) {
      const scale = zoom;
      const sw = video.videoWidth / scale;
      const sh = video.videoHeight / scale;
      const sx = (video.videoWidth - sw) / 2;
      const sy = (video.videoHeight - sh) / 2;
      ctx.drawImage(video, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);
    } else {
      ctx.drawImage(video, 0, 0);
    }
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
        <TouchableOpacity onPress={onClose} style={styles.iconButton}>
          <X size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerText}>Skenirajte vodomjer</Text>
        <TouchableOpacity onPress={toggleTorch} style={styles.iconButton}>
          {torchOn ? <Zap size={24} color="#FFD700" /> : <ZapOff size={24} color="#fff" />}
        </TouchableOpacity>
      </View>

      {error ? (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : (
        <View style={styles.webVideoContainer}>
          <video
            ref={videoRef}
            style={{ width: '100%', maxHeight: 420, objectFit: 'cover', transition: 'transform 0.2s' }}
            playsInline
            muted
          />
          <canvas ref={canvasRef} style={{ display: 'none' }} />
          <View style={styles.webTargetFrame} />
          <View style={styles.zoomControls}>
            <TouchableOpacity onPress={() => handleZoom('out')} style={styles.zoomButton}>
              <ZoomOut size={20} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.zoomText}>{zoom.toFixed(1)}x</Text>
            <TouchableOpacity onPress={() => handleZoom('in')} style={styles.zoomButton}>
              <ZoomIn size={20} color="#fff" />
            </TouchableOpacity>
          </View>
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
          <Text style={styles.uploadText}>Učitaj sliku</Text>
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
  const [zoom, setZoom] = useState(0);
  const [flash, setFlash] = useState<FlashMode>('off');
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

  const handleZoom = (direction: 'in' | 'out') => {
    const newZoom = direction === 'in' ? Math.min(zoom + 0.1, 1) : Math.max(zoom - 0.1, 0);
    setZoom(parseFloat(newZoom.toFixed(1)));
  };

  const toggleFlash = () => {
    setFlash(f => f === 'off' ? 'torch' : 'off');
  };

  return (
    <View style={styles.container}>
      <ExpoCameraView ref={cameraRef} style={styles.camera} facing={facing} zoom={zoom} flash={flash}>
        <View style={styles.overlay}>
          <View style={styles.header}>
            <TouchableOpacity style={styles.iconButton} onPress={onClose}>
              <X size={24} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.headerText}>Skenirajte vodomjer</Text>
            <TouchableOpacity style={styles.iconButton} onPress={toggleFlash}>
              {flash === 'torch' ? <Zap size={24} color="#FFD700" /> : <ZapOff size={24} color="#fff" />}
            </TouchableOpacity>
          </View>

          <View style={styles.targetArea}>
            <View style={styles.targetFrame} />
            <Text style={styles.instructionText}>Postavite brojeve vodomjera unutar okvira</Text>
          </View>

          <View style={styles.bottomControls}>
            <View style={styles.zoomControls}>
              <TouchableOpacity onPress={() => handleZoom('out')} style={styles.zoomButton}>
                <ZoomOut size={20} color="#fff" />
              </TouchableOpacity>
              <Text style={styles.zoomText}>{Math.round(zoom * 10)}x</Text>
              <TouchableOpacity onPress={() => handleZoom('in')} style={styles.zoomButton}>
                <ZoomIn size={20} color="#fff" />
              </TouchableOpacity>
            </View>

            <View style={styles.captureRow}>
              <TouchableOpacity style={styles.iconButton} onPress={() => setFacing(f => f === 'back' ? 'front' : 'back')}>
                <RotateCcw size={24} color="#fff" />
              </TouchableOpacity>
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
              <View style={{ width: 40 }} />
            </View>
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
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, paddingTop: 48 },
  webHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, backgroundColor: 'rgba(0,0,0,0.8)' },
  iconButton: { padding: 8, width: 40, alignItems: 'center' },
  headerText: { color: '#fff', fontSize: 16, fontWeight: '500' },
  targetArea: { alignItems: 'center', justifyContent: 'center' },
  targetFrame: { width: 280, height: 120, borderWidth: 2, borderColor: Colors.primary, borderRadius: 8, marginBottom: 12 },
  instructionText: { color: '#fff', fontSize: 13, textAlign: 'center', marginHorizontal: 32 },
  bottomControls: { paddingBottom: 32, gap: 16 },
  captureRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 32 },
  zoomControls: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 16 },
  zoomButton: { backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 20, padding: 8 },
  zoomText: { color: '#fff', fontSize: 14, minWidth: 32, textAlign: 'center' },
  captureButton: { width: 70, height: 70, borderRadius: 35, backgroundColor: 'rgba(255,255,255,0.3)', justifyContent: 'center', alignItems: 'center' },
  captureButtonDisabled: { opacity: 0.5 },
  captureButtonInner: { width: 60, height: 60, borderRadius: 30, backgroundColor: Colors.primary, justifyContent: 'center', alignItems: 'center' },
  webVideoContainer: { position: 'relative', backgroundColor: '#111', overflow: 'hidden' },
  webTargetFrame: { position: 'absolute', top: '50%', left: '50%', width: 280, height: 100, marginTop: -50, marginLeft: -140, borderWidth: 2, borderColor: Colors.primary, borderRadius: 8 },
  webControls: { alignItems: 'center', paddingVertical: 24, gap: 16, backgroundColor: '#111' },
  uploadButton: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 24, paddingVertical: 12, borderWidth: 1, borderColor: Colors.primary, borderRadius: 8 },
  uploadText: { color: Colors.primary, fontSize: 14 },
  errorContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  errorText: { color: '#fff', textAlign: 'center', fontSize: 14 },
  text: { color: '#fff', fontSize: 16, textAlign: 'center', margin: 32 },
  button: { marginHorizontal: 32, marginTop: 16 },
});
