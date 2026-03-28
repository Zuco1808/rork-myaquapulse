import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { CreditCard, Clock, AlertTriangle, CheckCircle } from 'lucide-react-native';
import { Card } from '../ui/Card';
import { StatusIndicator } from '../ui/StatusIndicator';
import Colors from '@/constants/colors';
import { Bill } from '@/types/location';

interface BillCardProps {
  bill: Bill;
  meterSerialNumber?: string;
}

export const BillCard: React.FC<BillCardProps> = ({
  bill,
  meterSerialNumber,
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
  
  const formatCurrency = (amount: number) => {
    return amount.toFixed(2) + ' KM';
  };
  
  const getDaysRemaining = () => {
    const now = new Date();
    const dueDate = new Date(bill.dueDate);
    const diffTime = dueDate.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };
  
  const daysRemaining = getDaysRemaining();
  const isOverdue = bill.status === 'overdue' || daysRemaining < 0;
  
  const handlePress = () => {
    router.push(`/bills/${bill.id}`);
  };
  
  return (
    <TouchableOpacity onPress={handlePress} activeOpacity={0.7}>
      <Card style={styles.card}>
        <View style={styles.header}>
          <View style={styles.iconContainer}>
            <CreditCard size={24} color={Colors.primary} />
          </View>
          <View style={styles.headerContent}>
            <Text style={styles.title}>
              Račun za {formatDate(bill.issueDate)}
            </Text>
            {meterSerialNumber && (
              <Text style={styles.meterNumber}>
                Vodomjer: {meterSerialNumber}
              </Text>
            )}
          </View>
          <StatusIndicator status={bill.status} />
        </View>
        
        <View style={styles.content}>
          <View style={styles.row}>
            <Text style={styles.label}>Iznos:</Text>
            <Text style={styles.amount}>{formatCurrency(bill.amount)}</Text>
          </View>
          
          <View style={styles.row}>
            <Text style={styles.label}>Potrošnja:</Text>
            <Text style={styles.value}>{bill.consumption} m³</Text>
          </View>
          
          <View style={styles.row}>
            <Text style={styles.label}>Rok plaćanja:</Text>
            <View style={styles.dueDateContainer}>
              <Text style={[
                styles.value,
                isOverdue && styles.overdue
              ]}>
                {formatDate(bill.dueDate)}
              </Text>
              {bill.status === 'pending' && (
                <View style={styles.daysContainer}>
                  <Clock size={14} color={isOverdue ? Colors.error : Colors.info} />
                  <Text style={[
                    styles.daysText,
                    isOverdue && styles.overdue
                  ]}>
                    {isOverdue 
                      ? `Kasni ${Math.abs(daysRemaining)} dana` 
                      : `Još ${daysRemaining} dana`}
                  </Text>
                </View>
              )}
            </View>
          </View>
          
          {bill.status === 'paid' && bill.paidDate && (
            <View style={styles.row}>
              <Text style={styles.label}>Plaćeno:</Text>
              <Text style={styles.value}>{formatDate(bill.paidDate)}</Text>
            </View>
          )}
        </View>
        
        {bill.status === 'paid' ? (
          <View style={styles.paidContainer}>
            <CheckCircle size={16} color={Colors.success} />
            <Text style={styles.paidText}>
              Račun je plaćen
            </Text>
          </View>
        ) : isOverdue ? (
          <View style={styles.overdueContainer}>
            <AlertTriangle size={16} color={Colors.error} />
            <Text style={styles.overdueText}>
              Prekoračen rok plaćanja
            </Text>
          </View>
        ) : null}
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
  title: {
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
    marginBottom: 12,
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
  amount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.primary,
  },
  dueDateContainer: {
    alignItems: 'flex-end',
  },
  daysContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  daysText: {
    fontSize: 12,
    color: Colors.info,
    marginLeft: 4,
  },
  overdue: {
    color: Colors.error,
  },
  overdueContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFEBEE',
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.error,
  },
  overdueText: {
    marginLeft: 8,
    fontSize: 14,
    color: Colors.error,
  },
  paidContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5E9',
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.success,
  },
  paidText: {
    marginLeft: 8,
    fontSize: 14,
    color: Colors.success,
  },
});