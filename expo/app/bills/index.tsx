import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  TouchableOpacity, 
  TextInput,
  RefreshControl,
  Alert,
  Modal,
  Platform,
  SafeAreaView
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { 
  CreditCard, 
  Search, 
  Plus, 
  Filter, 
  ChevronRight, 
  Calendar,
  DollarSign,
  CheckCircle,
  AlertTriangle,
  Download,
  Printer,
  Menu,
  X,
  Mail,
  Check as CheckIcon
} from 'lucide-react-native';
import { Header } from '@/components/layout/Header';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { StatusIndicator } from '@/components/ui/StatusIndicator';
import { Input } from '@/components/ui/Input';
import { useAuthStore } from '@/store/auth-store';
import { getBills } from '@/lib/api/bills';
import { Drawer } from '@/components/layout/Drawer';
import Colors from '@/constants/colors';

export default function BillsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { user } = useAuthStore();
  const userId = params.userId as string;
  const [bills, setBills] = useState<any[]>([]);
  const [filteredBills, setFilteredBills] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterPeriod, setFilterPeriod] = useState('all');
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const fetchBills = async () => {
    try {
      const data = await getBills();
      const userFiltered = userId ? data.filter((b: any) => b.userId === userId) : data;
      setBills(userFiltered);
      setFilteredBills(userFiltered);
    } catch (err) {
      console.error('Greska:', err);
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => { fetchBills(); }, []);
  const [selectedBill, setSelectedBill] = useState<any>(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentModalVisible, setPaymentModalVisible] = useState(false);
  const [bulkSelected, setBulkSelected] = useState<string[]>([]);
  const [bulkMode, setBulkMode] = useState(false);
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [selectedMeterId, setSelectedMeterId] = useState('');
  const [billAmount, setBillAmount] = useState('');
  const [billPeriod, setBillPeriod] = useState('');
  const [pdfBill, setPdfBill] = useState<any>(null);
  const [pdfModalVisible, setPdfModalVisible] = useState(false);
  const [selectedBills, setSelectedBills] = useState<string[]>([]);
  const [selectAllBills, setSelectAllBills] = useState(false);
  const [bulkOperationModalVisible, setBulkOperationModalVisible] = useState(false);
  const [emailModalVisible, setEmailModalVisible] = useState(false);
  const [emailBill, setEmailBill] = useState<any>(null);

  
  const onRefresh = () => {
    setRefreshing(true);
    fetchBills();
    setRefreshing(false);
  };
  
  const applyFilters = () => {
    let filtered = [...bills];
    
    // Apply search query
    if (searchQuery) {
      filtered = filtered.filter(bill => 
        bill.number.toLowerCase().includes(searchQuery.toLowerCase()) ||
        bill.userName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        bill.period.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    
    // Apply status filter
    if (filterStatus !== 'all') {
      filtered = filtered.filter(bill => bill.status === filterStatus);
    }
    
    // Apply period filter
    if (filterPeriod !== 'all') {
      filtered = filtered.filter(bill => bill.period.includes(filterPeriod));
    }
    
    setFilteredBills(filtered);
  };
  
  useEffect(() => {
    applyFilters();
  }, [searchQuery, filterStatus, filterPeriod]);
  
  const handleSearch = (text: string) => {
    setSearchQuery(text);
  };
  
  const handleFilterChange = (status: string) => {
    setFilterStatus(status);
  };
  
  const handlePeriodChange = (period: string) => {
    setFilterPeriod(period);
  };
  
  const handleAddBill = () => {
    router.push('/bills/add');
  };
  
  const handleViewBill = (id: string) => {
    router.push(`/bills/${id}`);
  };
  
  const handlePayBill = (bill: any) => {
    setSelectedBill(bill);
    setPaymentAmount(bill.amount.toFixed(2));
    setPaymentModalVisible(true);
  };
  
  const handleConfirmPayment = () => {
    if (!selectedBill) return;
    
    const amount = parseFloat(paymentAmount);
    if (isNaN(amount) || amount <= 0) {
      Alert.alert("Greška", "Unesite validan iznos za plaćanje.");
      return;
    }
    
    // Update bill status
    const updatedBills = bills.map(bill => 
      bill.id === selectedBill.id 
        ? { ...bill, status: 'paid' as const, paidDate: new Date().toISOString().split('T')[0] } 
        : bill
    );
    setBills(updatedBills);
    applyFilters();
    
    // Close modal
    setPaymentModalVisible(false);
    setSelectedBill(null);
    
    // Show success message
    Alert.alert(
      "Uspjeh", 
      `Račun je uspješno plaćen u iznosu od ${amount.toFixed(2)} KM.`
    );
  };
  
  const handleViewPdf = (bill: any) => {
    setPdfBill(bill);
    setPdfModalVisible(true);
  };
  
  const handleDownloadPdf = (id: string) => {
    Alert.alert(
      "Preuzimanje PDF-a",
      "PDF računa će biti preuzet.",
      [{ text: "OK" }]
    );
  };
  
  const handlePrintBill = (id: string) => {
    Alert.alert(
      "Štampanje računa",
      "Račun će biti poslan na štampač.",
      [{ text: "OK" }]
    );
  };
  
  const handleSendEmail = (bill: any) => {
    Alert.alert(
      "Slanje računa",
      `Račun će biti poslan na email: ${bill.userEmail || 'korisnika'}`,
      [{ text: "OK" }]
    );
  };
  
  const handleOpenBulkOperations = () => {
    setSelectedBills([]);
    setSelectAllBills(false);
    setBulkOperationModalVisible(true);
  };
  
  const handleToggleSelectBill = (id: string) => {
    if (selectedBills.includes(id)) {
      setSelectedBills(selectedBills.filter(billId => billId !== id));
    } else {
      setSelectedBills([...selectedBills, id]);
    }
  };
  
  const handleToggleSelectAll = () => {
    if (selectAllBills) {
      setSelectedBills([]);
    } else {
      setSelectedBills(filteredBills.map(bill => bill.id));
    }
    setSelectAllBills(!selectAllBills);
  };
  
  const handleBulkPrint = () => {
    if (selectedBills.length === 0) {
      Alert.alert("Greška", "Niste odabrali nijedan račun.");
      return;
    }
    
    Alert.alert(
      "Štampanje računa",
      `Štampanje ${selectedBills.length} računa.`,
      [
        { 
          text: "OK",
          onPress: () => {
            setBulkOperationModalVisible(false);
            Alert.alert("Uspjeh", "Računi su poslani na štampanje.");
          }
        }
      ]
    );
  };
  
  const handleBulkEmail = () => {
    if (selectedBills.length === 0) {
      Alert.alert("Greška", "Niste odabrali nijedan račun.");
      return;
    }
    
    Alert.alert(
      "Slanje računa",
      `Slanje ${selectedBills.length} računa na email.`,
      [
        { 
          text: "OK",
          onPress: () => {
            setBulkOperationModalVisible(false);
            Alert.alert("Uspjeh", "Računi su poslani na email.");
          }
        }
      ]
    );
  };
  
  const renderBillCard = ({ item }: { item: any }) => {
    const isPaid = item.status === 'paid';
    const isOverdue = item.status === 'overdue';
    
    return (
      <Card style={styles.billCard}>
        <TouchableOpacity 
          style={styles.cardContent}
          onPress={() => handleViewBill(item.id)}
          activeOpacity={0.7}
        >
          <View style={styles.billHeader}>
            <View style={styles.billInfo}>
              <Text style={styles.billNumber}>{item.number}</Text>
              <Text style={styles.billPeriod}>{item.period}</Text>
            </View>
            <StatusIndicator 
              status={item.status} 
              labels={{
                paid: "Plaćeno",
                pending: "Na čekanju",
                overdue: "Prekoračeno"
              }}
            />
          </View>
          
          <View style={styles.userInfo}>
            <Text style={styles.userName}>{item.userName}</Text>
            <Text style={styles.userAddress}>{item.userAddress}</Text>
          </View>
          
          <View style={styles.billDetails}>
            <View style={styles.billDetailItem}>
              <DollarSign size={16} color={Colors.primary} />
              <Text style={styles.billDetailValue}>{item.amount.toFixed(2)} KM</Text>
            </View>
            
            <View style={styles.billDetailItem}>
              <Calendar size={16} color={isOverdue ? Colors.error : Colors.textLight} />
              <Text 
                style={[
                  styles.billDetailValue, 
                  isOverdue && styles.overdueText
                ]}
              >
                Rok: {new Date(item.dueDate).toLocaleDateString('de-DE')}
              </Text>
            </View>
          </View>
        </TouchableOpacity>
        
        <View style={styles.cardActions}>
          {!isPaid && (
            <Button
              title="Plati"
              variant="primary"
              size="small"
              leftIcon={<CheckCircle size={16} color="#fff" />}
              onPress={() => handlePayBill(item)}
            />
          )}
          
          <Button
            title="PDF"
            variant="outline"
            size="small"
            leftIcon={<Download size={16} color={Colors.primary} />}
            style={{ marginLeft: isPaid ? 0 : 8 }}
            onPress={() => handleViewPdf(item)}
          />
          
          <Button
            title="Štampaj"
            variant="outline"
            size="small"
            leftIcon={<Printer size={16} color={Colors.primary} />}
            style={{ marginLeft: 8 }}
            onPress={() => handlePrintBill(item.id)}
          />
          
          {(user?.role === 'utility_admin' || user?.role === 'finance') && (
            <Button
              title="Email"
              variant="outline"
              size="small"
              leftIcon={<Mail size={16} color={Colors.primary} />}
              style={{ marginLeft: 8 }}
              onPress={() => handleSendEmail(item)}
            />
          )}
        </View>
      </Card>
    );
  };
  
  const renderEmptyState = () => {
    return (
      <EmptyState
        title="Nema računa"
        message="Trenutno nema računa koji odgovaraju vašoj pretrazi."
        icon={<CreditCard size={48} color={Colors.textLight} />}
        actionLabel="Dodaj novi račun"
        onAction={handleAddBill}
      />
    );
  };
  
  const renderPaymentModal = () => {
    if (!selectedBill) return null;
    
    return (
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
                Račun: {selectedBill.number}
              </Text>
              <Text style={styles.modalText}>
                Korisnik: {selectedBill.userName}
              </Text>
              <Text style={styles.modalText}>
                Iznos računa: {selectedBill.amount.toFixed(2)} KM
              </Text>
              
              <Input
                label="Iznos za plaćanje"
                placeholder="Unesite iznos"
                value={paymentAmount}
                onChangeText={setPaymentAmount}
                keyboardType="numeric"
                leftIcon={<DollarSign size={20} color={Colors.textLight} />}
              />
              
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
    );
  };
  
  const canManageBills = user?.role === 'super_admin' || user?.role === 'utility_admin' || user?.role === 'finance';
  
  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <Header 
          title="Računi"
          showBack
          showMenu={false}
          onLeftPress={() => router.back()}
        />
        
        <Drawer
          isOpen={isDrawerOpen}
          onClose={() => setIsDrawerOpen(false)}
        />
        
        <View style={styles.searchContainer}>
          <View style={styles.searchInputContainer}>
            <Search size={20} color={Colors.textLight} style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Pretraži račune..."
              value={searchQuery}
              onChangeText={handleSearch}
            />
          </View>
          
          <TouchableOpacity
            style={styles.filterButton}
            onPress={() => setShowFilters(!showFilters)}
          >
            <Filter size={20} color={Colors.primary} />
          </TouchableOpacity>
          
          {canManageBills && (
            <TouchableOpacity
              style={styles.bulkButton}
              onPress={handleOpenBulkOperations}
            >
              <Printer size={20} color={Colors.primary} />
            </TouchableOpacity>
          )}
        </View>
        
        {showFilters && (
          <View style={styles.filtersContainer}>
            <Text style={styles.filtersTitle}>Status:</Text>
            <View style={styles.filterOptions}>
              <TouchableOpacity
                style={[
                  styles.filterOption,
                  filterStatus === 'all' && styles.filterOptionActive
                ]}
                onPress={() => handleFilterChange('all')}
              >
                <Text style={[
                  styles.filterOptionText,
                  filterStatus === 'all' && styles.filterOptionTextActive
                ]}>Svi</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[
                  styles.filterOption,
                  filterStatus === 'pending' && styles.filterOptionActive
                ]}
                onPress={() => handleFilterChange('pending')}
              >
                <Text style={[
                  styles.filterOptionText,
                  filterStatus === 'pending' && styles.filterOptionTextActive
                ]}>Na čekanju</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[
                  styles.filterOption,
                  filterStatus === 'paid' && styles.filterOptionActive
                ]}
                onPress={() => handleFilterChange('paid')}
              >
                <Text style={[
                  styles.filterOptionText,
                  filterStatus === 'paid' && styles.filterOptionTextActive
                ]}>Plaćeni</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[
                  styles.filterOption,
                  filterStatus === 'overdue' && styles.filterOptionActive
                ]}
                onPress={() => handleFilterChange('overdue')}
              >
                <Text style={[
                  styles.filterOptionText,
                  filterStatus === 'overdue' && styles.filterOptionTextActive
                ]}>Prekoračeni</Text>
              </TouchableOpacity>
            </View>
            
            <Text style={styles.filtersTitle}>Period:</Text>
            <View style={styles.filterOptions}>
              <TouchableOpacity
                style={[
                  styles.filterOption,
                  filterPeriod === 'all' && styles.filterOptionActive
                ]}
                onPress={() => handlePeriodChange('all')}
              >
                <Text style={[
                  styles.filterOptionText,
                  filterPeriod === 'all' && styles.filterOptionTextActive
                ]}>Svi</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[
                  styles.filterOption,
                  filterPeriod === 'April' && styles.filterOptionActive
                ]}
                onPress={() => handlePeriodChange('April')}
              >
                <Text style={[
                  styles.filterOptionText,
                  filterPeriod === 'April' && styles.filterOptionTextActive
                ]}>April 2023</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[
                  styles.filterOption,
                  filterPeriod === 'Maj' && styles.filterOptionActive
                ]}
                onPress={() => handlePeriodChange('Maj')}
              >
                <Text style={[
                  styles.filterOptionText,
                  filterPeriod === 'Maj' && styles.filterOptionTextActive
                ]}>Maj 2023</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
        
        <FlatList
          data={filteredBills}
          renderItem={renderBillCard}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContainer}
          ListEmptyComponent={renderEmptyState}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        />
        
        {(user?.role === 'super_admin' || user?.role === 'utility_admin' || user?.role === 'finance') && (
          <TouchableOpacity
            style={styles.fab}
            onPress={handleAddBill}
            activeOpacity={0.8}
          >
            <Plus size={24} color="#fff" />
          </TouchableOpacity>
        )}
        
        {renderPaymentModal()}
        
        {/* PDF Preview Modal */}
        {pdfBill && (
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
                <Text style={styles.pdfModalTitle}>Račun {pdfBill.number}</Text>
                <View style={styles.pdfModalActions}>
                  <TouchableOpacity 
                    style={styles.pdfModalAction}
                    onPress={() => handleDownloadPdf(pdfBill.id)}
                  >
                    <Download size={24} color={Colors.primary} />
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={styles.pdfModalAction}
                    onPress={() => handlePrintBill(pdfBill.id)}
                  >
                    <Printer size={24} color={Colors.primary} />
                  </TouchableOpacity>
                  {(user?.role === 'utility_admin' || user?.role === 'finance') && (
                    <TouchableOpacity 
                      style={styles.pdfModalAction}
                      onPress={() => handleSendEmail(pdfBill)}
                    >
                      <Mail size={24} color={Colors.primary} />
                    </TouchableOpacity>
                  )}
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
                      <Text style={styles.billPdfBillNumber}>{pdfBill.number}</Text>
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
                      <Text style={styles.billPdfDateValue}>{new Date(pdfBill.dueDate).toLocaleDateString('de-DE')}</Text>
                    </View>
                  </View>
                  
                  {/* Customer Info */}
                  <View style={styles.billPdfCustomerContainer}>
                    <View style={styles.billPdfCustomerInfo}>
                      <Text style={styles.billPdfCustomerName}>{pdfBill.userName}</Text>
                      <Text style={styles.billPdfCustomerAddress}>{pdfBill.userAddress}</Text>
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
                        <Text style={styles.billPdfTableCellValue}>{pdfBill.consumption}</Text>
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
                    {(pdfBill.items || []).map((item: any, index: number) => (
                      <View key={index} style={styles.billPdfItemRow}>
                        <Text style={[styles.billPdfItemText, { flex: 3 }]}>{item.description}</Text>
                        <Text style={[styles.billPdfItemText, { flex: 1 }]}>
                          {index === 0 ? pdfBill.consumption : ''}
                        </Text>
                        <Text style={[styles.billPdfItemText, { flex: 1 }]}>
                          {(item.amount / (index === 0 ? pdfBill.consumption : 1)).toFixed(2)}
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
                      <Text style={styles.billPdfTotalValue}>{pdfBill.amount.toFixed(2)} KM</Text>
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
                          <Text style={styles.billPdfPaymentValue}>{pdfBill.userName}</Text>
                          <Text style={styles.billPdfPaymentValue}>{pdfBill.userAddress}</Text>
                        </View>
                        
                        <View style={styles.billPdfPaymentField}>
                          <Text style={styles.billPdfPaymentLabel}>Svrha:</Text>
                          <Text style={styles.billPdfPaymentValue}>
                            Račun za utrošenu vodu i odvođenje otpadnih voda za period {pdfBill.period}
                          </Text>
                        </View>
                        
                        <View style={styles.billPdfPaymentField}>
                          <Text style={styles.billPdfPaymentLabel}>Iznos:</Text>
                          <Text style={styles.billPdfPaymentValue}>{pdfBill.amount.toFixed(2)} KM</Text>
                        </View>
                      </View>
                      
                      <View style={styles.billPdfPaymentColumn}>
                        <View style={styles.billPdfPaymentField}>
                          <Text style={styles.billPdfPaymentLabel}>Primalac:</Text>
                          <Text style={styles.billPdfPaymentValue}>{pdfBill.companyName}</Text>
                          <Text style={styles.billPdfPaymentValue}>Jaroslava Černija 8, Sarajevo</Text>
                        </View>
                        
                        <View style={styles.billPdfPaymentField}>
                          <Text style={styles.billPdfPaymentLabel}>Datum uplate:</Text>
                          <Text style={styles.billPdfPaymentValue}>{pdfBill.dueDate}</Text>
                        </View>
                        
                        <View style={styles.billPdfPaymentField}>
                          <Text style={styles.billPdfPaymentLabel}>Referenca:</Text>
                          <Text style={styles.billPdfPaymentValue}>{pdfBill.number}-377823-1</Text>
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
        )}
        
        {/* Bulk Operations Modal */}
        <Modal
          visible={bulkOperationModalVisible}
          transparent={true}
          animationType="slide"
          onRequestClose={() => setBulkOperationModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.bulkModalContainer}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Masovne operacije</Text>
                <TouchableOpacity 
                  onPress={() => setBulkOperationModalVisible(false)}
                  style={styles.closeButton}
                >
                  <X size={24} color={Colors.text} />
                </TouchableOpacity>
              </View>
              
              <View style={styles.bulkModalContent}>
                <Text style={styles.bulkModalSubtitle}>
                  Odaberite račune za masovne operacije
                </Text>
                
                <View style={styles.selectAllContainer}>
                  <TouchableOpacity
                    style={styles.selectAllCheckbox}
                    onPress={handleToggleSelectAll}
                  >
                    <View style={[
                      styles.checkbox,
                      selectAllBills && styles.checkboxSelected
                    ]}>
                      {selectAllBills && <CheckIcon size={16} color="#fff" />}
                    </View>
                    <Text style={styles.selectAllText}>Odaberi sve</Text>
                  </TouchableOpacity>
                  
                  <Text style={styles.selectedCountText}>
                    Odabrano: {selectedBills.length} / {filteredBills.length}
                  </Text>
                </View>
                
                <FlatList
                  data={filteredBills}
                  keyExtractor={(item) => item.id}
                  style={styles.bulkBillsList}
                  renderItem={({ item }) => (
                    <TouchableOpacity
                      style={styles.bulkBillItem}
                      onPress={() => handleToggleSelectBill(item.id)}
                    >
                      <View style={[
                        styles.checkbox,
                        selectedBills.includes(item.id) && styles.checkboxSelected
                      ]}>
                        {selectedBills.includes(item.id) && <CheckIcon size={16} color="#fff" />}
                      </View>
                      
                      <View style={styles.bulkBillInfo}>
                        <Text style={styles.bulkBillNumber}>{item.number}</Text>
                        <Text style={styles.bulkBillDetails}>
                          {item.userName} - {item.period} - {item.amount.toFixed(2)} KM
                        </Text>
                      </View>
                      
                      <StatusIndicator 
                        status={item.status} 
                        labels={{
                          paid: "Plaćeno",
                          pending: "Na čekanju",
                          overdue: "Prekoračeno"
                        }}
                        size="small"
                      />
                    </TouchableOpacity>
                  )}
                />
                
                <View style={styles.bulkActions}>
                  <Button
                    title="Štampaj odabrane"
                    leftIcon={<Printer size={20} color="#fff" />}
                    onPress={handleBulkPrint}
                    style={styles.bulkActionButton}
                    disabled={selectedBills.length === 0}
                  />
                  
                  <Button
                    title="Pošalji na email"
                    leftIcon={<Mail size={20} color="#fff" />}
                    onPress={handleBulkEmail}
                    style={styles.bulkActionButton}
                    disabled={selectedBills.length === 0}
                  />
                </View>
              </View>
            </View>
          </View>
        </Modal>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#fff',
  },
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  searchContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  searchInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.highlight,
    borderRadius: 8,
    paddingHorizontal: 12,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: 40,
    color: Colors.text,
  },
  filterButton: {
    marginLeft: 12,
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: Colors.highlight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bulkButton: {
    marginLeft: 12,
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: Colors.highlight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filtersContainer: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  filtersTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 8,
    marginTop: 8,
  },
  filterOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  filterOption: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: Colors.highlight,
  },
  filterOptionActive: {
    backgroundColor: Colors.primary,
  },
  filterOptionText: {
    fontSize: 12,
    color: Colors.text,
  },
  filterOptionTextActive: {
    color: '#fff',
  },
  listContainer: {
    padding: 16,
    paddingBottom: Platform.OS === 'android' ? 100 : 80, // Extra padding for Android
  },
  billCard: {
    marginBottom: 16,
  },
  cardContent: {
    padding: 16,
  },
  billHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  billInfo: {
    flex: 1,
  },
  billNumber: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 2,
  },
  billPeriod: {
    fontSize: 14,
    color: Colors.textLight,
  },
  userInfo: {
    marginBottom: 12,
  },
  userName: {
    fontSize: 15,
    fontWeight: '500',
    color: Colors.text,
    marginBottom: 2,
  },
  userAddress: {
    fontSize: 14,
    color: Colors.textLight,
  },
  billDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  billDetailItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  billDetailValue: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.text,
    marginLeft: 6,
  },
  overdueText: {
    color: Colors.error,
  },
  cardActions: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    padding: 12,
  },
  fab: {
    position: 'absolute',
    bottom: Platform.OS === 'android' ? 40 : 24, // Higher position for Android
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
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
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 24,
  },
  modalButton: {
    flex: 1,
    marginHorizontal: 8,
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
  // Bulk Operations Modal Styles
  bulkModalContainer: {
    width: '90%',
    maxWidth: 500,
    backgroundColor: '#fff',
    borderRadius: 12,
    maxHeight: '80%',
  },
  bulkModalContent: {
    padding: 16,
  },
  bulkModalSubtitle: {
    fontSize: 16,
    color: Colors.textLight,
    marginBottom: 16,
  },
  selectAllContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  selectAllCheckbox: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: Colors.primary,
    marginRight: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxSelected: {
    backgroundColor: Colors.primary,
  },
  selectAllText: {
    fontSize: 16,
    color: Colors.text,
  },
  selectedCountText: {
    fontSize: 14,
    color: Colors.textLight,
  },
  bulkBillsList: {
    maxHeight: 300,
  },
  bulkBillItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  bulkBillInfo: {
    flex: 1,
    marginLeft: 8,
  },
  bulkBillNumber: {
    fontSize: 14,
    fontWeight: 'bold',
    color: Colors.text,
  },
  bulkBillDetails: {
    fontSize: 12,
    color: Colors.textLight,
  },
  bulkActions: {
    marginTop: 16,
  },
  bulkActionButton: {
    marginBottom: 8,
  },
});



