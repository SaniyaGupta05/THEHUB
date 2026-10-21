import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS, SPACING } from '../constants/theme';

interface DemoBadgeProps {
  label?: string;
}

export const DemoBadge: React.FC<DemoBadgeProps> = ({ label = 'DEMO PROTOTYPE' }) => {
  return (
    <View style={styles.badge}>
      <View style={styles.dot} />
      <Text style={styles.text}>{label} - SIMULATED SERVICES</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E1E1E',
    paddingVertical: 5,
    paddingHorizontal: 10,
    justifyContent: 'center',
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.gold,
    marginRight: 6,
  },
  text: {
    color: '#DDD',
    fontSize: 10,
    letterSpacing: 0.8,
    fontWeight: '600',
  },
});
