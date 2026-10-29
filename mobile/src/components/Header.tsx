import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useCart } from '../context/CartContext';

interface HeaderProps {
  onSearchPress?: () => void;
  onCartPress?: () => void;
  onHubklubPress?: () => void;
  onOnboardingPress?: () => void;
  title?: string;
  showBack?: boolean;
  onBackPress?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  onSearchPress,
  onCartPress,
  onHubklubPress,
  onOnboardingPress,
  title,
  showBack = false,
  onBackPress,
}) => {
  const { itemCount } = useCart();

  return (
    <View style={styles.container}>
      <View style={styles.leftContainer}>
        {showBack ? (
          <TouchableOpacity onPress={onBackPress} style={styles.iconButton}>
            <Ionicons name="arrow-back" size={24} color="#111111" />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={styles.brandContainer}
            onPress={onOnboardingPress}
            activeOpacity={0.8}
            accessibilityLabel="THE HUB Logo"
          >
            <Image
              source={require('../../assets/the_hub_logo.png')}
              style={styles.brandLogo}
              resizeMode="contain"
            />
          </TouchableOpacity>
        )}
        {title && showBack && <Text style={styles.headerTitle}>{title}</Text>}
      </View>

      <View style={styles.rightContainer}>
        {/* Onboarding preview icon */}
        {onOnboardingPress && (
          <TouchableOpacity onPress={onOnboardingPress} style={styles.iconButton}>
            <Ionicons name="sparkles-outline" size={20} color="#8E8E93" />
          </TouchableOpacity>
        )}

        {/* Shopping bag button matching Screen 3 */}
        {onCartPress && (
          <TouchableOpacity onPress={onCartPress} style={styles.iconButton}>
            <Ionicons name="bag-handle-outline" size={24} color="#111111" />
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{itemCount}</Text>
            </View>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F2F2F2',
  },
  leftContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  brandContainer: {
    paddingVertical: 2,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  brandLogo: {
    width: 98,
    height: 32,
  },
  brandTitle: {
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: 3,
    color: '#111111',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111111',
    marginLeft: 8,
  },
  rightContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconButton: {
    padding: 6,
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: '#111111',
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 3,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '700',
  },
});
