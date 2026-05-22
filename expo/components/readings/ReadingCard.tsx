import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { FileText, AlertTriangle } from 'lucide-react-native';
import { Card } from '../ui/Card';
import { StatusIndicator } from '../ui/StatusIndicator';
import Colors from '@/constants/colors';
import { Reading } from '@/types/location';

interface ReadingCardProps {
  reading: Reading;
  showMeterInfo?: boolean;
  meterSerialNumber?: string;
  onEdit?: () => void;
  onVerify?: () => void;
  onReject?: () => void;
}

export const ReadingCard: React.FC<ReadingCardProps> = ({
  reading,
  showMeterInfo = false,
  meterSerialNumber,
  onEdit,
  onVerify,
  onReject
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
  
  const getReadMethodLabel = (method: string | undefined) => {
    switch (method) {
      case 'manual': return 'Ručno';
      case 'ocr': return 'OCR';
      case 'end_user': return 'Korisnik';
      default: return method || 'Nepoznato';
    }
  };
  
  const handlePress = () => {
    router.push(`/readings/${reading.id}` as any);
  };
  
  const hasAnomaly = reading.consumption && reading.previousValue 
    ? reading.consumption > reading.previousValue * 1.3 
    : false;
  
  return (
    <TouchableOpacity onPress={handlePress} activeOpacity={0.7}>
      <Card style={styles.card}>
        <View style={styles.header}>
          <View style={styles.iconContainer}>
            <FileText size={24} color={Colors.primary} />
          </View>
          <View style={styles.headerContent}>
            <Text style={styles.date}>
              {formatDate(reading.readingDate)}
            </Text>
            {showMeterInfo && meterSerialNumber && (
              <Text style={styles.meterNumber}>
                Vodomjer: {meterSerialNumber}
              </Text>
            )}
          </View>
          <StatusIndicator status={reading.status as any} />
        </View>
        
        <View style={styles.content}>
          <View style={styles.row}>
            <Text style={styles.label}>Stanje:</Text>
            <Text style={styles.value}>{reading.value} m³</Text>
          </View>
          
          {reading.previousValue !== undefined && (
            <View style={styles.row}>
              <Text style={styles.label}>Prethodno:</Text>
              <Text style={styles.value}>{reading.previousValue} m³</Text>
            </View>
          )}
          
          {reading.consumption !== undefined && (
            <View style={styles.row}>
              <Text style={styles.label}>Potrošnja:</Text>
              <View style={styles.consumptionContainer}>
                <Text style={styles.value}>{reading.consumption} m³</Text>
                {hasAnomaly && (
                  <View style={styles.warningIcon}>
                    <AlertTriangle size={16} color={Colors.warning} />
                  </View>
                )}
              </View>
            </View>
          )}
          
          <View style={styles.row}>
            <Text style={styles.label}>Način očitanja:</Text>
            <Text style={styles.value}>{getReadMethodLabel(reading.readMethod)}</Text>
          </View>
        </View>
        
        {hasAnomaly && (
          <View style={styles.anomalyContainer}>
            <AlertTriangle size={16} color={Colors.warning} />
            <Text style={styles.anomalyText}>
              Neuobičajena potrošnja (+30% od prosjeka)
            </Text>
          </View>
        )}
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
  date: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.text,
  },
  meterNumber: {
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
  consumptionContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  warningIcon: {
    marginLeft: 6,
  },
  anomalyContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF8E1',
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.warning,
  },
  anomalyText: {
    marginLeft: 8,
    fontSize: 14,
    color: Colors.warning,
  },
});