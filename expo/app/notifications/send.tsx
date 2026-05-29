import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity,
  Switch,
  Alert
} from 'react-native';
import { useRouter } from 'expo-router';
import { 
  ArrowLeft, 
  Send, 
  Users, 
  Building, 
  MapPin, 
  Bell,
  AlertTriangle,
  Info,
  CheckCircle,
  Menu
} from 'lucide-react-native';
import { Header } from '@/components/layout/Header';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { useAuthStore } from '@/store/auth-store';
import { useNotificationStore } from '@/store/notification-store';
import { getCompanies } from '@/lib/api/companies';
import { mockCompanies } from '@/mocks/companies';
import Colors from '@/constants/colors';

interface CompanyOption {
  id: string;
  name: string;
}

// Notification types
const notificationTypes = [
  { id: 'info', label: 'Informacija', icon: <Info size={20} color={Colors.info} /> },
  { id: 'success', label: 'Uspjeh', icon: <CheckCircle size={20} color={Colors.success} /> },
  { id: 'warning', label: 'Upozorenje', icon: <AlertTriangle size={20} color={Colors.warning} /> },
  { id: 'error', label: 'Greška', icon: <AlertTriangle size={20} color={Colors.error} /> },
];

// User roles
const userRoles = [
  { id: 'superadmin', label: 'Super Admin' },
  { id: 'admin', label: 'Admin' },
  { id: 'finance', label: 'Finansije' },
  { id: 'worker', label: 'Radnik' },
  { id: 'citizen', label: 'Građanin' },
];

export default function SendNotificationScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { sendNotification } = useNotificationStore();
  
  // Form state
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [selectedType, setSelectedType] = useState('info');
  const [isLoading, setIsLoading] = useState(false);
  
  // Target options
  const [targetAll, setTargetAll] = useState(true);
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const [selectedCompanies, setSelectedCompanies] = useState<string[]>([]);
  const [selectedLocations, setSelectedLocations] = useState<string[]>([]);
  
  // Company selection state
  const [showCompanySelector, setShowCompanySelector] = useState(false);
  const [companies, setCompanies] = useState<CompanyOption[]>([]);

  // Load companies from Supabase (fallback to mock if it fails)
  useEffect(() => {
    let mounted = true;
    getCompanies()
      .then((data) => {
        if (!mounted) return;
        setCompanies(data.map((c) => ({ id: c.id, name: c.name })));
      })
      .catch(() => {
        if (!mounted) return;
        setCompanies(mockCompanies.map((c) => ({ id: c.id, name: c.name })));
      });
    return () => {
      mounted = false;
    };
  }, []);

  // Check if user has permission to access this screen
  useEffect(() => {
    if (!user || (user.role !== 'superadmin' && user.role !== 'admin' && user.role !== 'worker')) {
      router.replace('/(tabs)');
    }
  }, [user, router]);
  
  const toggleRole = (roleId: string) => {
    if (selectedRoles.includes(roleId)) {
      setSelectedRoles(selectedRoles.filter(id => id !== roleId));
    } else {
      setSelectedRoles([...selectedRoles, roleId]);
    }
  };
  
  const toggleTargetAll = () => {
    setTargetAll(!targetAll);
    if (targetAll) {
      // If turning off "all", select all roles by default
      setSelectedRoles(userRoles.map(role => role.id));
    } else {
      setSelectedRoles([]);
      setSelectedCompanies([]);
      setSelectedLocations([]);
    }
  };
  
  const toggleCompany = (companyId: string) => {
    if (selectedCompanies.includes(companyId)) {
      setSelectedCompanies(selectedCompanies.filter(id => id !== companyId));
    } else {
      setSelectedCompanies([...selectedCompanies, companyId]);
    }
  };
  
  const handleSelectLocations = () => {
    // In a real app, this would open a location selector
    Alert.alert(
      "Odabir lokacija",
      "Ova funkcionalnost bi otvorila odabir lokacija.",
      [{ text: "OK" }]
    );
  };
  
  const validateForm = () => {
    if (!title.trim()) {
      Alert.alert("Greška", "Naslov obavijesti je obavezan.");
      return false;
    }
    
    if (!message.trim()) {
      Alert.alert("Greška", "Tekst obavijesti je obavezan.");
      return false;
    }
    
    if (!targetAll && selectedRoles.length === 0) {
      Alert.alert("Greška", "Odaberite barem jednu ulogu korisnika.");
      return false;
    }
    
    return true;
  };
  
  const handleSendNotification = async () => {
    if (!validateForm()) return;
    
    setIsLoading(true);
    
    try {
      // Create notification object
      const notification = {
        title,
        message,
        type: selectedType,
        targetAll,
        targetRoles: selectedRoles,
        targetCompanies: selectedCompanies,
        targetLocations: selectedLocations,
      };
      
      // Send notification
      await sendNotification(notification);
      
      // Show success message
      Alert.alert(
        "Uspjeh",
        "Obavijest je uspješno poslana.",
        [
          { 
            text: "OK", 
            onPress: () => router.back() 
          }
        ]
      );
    } catch (error) {
      Alert.alert("Greška", "Došlo je do greške prilikom slanja obavijesti.");
    } finally {
      setIsLoading(false);
    }
  };
  
  // Filter companies based on user role
  const userCompanyId = (user as any)?.companyId ?? (user as any)?.company_id;
  const availableCompanies =
    user?.role === 'admin'
      ? companies.filter((company) => company.id === userCompanyId)
      : companies;
  
  const renderCompanySelector = () => {
    if (!showCompanySelector) return null;
    
    return (
      <View style={styles.selectorContainer}>
        <Text style={styles.selectorTitle}>Odaberite kompanije:</Text>
        
        {availableCompanies.map(company => (
          <TouchableOpacity
            key={company.id}
            style={[
              styles.companyOption,
              selectedCompanies.includes(company.id) && styles.companyOptionSelected
            ]}
            onPress={() => toggleCompany(company.id)}
          >
            <Text style={[
              styles.companyOptionText,
              selectedCompanies.includes(company.id) && styles.companyOptionTextSelected
            ]}>
              {company.name}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    );
  };
  
  return (
    <View style={styles.container}>
      <Header 
        title="Nova obavijest"
        showBack
        leftIcon={<Menu size={24} color={Colors.text} />}
        onLeftPress={() => router.push('/(tabs)')}
      />
      
      <ScrollView style={styles.content}>
        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>Detalji obavijesti</Text>
          
          <Input
            label="Naslov"
            placeholder="Unesite naslov obavijesti"
            value={title}
            onChangeText={setTitle}
          />
          
          <Input
            label="Tekst obavijesti"
            placeholder="Unesite tekst obavijesti"
            value={message}
            onChangeText={setMessage}
            multiline
            numberOfLines={4}
            style={styles.messageInput}
          />
          
          <Text style={styles.label}>Tip obavijesti</Text>
          <View style={styles.typeOptions}>
            {notificationTypes.map((type) => (
              <TouchableOpacity
                key={type.id}
                style={[
                  styles.typeOption,
                  selectedType === type.id && styles.typeOptionSelected
                ]}
                onPress={() => setSelectedType(type.id)}
              >
                {type.icon}
                <Text 
                  style={[
                    styles.typeOptionText,
                    selectedType === type.id && styles.typeOptionTextSelected
                  ]}
                >
                  {type.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </Card>
        
        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>Primaoci</Text>
          
          <View style={styles.targetAllContainer}>
            <View style={styles.targetAllInfo}>
              <Bell size={20} color={Colors.primary} />
              <Text style={styles.targetAllText}>Pošalji svim korisnicima</Text>
            </View>
            <Switch
              value={targetAll}
              onValueChange={toggleTargetAll}
              trackColor={{ false: Colors.border, true: Colors.primary }}
              thumbColor={targetAll ? '#fff' : '#f4f3f4'}
            />
          </View>
          
          {!targetAll && (
            <>
              <Text style={styles.label}>Uloge korisnika</Text>
              <View style={styles.rolesContainer}>
                {userRoles.map((role) => (
                  <TouchableOpacity
                    key={role.id}
                    style={[
                      styles.roleOption,
                      selectedRoles.includes(role.id) && styles.roleOptionSelected
                    ]}
                    onPress={() => toggleRole(role.id)}
                  >
                    <Text 
                      style={[
                        styles.roleOptionText,
                        selectedRoles.includes(role.id) && styles.roleOptionTextSelected
                      ]}
                    >
                      {role.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              
              {user?.role === 'superadmin' && (
                <View style={styles.additionalFilters}>
                  <Button
                    title="Odaberi kompanije"
                    variant="outline"
                    size="small"
                    leftIcon={<Building size={16} color={Colors.primary} />}
                    onPress={() => setShowCompanySelector(!showCompanySelector)}
                    style={styles.filterButton}
                  />
                  
                  <Button
                    title="Odaberi lokacije"
                    variant="outline"
                    size="small"
                    leftIcon={<MapPin size={16} color={Colors.primary} />}
                    onPress={handleSelectLocations}
                    style={styles.filterButton}
                  />
                </View>
              )}
              
              {renderCompanySelector()}
              
              {selectedCompanies.length > 0 && (
                <View style={styles.selectedFiltersContainer}>
                  <Text style={styles.selectedFiltersLabel}>Odabrane kompanije:</Text>
                  <Text style={styles.selectedFiltersValue}>
                    {selectedCompanies.length} kompanija
                  </Text>
                </View>
              )}
              
              {selectedLocations.length > 0 && (
                <View style={styles.selectedFiltersContainer}>
                  <Text style={styles.selectedFiltersLabel}>Odabrane lokacije:</Text>
                  <Text style={styles.selectedFiltersValue}>
                    {selectedLocations.length} lokacija
                  </Text>
                </View>
              )}
            </>
          )}
        </Card>
        
        <View style={styles.buttonContainer}>
          <Button
            title="Pošalji obavijest"
            onPress={handleSendNotification}
            leftIcon={<Send size={20} color="#fff" />}
            isLoading={isLoading}
          />
        </View>
      </ScrollView>
    </View>
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
  messageInput: {
    height: 100,
    textAlignVertical: 'top',
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.text,
    marginBottom: 8,
    marginTop: 16,
  },
  typeOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 8,
  },
  typeOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: '#fff',
  },
  typeOptionSelected: {
    borderColor: Colors.primary,
    backgroundColor: Colors.highlight,
  },
  typeOptionText: {
    fontSize: 14,
    color: Colors.text,
    marginLeft: 8,
  },
  typeOptionTextSelected: {
    color: Colors.primary,
    fontWeight: '500',
  },
  targetAllContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  targetAllInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  targetAllText: {
    fontSize: 16,
    color: Colors.text,
    marginLeft: 12,
  },
  rolesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  roleOption: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: '#fff',
  },
  roleOptionSelected: {
    borderColor: Colors.primary,
    backgroundColor: Colors.highlight,
  },
  roleOptionText: {
    fontSize: 14,
    color: Colors.text,
  },
  roleOptionTextSelected: {
    color: Colors.primary,
    fontWeight: '500',
  },
  additionalFilters: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  filterButton: {
    flex: 1,
  },
  selectorContainer: {
    marginTop: 8,
    marginBottom: 16,
    padding: 12,
    backgroundColor: Colors.highlight,
    borderRadius: 8,
  },
  selectorTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.text,
    marginBottom: 8,
  },
  companyOption: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: '#fff',
    marginBottom: 8,
  },
  companyOptionSelected: {
    borderColor: Colors.primary,
    backgroundColor: Colors.highlight,
  },
  companyOptionText: {
    fontSize: 14,
    color: Colors.text,
  },
  companyOptionTextSelected: {
    color: Colors.primary,
    fontWeight: '500',
  },
  selectedFiltersContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  selectedFiltersLabel: {
    fontSize: 14,
    color: Colors.text,
  },
  selectedFiltersValue: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.primary,
  },
  buttonContainer: {
    marginTop: 8,
    marginBottom: 32,
  },
});