import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Edit2, Trash2 } from 'lucide-react-native';
import { Card } from '@/components/ui/Card';
import Colors from '@/constants/colors';

export type PricingTier = {
  id: string;
  minConsumption: number;
  maxConsumption: number | null;
  pricePerUnit: number;
  description: string;
};

type PricingTierCardProps = {
  tier: PricingTier;
  currency?: string;
  onEdit?: (tier: PricingTier) => void;
  onDelete?: (tierId: string) => void;
  isLast?: boolean;
};

export const PricingTierCard = ({
  tier,
  currency = 'KM',
  onEdit,
  onDelete,
  isLast = false,
}: PricingTierCardProps) => {
  const { id, minConsumption, maxConsumption, pricePerUnit, description } = tier;
  
  const consumptionRange = maxConsumption 
    ? `${minConsumption} - ${maxConsumption} m³`
    : `> ${minConsumption} m³`;
  
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.rangeContainer}>
          <Text style={styles.rangeLabel}>Potrošnja:</Text>
          <Text style={styles.rangeValue}>{consumptionRange}</Text>
        </View>
        <View style={styles.actions}>
          {onEdit && (
            <TouchableOpacity 
              onPress={() => onEdit(tier)}
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
      
      <View style={styles.content}>
        <View style={styles.priceContainer}>
          <Text style={styles.price}>{pricePerUnit.toFixed(2)}</Text>
          <Text style={styles.currency}>{currency}/m³</Text>
        </View>
        
        <Text style={styles.description}>{description}</Text>
      </View>
      
      {!isLast && <View style={styles.divider} />}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  rangeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rangeLabel: {
    fontSize: 14,
    color: Colors.textLight,
    marginRight: 4,
  },
  rangeValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: Colors.text,
  },
  actions: {
    flexDirection: 'row',
  },
  actionButton: {
    padding: 4,
    marginLeft: 8,
  },
  content: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  price: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.primary,
  },
  currency: {
    fontSize: 14,
    color: Colors.textLight,
    marginLeft: 4,
  },
  description: {
    fontSize: 14,
    color: Colors.text,
    flex: 1,
    textAlign: 'right',
  },
  divider: {
    height: 1,
    backgroundColor: Colors.border,
    marginTop: 16,
  },
});