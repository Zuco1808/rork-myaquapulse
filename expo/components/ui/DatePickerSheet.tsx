import React from 'react';
import { Modal, View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import Colors from '@/constants/colors';

interface Props {
  visible: boolean;
  value: Date;
  minimumDate?: Date;
  maximumDate?: Date;
  onChange: (date: Date) => void;
  onClose: () => void;
}

/**
 * Wraps DateTimePicker in its own Modal so its scroll gestures
 * don't conflict with any parent ScrollView (common Android issue).
 */
export function DatePickerSheet({ visible, value, minimumDate, maximumDate, onChange, onClose }: Props) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose} />
        <View style={styles.sheet}>
          <DateTimePicker
            value={value}
            mode="date"
            display="spinner"
            minimumDate={minimumDate}
            maximumDate={maximumDate}
            onChange={(_, date) => { if (date) onChange(date); }}
            style={{ width: '100%' }}
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
  sheet:    { backgroundColor: '#fff', paddingBottom: 24 },
  done: {
    alignItems: 'center', paddingVertical: 12,
    marginHorizontal: 16, marginTop: 4,
    borderRadius: 8, backgroundColor: Colors.highlight,
  },
  doneText: { fontSize: 14, fontWeight: '600', color: Colors.primary },
});
