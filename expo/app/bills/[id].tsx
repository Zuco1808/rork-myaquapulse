import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  Alert,
  Modal,
  SafeAreaView,
  Platform,
  TextInput as RNTextInput
} from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { 
  CreditCard, 
  Calendar, 
  DollarSign, 
  User, 
  MapPin, 
  Droplet, 
  CheckCircle, 
  Download, 
  Printer,
  X,
  Menu
} from 'lucide-react-native';
import { StatusIndicator } from '@/components/ui/StatusIndicator';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Header } from '@/components/layout/Header';
import { Drawer } from '@/components/layout/Drawer';
import { useAuthStore } from '@/store/auth-store';
import { updateBillStatus } from '@/lib/api/bills';
import Colors from '@/constants/colors';

// Bill type
interface Bill {
  id: string;
  number: string;
  userId: string;
  userName: string;
  userAddress: string;
  companyId: string;
  companyName: string;
  amount: number;
  status: 'paid' | 'pending' | 'overdue';
  dueDate: string;
  paidDate: string | null;
  period: string;
  consumption: number;
  items: Array<{
    description: string;
    amount: number;
  }>;
}

// Mock bills data
const mockBills: Bill[] = [
  {
    id: 'b1',
    number: 'F-2023-001',
    userId: 'u1',
    userName: 'Amina Hodžić',
    userAddress: 'Zmaja od Bosne 8, Sarajevo',
    companyId: 'c1',
    companyName: 'Vodovod Sarajevo',
    amount: 45.80,
    status: 'paid',
    dueDate: '2023-05-15',
    paidDate: '2023-05-10',
    period: 'April 2023',
    consumption: 12.5,
    items: [
      { description: 'Potrošnja vode', amount: 32.50 },
      { description: 'Kanalizacija', amount: 8.30 },
      { description: 'Održavanje', amount: 5.00 }
    ]
  },
  {
    id: 'b2',
    number: 'F-2023-002',
    userId: 'u2',
    userName: 'Emir Kovačević',
    userAddress: 'Ferhadija 12, Sarajevo',
    companyId: 'c1',
    companyName: 'Vodovod Sarajevo',
    amount: 68.20,
    status: 'paid',
    dueDate: '2023-05-15',
    paidDate: '2023-05-12',
    period: 'April 2023',
    consumption: 18.3,
    items: [
      { description: 'Potrošnja vode', amount: 48.50 },
      { description: 'Kanalizacija', amount: 12.70 },
      { description: 'Održavanje', amount: 7.00 }
    ]
  },
  {
    id: 'b3',
    number: 'F-2023-003',
    userId: 'u3',
    userName: 'Selma Begić',
    userAddress: 'Titova 18, Sarajevo',
    companyId: 'c1',
    companyName: 'Vodovod Sarajevo',
    amount: 52.40,
    status: 'overdue',
    dueDate: '2023-05-15',
    paidDate: null,
    period: 'April 2023',
    consumption: 14.2,
    items: [
      { description: 'Potrošnja vode', amount: 37.20 },
      { description: 'Kanalizacija', amount: 10.20 },
      { description: 'Održavanje', amount: 5.00 }
    ]
  },
  {
    id: 'b4',
    number: 'F-2023-004',
    userId: 'u4',
    userName: 'Adnan Mehić',
    userAddress: 'Alipašina 22, Sarajevo',
    companyId: 'c1',
    companyName: 'Vodovod Sarajevo',
    amount: 38.60,
    status: 'pending',
    dueDate: '2023-06-15',
    paidDate: null,
    period: 'Maj 2023',
    consumption: 10.5,
    items: [
      { description: 'Potrošnja vode', amount: 27.30 },
      { description: 'Kanalizacija', amount: 6.30 },
      { description: 'Održavanje', amount: 5.00 }
    ]
  },
  {
    id: 'b5',
    number: 'F-2023-005',
    userId: 'u5',
    userName: 'Lejla Hadžić',
    userAddress: 'Koševo 5, Sarajevo',
    companyId: 'c1',
    companyName: 'Vodovod Sarajevo',
    amount: 42.10,
    status: 'pending',
    dueDate: '2023-06-15',
    paidDate: null,
    period: 'Maj 2023',
    consumption: 11.8,
    items: [
      { description: 'Potrošnja vode', amount: 29.80 },
      { description: 'Kanalizacija', amount: 7.30 },
      { description: 'Održavanje', amount: 5.00 }
    ]
  }
];

export default function BillDetailsScreen() {
  const params = useLocalSearchParams();
  const router = useRouter();
  const { user } = useAuthStore();
  const { id } = params;
  
  const [bill, setBill] = useState<Bill | null>(null);
  const [paymentModalVisible, setPaymentModalVisible] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [pdfModalVisible, setPdfModalVisible] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  
  useEffect(() => {
    // Check if user is logged in
    if (!user) {
      router.replace('/login');
      return;
    }
    
    // Load bill data
    if (id) {
      const foundBill = mockBills.find(b => b.id === id);
      if (foundBill) {
        setBill(foundBill);
        if (foundBill.amount) {
          setPaymentAmount(foundBill.amount.toFixed(2));
        }
      } else {
        Alert.alert("Greška", "Račun nije pronađen.");
        router.back();
      }
    }
  }, [id, router, user]);
  
  const handlePayBill = () => {
    if (!bill) return;
    setPaymentModalVisible(true);
  };
  
  const handleConfirmPayment = async () => {
    if (!bill) return;

    const amount = parseFloat(paymentAmount);
    if (isNaN(amount) || amount <= 0) {
      Alert.alert("Greška", "Unesite validan iznos za plaćanje.");
      return;
    }

    const paidDateIso = new Date().toISOString();

    try {
      await updateBillStatus(bill.id, 'paid', paidDateIso);

      setBill({
        ...bill,
        status: 'paid',
        paidDate: paidDateIso.split('T')[0],
      });
      setPaymentModalVisible(false);

      Alert.alert(
        "Uspjeh",
        `Račun je uspješno plaćen u iznosu od ${amount.toFixed(2)} KM.`
      );
    } catch {
      Alert.alert("Greška", "Nije moguće spremiti plaćanje. Pokušajte ponovo.");
    }
  };
  
  const handleViewPdf = () => {
    if (!bill) return;
    setPdfModalVisible(true);
  };
  
  const handleDownloadPdf = () => {
    Alert.alert(
      "Preuzimanje PDF-a",
      "PDF računa će biti preuzet.",
      [{ text: "OK" }]
    );
  };
  
  const handlePrintBill = () => {
    Alert.alert(
      "Štampanje računa",
      "Račun će biti poslan na štampač.",
      [{ text: "OK" }]
    );
  };
  
  if (!bill) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.container}>
          <Header 
            title="Detalji računa" 
            showBack 
            showMenu
            onLeftPress={() => setIsDrawerOpen(true)}
          />
          <Drawer
            isOpen={isDrawerOpen}
            onClose={() => setIsDrawerOpen(false)}
          />
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingText}>Učitavanje...</Text>
          </View>
        </View>
      </SafeAreaView>
    );
  }
  
  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <Header 
          title="Detalji računa" 
          showBack 
          showMenu
          onLeftPress={() => setIsDrawerOpen(true)}
        />
        
        <Drawer
          isOpen={isDrawerOpen}
          onClose={() => setIsDrawerOpen(false)}
        />
        
        <ScrollView style={styles.scrollView} contentContainerStyle={styles.contentContainer}>
          <Card style={styles.billCard}>
            <View style={styles.billHeader}>
              <View style={styles.billInfo}>
                <Text style={styles.billNumber}>{bill.number}</Text>
                <Text style={styles.billPeriod}>{bill.period}</Text>
              </View>
              <StatusIndicator 
                status={bill.status} 
                labels={{
                  paid: "Plaćeno",
                  pending: "Na čekanju",
                  overdue: "Prekoračeno"
                }}
                size="large"
              />
            </View>
            
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <User size={20} color={Colors.primary} />
                <Text style={styles.sectionTitle}>Podaci o korisniku</Text>
              </View>
              <View style={styles.sectionContent}>
                <Text style={styles.userName}>{bill.userName}</Text>
                <View style={styles.infoRow}>
                  <MapPin size={16} color={Colors.textLight} />
                  <Text style={styles.infoText}>{bill.userAddress}</Text>
                </View>
              </View>
            </View>
            
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <CreditCard size={20} color={Colors.primary} />
                <Text style={styles.sectionTitle}>Podaci o računu</Text>
              </View>
              <View style={styles.sectionContent}>
                <View style={styles.infoRow}>
                  <DollarSign size={16} color={Colors.textLight} />
                  <Text style={styles.infoText}>
                    <Text style={styles.infoLabel}>Iznos: </Text>
                    <Text style={styles.infoValue}>{bill.amount.toFixed(2)} KM</Text>
                  </Text>
                </View>
                
                <View style={styles.infoRow}>
                  <Calendar size={16} color={Colors.textLight} />
                  <Text style={styles.infoText}>
                    <Text style={styles.infoLabel}>Rok plaćanja: </Text>
                    <Text style={styles.infoValue}>{bill.dueDate}</Text>
                  </Text>
                </View>
                
                <View style={styles.infoRow}>
                  <Droplet size={16} color={Colors.textLight} />
                  <Text style={styles.infoText}>
                    <Text style={styles.infoLabel}>Potrošnja: </Text>
                    <Text style={styles.infoValue}>{bill.consumption} m³</Text>
                  </Text>
                </View>
                
                {bill.status === 'paid' && bill.paidDate && (
                  <View style={styles.infoRow}>
                    <CheckCircle size={16} color={Colors.success} />
                    <Text style={styles.infoText}>
                      <Text style={styles.infoLabel}>Plaćeno: </Text>
                      <Text style={styles.infoValue}>{bill.paidDate}</Text>
                    </Text>
                  </View>
                )}
              </View>
            </View>
            
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Stavke računa</Text>
              </View>
              <View style={styles.sectionContent}>
                <View style={styles.itemsHeader}>
                  <Text style={[styles.itemHeaderText, { flex: 2 }]}>Opis</Text>
                  <Text style={[styles.itemHeaderText, { flex: 1, textAlign: 'right' }]}>Iznos</Text>
                </View>
                
                {bill.items.map((item, index) => (
                  <View key={index} style={styles.itemRow}>
                    <Text style={[styles.itemText, { flex: 2 }]}>{item.description}</Text>
                    <Text style={[styles.itemText, { flex: 1, textAlign: 'right' }]}>
                      {item.amount.toFixed(2)} KM
                    </Text>
                  </View>
                ))}
                
                <View style={styles.totalRow}>
                  <Text style={styles.totalLabel}>Ukupno:</Text>
                  <Text style={styles.totalValue}>{bill.amount.toFixed(2)} KM</Text>
                </View>
              </View>
            </View>
          </Card>
          
          <View style={styles.actions}>
            {bill.status !== 'paid' && (
              <Button
                title="Plati račun"
                onPress={handlePayBill}
                leftIcon={<CheckCircle size={20} color="#fff" />}
                style={styles.actionButton}
              />
            )}
            
            <Button
              title="Preuzmi PDF"
              variant="outline"
              onPress={handleViewPdf}
              leftIcon={<Download size={20} color={Colors.primary} />}
              style={styles.actionButton}
            />
            
            <Button
              title="Štampaj"
              variant="outline"
              onPress={handlePrintBill}
              leftIcon={<Printer size={20} color={Colors.primary} />}
              style={styles.actionButton}
            />
          </View>
        </ScrollView>
        
        {/* Payment Modal */}
        <Modal
          visible={paymentModalVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setPaymentModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContainer}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Plaćanje računa</Text>
                <TouchableOpacity 
                  onPress={() => setPaymentModalVisible(false)}
                  style={styles.closeButton}
                >
                  <X size={24} color={Colors.text} />
                </TouchableOpacity>
              </View>
              
              <View style={styles.modalContent}>
                <Text style={styles.modalText}>
                  Račun: {bill.number}
                </Text>
                <Text style={styles.modalText}>
                  Korisnik: {bill.userName}
                </Text>
                <Text style={styles.modalText}>
                  Iznos računa: {bill.amount.toFixed(2)} KM
                </Text>
                
                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>Iznos za plaćanje:</Text>
                  <View style={styles.inputWrapper}>
                    <DollarSign size={20} color={Colors.textLight} style={styles.inputIcon} />
                    <TextInput
                      style={styles.input}
                      value={paymentAmount}
                      onChangeText={setPaymentAmount}
                      keyboardType="numeric"
                      placeholder="Unesite iznos"
                    />
                  </View>
                </View>
                
                <View style={styles.modalActions}>
                  <Button
                    title="Odustani"
                    variant="outline"
                    onPress={() => setPaymentModalVisible(false)}
                    style={styles.modalButton}
                  />
                  <Button
                    title="Plati"
                    onPress={handleConfirmPayment}
                    style={styles.modalButton}
                  />
                </View>
              </View>
            </View>
          </View>
        </Modal>
        
        {/* PDF Preview Modal */}
        <Modal
          visible={pdfModalVisible}
          transparent={false}
          animationType="slide"
          onRequestClose={() => setPdfModalVisible(false)}
        >
          <SafeAreaView style={styles.pdfModalContainer}>
            <View style={styles.pdfModalHeader}>
              <TouchableOpacity 
                onPress={() => setPdfModalVisible(false)}
                style={styles.pdfModalCloseButton}
              >
                <X size={24} color={Colors.text} />
              </TouchableOpacity>
              <Text style={styles.pdfModalTitle}>Račun {bill.number}</Text>
              <View style={styles.pdfModalActions}>
                <TouchableOpacity 
                  style={styles.pdfModalAction}
                  onPress={handleDownloadPdf}
                >
                  <Download size={24} color={Colors.primary} />
                </TouchableOpacity>
                <TouchableOpacity 
                  style={styles.pdfModalAction}
                  onPress={handlePrintBill}
                >
                  <Printer size={24} color={Colors.primary} />
                </TouchableOpacity>
              </View>
            </View>
            
            <View style={styles.billPdfContainer}>
              <View style={styles.billPdfContent}>
                {/* Header */}
                <View style={styles.billPdfHeader}>
                  <View style={styles.billPdfCompanyInfo}>
                    <Text style={styles.billPdfCompanyName}>
                      KANTONALNO JAVNO KOMUNALNO PREDUZEĆE
                    </Text>
                    <Text style={styles.billPdfCompanyName}>
                      "VODOVOD I KANALIZACIJA" D.O.O. SARAJEVO
                    </Text>
                    <Text style={styles.billPdfCompanyAddress}>
                      Jaroslava Černija 8, Sarajevo
                    </Text>
                  </View>
                  <View style={styles.billPdfBillInfo}>
                    <Text style={styles.billPdfBillTitle}>RAČUN broj</Text>
                    <Text style={styles.billPdfBillNumber}>{bill.number}</Text>
                    <Text style={styles.billPdfBillSubtitle}>
                      za utrošenu vodu i odvođenje otpadnih voda
                    </Text>
                  </View>
                </View>
                
                {/* Dates */}
                <View style={styles.billPdfDates}>
                  <View style={styles.billPdfDateItem}>
                    <Text style={styles.billPdfDateLabel}>Sarajevo,</Text>
                    <Text style={styles.billPdfDateValue}>
                      {new Date().toLocaleDateString('bs-BA')}
                    </Text>
                  </View>
                  <View style={styles.billPdfDateItem}>
                    <Text style={styles.billPdfDateLabel}>Valuta,</Text>
                    <Text style={styles.billPdfDateValue}>{bill.dueDate}</Text>
                  </View>
                </View>
                
                {/* Customer Info */}
                <View style={styles.billPdfCustomerContainer}>
                  <View style={styles.billPdfCustomerInfo}>
                    <Text style={styles.billPdfCustomerName}>{bill.userName}</Text>
                    <Text style={styles.billPdfCustomerAddress}>{bill.userAddress}</Text>
                  </View>
                  
                  <View style={styles.billPdfMeterInfo}>
                    <View style={styles.billPdfMeterRow}>
                      <Text style={styles.billPdfMeterLabel}>Šifra potrošača:</Text>
                      <Text style={styles.billPdfMeterValue}>377823</Text>
                    </View>
                    <View style={styles.billPdfMeterRow}>
                      <Text style={styles.billPdfMeterLabel}>Broj vodomjera:</Text>
                      <Text style={styles.billPdfMeterValue}>12-2-10030676</Text>
                    </View>
                    <View style={styles.billPdfMeterRow}>
                      <Text style={styles.billPdfMeterLabel}>Tip potrošača:</Text>
                      <Text style={styles.billPdfMeterValue}>11</Text>
                    </View>
                  </View>
                </View>
                
                {/* Consumption Table */}
                <View style={styles.billPdfConsumptionContainer}>
                  <View style={styles.billPdfTableHeader}>
                    <Text style={styles.billPdfTableHeaderText}>
                      Podaci o isporuci vode i očitavanju vodomjera
                    </Text>
                  </View>
                  
                  <View style={styles.billPdfTableRow}>
                    <View style={[styles.billPdfTableCell, { flex: 1 }]}>
                      <Text style={styles.billPdfTableCellHeader}>Rbr</Text>
                      <Text style={styles.billPdfTableCellValue}>1</Text>
                    </View>
                    <View style={[styles.billPdfTableCell, { flex: 2 }]}>
                      <Text style={styles.billPdfTableCellHeader}>Broj vodomjera</Text>
                      <Text style={styles.billPdfTableCellValue}>12-2-10030676</Text>
                    </View>
                    <View style={[styles.billPdfTableCell, { flex: 2 }]}>
                      <Text style={styles.billPdfTableCellHeader}>Datum očitanja</Text>
                      <Text style={styles.billPdfTableCellValue}>17.01.2024</Text>
                    </View>
                    <View style={[styles.billPdfTableCell, { flex: 1.5 }]}>
                      <Text style={styles.billPdfTableCellHeader}>Stanje vodomjera</Text>
                      <Text style={styles.billPdfTableCellValue}>352</Text>
                    </View>
                    <View style={[styles.billPdfTableCell, { flex: 1.5 }]}>
                      <Text style={styles.billPdfTableCellHeader}>Utrošak m³</Text>
                      <Text style={styles.billPdfTableCellValue}>{bill.consumption}</Text>
                    </View>
                  </View>
                </View>
                
                {/* Billing Items */}
                <View style={styles.billPdfItemsContainer}>
                  <View style={styles.billPdfTableHeader}>
                    <Text style={styles.billPdfTableHeaderText}>
                      Obračun potrošnje
                    </Text>
                  </View>
                  
                  <View style={styles.billPdfItemsHeader}>
                    <Text style={[styles.billPdfItemHeaderText, { flex: 3 }]}>Opis</Text>
                    <Text style={[styles.billPdfItemHeaderText, { flex: 1 }]}>Količina</Text>
                    <Text style={[styles.billPdfItemHeaderText, { flex: 1 }]}>Cijena</Text>
                    <Text style={[styles.billPdfItemHeaderText, { flex: 1 }]}>Iznos</Text>
                    <Text style={[styles.billPdfItemHeaderText, { flex: 1 }]}>PDV</Text>
                    <Text style={[styles.billPdfItemHeaderText, { flex: 1.5 }]}>Ukupno</Text>
                  </View>
                  
                  {bill.items.map((item, index) => (
                    <View key={index} style={styles.billPdfItemRow}>
                      <Text style={[styles.billPdfItemText, { flex: 3 }]}>{item.description}</Text>
                      <Text style={[styles.billPdfItemText, { flex: 1 }]}>
                        {index === 0 ? bill.consumption : ''}
                      </Text>
                      <Text style={[styles.billPdfItemText, { flex: 1 }]}>
                        {(item.amount / (index === 0 ? bill.consumption : 1)).toFixed(2)}
                      </Text>
                      <Text style={[styles.billPdfItemText, { flex: 1 }]}>
                        {(item.amount * 0.85).toFixed(2)}
                      </Text>
                      <Text style={[styles.billPdfItemText, { flex: 1 }]}>
                        {(item.amount * 0.15).toFixed(2)}
                      </Text>
                      <Text style={[styles.billPdfItemText, { flex: 1.5, fontWeight: 'bold' }]}>
                        {item.amount.toFixed(2)}
                      </Text>
                    </View>
                  ))}
                  
                  <View style={styles.billPdfTotalRow}>
                    <Text style={styles.billPdfTotalLabel}>UKUPAN IZNOS RAČUNA (sa PDV)</Text>
                    <Text style={styles.billPdfTotalValue}>{bill.amount.toFixed(2)} KM</Text>
                  </View>
                </View>
                
                {/* Payment Slip */}
                <View style={styles.billPdfPaymentSlip}>
                  <View style={styles.billPdfPaymentHeader}>
                    <Text style={styles.billPdfPaymentTitle}>UPLATNI NALOG</Text>
                  </View>
                  
                  <View style={styles.billPdfPaymentContent}>
                    <View style={styles.billPdfPaymentColumn}>
                      <View style={styles.billPdfPaymentField}>
                        <Text style={styles.billPdfPaymentLabel}>Platilac:</Text>
                        <Text style={styles.billPdfPaymentValue}>{bill.userName}</Text>
                        <Text style={styles.billPdfPaymentValue}>{bill.userAddress}</Text>
                      </View>
                      
                      <View style={styles.billPdfPaymentField}>
                        <Text style={styles.billPdfPaymentLabel}>Svrha:</Text>
                        <Text style={styles.billPdfPaymentValue}>
                          Račun za utrošenu vodu i odvođenje otpadnih voda za period {bill.period}
                        </Text>
                      </View>
                      
                      <View style={styles.billPdfPaymentField}>
                        <Text style={styles.billPdfPaymentLabel}>Iznos:</Text>
                        <Text style={styles.billPdfPaymentValue}>{bill.amount.toFixed(2)} KM</Text>
                      </View>
                    </View>
                    
                    <View style={styles.billPdfPaymentColumn}>
                      <View style={styles.billPdfPaymentField}>
                        <Text style={styles.billPdfPaymentLabel}>Primalac:</Text>
                        <Text style={styles.billPdfPaymentValue}>{bill.companyName}</Text>
                        <Text style={styles.billPdfPaymentValue}>Jaroslava Černija 8, Sarajevo</Text>
                      </View>
                      
                      <View style={styles.billPdfPaymentField}>
                        <Text style={styles.billPdfPaymentLabel}>Datum uplate:</Text>
                        <Text style={styles.billPdfPaymentValue}>{bill.dueDate}</Text>
                      </View>
                      
                      <View style={styles.billPdfPaymentField}>
                        <Text style={styles.billPdfPaymentLabel}>Referenca:</Text>
                        <Text style={styles.billPdfPaymentValue}>{bill.number}-377823-1</Text>
                      </View>
                    </View>
                  </View>
                </View>
                
                {/* Footer */}
                <View style={styles.billPdfFooter}>
                  <Text style={styles.billPdfFooterText}>
                    Račun je pisan elektronski i punovažan je bez potpisa i pečata.
                  </Text>
                  <Text style={styles.billPdfFooterText}>
                    Za račun koji nije plaćen u roku od 30 dana, zaračunava se zatezna kamata.
                  </Text>
                </View>
              </View>
            </View>
          </SafeAreaView>
        </Modal>
      </View>
    </SafeAreaView>
  );
}

// TextInput component for the modal
const TextInput = ({ 
  style, 
  value, 
  onChangeText, 
  placeholder, 
  keyboardType 
}: { 
  style?: any, 
  value: string, 
  onChangeText: (text: string) => void, 
  placeholder?: string,
  keyboardType?: 'default' | 'numeric' | 'email-address' | 'phone-pad'
}) => {
  return (
    <View>
      <RNTextInput
        style={[styles.textInputContainer, style]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        keyboardType={keyboardType}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#fff',
  },
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: Colors.textLight,
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: Platform.OS === 'android' ? 100 : 80, // Extra padding for Android
  },
  billCard: {
    padding: 16,
  },
  billHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 24,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    paddingBottom: 16,
  },
  billInfo: {
    flex: 1,
  },
  billNumber: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 4,
  },
  billPeriod: {
    fontSize: 16,
    color: Colors.textLight,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.text,
    marginLeft: 8,
  },
  sectionContent: {
    paddingLeft: 28,
  },
  userName: {
    fontSize: 16,
    fontWeight: '500',
    color: Colors.text,
    marginBottom: 8,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    color: Colors.text,
    marginLeft: 8,
  },
  infoLabel: {
    color: Colors.textLight,
  },
  infoValue: {
    fontWeight: '500',
  },
  itemsHeader: {
    flexDirection: 'row',
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    marginBottom: 8,
  },
  itemHeaderText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: Colors.text,
  },
  itemRow: {
    flexDirection: 'row',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  itemText: {
    fontSize: 14,
    color: Colors.text,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
    paddingTop: 8,
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.text,
  },
  totalValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.primary,
  },
  actions: {
    marginTop: 24,
  },
  actionButton: {
    marginBottom: 12,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    width: '90%',
    backgroundColor: '#fff',
    borderRadius: 12,
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.text,
  },
  closeButton: {
    padding: 4,
  },
  modalContent: {
    padding: 16,
  },
  modalText: {
    fontSize: 16,
    color: Colors.text,
    marginBottom: 8,
  },
  inputContainer: {
    marginTop: 16,
    marginBottom: 24,
  },
  inputLabel: {
    fontSize: 14,
    color: Colors.text,
    marginBottom: 8,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 48,
  },
  inputIcon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    height: '100%',
    color: Colors.text,
    fontSize: 16,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  modalButton: {
    flex: 1,
    marginHorizontal: 8,
  },
  // TextInput component styles
  textInputContainer: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: Colors.highlight,
    fontSize: 16,
    color: Colors.text,
  },
  textInputText: {
    fontSize: 16,
    color: Colors.text,
  },
  // PDF Modal Styles
  pdfModalContainer: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  pdfModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  pdfModalCloseButton: {
    padding: 4,
  },
  pdfModalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.text,
  },
  pdfModalActions: {
    flexDirection: 'row',
  },
  pdfModalAction: {
    padding: 8,
    marginLeft: 8,
  },
  billPdfContainer: {
    flex: 1,
    padding: 16,
  },
  billPdfContent: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  billPdfHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    paddingBottom: 16,
  },
  billPdfCompanyInfo: {
    flex: 1,
  },
  billPdfCompanyName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#003366',
    marginBottom: 2,
  },
  billPdfCompanyAddress: {
    fontSize: 12,
    color: Colors.textLight,
  },
  billPdfBillInfo: {
    alignItems: 'flex-end',
  },
  billPdfBillTitle: {
    fontSize: 14,
    color: Colors.textLight,
  },
  billPdfBillNumber: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.primary,
    marginVertical: 2,
  },
  billPdfBillSubtitle: {
    fontSize: 12,
    color: Colors.textLight,
  },
  billPdfDates: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
    marginBottom: 16,
  },
  billPdfDateItem: {
    flexDirection: 'row',
  },
  billPdfDateLabel: {
    fontSize: 12,
    color: Colors.textLight,
    marginRight: 4,
  },
  billPdfDateValue: {
    fontSize: 12,
    fontWeight: '500',
    color: Colors.text,
  },
  billPdfCustomerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#eee',
    borderRadius: 4,
    padding: 12,
  },
  billPdfCustomerInfo: {
    flex: 1,
  },
  billPdfCustomerName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 2,
  },
  billPdfCustomerAddress: {
    fontSize: 12,
    color: Colors.textLight,
  },
  billPdfMeterInfo: {
    flex: 1,
    alignItems: 'flex-end',
  },
  billPdfMeterRow: {
    flexDirection: 'row',
    marginBottom: 2,
  },
  billPdfMeterLabel: {
    fontSize: 12,
    color: Colors.textLight,
    marginRight: 4,
  },
  billPdfMeterValue: {
    fontSize: 12,
    fontWeight: '500',
    color: Colors.text,
  },
  billPdfConsumptionContainer: {
    marginBottom: 24,
  },
  billPdfTableHeader: {
    backgroundColor: '#f0f7ff',
    padding: 8,
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
    borderWidth: 1,
    borderColor: '#d0e5ff',
  },
  billPdfTableHeaderText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#003366',
  },
  billPdfTableRow: {
    flexDirection: 'row',
    borderWidth: 1,
    borderTopWidth: 0,
    borderColor: '#eee',
  },
  billPdfTableCell: {
    padding: 8,
    borderRightWidth: 1,
    borderRightColor: '#eee',
  },
  billPdfTableCellHeader: {
    fontSize: 10,
    color: Colors.textLight,
    marginBottom: 4,
  },
  billPdfTableCellValue: {
    fontSize: 12,
    color: Colors.text,
  },
  billPdfItemsContainer: {
    marginBottom: 24,
  },
  billPdfItemsHeader: {
    flexDirection: 'row',
    backgroundColor: '#f0f7ff',
    padding: 8,
    borderWidth: 1,
    borderTopWidth: 0,
    borderColor: '#d0e5ff',
  },
  billPdfItemHeaderText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#003366',
  },
  billPdfItemRow: {
    flexDirection: 'row',
    borderWidth: 1,
    borderTopWidth: 0,
    borderColor: '#eee',
    padding: 8,
  },
  billPdfItemText: {
    fontSize: 12,
    color: Colors.text,
  },
  billPdfTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#f0f7ff',
    padding: 12,
    borderWidth: 1,
    borderTopWidth: 0,
    borderColor: '#d0e5ff',
    borderBottomLeftRadius: 4,
    borderBottomRightRadius: 4,
  },
  billPdfTotalLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#003366',
  },
  billPdfTotalValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.primary,
  },
  billPdfPaymentSlip: {
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#eee',
    borderRadius: 4,
  },
  billPdfPaymentHeader: {
    backgroundColor: '#f0f7ff',
    padding: 8,
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#d0e5ff',
  },
  billPdfPaymentTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#003366',
    textAlign: 'center',
  },
  billPdfPaymentContent: {
    flexDirection: 'row',
    padding: 12,
  },
  billPdfPaymentColumn: {
    flex: 1,
  },
  billPdfPaymentField: {
    marginBottom: 12,
  },
  billPdfPaymentLabel: {
    fontSize: 10,
    color: Colors.textLight,
    marginBottom: 2,
  },
  billPdfPaymentValue: {
    fontSize: 12,
    color: Colors.text,
  },
  billPdfFooter: {
    borderTopWidth: 1,
    borderTopColor: '#eee',
    paddingTop: 12,
  },
  billPdfFooterText: {
    fontSize: 10,
    color: Colors.textLight,
    marginBottom: 4,
    textAlign: 'center',
  },
});