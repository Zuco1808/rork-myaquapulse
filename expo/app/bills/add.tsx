import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  Droplet,
  Calendar,
  User,
  CheckCircle,
  CreditCard,
  MapPin,
} from 'lucide-react-native';
import { Header } from '@/components/layout/Header';
import { Drawer } from '@/components/layout/Drawer';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { useAuthStore } from '@/store/auth-store';
import {
  getReadingsForBilling,
  calculateBillAmount,
  createBill,
  PRICING_PACKAGES,
  PricingPackageType,
  BillCalculation,
} from '@/lib/api/bills';
import Colors from '@/constants/colors';

export default function AddBillScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [readings, setReadings] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedReading, setSelectedReading] = useState<any>(null);
  const [pricingPackage, setPricingPackage] = useState<PricingPackageType>('standard');
  const [calculation, setCalculation] = useState<BillCalculation | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const dueDate = new Date();
  dueDate.setDate(dueDate.getDate() + 15);

  useEffect(() => {
    loadReadings();
  }, []);

  useEffect(() => {
    if (selectedReading?.consumption) {
      setCalculation(calculateBillAmount(selectedReading.consumption, pricingPackage));
    }
  }, [selectedReading, pricingPackage]);

  const loadReadings = async () => {
    setIsLoading(true);
    try {
      const data = await getReadingsForBilling();
      setReadings(data);
    } catch {
      Alert.alert('Greška', 'Nije moguće učitati očitanja.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerate = async () => {
    if (!selectedReading || !calculation) return;
    setIsSubmitting(true);
    try {
      const readingDate = new Date(selectedReading.readingDate);
      const periodFrom = new Date(readingDate);
      periodFrom.setDate(readingDate.getDate() - 30);

      await createBill({
        user_id: selectedReading.userId,
        meter_id: selectedReading.meterId,
        ...(selectedReading.locationId ? { location_id: selectedReading.locationId } : {}),
        amount: calculation.total,
        currency: 'BAM',
        period_from: periodFrom.toISOString(),
        period_to: readingDate.toISOString(),
        due_date: dueDate.toISOString(),
        consumption: selectedReading.consumption,
        notes: `Paket: ${PRICING_PACKAGES[pricingPackage].name}`,
      });

      if (Platform.OS === 'web') {
        alert('Račun je uspješno generisan.');
        router.back();
      } else {
        Alert.alert('Uspješno', 'Račun je uspješno generisan.', [
          { text: 'OK', onPress: () => router.back() },
        ]);
      }
    } catch {
      Alert.alert('Greška', 'Nije moguće generisati račun. Pokušajte ponovo.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatDate = (timestamp: number) =>
    new Date(timestamp).toLocaleDateString('bs-BA', {
      day: '2-digit', month: '2-digit', year: 'numeric',
    });

  const formatDueDate = (date: Date) =>
    date.toLocaleDateString('bs-BA', { day: '2-digit', month: '2-digit', year: 'numeric' });

  return (
    <>
      <Header
        title="Generiši račun"
        showBack
        showMenu
        onLeftPress={() => router.back()}
        onMenuPress={() => setIsDrawerOpen(true)}
      />
      <Drawer isOpen={isDrawerOpen} onClose={() => setIsDrawerOpen(false)} />

      <ScrollView style={styles.container} contentContainerStyle={styles.content}>

        {/* Step 1 */}
        <Text style={styles.stepTitle}>1. Odaberi očitanje</Text>
        <Text style={styles.stepDesc}>
          Verificirana očitanja vodomjera za koja još nije generisan račun
        </Text>

        {isLoading ? (
          <ActivityIndicator color={Colors.primary} style={styles.loader} />
        ) : readings.length === 0 ? (
          <Card style={styles.emptyCard}>
            <Droplet size={32} color={Colors.disabled} />
            <Text style={styles.emptyText}>
              Nema verificiranih očitanja za fakturisanje
            </Text>
          </Card>
        ) : (
          readings.map((reading) => {
            const isSelected = selectedReading?.id === reading.id;
            return (
              <TouchableOpacity
                key={reading.id}
                style={[styles.readingItem, isSelected && styles.readingItemSelected]}
                onPress={() => setSelectedReading(reading)}
                activeOpacity={0.7}
              >
                <View style={styles.readingLeft}>
                  <View style={styles.readingRow}>
                    <Droplet size={15} color={Colors.primary} />
                    <Text style={styles.readingSerial}>{reading.meterSerial}</Text>
                  </View>
                  {reading.userName ? (
                    <View style={styles.readingRow}>
                      <User size={13} color={Colors.textLight} />
                      <Text style={styles.readingDetail}>{reading.userName}</Text>
                    </View>
                  ) : null}
                  {reading.locationName ? (
                    <View style={styles.readingRow}>
                      <MapPin size={13} color={Colors.textLight} />
                      <Text style={styles.readingDetail}>{reading.locationName}</Text>
                    </View>
                  ) : null}
                  <View style={styles.readingRow}>
                    <Calendar size={13} color={Colors.textLight} />
                    <Text style={styles.readingDetail}>{formatDate(reading.readingDate)}</Text>
                  </View>
                </View>
                <View style={styles.readingRight}>
                  <Text style={styles.readingConsumption}>
                    {reading.consumption.toFixed(1)}
                  </Text>
                  <Text style={styles.readingUnit}>m³</Text>
                  {isSelected && (
                    <CheckCircle size={20} color={Colors.primary} style={{ marginTop: 4 }} />
                  )}
                </View>
              </TouchableOpacity>
            );
          })
        )}

        {/* Step 2 */}
        {selectedReading && (
          <>
            <Text style={[styles.stepTitle, { marginTop: 28 }]}>2. Cjenovni paket</Text>
            <View style={styles.packageRow}>
              {(Object.keys(PRICING_PACKAGES) as PricingPackageType[]).map((key) => (
                <TouchableOpacity
                  key={key}
                  style={[
                    styles.packageButton,
                    pricingPackage === key && styles.packageButtonActive,
                  ]}
                  onPress={() => setPricingPackage(key)}
                >
                  <Text
                    style={[
                      styles.packageButtonText,
                      pricingPackage === key && styles.packageButtonTextActive,
                    ]}
                  >
                    {PRICING_PACKAGES[key].name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </>
        )}

        {/* Step 3: Breakdown */}
        {calculation && (
          <>
            <Text style={[styles.stepTitle, { marginTop: 28 }]}>3. Obračun</Text>
            <Card style={styles.breakdownCard}>
              <View style={styles.breakdownHeader}>
                <Text style={[styles.breakdownCell, { flex: 2 }]}>Opis</Text>
                <Text style={styles.breakdownCellRight}>m³</Text>
                <Text style={styles.breakdownCellRight}>KM/m³</Text>
                <Text style={styles.breakdownCellRight}>Iznos</Text>
              </View>
              {calculation.breakdown.map((item, i) => (
                <View key={i} style={styles.breakdownRow}>
                  <Text style={[styles.breakdownCell, { flex: 2 }]}>{item.label}</Text>
                  <Text style={styles.breakdownCellRight}>{item.consumption.toFixed(1)}</Text>
                  <Text style={styles.breakdownCellRight}>{item.pricePerUnit.toFixed(2)}</Text>
                  <Text style={styles.breakdownCellRight}>{item.amount.toFixed(2)}</Text>
                </View>
              ))}
              <View style={styles.breakdownTotalRow}>
                <Text style={styles.breakdownTotalLabel}>UKUPNO</Text>
                <Text style={styles.breakdownTotalAmount}>
                  {calculation.total.toFixed(2)} KM
                </Text>
              </View>
            </Card>

            {/* Step 4: Due date */}
            <Text style={[styles.stepTitle, { marginTop: 28 }]}>4. Rok plaćanja</Text>
            <Card style={styles.dueDateCard}>
              <View style={styles.dueDateRow}>
                <Calendar size={18} color={Colors.primary} />
                <Text style={styles.dueDateText}>{formatDueDate(dueDate)}</Text>
                <Text style={styles.dueDateNote}>  · 15 dana od danas</Text>
              </View>
            </Card>

            {/* Summary */}
            <Card style={styles.summaryCard}>
              <View style={styles.summaryHeader}>
                <CreditCard size={18} color={Colors.primary} />
                <Text style={styles.summaryTitle}>Pregled računa</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Vodomjer</Text>
                <Text style={styles.summaryValue}>{selectedReading.meterSerial}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Korisnik</Text>
                <Text style={styles.summaryValue}>{selectedReading.userName || '—'}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Potrošnja</Text>
                <Text style={styles.summaryValue}>
                  {selectedReading.consumption.toFixed(1)} m³
                </Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Paket</Text>
                <Text style={styles.summaryValue}>{PRICING_PACKAGES[pricingPackage].name}</Text>
              </View>
              <View style={[styles.summaryRow, styles.summaryTotalRow]}>
                <Text style={styles.summaryTotalLabel}>Ukupan iznos</Text>
                <Text style={styles.summaryTotalAmount}>
                  {calculation.total.toFixed(2)} KM
                </Text>
              </View>
            </Card>

            <Button
              title="Generiši račun"
              onPress={handleGenerate}
              isLoading={isSubmitting}
              style={styles.generateBtn}
            />

            <Button
              title="Otkaži"
              variant="outline"
              onPress={() => router.back()}
              style={styles.cancelBtn}
            />
          </>
        )}
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  loader: {
    marginVertical: 32,
  },
  stepTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 4,
  },
  stepDesc: {
    fontSize: 13,
    color: Colors.textLight,
    marginBottom: 12,
  },
  emptyCard: {
    padding: 32,
    alignItems: 'center',
    gap: 12,
  },
  emptyText: {
    fontSize: 14,
    color: Colors.textLight,
    textAlign: 'center',
  },
  readingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 10,
    marginBottom: 8,
    backgroundColor: Colors.background,
  },
  readingItemSelected: {
    borderColor: Colors.primary,
    backgroundColor: '#f0f8ff',
  },
  readingLeft: {
    flex: 1,
    gap: 4,
  },
  readingRight: {
    alignItems: 'center',
    marginLeft: 8,
  },
  readingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  readingSerial: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
  },
  readingDetail: {
    fontSize: 13,
    color: Colors.textLight,
  },
  readingConsumption: {
    fontSize: 22,
    fontWeight: 'bold',
    color: Colors.primary,
  },
  readingUnit: {
    fontSize: 12,
    color: Colors.textLight,
  },
  packageRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  packageButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
  },
  packageButtonActive: {
    borderColor: Colors.primary,
    backgroundColor: '#f0f8ff',
  },
  packageButtonText: {
    fontSize: 13,
    color: Colors.textLight,
    textAlign: 'center',
  },
  packageButtonTextActive: {
    color: Colors.primary,
    fontWeight: '600',
  },
  breakdownCard: {
    padding: 12,
    marginTop: 4,
  },
  breakdownHeader: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    paddingBottom: 6,
    marginBottom: 4,
  },
  breakdownCell: {
    fontSize: 12,
    color: Colors.textLight,
    fontWeight: '600',
  },
  breakdownCellRight: {
    flex: 1,
    fontSize: 12,
    color: Colors.textLight,
    fontWeight: '600',
    textAlign: 'right',
  },
  breakdownRow: {
    flexDirection: 'row',
    paddingVertical: 5,
    borderBottomWidth: 1,
    borderBottomColor: Colors.highlight,
  },
  breakdownTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 10,
    marginTop: 4,
  },
  breakdownTotalLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    color: Colors.text,
  },
  breakdownTotalAmount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.primary,
  },
  dueDateCard: {
    padding: 14,
    marginTop: 4,
  },
  dueDateRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dueDateText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginLeft: 10,
  },
  dueDateNote: {
    fontSize: 13,
    color: Colors.textLight,
  },
  summaryCard: {
    padding: 16,
    marginTop: 16,
  },
  summaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  summaryTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: Colors.text,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: Colors.highlight,
  },
  summaryLabel: {
    fontSize: 14,
    color: Colors.textLight,
  },
  summaryValue: {
    fontSize: 14,
    color: Colors.text,
    fontWeight: '500',
  },
  summaryTotalRow: {
    borderBottomWidth: 0,
    marginTop: 4,
    paddingTop: 10,
  },
  summaryTotalLabel: {
    fontSize: 15,
    fontWeight: 'bold',
    color: Colors.text,
  },
  summaryTotalAmount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.primary,
  },
  generateBtn: {
    marginTop: 20,
  },
  cancelBtn: {
    marginTop: 10,
  },
});
