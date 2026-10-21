import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS, SPACING } from '../constants/theme';

interface PointsProgressBarProps {
  current: number;
  total: number;
  percent: number;
  label?: string;
  unit?: string;
  subtitle?: string;
}

export const PointsProgressBar: React.FC<PointsProgressBarProps> = ({
  current,
  total,
  percent,
  label,
  unit = '₹',
  subtitle,
}) => {
  const safePercent = Math.min(100, Math.max(0, percent));

  const formatValue = (val: number) => {
    return new Intl.NumberFormat('en-IN').format(val);
  };

  return (
    <View style={styles.container}>
      {label && (
        <View style={styles.labelRow}>
          <Text style={styles.label}>{label}</Text>
          <Text style={styles.progressText}>
            {unit}
            {formatValue(current)} / {unit}
            {formatValue(total)} ({safePercent.toFixed(0)}%)
          </Text>
        </View>
      )}

      <View style={styles.track}>
        <View style={[styles.fill, { width: `${safePercent}%` }]} />
      </View>

      {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: SPACING.xs,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 6,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.text,
  },
  progressText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.goldDark,
  },
  track: {
    height: 8,
    backgroundColor: '#EAE6DF',
    borderRadius: 4,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    backgroundColor: COLORS.gold,
    borderRadius: 4,
  },
  subtitle: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
});
