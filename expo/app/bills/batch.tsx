import React, { useState, useEffect, useMemo } from 'react';
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
  CheckSquare,
  Square,
  User,
  Droplet,
  Calendar,
  CreditCard,
  CheckCircle,
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
} from '@/lib/api/bills';
import Colors from '@/constants/colors';

export default function BatchBillScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [readings, setReadings] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [pricingPackage, setPricingPackage] = useState<PricingPackageType>('standard');
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0 });

  const dueDate = new Date();
  dueDate.setDate(dueDate.getDate() + 15);

  useEffect(() => {
    loadReadings();
  }, []);

  const loadReadings = async () => {
    setIsLoading(true);
    try {
      const data = await getReadingsForBilling();
      setReadings(data);
      setSelectedIds(new Set(data.map((r: any) => r.id)));
    } catch {
      Alert.alert('Greška', 'Nije moguće učitati očitanja.');
    } finally {
      setIsLoading(false);
    }
  };

  const amounts = useMemo(() => {
    const map = new Map<string, number>();
    for (const r of readings) {
      map.set(r.id, calculateBillAmount(r.consumption, pricingPackage).total);
    }
    return map;
  }, [readings, pricingPackage]);

  const selectedReadings = readings.filter(r => selectedIds.has(r.id));
  const totalAmount = selectedReadings.reduce((s, r) => s + (amounts.get(r.id) || 0), 0);
  const allSelected = readings.length > 0 && selectedIds.size === readings.length;

  const toggleAll = () => {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(readings.map(r => r.id)));
    }
  };

  const toggleOne = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id); else next.add(id);
    setSelectedIds(next);
  };

  const handleGenerate = () => {
    if (selectedReadings.length === 0) {
      Alert.alert('Informacija', 'Odaberite najmanje jedno očitanje.');
      return;
    }

    Alert.alert(
      'Batch generisanje',
      `Generisati ${selectedReadings.length} računa ukupno ${totalAmount.toFixed(2)} KM?\n\nRok plaćanja: ${dueDate.toLocaleDateString('bs-BA')}\nPaket: ${PRICING_PACKAGES[pricingPackage].name}`,
      [
        { text: 'Otkaži', style: 'cancel' },
        { text: 'Generiši', onPress: runGeneration },
      ]
    );
  };

  const runGeneration = async () => {
    setIsGenerating(true);
    setProgress({ done: 0, total: selectedReadings.length });

    let success = 0;
    let failed = 0;

    for (const reading of selectedReadings) {
      try {
        const periodFrom = new Date(reading.readingDate);
        periodFrom.setDate(periodFrom.getDate() - 30);

        await createBill({
          user_id: reading.userId,
          meter_id: reading.meterId,
          ...(reading.locationId ? { location_id: reading.locationId } : {}),
          amount: amounts.get(reading.id) || 0,
          currency: 'BAM',
          period_from: periodFrom.toISOString(),
          period_to: new Date(reading.readingDate).toISOString(),
          due_date: dueDate.toISOString(),
          consumption: reading.consumption,
          notes: `Batch generisanje. Paket: ${PRICING_PACKAGES[pricingPackage].name}`,
        });
        success++;
      } catch {
        failed++;
      }
      setProgress(prev => ({ ...prev, done: prev.done + 1 }));
    }

    setIsGenerating(false);

    const message = failed === 0
      ? `Uspješno generisano ${success} računa.`
      : `Generisano ${success} računa. Neuspješno: ${failed}.`;

    if (Platform.OS === 'web') {
      alert(message);
      router.back();
    } else {
      Alert.alert(failed === 0 ? 'Uspješno' : 'Djelimičan uspjeh', message, [
        { text: 'OK', onPress: () => router.back() },
      ]);
    }
  };

  const formatDate = (ts: number) =>
    new Date(ts).toLocaleDateString('bs-BA', { day: '2-digit', month: '2-digit', year: 'numeric' });

  const formatDueDate = (d: Date) =>
    d.toLocaleDateString('bs-BA', { day: '2-digit', month: '2-digit', year: 'numeric' });

  return (
    <View style={styles.screen}>
      <Header
        title="Batch generisanje"
        showBack
        showMenu
        onLeftPress={() => router.back()}
        onMenuPress={() => setIsDrawerOpen(true)}
      />
      <Drawer isOpen={isDrawerOpen} onClose={() => setIsDrawerOpen(false)} />

      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>

        {/* Pricing package */}
        <Text style={styles.sectionTitle}>Cjenovni paket</Text>
        <View style={styles.packageRow}>
          {(Object.keys(PRICING_PACKAGES) as PricingPackageType[]).map(key => (
            <TouchableOpacity
              key={key}
              style={[styles.packageBtn, pricingPackage === key && styles.packageBtnActive]}
              onPress={() => setPricingPackage(key)}
            >
              <Text style={[styles.packageBtnText, pricingPackage === key && styles.packageBtnTextActive]}>
                {PRICING_PACKAGES[key].name}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Select all row */}
        {!isLoading && readings.length > 0 && (
          <TouchableOpacity style={styles.selectAllRow} onPress={toggleAll} activeOpacity={0.7}>
            {allSelected
              ? <CheckSquare size={20} color={Colors.primary} />
              : <Square size={20} color={Colors.textLight} />
            }
            <Text style={styles.selectAllText}>
              {allSelected ? 'Poništi sve' : 'Odaberi sve'}
            </Text>
            <View style={styles.countBadge}>
              <Text style={styles.countText}>{selectedIds.size} / {readings.length}</Text>
            </View>
          </TouchableOpacity>
        )}

        {/* Readings list */}
        {isLoading ? (
          <ActivityIndicator color={Colors.primary} style={{ marginVertical: 32 }} />
        ) : readings.length === 0 ? (
          <Card style={styles.emptyCard}>
            <Droplet size={32} color={Colors.disabled} />
            <Text style={styles.emptyText}>Nema verificiranih očitanja za fakturisanje</Text>
          </Card>
        ) : (
          readings.map(r => {
            const isSelected = selectedIds.has(r.id);
            const amount = amounts.get(r.id) || 0;
            return (
              <TouchableOpacity
                key={r.id}
                style={[styles.readingRow, isSelected && styles.readingRowSelected]}
                onPress={() => toggleOne(r.id)}
                activeOpacity={0.7}
              >
                <View style={styles.checkbox}>
                  {isSelected
                    ? <CheckSquare size={20} color={Colors.primary} />
                    : <Square size={20} color={Colors.disabled} />
                  }
                </View>
                <View style={styles.readingInfo}>
                  <View style={styles.readingTopRow}>
                    <Text style={styles.readingSerial}>{r.meterSerial}</Text>
                    <Text style={[styles.readingAmount, isSelected && { color: Colors.primary }]}>
                      {amount.toFixed(2)} KM
                    </Text>
                  </View>
                  {r.userName ? (
                    <View style={styles.readingMetaRow}>
                      <User size={12} color={Colors.textLight} />
                      <Text style={styles.readingMeta}>{r.userName}</Text>
                    </View>
                  ) : null}
                  <View style={styles.readingMetaRow}>
                    <Droplet size={12} color={Colors.textLight} />
                    <Text style={styles.readingMeta}>{r.consumption.toFixed(1)} m³</Text>
                    <Text style={styles.readingMetaSep}>·</Text>
                    <Calendar size={12} color={Colors.textLight} />
                    <Text style={styles.readingMeta}>{formatDate(r.readingDate)}</Text>
                  </View>
                </View>
              </TouchableOpacity>
            );
          })
        )}

        {/* Summary */}
        {selectedReadings.length > 0 && (
          <Card style={styles.summaryCard}>
            <View style={styles.summaryHeader}>
              <CreditCard size={16} color={Colors.primary} />
              <Text style={styles.summaryTitle}>Pregled batch generisanja</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Broj računa</Text>
              <Text style={styles.summaryValue}>{selectedReadings.length}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Cjenovni paket</Text>
              <Text style={styles.summaryValue}>{PRICING_PACKAGES[pricingPackage].name}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Rok plaćanja</Text>
              <Text style={styles.summaryValue}>{formatDueDate(dueDate)}</Text>
            </View>
            <View style={[styles.summaryRow, styles.summaryTotalRow]}>
              <Text style={styles.summaryTotalLabel}>Ukupan iznos</Text>
              <Text style={styles.summaryTotalAmount}>{totalAmount.toFixed(2)} KM</Text>
            </View>
          </Card>
        )}

        {/* Generate button */}
        {!isLoading && (
          isGenerating ? (
            <Card style={styles.progressCard}>
              <ActivityIndicator color={Colors.primary} />
              <Text style={styles.progressText}>
                Generisanje... ({progress.done}/{progress.total})
              </Text>
            </Card>
          ) : (
            <Button
              title={selectedReadings.length > 0
                ? `Generiši ${selectedReadings.length} računa`
                : 'Odaberi očitanja'}
              onPress={handleGenerate}
              disabled={selectedReadings.length === 0}
              style={styles.generateBtn}
            />
          )
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scroll: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 8,
  },
  packageRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  packageBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
  },
  packageBtnActive: {
    borderColor: Colors.primary,
    backgroundColor: '#f0f8ff',
  },
  packageBtnText: {
    fontSize: 13,
    color: Colors.textLight,
  },
  packageBtnTextActive: {
    color: Colors.primary,
    fontWeight: '600',
  },
  selectAllRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 4,
    marginBottom: 8,
    gap: 8,
  },
  selectAllText: {
    fontSize: 14,
    color: Colors.text,
    flex: 1,
    fontWeight: '500',
  },
  countBadge: {
    backgroundColor: Colors.primary,
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  countText: {
    fontSize: 11,
    color: '#fff',
    fontWeight: '600',
  },
  readingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 10,
    marginBottom: 8,
    backgroundColor: Colors.background,
  },
  readingRowSelected: {
    borderColor: Colors.primary,
    backgroundColor: '#f0f8ff',
  },
  checkbox: {
    marginRight: 10,
  },
  readingInfo: {
    flex: 1,
  },
  readingTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  readingSerial: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
  },
  readingAmount: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.textLight,
  },
  readingMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  readingMeta: {
    fontSize: 12,
    color: Colors.textLight,
  },
  readingMetaSep: {
    fontSize: 12,
    color: Colors.disabled,
  },
  emptyCard: {
    padding: 32,
    alignItems: 'center',
    gap: 10,
  },
  emptyText: {
    fontSize: 14,
    color: Colors.textLight,
    textAlign: 'center',
  },
  summaryCard: {
    padding: 16,
    marginTop: 16,
    marginBottom: 4,
  },
  summaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  summaryTitle: {
    fontSize: 14,
    fontWeight: '700',
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
    fontSize: 13,
    color: Colors.textLight,
  },
  summaryValue: {
    fontSize: 13,
    color: Colors.text,
    fontWeight: '500',
  },
  summaryTotalRow: {
    borderBottomWidth: 0,
    paddingTop: 10,
    marginTop: 4,
  },
  summaryTotalLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.text,
  },
  summaryTotalAmount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.primary,
  },
  progressCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    marginTop: 16,
    gap: 12,
  },
  progressText: {
    fontSize: 15,
    color: Colors.text,
    fontWeight: '500',
  },
  generateBtn: {
    marginTop: 16,
  },
});
