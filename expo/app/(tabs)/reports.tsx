import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity,
  Alert
} from 'react-native';
import { useRouter } from 'expo-router';
import { 
  BarChart3, 
  Download, 
  Calendar, 
  Filter, 
  ChevronDown,
  Droplet,
  DollarSign,
  Users,
  AlertTriangle,
  Printer
} from 'lucide-react-native';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useAuthStore } from '@/store/auth-store';
import Colors from '@/constants/colors';

// Report types
const reportTypes = [
  { id: 'consumption', label: 'Potrošnja vode', icon: <Droplet size={20} color={Colors.primary} /> },
  { id: 'financial', label: 'Finansijski izvještaji', icon: <DollarSign size={20} color={Colors.primary} /> },
  { id: 'users', label: 'Korisnici', icon: <Users size={20} color={Colors.primary} /> },
  { id: 'alerts', label: 'Alarmi i anomalije', icon: <AlertTriangle size={20} color={Colors.primary} /> },
];

// Time periods
const timePeriods = [
  { id: 'day', label: 'Dan' },
  { id: 'week', label: 'Sedmica' },
  { id: 'month', label: 'Mjesec' },
  { id: 'quarter', label: 'Kvartal' },
  { id: 'year', label: 'Godina' },
];

// Mock consumption data
const mockConsumptionData = [
  { label: 'Jan', value: 120 },
  { label: 'Feb', value: 110 },
  { label: 'Mar', value: 130 },
  { label: 'Apr', value: 150 },
  { label: 'Maj', value: 140 },
  { label: 'Jun', value: 160 },
];

// Mock financial data
const mockFinancialData = [
  { label: 'Jan', value: 4500 },
  { label: 'Feb', value: 4200 },
  { label: 'Mar', value: 4800 },
  { label: 'Apr', value: 5200 },
  { label: 'Maj', value: 5000 },
  { label: 'Jun', value: 5500 },
];

export default function ReportsScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  
  // Report state
  const [selectedReportType, setSelectedReportType] = useState('consumption');
  const [selectedPeriod, setSelectedPeriod] = useState('month');
  const [showReportTypes, setShowReportTypes] = useState(false);
  const [showPeriods, setShowPeriods] = useState(false);
  
  // Check if user has permission to access this screen
  useEffect(() => {
    if (!user) {
      router.replace('/login');
    }
  }, [user, router]);
  
  const handleReportTypeChange = (type: string) => {
    setSelectedReportType(type);
    setShowReportTypes(false);
  };
  
  const handlePeriodChange = (period: string) => {
    setSelectedPeriod(period);
    setShowPeriods(false);
  };
  
  const handleDownloadPdf = () => {
    Alert.alert(
      "Preuzimanje PDF-a",
      "PDF izvještaja će biti preuzet.",
      [{ text: "OK" }]
    );
  };
  
  const handlePrintReport = () => {
    Alert.alert(
      "Štampanje izvještaja",
      "Izvještaj će biti poslan na štampač.",
      [{ text: "OK" }]
    );
  };
  
  const getReportTitle = () => {
    const reportType = reportTypes.find(r => r.id === selectedReportType);
    const period = timePeriods.find(p => p.id === selectedPeriod);
    
    return `${reportType?.label} - ${period?.label}`;
  };
  
  const renderConsumptionReport = () => {
    const maxValue = Math.max(...mockConsumptionData.map(d => d.value));
    
    return (
      <View style={styles.reportContent}>
        <Text style={styles.reportTitle}>{getReportTitle()}</Text>
        
        <View style={styles.chartContainer}>
          <View style={styles.yAxis}>
            <Text style={styles.axisLabel}>{maxValue} m³</Text>
            <Text style={styles.axisLabel}>{Math.round(maxValue / 2)} m³</Text>
            <Text style={styles.axisLabel}>0 m³</Text>
          </View>
          
          <View style={styles.chart}>
            {mockConsumptionData.map((item, index) => (
              <View key={index} style={styles.barContainer}>
                <View 
                  style={[
                    styles.bar, 
                    { 
                      height: `${(item.value / maxValue) * 100}%`,
                      backgroundColor: Colors.primary 
                    }
                  ]} 
                />
                <Text style={styles.barLabel}>{item.label}</Text>
              </View>
            ))}
          </View>
        </View>
        
        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>810 m³</Text>
            <Text style={styles.statLabel}>Ukupna potrošnja</Text>
          </View>
          
          <View style={styles.statItem}>
            <Text style={styles.statValue}>135 m³</Text>
            <Text style={styles.statLabel}>Prosječna mjesečna</Text>
          </View>
          
          <View style={styles.statItem}>
            <Text style={styles.statValue}>+6.7%</Text>
            <Text style={styles.statLabel}>Trend</Text>
          </View>
        </View>
        
        <View style={styles.reportActions}>
          <Button
            title="Preuzmi PDF"
            variant="outline"
            size="small"
            leftIcon={<Download size={16} color={Colors.primary} />}
            onPress={handleDownloadPdf}
          />
          
          <Button
            title="Štampaj"
            size="small"
            style={{ marginLeft: 8 }}
            onPress={handlePrintReport}
          />
        </View>
      </View>
    );
  };
  
  const renderFinancialReport = () => {
    const maxValue = Math.max(...mockFinancialData.map(d => d.value));
    
    return (
      <View style={styles.reportContent}>
        <Text style={styles.reportTitle}>{getReportTitle()}</Text>
        
        <View style={styles.chartContainer}>
          <View style={styles.yAxis}>
            <Text style={styles.axisLabel}>{maxValue} KM</Text>
            <Text style={styles.axisLabel}>{Math.round(maxValue / 2)} KM</Text>
            <Text style={styles.axisLabel}>0 KM</Text>
          </View>
          
          <View style={styles.chart}>
            {mockFinancialData.map((item, index) => (
              <View key={index} style={styles.barContainer}>
                <View 
                  style={[
                    styles.bar, 
                    { 
                      height: `${(item.value / maxValue) * 100}%`,
                      backgroundColor: Colors.secondary 
                    }
                  ]} 
                />
                <Text style={styles.barLabel}>{item.label}</Text>
              </View>
            ))}
          </View>
        </View>
        
        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>29,200 KM</Text>
            <Text style={styles.statLabel}>Ukupni prihod</Text>
          </View>
          
          <View style={styles.statItem}>
            <Text style={styles.statValue}>4,867 KM</Text>
            <Text style={styles.statLabel}>Prosječni mjesečni</Text>
          </View>
          
          <View style={styles.statItem}>
            <Text style={styles.statValue}>+5.8%</Text>
            <Text style={styles.statLabel}>Trend</Text>
          </View>
        </View>
        
        <View style={styles.reportActions}>
          <Button
            title="Preuzmi PDF"
            variant="outline"
            size="small"
            leftIcon={<Download size={16} color={Colors.primary} />}
            onPress={handleDownloadPdf}
          />
          
          <Button
            title="Štampaj"
            size="small"
            style={{ marginLeft: 8 }}
            onPress={handlePrintReport}
          />
        </View>
      </View>
    );
  };
  
  const renderUsersReport = () => {
    return (
      <View style={styles.reportContent}>
        <Text style={styles.reportTitle}>{getReportTitle()}</Text>
        
        <View style={styles.tableContainer}>
          <View style={styles.tableHeader}>
            <Text style={[styles.tableHeaderCell, { flex: 2 }]}>Korisnik</Text>
            <Text style={[styles.tableHeaderCell, { flex: 1 }]}>Uloga</Text>
            <Text style={[styles.tableHeaderCell, { flex: 1 }]}>Potrošnja</Text>
            <Text style={[styles.tableHeaderCell, { flex: 1 }]}>Računi</Text>
          </View>
          
          <View style={styles.tableRow}>
            <Text style={[styles.tableCell, { flex: 2 }]}>Amina Hodžić</Text>
            <Text style={[styles.tableCell, { flex: 1 }]}>Građanin</Text>
            <Text style={[styles.tableCell, { flex: 1 }]}>45 m³</Text>
            <Text style={[styles.tableCell, { flex: 1 }]}>2/2</Text>
          </View>
          
          <View style={styles.tableRow}>
            <Text style={[styles.tableCell, { flex: 2 }]}>Emir Kovačević</Text>
            <Text style={[styles.tableCell, { flex: 1 }]}>Građanin</Text>
            <Text style={[styles.tableCell, { flex: 1 }]}>68 m³</Text>
            <Text style={[styles.tableCell, { flex: 1 }]}>2/2</Text>
          </View>
          
          <View style={styles.tableRow}>
            <Text style={[styles.tableCell, { flex: 2 }]}>Selma Begić</Text>
            <Text style={[styles.tableCell, { flex: 1 }]}>Građanin</Text>
            <Text style={[styles.tableCell, { flex: 1 }]}>52 m³</Text>
            <Text style={[styles.tableCell, { flex: 1 }]}>1/2</Text>
          </View>
          
          <View style={styles.tableRow}>
            <Text style={[styles.tableCell, { flex: 2 }]}>Adnan Mehić</Text>
            <Text style={[styles.tableCell, { flex: 1 }]}>Građanin</Text>
            <Text style={[styles.tableCell, { flex: 1 }]}>38 m³</Text>
            <Text style={[styles.tableCell, { flex: 1 }]}>0/1</Text>
          </View>
          
          <View style={styles.tableRow}>
            <Text style={[styles.tableCell, { flex: 2 }]}>Lejla Hadžić</Text>
            <Text style={[styles.tableCell, { flex: 1 }]}>Građanin</Text>
            <Text style={[styles.tableCell, { flex: 1 }]}>42 m³</Text>
            <Text style={[styles.tableCell, { flex: 1 }]}>0/1</Text>
          </View>
        </View>
        
        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>45</Text>
            <Text style={styles.statLabel}>Ukupno korisnika</Text>
          </View>
          
          <View style={styles.statItem}>
            <Text style={styles.statValue}>5</Text>
            <Text style={styles.statLabel}>Novih ovaj mjesec</Text>
          </View>
          
          <View style={styles.statItem}>
            <Text style={styles.statValue}>85%</Text>
            <Text style={styles.statLabel}>Stopa naplate</Text>
          </View>
        </View>
        
        <View style={styles.reportActions}>
          <Button
            title="Preuzmi PDF"
            variant="outline"
            size="small"
            leftIcon={<Download size={16} color={Colors.primary} />}
            onPress={handleDownloadPdf}
          />
          
          <Button
            title="Štampaj"
            size="small"
            style={{ marginLeft: 8 }}
            onPress={handlePrintReport}
          />
        </View>
      </View>
    );
  };
  
  const renderAlertsReport = () => {
    return (
      <View style={styles.reportContent}>
        <Text style={styles.reportTitle}>{getReportTitle()}</Text>
        
        <View style={styles.tableContainer}>
          <View style={styles.tableHeader}>
            <Text style={[styles.tableHeaderCell, { flex: 2 }]}>Alarm</Text>
            <Text style={[styles.tableHeaderCell, { flex: 1 }]}>Tip</Text>
            <Text style={[styles.tableHeaderCell, { flex: 1 }]}>Datum</Text>
            <Text style={[styles.tableHeaderCell, { flex: 1 }]}>Status</Text>
          </View>
          
          <View style={styles.tableRow}>
            <Text style={[styles.tableCell, { flex: 2 }]}>Visoka potrošnja</Text>
            <Text style={[styles.tableCell, { flex: 1 }]}>Upozorenje</Text>
            <Text style={[styles.tableCell, { flex: 1 }]}>15.05.2023</Text>
            <Text style={[styles.tableCell, { flex: 1, color: Colors.warning }]}>Aktivan</Text>
          </View>
          
          <View style={styles.tableRow}>
            <Text style={[styles.tableCell, { flex: 2 }]}>Curenje vode</Text>
            <Text style={[styles.tableCell, { flex: 1 }]}>Kritično</Text>
            <Text style={[styles.tableCell, { flex: 1 }]}>14.05.2023</Text>
            <Text style={[styles.tableCell, { flex: 1, color: Colors.success }]}>Riješen</Text>
          </View>
          
          <View style={styles.tableRow}>
            <Text style={[styles.tableCell, { flex: 2 }]}>Niska potrošnja</Text>
            <Text style={[styles.tableCell, { flex: 1 }]}>Info</Text>
            <Text style={[styles.tableCell, { flex: 1 }]}>13.05.2023</Text>
            <Text style={[styles.tableCell, { flex: 1, color: Colors.warning }]}>Aktivan</Text>
          </View>
          
          <View style={styles.tableRow}>
            <Text style={[styles.tableCell, { flex: 2 }]}>Prekid očitanja</Text>
            <Text style={[styles.tableCell, { flex: 1 }]}>Upozorenje</Text>
            <Text style={[styles.tableCell, { flex: 1 }]}>12.05.2023</Text>
            <Text style={[styles.tableCell, { flex: 1, color: Colors.warning }]}>Aktivan</Text>
          </View>
          
          <View style={styles.tableRow}>
            <Text style={[styles.tableCell, { flex: 2 }]}>Kvar na vodomjeru</Text>
            <Text style={[styles.tableCell, { flex: 1 }]}>Kritično</Text>
            <Text style={[styles.tableCell, { flex: 1 }]}>11.05.2023</Text>
            <Text style={[styles.tableCell, { flex: 1, color: Colors.success }]}>Riješen</Text>
          </View>
        </View>
        
        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>12</Text>
            <Text style={styles.statLabel}>Ukupno alarma</Text>
          </View>
          
          <View style={styles.statItem}>
            <Text style={styles.statValue}>7</Text>
            <Text style={styles.statLabel}>Aktivnih</Text>
          </View>
          
          <View style={styles.statItem}>
            <Text style={styles.statValue}>5</Text>
            <Text style={styles.statLabel}>Riješenih</Text>
          </View>
        </View>
        
        <View style={styles.reportActions}>
          <Button
            title="Preuzmi PDF"
            variant="outline"
            size="small"
            leftIcon={<Download size={16} color={Colors.primary} />}
            onPress={handleDownloadPdf}
          />
          
          <Button
            title="Štampaj"
            size="small"
            style={{ marginLeft: 8 }}
            onPress={handlePrintReport}
          />
        </View>
      </View>
    );
  };
  
  const renderReportContent = () => {
    switch (selectedReportType) {
      case 'consumption':
        return renderConsumptionReport();
      case 'financial':
        return renderFinancialReport();
      case 'users':
        return renderUsersReport();
      case 'alerts':
        return renderAlertsReport();
      default:
        return renderConsumptionReport();
    }
  };
  
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Izvještaji</Text>
        <BarChart3 size={24} color={Colors.primary} />
      </View>
      
      <View style={styles.filters}>
        <View style={styles.filterGroup}>
          <Text style={styles.filterLabel}>Tip izvještaja:</Text>
          <TouchableOpacity
            style={styles.dropdown}
            onPress={() => setShowReportTypes(!showReportTypes)}
          >
            <View style={styles.dropdownContent}>
              {reportTypes.find(r => r.id === selectedReportType)?.icon}
              <Text style={styles.dropdownText}>
                {reportTypes.find(r => r.id === selectedReportType)?.label}
              </Text>
            </View>
            <ChevronDown size={20} color={Colors.textLight} />
          </TouchableOpacity>
          
          {showReportTypes && (
            <View style={styles.dropdownMenu}>
              {reportTypes.map((type) => (
                <TouchableOpacity
                  key={type.id}
                  style={[
                    styles.dropdownMenuItem,
                    selectedReportType === type.id && styles.dropdownMenuItemActive
                  ]}
                  onPress={() => handleReportTypeChange(type.id)}
                >
                  {type.icon}
                  <Text 
                    style={[
                      styles.dropdownMenuItemText,
                      selectedReportType === type.id && styles.dropdownMenuItemTextActive
                    ]}
                  >
                    {type.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
        
        <View style={styles.filterGroup}>
          <Text style={styles.filterLabel}>Period:</Text>
          <TouchableOpacity
            style={styles.dropdown}
            onPress={() => setShowPeriods(!showPeriods)}
          >
            <View style={styles.dropdownContent}>
              <Calendar size={20} color={Colors.primary} />
              <Text style={styles.dropdownText}>
                {timePeriods.find(p => p.id === selectedPeriod)?.label}
              </Text>
            </View>
            <ChevronDown size={20} color={Colors.textLight} />
          </TouchableOpacity>
          
          {showPeriods && (
            <View style={styles.dropdownMenu}>
              {timePeriods.map((period) => (
                <TouchableOpacity
                  key={period.id}
                  style={[
                    styles.dropdownMenuItem,
                    selectedPeriod === period.id && styles.dropdownMenuItemActive
                  ]}
                  onPress={() => handlePeriodChange(period.id)}
                >
                  <Text 
                    style={[
                      styles.dropdownMenuItemText,
                      selectedPeriod === period.id && styles.dropdownMenuItemTextActive
                    ]}
                  >
                    {period.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
      </View>
      
      <Card style={styles.reportCard}>
        {renderReportContent()}
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 32,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.text,
  },
  filters: {
    marginBottom: 16,
  },
  filterGroup: {
    marginBottom: 12,
    position: 'relative',
  },
  filterLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.text,
    marginBottom: 8,
  },
  dropdown: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    padding: 12,
    backgroundColor: '#fff',
  },
  dropdownContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dropdownText: {
    fontSize: 14,
    color: Colors.text,
    marginLeft: 8,
  },
  dropdownMenu: {
    position: 'absolute',
    top: 80,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    zIndex: 10,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  dropdownMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  dropdownMenuItemActive: {
    backgroundColor: Colors.highlight,
  },
  dropdownMenuItemText: {
    fontSize: 14,
    color: Colors.text,
    marginLeft: 8,
  },
  dropdownMenuItemTextActive: {
    color: Colors.primary,
    fontWeight: '500',
  },
  reportCard: {
    marginBottom: 16,
  },
  reportContent: {
    padding: 16,
  },
  reportTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 16,
    textAlign: 'center',
  },
  chartContainer: {
    flexDirection: 'row',
    height: 200,
    marginBottom: 24,
  },
  yAxis: {
    width: 50,
    height: '100%',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingRight: 8,
  },
  axisLabel: {
    fontSize: 12,
    color: Colors.textLight,
  },
  chart: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'flex-end',
    height: '100%',
    borderLeftWidth: 1,
    borderBottomWidth: 1,
    borderColor: Colors.border,
    paddingTop: 8,
  },
  barContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
    height: '100%',
    paddingBottom: 20,
  },
  bar: {
    width: '60%',
    minHeight: 4,
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
  },
  barLabel: {
    position: 'absolute',
    bottom: 0,
    fontSize: 12,
    color: Colors.textLight,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 24,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.primary,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: Colors.textLight,
  },
  reportActions: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
  tableContainer: {
    marginBottom: 24,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: Colors.highlight,
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
  },
  tableHeaderCell: {
    fontSize: 14,
    fontWeight: 'bold',
    color: Colors.text,
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  tableCell: {
    fontSize: 14,
    color: Colors.text,
  },
});