import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Edit2, Trash2, Package } from 'lucide-react-native';
import { Card } from '@/components/ui/Card';
import Colors from '@/constants/colors';

export type PricingPackage = {
  id: string;
  name: string;
  description: string;
  isDefault: boolean;
  periodIds: string[];
  userGroupIds: string[];
};

type PackageCardProps = {
  package: PricingPackage;
  onEdit?: (pkg: PricingPackage) => void;
  onDelete?: (packageId: string) => void;
  onPress?: (pkg: PricingPackage) => void;
};

export const PackageCard = ({
  package: pkg,
  onEdit,
  onDelete,
  onPress,
}: PackageCardProps) => {
  const { id, name, description, isDefault } = pkg;
  
  const handlePress = () => {
    if (onPress) {
      onPress(pkg);
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
            <Package size={20} color={Colors.primary} style={styles.icon} />
            <Text style={styles.title}>{name}</Text>
            {isDefault && <View style={styles.defaultBadge}><Text style={styles.defaultBadgeText}>Osnovni</Text></View>}
          </View>
          <View style={styles.actions}>
            {onEdit && (
              <TouchableOpacity 
                onPress={() => onEdit(pkg)}
                style={styles.actionButton}
                activeOpacity={0.7}
              >
                <Edit2 size={18} color={Colors.primary} />
              </TouchableOpacity>
            )}
            {onDelete && !isDefault && (
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
  icon: {
    marginRight: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.text,
    marginRight: 8,
  },
  defaultBadge: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  defaultBadgeText: {
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
  },
});