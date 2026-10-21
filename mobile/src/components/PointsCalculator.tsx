import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, SHADOWS } from '../constants/theme';
import { apiClient } from '../api/client';
import { PointsCalculationResult } from '../types';

interface PointsCalculatorProps {
  onPointsCredited?: () => void;
  isMember?: boolean;
}

const PRESET_AMOUNTS = [1000, 5000, 15000, 25000, 60000, 100000];

export const PointsCalculator: React.FC<PointsCalculatorProps> = ({
  onPointsCredited,
  isMember = true,
}) => {
  const [amountStr, setAmountStr] = useState('25000');
  const [calculation, setCalculation] = useState<PointsCalculationResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isCrediting, setIsCrediting] = useState(false);
  const [creditSuccessMsg, setCreditSuccessMsg] = useState<string | null>(null);

  const amount = parseFloat(amountStr) || 0;

  useEffect(() => {
    let active = true;

    async function recalculate() {
      if (amount <= 0) {
        setCalculation(null);
        return;
      }
      setIsLoading(true);
      try {
        const res = await apiClient.calculatePoints(amount);
        if (active) {
          setCalculation(res);
        }
      } catch (err) {
        // Local calculation fallback
        let rate = 0.03;
        let slab = 'Up to ₹20,000 (3% Back)';
        if (amount > 50000) {
          rate = 0.06;
          slab = '₹50,001+ (6% Back)';
        } else if (amount > 20000) {
          rate = 0.05;
          slab = '₹20,001 to ₹50,000 (5% Back)';
        }
        const base = Math.round(amount * rate);
        const bonus = amount >= 100000 ? Math.round(base * 0.2) : 0;
        if (active) {
          setCalculation({
            amount,
            rate_percent: rate * 100,
            slab_name: slab,
            base_points: base,
            rupee_equivalent: base,
            annual_spend_before: 0,
            annual_spend_after: amount,
            annual_threshold: 100000,
            bonus_achieved: amount >= 100000,
            bonus_points: bonus,
            total_points: base + bonus,
            total_rupee_value: base + bonus,
            is_demo: true,
          });
        }
      } finally {
        if (active) setIsLoading(false);
      }
    }

    const timer = setTimeout(recalculate, 200);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [amount]);

  const handleSimulateCredit = async () => {
    if (amount <= 0 || !calculation) return;
    setIsCrediting(true);
    setCreditSuccessMsg(null);
    try {
      const res = await apiClient.simulateCreditPoints(amount);
      setCreditSuccessMsg(`Successfully credited +${res.credited_points || calculation.total_points} HUBKLUB Points!`);
      if (onPointsCredited) {
        onPointsCredited();
      }
    } catch (err: any) {
      Alert.alert('Simulation Error', err.message || 'Failed to simulate points credit.');
    } finally {
      setIsCrediting(false);
    }
  };

  return (
    <View style={styles.card}>
      {/* Header */}
      <View style={styles.headerRow}>
        <View style={styles.iconCircle}>
          <Ionicons name="calculator-outline" size={20} color={COLORS.gold} />
        </View>
        <View style={{ flex: 1 }}>
          <View style={styles.titleBadgeRow}>
            <Text style={styles.title}>POINT COUNT CALCULATOR</Text>
            <View style={styles.liveBadge}>
              <Text style={styles.liveBadgeText}>INTERACTIVE</Text>
            </View>
          </View>
          <Text style={styles.subtitle}>
            Estimate exactly how many points you earn for any purchase
          </Text>
        </View>
      </View>

      {/* Preset Amount Chips */}
      <Text style={styles.inputLabel}>QUICK SELECT BILL AMOUNT</Text>
      <View style={styles.chipsRow}>
        {PRESET_AMOUNTS.map((val) => {
          const isSelected = amount === val;
          return (
            <TouchableOpacity
              key={val}
              onPress={() => {
                setAmountStr(val.toString());
                setCreditSuccessMsg(null);
              }}
              style={[styles.chip, isSelected && styles.chipSelected]}
            >
              <Text style={[styles.chipText, isSelected && styles.chipTextSelected]}>
                ₹{val >= 100000 ? `${val / 100000} Lakh` : `${val / 1000}k`}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Custom Input */}
      <View style={styles.inputContainer}>
        <Text style={styles.currencyPrefix}>₹</Text>
        <TextInput
          style={styles.textInput}
          value={amountStr}
          onChangeText={(txt) => {
            setAmountStr(txt.replace(/[^0-9]/g, ''));
            setCreditSuccessMsg(null);
          }}
          placeholder="Enter purchase amount"
          keyboardType="numeric"
          maxLength={8}
        />
        {amount > 0 && (
          <TouchableOpacity
            onPress={() => {
              setAmountStr('');
              setCreditSuccessMsg(null);
            }}
            style={styles.clearBtn}
          >
            <Ionicons name="close-circle" size={18} color="#999" />
          </TouchableOpacity>
        )}
      </View>

      {/* Live Calculation Output Card */}
      {isLoading ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator size="small" color={COLORS.gold} />
          <Text style={styles.loadingText}>Counting points...</Text>
        </View>
      ) : calculation && amount > 0 ? (
        <View style={styles.resultBox}>
          {/* Slab Banner */}
          <View style={styles.slabRow}>
            <View style={styles.ratePill}>
              <Ionicons name="trending-up" size={14} color="#FFF" />
              <Text style={styles.ratePillText}>{calculation.rate_percent}% Slab</Text>
            </View>
            <Text style={styles.slabName}>{calculation.slab_name}</Text>
          </View>

          {/* Breakdown Items */}
          <View style={styles.calcRow}>
            <Text style={styles.calcLabel}>Base Points Earned</Text>
            <Text style={styles.calcVal}>+{calculation.base_points.toLocaleString('en-IN')} pts</Text>
          </View>

          <View style={styles.calcRow}>
            <Text style={styles.calcLabel}>Rupee Value (1 pt = ₹1)</Text>
            <Text style={styles.calcVal}>₹{calculation.rupee_equivalent.toLocaleString('en-IN')}</Text>
          </View>

          {calculation.bonus_points > 0 ? (
            <View style={[styles.calcRow, styles.bonusRow]}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Ionicons name="gift" size={14} color={COLORS.gold} style={{ marginRight: 4 }} />
                <Text style={styles.bonusLabel}>+20% Annual Bonus</Text>
              </View>
              <Text style={styles.bonusVal}>+{calculation.bonus_points.toLocaleString('en-IN')} pts</Text>
            </View>
          ) : (
            <View style={styles.bonusProgressHint}>
              <Ionicons name="information-circle-outline" size={14} color="#888" />
              <Text style={styles.bonusProgressText}>
                {amount >= 100000
                  ? 'Annual spend >= ₹1,00,000 threshold reached!'
                  : `Spend ₹${(100000 - amount).toLocaleString('en-IN')} more to unlock 20% annual bonus points.`}
              </Text>
            </View>
          )}

          {/* Highlighted Total */}
          <View style={styles.totalDivider} />
          <View style={styles.totalRow}>
            <View>
              <Text style={styles.totalLabel}>TOTAL POINTS COUNT</Text>
              <Text style={styles.totalSub}>₹{calculation.total_rupee_value.toLocaleString('en-IN')} value on next purchase</Text>
            </View>
            <View style={styles.totalPointsBadge}>
              <Ionicons name="star" size={16} color={COLORS.gold} />
              <Text style={styles.totalPointsNumber}>
                +{calculation.total_points.toLocaleString('en-IN')}
              </Text>
            </View>
          </View>

          {/* Simulate Action Button */}
          {creditSuccessMsg ? (
            <View style={styles.successBanner}>
              <Ionicons name="checkmark-circle" size={16} color={COLORS.success} />
              <Text style={styles.successBannerText}>{creditSuccessMsg}</Text>
            </View>
          ) : (
            <TouchableOpacity
              style={styles.creditBtn}
              onPress={handleSimulateCredit}
              disabled={isCrediting}
            >
              <Ionicons name="add-circle-outline" size={18} color="#FFF" />
              <Text style={styles.creditBtnText}>
                {isCrediting ? 'CREDITING POINTS...' : `TEST CREDIT +${calculation.total_points} PTS (DEMO)`}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.card,
    borderRadius: 8,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: SPACING.md,
    ...SHADOWS.sm,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  iconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#FDF8F0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.sm,
  },
  titleBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.primary,
    letterSpacing: 0.8,
  },
  liveBadge: {
    backgroundColor: COLORS.gold,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  liveBadgeText: {
    color: '#FFF',
    fontSize: 8,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  inputLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#888',
    letterSpacing: 0.5,
    marginTop: SPACING.sm,
    marginBottom: 6,
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: SPACING.sm,
  },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#F4F4F4',
    borderWidth: 1,
    borderColor: '#E8E8E8',
  },
  chipSelected: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  chipText: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.text,
  },
  chipTextSelected: {
    color: '#FFF',
    fontWeight: '700',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderRadius: 6,
    paddingHorizontal: SPACING.sm,
    height: 44,
    backgroundColor: '#FFF',
  },
  currencyPrefix: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.gold,
    marginRight: 6,
  },
  textInput: {
    flex: 1,
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
  },
  clearBtn: {
    padding: 4,
  },
  loadingBox: {
    paddingVertical: SPACING.md,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  loadingText: {
    fontSize: 12,
    color: '#888',
  },
  resultBox: {
    marginTop: SPACING.sm,
    backgroundColor: '#FAF9F6',
    borderRadius: 8,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: '#EFECE6',
  },
  slabRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.sm,
    paddingBottom: SPACING.xs,
    borderBottomWidth: 1,
    borderBottomColor: '#EDEBE6',
  },
  ratePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.gold,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    marginRight: 8,
    gap: 4,
  },
  ratePillText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: '800',
  },
  slabName: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.primary,
  },
  calcRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 3,
  },
  calcLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  calcVal: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.text,
  },
  bonusRow: {
    backgroundColor: '#FFF9E6',
    paddingHorizontal: 6,
    paddingVertical: 4,
    borderRadius: 4,
    marginVertical: 2,
  },
  bonusLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.goldDark,
  },
  bonusVal: {
    fontSize: 12,
    fontWeight: '800',
    color: COLORS.goldDark,
  },
  bonusProgressHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
    paddingVertical: 2,
  },
  bonusProgressText: {
    fontSize: 10,
    color: '#888',
    flex: 1,
  },
  totalDivider: {
    height: 1,
    backgroundColor: '#E0DDD5',
    marginVertical: SPACING.sm,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  totalLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: COLORS.primary,
    letterSpacing: 0.5,
  },
  totalSub: {
    fontSize: 10,
    color: COLORS.textSecondary,
    marginTop: 1,
  },
  totalPointsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E1E1E',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    gap: 6,
  },
  totalPointsNumber: {
    color: COLORS.gold,
    fontSize: 15,
    fontWeight: '800',
  },
  creditBtn: {
    backgroundColor: COLORS.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 6,
    gap: 8,
    marginTop: 4,
  },
  creditBtnText: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  successBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5E9',
    padding: SPACING.sm,
    borderRadius: 6,
    gap: 6,
    marginTop: 4,
  },
  successBannerText: {
    color: COLORS.success,
    fontSize: 11,
    fontWeight: '700',
    flex: 1,
  },
});
