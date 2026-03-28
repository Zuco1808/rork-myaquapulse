import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Image } from 'expo-image';
import { Check, X, Edit2 } from 'lucide-react-native';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import Colors from '@/constants/colors';

interface OCRResultProps {
  imageUri: string;
  onConfirm: (value: number) => void;
  onRetry: () => void;
  onCancel: () => void;
}

export const OCRResult: React.FC<OCRResultProps> = ({
  imageUri,
  onConfirm,
  onRetry,
  onCancel,
}) => {
  const [isProcessing, setIsProcessing] = useState(true);
  const [ocrValue, setOcrValue] = useState<string>('');
  const [isEditing, setIsEditing] = useState(false);
  const [editedValue, setEditedValue] = useState<string>('');
  
  // Simulate OCR processing
  React.useEffect(() => {
    const timer = setTimeout(() => {
      // Generate a random reading between 1000 and 9999
      const randomReading = Math.floor(Math.random() * 9000) + 1000;
      setOcrValue(randomReading.toString());
      setEditedValue(randomReading.toString());
      setIsProcessing(false);
    }, 2000);
    
    return () => clearTimeout(timer);
  }, []);
  
  const handleConfirm = () => {
    const numericValue = parseFloat(isEditing ? editedValue : ocrValue);
    if (!isNaN(numericValue)) {
      onConfirm(numericValue);
    }
  };
  
  const toggleEdit = () => {
    setIsEditing(!isEditing);
  };
  
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Rezultat skeniranja</Text>
        <TouchableOpacity 
          style={styles.closeButton}
          onPress={onCancel}
          activeOpacity={0.7}
        >
          <X size={24} color={Colors.text} />
        </TouchableOpacity>
      </View>
      
      <View style={styles.imageContainer}>
        <Image
          source={{ uri: imageUri }}
          style={styles.image}
          contentFit="cover"
        />
      </View>
      
      <View style={styles.resultContainer}>
        {isProcessing ? (
          <View style={styles.processingContainer}>
            <ActivityIndicator size="large" color={Colors.primary} />
            <Text style={styles.processingText}>
              Analiziranje slike...
            </Text>
          </View>
        ) : (
          <>
            <Text style={styles.resultLabel}>
              Očitana vrijednost:
            </Text>
            
            {isEditing ? (
              <View style={styles.editContainer}>
                <Input
                  value={editedValue}
                  onChangeText={setEditedValue}
                  keyboardType="numeric"
                  containerStyle={styles.input}
                  autoFocus
                />
                <TouchableOpacity 
                  style={styles.editButton}
                  onPress={toggleEdit}
                  activeOpacity={0.7}
                >
                  <Check size={24} color={Colors.success} />
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.valueContainer}>
                <Text style={styles.resultValue}>
                  {ocrValue} m³
                </Text>
                <TouchableOpacity 
                  style={styles.editButton}
                  onPress={toggleEdit}
                  activeOpacity={0.7}
                >
                  <Edit2 size={20} color={Colors.primary} />
                </TouchableOpacity>
              </View>
            )}
            
            <Text style={styles.infoText}>
              Provjerite da li je očitana vrijednost tačna. Ako nije, možete je ručno ispraviti.
            </Text>
          </>
        )}
      </View>
      
      <View style={styles.footer}>
        <Button
          title="Ponovi skeniranje"
          onPress={onRetry}
          variant="outline"
          style={styles.button}
          disabled={isProcessing}
        />
        <Button
          title="Potvrdi"
          onPress={handleConfirm}
          style={styles.button}
          disabled={isProcessing}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.text,
  },
  closeButton: {
    padding: 8,
  },
  imageContainer: {
    height: 200,
    margin: 16,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: Colors.border,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  resultContainer: {
    padding: 16,
    flex: 1,
  },
  processingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  processingText: {
    fontSize: 16,
    color: Colors.text,
    marginTop: 16,
  },
  resultLabel: {
    fontSize: 16,
    color: Colors.textLight,
    marginBottom: 8,
  },
  valueContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  resultValue: {
    fontSize: 32,
    fontWeight: 'bold',
    color: Colors.text,
    marginRight: 16,
  },
  editContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  input: {
    flex: 1,
    marginBottom: 0,
  },
  editButton: {
    padding: 8,
  },
  infoText: {
    fontSize: 14,
    color: Colors.textLight,
    marginTop: 8,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  button: {
    flex: 1,
    marginHorizontal: 8,
  },
});