import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  Alert,
} from 'react-native';
import { X, Calendar, Check } from 'lucide-react-native';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { DatePickerSheet } from '@/components/ui/DatePickerSheet';
import {
  createPayment,
  PaymentMethod,
  PAYMENT_METHOD_LABEL,
} from '@/lib/api/payments';
import { captureError } from '@/lib/sentry';
import Colors from '@/constants/colors';

interface Props {
  visible: boolean;
  invoiceId: string;
  utilityId: string;
  /** Preostali iznos za uplatu (predlaže se kao default). */
  remaining: number;
  onClose: () => void;
  onSuccess: () => void;
}

const METHODS: PaymentMethod[] = ['bank_transfer', 'cash', 'e_banking', 'card', 'other'];

const toISODate = (d: Date) => d.toISOString().split('T')[0];

export function PaymentModal({
  visible,
  invoiceId,
  utilityId,
  remaining,
  onClose,
  onSuccess,
}: Props) {
  const [amount, setAmount]       = useState(remaining > 0 ? remaining.toFixed(2) : '');
  const [method, setMethod]       = useState<PaymentMethod>('bank_transfer');
  const [reference, setReference] = useState('');
  const [note, setNote]           = useState('');
  const [date, setDate]           = useState(new Date());
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [saving, setSaving]       = useState(false);

  // Resetuj kad se modal otvori
  React.useEffect(() => {
    if (visible) {
      setAmount(remaining > 0 ? remaining.toFixed(2) : '');
      setMethod('bank_transfer');
      setReference('');
      setNote('');
      setDate(new Date());
    }
  }, [visible, remaining]);

  const handleSave = async () => {
    const value = parseFloat(amount.replace(',', '.'));
    if (!value || value <= 0) {
      Alert.alert('Greška', 'Unesite ispravan iznos veći od nule.');
      return;
    }
    setSaving(true);
    try {
      await createPayment({
        invoice_id:       invoiceId,
        utility_id:       utilityId,
        amount:           value,
        method,
        reference_number: reference.trim() || undefined,
        payment_date:     toISODate(date),
        note:             note.trim() || undefined,
      });
      onSuccess();
      onClose();
    } catch (e: any) {
      captureError(e, { screen: 'payment-modal', action: 'createPayment' });
      Alert.alert('Greška', e?.message || 'Evidentiranje uplate nije uspjelo.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={styles.safe}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.iconBtn}>
            <X size={24} color={Colors.text} />
          </TouchableOpacity>
          <Text style={styles.title}>Evidentiraj uplatu</Text>
          <View style={styles.iconBtn} />
        </View>

        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Input
            label="Iznos (BAM)"
            value={amount}
            onChangeText={setAmount}
            keyboardType="decimal-pad"
            placeholder="0.00"
          />

          <Text style={styles.fieldLabel}>Način plaćanja</Text>
          <View style={styles.methodRow}>
            {METHODS.map((m) => {
              const active = method === m;
              return (
                <TouchableOpacity
                  key={m}
                  style={[styles.methodChip, active && styles.methodChipActive]}
                  onPress={() => setMethod(m)}
                  activeOpacity={0.8}
                >
                  {active && <Check size={14} color="#fff" />}
                  <Text style={[styles.methodText, active && styles.methodTextActive]}>
                    {PAYMENT_METHOD_LABEL[m]}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <Text style={[styles.fieldLabel, { marginTop: 16 }]}>Datum uplate</Text>
          <TouchableOpacity style={styles.dateField} onPress={() => setDatePickerOpen(true)}>
            <Calendar size={18} color={Colors.primary} />
            <Text style={styles.dateText}>{date.toLocaleDateString('bs-BA')}</Text>
          </TouchableOpacity>

          <Input
            label="Referenca / Poziv na broj"
            value={reference}
            onChangeText={setReference}
            placeholder="npr. 1234567890"
            containerStyle={{ marginTop: 16 }}
          />

          <Input
            label="Napomena (opcionalno)"
            value={note}
            onChangeText={setNote}
            placeholder="Dodatne informacije"
            multiline
          />

          <Button
            title="Spremi uplatu"
            onPress={handleSave}
            isLoading={saving}
            style={{ marginTop: 8 }}
          />
        </ScrollView>

        <DatePickerSheet
          visible={datePickerOpen}
          value={date}
          maximumDate={new Date()}
          onChange={setDate}
          onClose={() => setDatePickerOpen(false)}
        />
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safe:    { flex: 1, backgroundColor: '#f4f6f9' },
  header:  {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 14,
    backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  iconBtn: { width: 32, alignItems: 'center' },
  title:   { fontSize: 17, fontWeight: 'bold', color: Colors.text },
  content: { padding: 16, paddingBottom: 40 },

  fieldLabel: { fontSize: 14, fontWeight: '500', color: Colors.text, marginBottom: 8 },

  methodRow:  { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  methodChip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 14, paddingVertical: 9,
    borderRadius: 20, borderWidth: 1, borderColor: Colors.border,
    backgroundColor: '#fff',
  },
  methodChipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  methodText:       { fontSize: 13, color: Colors.text },
  methodTextActive: { color: '#fff', fontWeight: '600' },

  dateField: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    borderWidth: 1, borderColor: Colors.border, borderRadius: 8,
    backgroundColor: '#fff', paddingVertical: 12, paddingHorizontal: 16,
  },
  dateText: { fontSize: 14, color: Colors.text },
});
