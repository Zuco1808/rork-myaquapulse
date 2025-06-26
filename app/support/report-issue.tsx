import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  Alert,
  Platform,
  KeyboardAvoidingView,
  Image
} from 'react-native';
import { useRouter } from 'expo-router';
import { 
  AlertTriangle, 
  Camera, 
  MapPin, 
  Send, 
  Menu,
  X
} from 'lucide-react-native';
import { Header } from '@/components/layout/Header';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { useAuthStore } from '@/store/auth-store';
import Colors from '@/constants/colors';

export default function ReportIssueScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  
  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [isUrgent, setIsUrgent] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  // Form validation
  const [titleError, setTitleError] = useState('');
  const [descriptionError, setDescriptionError] = useState('');
  
  const validateTitle = () => {
    if (!title.trim()) {
      setTitleError('Naslov je obavezan');
      return false;
    }
    setTitleError('');
    return true;
  };
  
  const validateDescription = () => {
    if (!description.trim()) {
      setDescriptionError('Opis problema je obavezan');
      return false;
    }
    setDescriptionError('');
    return true;
  };
  
  const handleAddImage = () => {
    // In a real app, this would open the camera or image picker
    // For now, we'll just add a placeholder image
    const placeholderImages = [
      'https://images.unsplash.com/photo-1584677626646-7c8f83690304',
      'https://images.unsplash.com/photo-1585704032915-c3400305e979',
      'https://images.unsplash.com/photo-1603807008857-ad66b70431e3'
    ];
    
    if (images.length < 3) {
      const randomImage = placeholderImages[images.length];
      setImages([...images, randomImage]);
    } else {
      Alert.alert('Upozorenje', 'Možete dodati najviše 3 slike.');
    }
  };
  
  const handleRemoveImage = (index: number) => {
    const updatedImages = [...images];
    updatedImages.splice(index, 1);
    setImages(updatedImages);
  };
  
  const handleGetLocation = () => {
    // In a real app, this would use the device's location
    setLocation('Trenutna lokacija: Zmaja od Bosne 8, Sarajevo');
  };
  
  const handleSubmit = async () => {
    const isTitleValid = validateTitle();
    const isDescriptionValid = validateDescription();
    
    if (isTitleValid && isDescriptionValid) {
      setIsLoading(true);
      
      // Simulate API call
      setTimeout(() => {
        setIsLoading(false);
        
        // Show success message
        Alert.alert(
          'Uspjeh',
          'Vaša prijava kvara je uspješno poslana. Bit ćete obaviješteni o statusu.',
          [
            { 
              text: 'OK', 
              onPress: () => router.back() 
            }
          ]
        );
      }, 1500);
    }
  };
  
  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
    >
      <Header 
        title="Prijava kvara"
        showBack
        leftIcon={<Menu size={24} color={Colors.text} />}
        onLeftPress={() => router.push('/(tabs)')}
      />
      
      <ScrollView style={styles.content}>
        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>Detalji problema</Text>
          
          <Input
            label="Naslov"
            placeholder="Unesite naslov prijave"
            value={title}
            onChangeText={(text) => {
              setTitle(text);
              if (titleError) validateTitle();
            }}
            error={titleError}
          />
          
          <Input
            label="Opis problema"
            placeholder="Detaljno opišite problem"
            value={description}
            onChangeText={(text) => {
              setDescription(text);
              if (descriptionError) validateDescription();
            }}
            multiline
            numberOfLines={4}
            style={styles.descriptionInput}
            error={descriptionError}
          />
          
          <View style={styles.urgentContainer}>
            <TouchableOpacity
              style={[
                styles.urgentButton,
                isUrgent && styles.urgentButtonActive
              ]}
              onPress={() => setIsUrgent(!isUrgent)}
            >
              <AlertTriangle size={20} color={isUrgent ? Colors.error : Colors.textLight} />
              <Text 
                style={[
                  styles.urgentText,
                  isUrgent && styles.urgentTextActive
                ]}
              >
                Hitno - potrebna hitna intervencija
              </Text>
            </TouchableOpacity>
          </View>
        </Card>
        
        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>Lokacija</Text>
          
          <Button
            title="Koristi trenutnu lokaciju"
            variant="outline"
            leftIcon={<MapPin size={20} color={Colors.primary} />}
            onPress={handleGetLocation}
            style={styles.locationButton}
          />
          
          {location ? (
            <View style={styles.locationContainer}>
              <MapPin size={16} color={Colors.primary} />
              <Text style={styles.locationText}>{location}</Text>
            </View>
          ) : null}
        </Card>
        
        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>Fotografije</Text>
          <Text style={styles.sectionDescription}>
            Dodajte fotografije koje prikazuju problem (opcionalno)
          </Text>
          
          <View style={styles.imagesContainer}>
            {images.map((image, index) => (
              <View key={index} style={styles.imageWrapper}>
                <Image
                  source={{ uri: image }}
                  style={styles.image}
                />
                <TouchableOpacity
                  style={styles.removeImageButton}
                  onPress={() => handleRemoveImage(index)}
                >
                  <X size={16} color="#fff" />
                </TouchableOpacity>
              </View>
            ))}
            
            {images.length < 3 && (
              <TouchableOpacity
                style={styles.addImageButton}
                onPress={handleAddImage}
              >
                <Camera size={24} color={Colors.primary} />
                <Text style={styles.addImageText}>Dodaj sliku</Text>
              </TouchableOpacity>
            )}
          </View>
        </Card>
        
        <View style={styles.buttonContainer}>
          <Button
            title="Pošalji prijavu"
            onPress={handleSubmit}
            leftIcon={<Send size={20} color="#fff" />}
            isLoading={isLoading}
          />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  section: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 16,
  },
  sectionDescription: {
    fontSize: 14,
    color: Colors.textLight,
    marginBottom: 16,
  },
  descriptionInput: {
    height: 100,
    textAlignVertical: 'top',
  },
  urgentContainer: {
    marginTop: 16,
  },
  urgentButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.highlight,
  },
  urgentButtonActive: {
    borderColor: Colors.error,
    backgroundColor: '#FFEBEE',
  },
  urgentText: {
    marginLeft: 8,
    fontSize: 14,
    color: Colors.text,
  },
  urgentTextActive: {
    color: Colors.error,
    fontWeight: '500',
  },
  locationButton: {
    marginBottom: 16,
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: Colors.highlight,
    borderRadius: 8,
  },
  locationText: {
    marginLeft: 8,
    fontSize: 14,
    color: Colors.text,
  },
  imagesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  imageWrapper: {
    position: 'relative',
    width: 100,
    height: 100,
    borderRadius: 8,
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  removeImageButton: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addImageButton: {
    width: 100,
    height: 100,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.highlight,
  },
  addImageText: {
    marginTop: 8,
    fontSize: 12,
    color: Colors.primary,
  },
  buttonContainer: {
    marginTop: 8,
    marginBottom: 32,
  },
});