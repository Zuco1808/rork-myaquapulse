import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  SafeAreaView,
  Platform
} from 'react-native';
import { useRouter } from 'expo-router';
import { 
  BarChart2, 
  Calendar, 
  ChevronLeft, 
  ChevronRight, 
  Download,
  Droplet,
  Menu
} from 'lucide-react-native';
import { Header } from '@/components/layout/Header';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Drawer } from '@/components/layout/Drawer';
import { useAuthStore } from '@/store/auth-store';
import Colors from '@/constants/colors';
import { BarChartConsumption } from '@/components/charts/BarChartConsumption';

// Define types for consumption data
interface MonthlyData {
  month: string;
  value: number;
}

interface YearlyData {
  year: string;
  value: number;
}

// Type guard functions
function isMonthlyData(data: MonthlyData | YearlyData): data is MonthlyData {
  return 'month' in data;
}

function isYearlyData(data: MonthlyData | YearlyData): data is YearlyData {
  return 'year' in data;
}

// Mock consumption data
const mockMonthlyData: MonthlyData[] = [
  { month: 'Jan', value: 12.5 },
  { month: 'Feb', value: 11.8 },
  { month: 'Mar', value: 13.2 },
  { month: 'Apr', value: 14.7 },
  { month: 'Maj', value: 15.3 },
  { month: 'Jun', value: 18.1 },
  { month: 'Jul', value: 20.5 },
  { month: 'Avg', value: 19.8 },
  { month: 'Sep', value: 16.4 },
  { month: 'Okt', value: 14.2 },
  { month: 'Nov', value: 12.9 },
  { month: 'Dec', value: 13.5 }
];

const mockYearlyData: YearlyData[] = [
  { year: '2018', value: 156.8 },
  { year: '2019', value: 168.2 },
  { year: '2020', value: 172.5 },
  { year: '2021', value: 165.9 },
  { year: '2022', value: 170.3 },
  { year: '2023', value: 182.9 }
];

export default function ConsumptionScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  
  const [period, setPeriod] = useState<'monthly' | 'yearly'>('monthly');
  const [year, setYear] = useState(2023);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  
  useEffect(() => {
    if (!user) {
      router.replace('/login');
    }
  }, [user, router]);
  
  const handlePeriodChange = (newPeriod: 'monthly' | 'yearly') => {
    setPeriod(newPeriod);
  };
  
  const handleYearChange = (direction: 'prev' | 'next') => {
    if (direction === 'prev') {
      setYear(year - 1);
    } else {
      setYear(year + 1);
    }
  };
  
  const handleDownloadReport = () => {
    // In a real app, you would generate and download a report
    alert('Izvještaj će biti preuzet.');
  };
  
  const calculateAverageConsumption = () => {
    const data = period === 'monthly' ? mockMonthlyData : mockYearlyData;
    const sum = data.reduce((acc, item) => acc + item.value, 0);
    return (sum / data.length).toFixed(1);
  };
  
  const calculateTotalConsumption = () => {
    const data = period === 'monthly' ? mockMonthlyData : mockYearlyData;
    return data.reduce((acc, item) => acc + item.value, 0).toFixed(1);
  };
  
  const findMaxConsumption = () => {
    const data = period === 'monthly' ? mockMonthlyData : mockYearlyData;
    const maxItem = data.reduce((max, item) => item.value > max.value ? item : max, data[0]);
    
    return {
      period: isMonthlyData(maxItem) ? maxItem.month : isYearlyData(maxItem) ? maxItem.year : '',
      value: maxItem.value.toFixed(1)
    };
  };
  
  const findMinConsumption = () => {
    const data = period === 'monthly' ? mockMonthlyData : mockYearlyData;
    const minItem = data.reduce((min, item) => item.value < min.value ? item : min, data[0]);
    
    return {
      period: isMonthlyData(minItem) ? minItem.month : isYearlyData(minItem) ? minItem.year : '',
      value: minItem.value.toFixed(1)
    };
  };
  
  const maxConsumption = findMaxConsumption();
  const minConsumption = findMinConsumption();
  
  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <Header 
          title="Potrošnja vode"
          showBack
          showMenu
          onLeftPress={() => setIsDrawerOpen(true)}
        />
        
        <Drawer
          isOpen={isDrawerOpen}
          onClose={() => setIsDrawerOpen(false)}
        />
        
        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
        >
          <Card style={styles.periodCard}>
            <View style={styles.periodSelector}>
              <TouchableOpacity
                style={[
                  styles.periodOption,
                  period === 'monthly' && styles.periodOptionActive
                ]}
                onPress={() => handlePeriodChange('monthly')}
              >
                <Text style={[
                  styles.periodOptionText,
                  period === 'monthly' && styles.periodOptionTextActive
                ]}>Mjesečno</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[
                  styles.periodOption,
                  period === 'yearly' && styles.periodOptionActive
                ]}
                onPress={() => handlePeriodChange('yearly')}
              >
                <Text style={[
                  styles.periodOptionText,
                  period === 'yearly' && styles.periodOptionTextActive
                ]}>Godišnje</Text>
              </TouchableOpacity>
            </View>
            
            <View style={styles.yearSelector}>
              <TouchableOpacity
                style={styles.yearButton}
                onPress={() => handleYearChange('prev')}
              >
                <ChevronLeft size={24} color={Colors.primary} />
              </TouchableOpacity>
              
              <View style={styles.yearContainer}>
                <Calendar size={16} color={Colors.textLight} style={styles.yearIcon} />
                <Text style={styles.yearText}>{year}</Text>
              </View>
              
              <TouchableOpacity
                style={styles.yearButton}
                onPress={() => handleYearChange('next')}
              >
                <ChevronRight size={24} color={Colors.primary} />
              </TouchableOpacity>
            </View>
          </Card>
          
          <Card style={styles.chartCard}>
            <Text style={styles.chartTitle}>
              {period === 'monthly' ? 'Mjesečna potrošnja vode' : 'Godišnja potrošnja vode'}
            </Text>
            
            <View style={styles.chartContainer}>
              <BarChartConsumption 
                data={period === 'monthly' ? mockMonthlyData : mockYearlyData}
                xKey={period === 'monthly' ? 'month' : 'year'}
                yKey="value"
              />
            </View>
            
            <Button
              title="Preuzmi izvještaj"
              variant="outline"
              leftIcon={<Download size={20} color={Colors.primary} />}
              onPress={handleDownloadReport}
              style={styles.downloadButton}
            />
          </Card>
          
          <View style={styles.statsGrid}>
            <Card style={styles.statsCard}>
              <View style={styles.statsIconContainer}>
                <Droplet size={24} color={Colors.primary} />
              </View>
              <Text style={styles.statsValue}>{calculateTotalConsumption()} m³</Text>
              <Text style={styles.statsLabel}>Ukupna potrošnja</Text>
            </Card>
            
            <Card style={styles.statsCard}>
              <View style={styles.statsIconContainer}>
                <BarChart2 size={24} color={Colors.primary} />
              </View>
              <Text style={styles.statsValue}>{calculateAverageConsumption()} m³</Text>
              <Text style={styles.statsLabel}>Prosječna potrošnja</Text>
            </Card>
            
            <Card style={styles.statsCard}>
              <View style={styles.statsIconContainer}>
                <Droplet size={24} color={Colors.success} />
              </View>
              <Text style={styles.statsValue}>{minConsumption.value} m³</Text>
              <Text style={styles.statsLabel}>
                Min. potrošnja ({minConsumption.period})
              </Text>
            </Card>
            
            <Card style={styles.statsCard}>
              <View style={styles.statsIconContainer}>
                <Droplet size={24} color={Colors.error} />
              </View>
              <Text style={styles.statsValue}>{maxConsumption.value} m³</Text>
              <Text style={styles.statsLabel}>
                Max. potrošnja ({maxConsumption.period})
              </Text>
            </Card>
          </View>
          
          <Card style={styles.tipsCard}>
            <Text style={styles.tipsTitle}>Savjeti za uštedu vode</Text>
            
            <View style={styles.tipItem}>
              <View style={styles.tipBullet} />
              <Text style={styles.tipText}>
                Popravite slavine koje cure - jedna kap u sekundi može potrošiti 10.000 litara vode godišnje.
              </Text>
            </View>
            
            <View style={styles.tipItem}>
              <View style={styles.tipBullet} />
              <Text style={styles.tipText}>
                Koristite mašine za pranje veša i suđa samo kada su pune.
              </Text>
            </View>
            
            <View style={styles.tipItem}>
              <View style={styles.tipBullet} />
              <Text style={styles.tipText}>
                Zatvarajte slavinu dok perete zube ili se brijete.
              </Text>
            </View>
            
            <View style={styles.tipItem}>
              <View style={styles.tipBullet} />
              <Text style={styles.tipText}>
                Instalirajte štedljive slavine i tuševe koji mogu smanjiti potrošnju vode do 50%.
              </Text>
            </View>
          </Card>
        </ScrollView>
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: Platform.OS === 'android' ? 100 : 80, // Extra padding for Android
  },
  periodCard: {
    padding: 16,
    marginBottom: 16,
  },
  periodSelector: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  periodOption: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 8,
    backgroundColor: Colors.highlight,
    marginHorizontal: 4,
  },
  periodOptionActive: {
    backgroundColor: Colors.primary,
  },
  periodOptionText: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.text,
  },
  periodOptionTextActive: {
    color: '#fff',
  },
  yearSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  yearButton: {
    padding: 8,
  },
  yearContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: Colors.highlight,
  },
  yearIcon: {
    marginRight: 8,
  },
  yearText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.text,
  },
  chartCard: {
    padding: 16,
    marginBottom: 16,
  },
  chartTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 16,
    textAlign: 'center',
  },
  chartContainer: {
    height: 250,
    marginBottom: 16,
  },
  downloadButton: {
    marginTop: 8,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  statsCard: {
    width: '48%',
    padding: 16,
    marginBottom: 16,
    alignItems: 'center',
  },
  statsIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.highlight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  statsValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 4,
  },
  statsLabel: {
    fontSize: 12,
    color: Colors.textLight,
    textAlign: 'center',
  },
  tipsCard: {
    padding: 16,
    marginBottom: 16,
  },
  tipsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 16,
  },
  tipItem: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  tipBullet: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.primary,
    marginTop: 6,
    marginRight: 8,
  },
  tipText: {
    flex: 1,
    fontSize: 14,
    color: Colors.text,
    lineHeight: 20,
  },
});