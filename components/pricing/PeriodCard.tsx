import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Edit2, Trash2, Calendar } from 'lucide-react-native';
import { Card } from '@/components/ui/Card';
import Colors from '@/constants/colors';

export type PricingPeriod = {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  description: string;
  isActive: boolean;
};

type PeriodCardProps = {
  period: PricingPeriod;
  onEdit?: (period: PricingPeriod) => void;
  onDelete?: (periodId: string) => void;
  onPress?: (period: PricingPeriod) => void;
};

export const PeriodCard = ({
  period,
  onEdit,
  onDelete,
  onPress,
}: PeriodCardProps) => {
  const { id, name, startDate, endDate, description, isActive } = period;
  
  const handlePress = () => {
    if (onPress) {
      onPress(period);
    }
  };
  
  return (
    <TouchableOpacity 
      onPress={handlePress}
      activeOpacity={onPress ? 0.7 : 1}
    >
      <Card style={styles.container}>
        <View style={styles.header}>
          <View style={styles.titleContainer}>
            <Text style={styles.title}>{name}</Text>
            {isActive && <View style={styles.activeBadge}><Text style={styles.activeBadgeText}>Aktivan</Text></View>}
          </View>
          <View style={styles.actions}>
            {onEdit && (
              <TouchableOpacity 
                onPress={() => onEdit(period)}
                style={styles.actionButton}
                activeOpacity={0.7}
              >
                <Edit2 size={18} color={Colors.primary} />
              </TouchableOpacity>
            )}
            {onDelete && (
              <TouchableOpacity 
                onPress={() => onDelete(id)}
                style={styles.actionButton}
                activeOpacity={0.7}
              >
                <Trash2 size={18} color={Colors.error} />
              </TouchableOpacity>
            )}
          </View>
        </View>
        
        <Text style={styles.description}>{description}</Text>
        
        <View style={styles.dateContainer}>
          <Calendar size={16} color={Colors.textLight} />
          <Text style={styles.dateText}>{startDate} - {endDate}</Text>
        </View>
      </Card>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.text,
    marginRight: 8,
  },
  activeBadge: {
    backgroundColor: Colors.success,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  activeBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '500',
  },
  actions: {
    flexDirection: 'row',
  },
  actionButton: {
    padding: 4,
    marginLeft: 8,
  },
  description: {
    fontSize: 14,
    color: Colors.text,
    marginBottom: 12,
  },
  dateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dateText: {
    fontSize: 14,
    color: Colors.textLight,
    marginLeft: 8,
  },
});