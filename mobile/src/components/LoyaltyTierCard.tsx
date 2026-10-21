import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, SHADOWS } from '../constants/theme';
import { HubklubMembershipStatus, HubklubBalance } from '../types';

interface LoyaltyTierCardProps {
  membership: HubklubMembershipStatus;
  balance: HubklubBalance;
  onRedeemPress?: () => void;
  onEnrollPress?: () => void;
}

export const LoyaltyTierCard: React.FC<LoyaltyTierCardProps> = ({
  membership,
  balance,
  onRedeemPress,
  onEnrollPress,
}) => {
  const isMember = membership.is_member;
  const tier = membership.tier || 'Classic';

  return (
    <View style={styles.card}>
      {/* Top Banner */}
      <View style={styles.header}>
        <View>
          <View style={styles.brandRow}>
            <Text style={styles.brandTitle}>HUBKLUB</Text>
            <View style={styles.tierBadge}>
              <Text style={styles.tierText}>{isMember ? tier.toUpperCase() : 'GUEST'}</Text>
            </View>
          </View>
          <Text style={styles.membershipNumber}>
            {isMember ? membership.membership_number : 'Membership Inactive'}
          </Text>
        </View>

        <Ionicons name="shield-checkmark" size={32} color={COLORS.gold} />
      </View>

      {/* Middle: Points & Rupee Value */}
      {isMember ? (
        <View style={styles.pointsSection}>
          <View style={styles.pointsRow}>
            <View>
              <Text style={styles.pointsLabel}>AVAILABLE POINTS</Text>
              <Text style={styles.pointsValue}>
                {new Intl.NumberFormat('en-IN').format(balance.available_points)}
              </Text>
            </View>
            <View style={styles.rupeeEquivalent}>
              <Text style={styles.pointsLabel}>REDEMPTION VALUE</Text>
              <Text style={styles.rupeeValue}>
                ₹{new Intl.NumberFormat('en-IN').format(balance.redemption_value_inr)}
              </Text>
              <Text style={styles.ruleNote}>1 pt = ₹1</Text>
            </View>
          </View>

          {balance.expiring_soon_points > 0 && (
            <View style={styles.expiryNotice}>
              <Ionicons name="time-outline" size={14} color="#C62828" />
              <Text style={styles.expiryText}>
                {balance.expiring_soon_points} points expiring soon
              </Text>
            </View>
          )}

          <TouchableOpacity style={styles.redeemButton} onPress={onRedeemPress}>
            <Ionicons name="gift-outline" size={16} color="#FFF" />
            <Text style={styles.redeemButtonText}>REDEEM POINTS</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.enrollmentPrompt}>
          <Text style={styles.enrollTitle}>Unlock HUBKLUB Privileges</Text>
          <Text style={styles.enrollDesc}>{membership.eligibility_message}</Text>

          {membership.is_eligible ? (
            <TouchableOpacity style={styles.enrollButton} onPress={onEnrollPress}>
              <Text style={styles.enrollButtonText}>ENROLL IN HUBKLUB NOW</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.thresholdNotice}>
              <Text style={styles.thresholdNoticeText}>
                Single purchase $\ge$ ₹1,000 required to activate membership.
              </Text>
            </View>
          )}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#1E1E1E',
    borderRadius: 8,
    padding: SPACING.md + 4,
    marginHorizontal: SPACING.md,
    marginVertical: SPACING.sm,
    borderWidth: 1,
    borderColor: '#3D3628',
    ...SHADOWS.md,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#2F2F2F',
    paddingBottom: SPACING.sm,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  brandTitle: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: 2,
  },
  tierBadge: {
    backgroundColor: COLORS.gold,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 3,
  },
  tierText: {
    color: '#000',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1,
  },
  membershipNumber: {
    color: '#999',
    fontSize: 11,
    marginTop: 2,
    letterSpacing: 0.5,
  },
  pointsSection: {
    marginTop: SPACING.md,
  },
  pointsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  pointsLabel: {
    color: '#888',
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 1,
    marginBottom: 4,
  },
  pointsValue: {
    color: COLORS.gold,
    fontSize: 26,
    fontWeight: '800',
  },
  rupeeEquivalent: {
    alignItems: 'flex-end',
  },
  rupeeValue: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '700',
  },
  ruleNote: {
    color: '#888',
    fontSize: 10,
    fontStyle: 'italic',
    marginTop: 2,
  },
  expiryNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(198, 40, 40, 0.15)',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 3,
    marginTop: 10,
    gap: 6,
    borderWidth: 1,
    borderColor: 'rgba(198, 40, 40, 0.3)',
  },
  expiryText: {
    color: '#FF8A80',
    fontSize: 11,
    fontWeight: '600',
  },
  redeemButton: {
    backgroundColor: COLORS.gold,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 4,
    marginTop: SPACING.md,
    gap: 6,
  },
  redeemButtonText: {
    color: '#000',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1,
  },
  enrollmentPrompt: {
    marginTop: SPACING.md,
  },
  enrollTitle: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 4,
  },
  enrollDesc: {
    color: '#AAA',
    fontSize: 12,
    lineHeight: 18,
    marginBottom: 12,
  },
  enrollButton: {
    backgroundColor: COLORS.gold,
    paddingVertical: 10,
    borderRadius: 4,
    alignItems: 'center',
  },
  enrollButtonText: {
    color: '#000',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1,
  },
  thresholdNotice: {
    backgroundColor: '#2A2A2A',
    padding: 8,
    borderRadius: 4,
  },
  thresholdNoticeText: {
    color: '#999',
    fontSize: 11,
  },
});
