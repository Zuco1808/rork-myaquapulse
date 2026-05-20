import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { Droplet } from 'lucide-react-native';
import { Card } from '../ui/Card';
import { StatusIndicator } from '../ui/StatusIndicator';
import Colors from '@/constants/colors';
import { WaterMeter } from '@/types/location';

interface MeterCardProps {
  meter: WaterMeter;
  showLocation?: boolean;
  locationName?: string;
}

export const MeterCard: React.FC<MeterCardProps> = ({
  meter,
  showLocation = false,
  locationName,
}) => {
  const router = useRouter();
  
  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString('bs-BA', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };
  
  const handlePress = () => {
    router.push(`/meters/${meter.id}` as any);
  };
  
  return (
    <TouchableOpacity onPress={handlePress} activeOpacity={0.7}>
      <Card style={styles.card}>
        <View style={styles.header}>
          <View style={styles.iconContainer}>
            <Droplet size={24} color={Colors.primary} />
          </View>
          <View style={styles.headerContent}>
            <Text style={styles.serialNumber}>
              {meter.serialNumber}
            </Text>
            {showLocation && locationName && (
              <Text style={styles.location}>
                Lokacija: {locationName}
              </Text>
            )}
          </View>
          <StatusIndicator status={meter.status} />
        </View>
        
        <View style={styles.content}>
          <View style={styles.row}>
            <Text style={styles.label}>Tip:</Text>
            <Text style={styles.value}>
              {meter.type === 'analog' ? 'Analogni' : 'Digitalni'}
            </Text>
          </View>
          
          <View style={styles.row}>
            <Text style={styles.label}>Datum instalacije:</Text>
            <Text style={styles.value}>{formatDate(meter.installDate)}</Text>
          </View>
          
          {meter.lastReading && (
            <>
              <View style={styles.row}>
                <Text style={styles.label}>Zadnje očitanje:</Text>
                <Text style={styles.value}>{meter.lastReading.value} m³</Text>
              </View>
              
              <View style={styles.row}>
                <Text style={styles.label}>Datum očitanja:</Text>
                <Text style={styles.value}>
                  {formatDate(meter.lastReading.readingDate)}
                </Text>
              </View>
            </>
          )}
        </View>
      </Card>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    padding: 0,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    backgroundColor: Colors.highlight,
  },
  iconContainer: {
    marginRight: 12,
  },
  headerContent: {
    flex: 1,
  },
  serialNumber: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.text,
  },
  location: {
    fontSize: 14,
    color: Colors.textLight,
    marginTop: 2,
  },
  content: {
    padding: 16,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  label: {
    fontSize: 14,
    color: Colors.textLight,
  },
  value: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.text,
  },
});