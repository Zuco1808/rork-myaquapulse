import React from 'react';
import { Modal, View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import Colors from '@/constants/colors';

interface Props {
  visible: boolean;
  value: Date;
  minimumDate?: Date;
  maximumDate?: Date;
  onChange: (date: Date) => void;
  onClose: () => void;
}

// Cast to bypass JSX type check for raw HTML element in React Native Web
const HtmlInput = 'input' as any;

const toISO = (d: Date): string => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

export function DatePickerSheet({ visible, value, minimumDate, maximumDate, onChange, onClose }: Props) {
  const handleChange = (e: any) => {
    const val: string = e?.target?.value;
    if (!val) return;
    const [y, m, d] = val.split('-').map(Number);
    const date = new Date(y, m - 1, d, 12, 0, 0); // local noon avoids UTC offset issues
    if (!isNaN(date.getTime())) onChange(date);
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose} />
        <View style={styles.sheet}>
          <HtmlInput
            type="date"
            value={toISO(value)}
            min={minimumDate ? toISO(minimumDate) : undefined}
            max={maximumDate ? toISO(maximumDate) : undefined}
            onChange={handleChange}
            style={{
              fontSize: 16,
              padding: '14px 16px',
              border: 'none',
              outline: 'none',
              width: '100%',
              boxSizing: 'border-box',
              color: '#1a1a2e',
              cursor: 'pointer',
              fontFamily: 'inherit',
              backgroundColor: 'transparent',
            }}
          />
          <TouchableOpacity style={styles.done} onPress={onClose}>
            <Text style={styles.doneText}>Gotovo</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay:  { flex: 1, justifyContent: 'flex-end' },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' },
  sheet:    { backgroundColor: '#fff', paddingBottom: 24, paddingTop: 8 },
  done: {
    alignItems: 'center', paddingVertical: 12,
    marginHorizontal: 16, marginTop: 4,
    borderRadius: 8, backgroundColor: Colors.highlight,
  },
  doneText: { fontSize: 14, fontWeight: '600', color: Colors.primary },
});
