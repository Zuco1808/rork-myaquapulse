import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { CameraView as ExpoCameraView, CameraType, useCameraPermissions } from 'expo-camera';
import { Camera, X } from 'lucide-react-native';
import { Button } from '../ui/Button';
import Colors from '@/constants/colors';

interface OCRCameraViewProps {
  onCapture: (imageUri: string) => void;
  onClose: () => void;
}

export const OCRCameraView: React.FC<OCRCameraViewProps> = ({
  onCapture,
  onClose,
}) => {
  const [permission, requestPermission] = useCameraPermissions();
  const [facing, setFacing] = useState<CameraType>('back');
  const cameraRef = useRef<any>(null);
  
  if (!permission) {
    // Camera permissions are still loading
    return (
      <View style={styles.container}>
        <Text style={styles.text}>Učitavanje kamere...</Text>
      </View>
    );
  }
  
  if (!permission.granted) {
    // Camera permissions are not granted yet
    return (
      <View style={styles.container}>
        <Text style={styles.text}>
          Potrebna je dozvola za pristup kameri kako biste mogli skenirati vodomjer.
        </Text>
        <Button 
          title="Dozvoli pristup kameri" 
          onPress={requestPermission} 
          style={styles.button}
        />
        <Button 
          title="Odustani" 
          onPress={onClose} 
          variant="outline"
          style={styles.button}
        />
      </View>
    );
  }
  
  const toggleCameraFacing = () => {
    setFacing((current: CameraType) => (current === 'back' ? 'front' : 'back'));
  };
  
  const takePicture = async () => {
    if (cameraRef.current) {
      try {
        // This is a mock since we can't actually take a picture in this environment
        // In a real app, you would use cameraRef.current.takePictureAsync()
        const mockImageUri = 'https://images.unsplash.com/photo-1581275288578-bfb98151a2e2?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1000&q=80';
        onCapture(mockImageUri);
      } catch (error) {
        console.error('Failed to take picture:', error);
      }
    }
  };
  
  return (
    <View style={styles.container}>
      <ExpoCameraView
        ref={cameraRef}
        style={styles.camera}
        facing={facing}
      >
        <View style={styles.overlay}>
          <View style={styles.header}>
            <TouchableOpacity 
              style={styles.closeButton}
              onPress={onClose}
              activeOpacity={0.7}
            >
              <X size={24} color="#fff" />
            </TouchableOpacity>
            
            <Text style={styles.headerText}>
              Skenirajte vodomjer
            </Text>
            
            <TouchableOpacity 
              style={styles.flipButton}
              onPress={toggleCameraFacing}
              activeOpacity={0.7}
            >
              <Camera size={24} color="#fff" />
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
              style={styles.captureButton}
              onPress={takePicture}
              activeOpacity={0.7}
            >
              <View style={styles.captureButtonInner}>
                <Camera size={28} color="#fff" />
              </View>
            </TouchableOpacity>
          </View>
        </View>
      </ExpoCameraView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  camera: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    justifyContent: 'space-between',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  closeButton: {
    padding: 8,
  },
  headerText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  flipButton: {
    padding: 8,
  },
  targetArea: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  targetFrame: {
    width: 280,
    height: 120,
    borderWidth: 2,
    borderColor: Colors.primary,
    borderRadius: 8,
    marginBottom: 16,
  },
  instructionText: {
    color: '#fff',
    fontSize: 14,
    textAlign: 'center',
    marginHorizontal: 32,
  },
  footer: {
    alignItems: 'center',
    paddingBottom: 32,
  },
  captureButton: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  captureButtonInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  text: {
    color: '#fff',
    fontSize: 16,
    textAlign: 'center',
    margin: 32,
  },
  button: {
    marginHorizontal: 32,
    marginTop: 16,
  },
});