import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Colors from '@/constants/colors';

interface NotificationBadgeProps {
  count: number;
  size?: 'small' | 'medium' | 'large';
  maxCount?: number;
}

export const NotificationBadge: React.FC<NotificationBadgeProps> = ({
  count,
  size = 'medium',
  maxCount = 99,
}) => {
  if (count <= 0) return null;
  
  const displayCount = count > maxCount ? `${maxCount}+` : count.toString();
  
  const getBadgeSize = () => {
    switch (size) {
      case 'small': return styles.smallBadge;
      case 'large': return styles.largeBadge;
      default: return styles.mediumBadge;
    }
  };
  
  const getTextSize = () => {
    switch (size) {
      case 'small': return styles.smallText;
      case 'large': return styles.largeText;
      default: return styles.mediumText;
    }
  };
  
  return (
    <View style={[styles.badge, getBadgeSize()]}>
      <Text style={[styles.text, getTextSize()]}>{displayCount}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    backgroundColor: Colors.error,
    borderRadius: 100,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'absolute',
    top: -5,
    right: -5,
    zIndex: 1,
  },
  smallBadge: {
    minWidth: 16,
    height: 16,
    paddingHorizontal: 2,
  },
  mediumBadge: {
    minWidth: 20,
    height: 20,
    paddingHorizontal: 4,
  },
  largeBadge: {
    minWidth: 24,
    height: 24,
    paddingHorizontal: 6,
  },
  text: {
    color: '#fff',
    fontWeight: 'bold',
  },
  smallText: {
    fontSize: 8,
  },
  mediumText: {
    fontSize: 10,
  },
  largeText: {
    fontSize: 12,
  },
});