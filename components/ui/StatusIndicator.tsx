import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Colors from '@/constants/colors';

interface StatusIndicatorProps {
  status: 'active' | 'inactive' | 'pending' | 'completed' | 'paid' | 'overdue' | 'maintenance' | 'verified' | 'flagged' | 'rejected';
  labels?: Record<string, string>;
  size?: 'small' | 'medium' | 'large';
}

export const StatusIndicator: React.FC<StatusIndicatorProps> = ({ 
  status, 
  labels = {
    active: 'Aktivan',
    inactive: 'Neaktivan',
    pending: 'Na čekanju',
    completed: 'Završeno',
    paid: 'Plaćeno',
    overdue: 'Prekoračeno',
    maintenance: 'Održavanje',
    verified: 'Potvrđeno',
    flagged: 'Označeno',
    rejected: 'Odbijeno'
  },
  size = 'medium'
}) => {
  const getStatusColor = () => {
    switch (status) {
      case 'active':
      case 'verified':
      case 'paid':
      case 'completed':
        return Colors.success;
      case 'pending':
        return Colors.warning;
      case 'inactive':
      case 'overdue':
      case 'flagged':
      case 'rejected':
        return Colors.error;
      case 'maintenance':
        return Colors.info;
      default:
        return Colors.textLight;
    }
  };
  
  const getSizeStyles = () => {
    switch (size) {
      case 'small':
        return {
          container: styles.containerSmall,
          text: styles.textSmall
        };
      case 'large':
        return {
          container: styles.containerLarge,
          text: styles.textLarge
        };
      default:
        return {
          container: styles.containerMedium,
          text: styles.textMedium
        };
    }
  };
  
  const sizeStyles = getSizeStyles();
  const statusColor = getStatusColor();
  const label = labels[status] || status;
  
  return (
    <View style={[styles.container, sizeStyles.container, { backgroundColor: statusColor }]}>
      <Text style={[styles.text, sizeStyles.text]}>{label}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  containerSmall: {
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  containerMedium: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  containerLarge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  text: {
    color: '#fff',
    fontWeight: '500',
  },
  textSmall: {
    fontSize: 10,
  },
  textMedium: {
    fontSize: 12,
  },
  textLarge: {
    fontSize: 14,
  },
});