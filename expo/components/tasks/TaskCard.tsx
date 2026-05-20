import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { ClipboardList, Clock, AlertTriangle } from 'lucide-react-native';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import Colors from '@/constants/colors';
import { Task } from '@/mocks/tasks';

interface TaskCardProps {
  task: Task;
}

export const TaskCard: React.FC<TaskCardProps> = ({ task }) => {
  const router = useRouter();
  
  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString('bs-BA', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };
  
  const getStatusBadge = () => {
    switch (task.status) {
      case 'pending':
        return <Badge label="Na čekanju" variant="info" />;
      case 'in_progress':
        return <Badge label="U toku" variant="primary" />;
      case 'completed':
        return <Badge label="Završeno" variant="success" />;
      case 'cancelled':
        return <Badge label="Otkazano" variant="error" />;
      default:
        return null;
    }
  };
  
  const getPriorityBadge = () => {
    switch (task.priority) {
      case 'low':
        return <Badge label="Nizak" variant="info" />;
      case 'medium':
        return <Badge label="Srednji" variant="primary" />;
      case 'high':
        return <Badge label="Visok" variant="warning" />;
      case 'urgent':
        return <Badge label="Hitno" variant="error" />;
      default:
        return null;
    }
  };
  
  const isOverdue = task.status !== 'completed' && task.status !== 'cancelled' && 
    task.dueDate < Date.now();
  
  const handlePress = () => {
    router.push(`/tasks/${task.id}` as any);
  };
  
  return (
    <TouchableOpacity onPress={handlePress} activeOpacity={0.7}>
      <Card style={styles.card}>
        <View style={styles.header}>
          <View style={styles.iconContainer}>
            <ClipboardList size={24} color={Colors.primary} />
          </View>
          <View style={styles.headerContent}>
            <Text style={styles.title} numberOfLines={1}>
              {task.title}
            </Text>
          </View>
        </View>
        
        <View style={styles.content}>
          <Text style={styles.description} numberOfLines={2}>
            {task.description}
          </Text>
          
          <View style={styles.metaContainer}>
            <View style={styles.badgeContainer}>
              {getStatusBadge()}
              {getPriorityBadge()}
            </View>
            
            <View style={styles.dateContainer}>
              <Clock size={16} color={isOverdue ? Colors.error : Colors.textLight} />
              <Text 
                style={[
                  styles.dueDate,
                  isOverdue && styles.overdue
                ]}
              >
                Rok: {formatDate(task.dueDate)}
              </Text>
            </View>
          </View>
          
          {task.meterIds && (
            <View style={styles.metersContainer}>
              <Text style={styles.metersLabel}>
                Broj vodomjera: {task.meterIds.length}
              </Text>
            </View>
          )}
        </View>
        
        {isOverdue && (
          <View style={styles.overdueContainer}>
            <AlertTriangle size={16} color={Colors.error} />
            <Text style={styles.overdueText}>
              Prekoračen rok izvršenja
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
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.text,
  },
  content: {
    padding: 16,
  },
  description: {
    fontSize: 14,
    color: Colors.text,
    marginBottom: 16,
  },
  metaContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  badgeContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  dateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dueDate: {
    fontSize: 14,
    color: Colors.textLight,
    marginLeft: 6,
  },
  overdue: {
    color: Colors.error,
  },
  metersContainer: {
    marginTop: 8,
  },
  metersLabel: {
    fontSize: 14,
    color: Colors.text,
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
});