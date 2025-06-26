import React from 'react';
import { View, Text, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import Colors from '@/constants/colors';

export interface BadgeProps {
  label: string;
  color?: string;
  size?: 'small' | 'medium' | 'large';
  style?: ViewStyle;
  textStyle?: TextStyle;
}

export const Badge: React.FC<BadgeProps> = ({
  label,
  color = Colors.primary,
  size = 'small',
  style,
  textStyle,
}) => {
  const sizeStyles = {
    small: {
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: 12,
      fontSize: 10,
    },
    medium: {
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 14,
      fontSize: 12,
    },
    large: {
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 16,
      fontSize: 14,
    },
  };

  return (
    <View
      style={[
        styles.badge,
        { backgroundColor: color + '20' }, // 20% opacity
        sizeStyles[size],
        style,
      ]}
    >
      <Text
        style={[
          styles.text,
          { color, fontSize: sizeStyles[size].fontSize },
          textStyle,
        ]}
      >
        {label}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
  },
  text: {
    fontWeight: '600',
  },
});