import React, { useEffect, useRef } from 'react';
import { Animated, Text, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { WifiOff } from 'lucide-react-native';
import NetInfo from '@react-native-community/netinfo';

const BANNER_H = 36;

export function OfflineBanner() {
  const insets = useSafeAreaInsets();
  const slideAnim = useRef(new Animated.Value(-BANNER_H)).current;
  const isShownRef = useRef(false);

  useEffect(() => {
    return NetInfo.addEventListener((state) => {
      const offline = state.isConnected === false;
      if (offline === isShownRef.current) return;
      isShownRef.current = offline;
      Animated.timing(slideAnim, {
        toValue: offline ? 0 : -BANNER_H,
        duration: 280,
        useNativeDriver: true,
      }).start();
    });
  }, []);

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.banner,
        { top: insets.top, transform: [{ translateY: slideAnim }] },
      ]}
    >
      <WifiOff size={13} color="#fff" />
      <Text style={styles.text}>Nema internetske veze</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  banner: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: BANNER_H,
    backgroundColor: '#E53E3E',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    zIndex: 9999,
    elevation: 9999,
  },
  text: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
});
