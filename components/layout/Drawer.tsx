import React from 'react';
import { 
  View, 
  StyleSheet, 
  Modal, 
  TouchableOpacity, 
  TouchableWithoutFeedback,
  Animated,
  Dimensions,
  Platform
} from 'react-native';
import { DrawerContent } from './DrawerContent';

interface DrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export const Drawer: React.FC<DrawerProps> = ({ isOpen, onClose }) => {
  const { width } = Dimensions.get('window');
  const drawerWidth = Math.min(width * 0.8, 300);
  
  const translateX = React.useRef(new Animated.Value(-drawerWidth)).current;
  const opacity = React.useRef(new Animated.Value(0)).current;
  
  React.useEffect(() => {
    if (isOpen) {
      Animated.parallel([
        Animated.timing(translateX, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(translateX, {
          toValue: -drawerWidth,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [isOpen, translateX, opacity, drawerWidth]);
  
  if (!isOpen && Platform.OS !== 'web') {
    return null;
  }
  
  return (
    <Modal
      visible={isOpen}
      transparent
      animationType="none"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        <TouchableWithoutFeedback onPress={onClose}>
          <Animated.View style={[styles.backdrop, { opacity }]} />
        </TouchableWithoutFeedback>
        
        <Animated.View 
          style={[
            styles.drawer, 
            { 
              width: drawerWidth,
              transform: [{ translateX }] 
            }
          ]}
        >
          <DrawerContent onClose={onClose} />
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'row',
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  drawer: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 2, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 5,
  },
});