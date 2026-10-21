import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { apiClient } from '../api/client';
import { HubklubSummary } from '../types';

type HubklubView =
  | 'dashboard' // Screen 13
  | 'eligibility' // Screen 14
  | 'rules' // Screen 15
  | 'redeem' // Screen 16
  | 'history' // Screen 17
  | 'expiry'; // Screen 18

export const HubklubScreen: React.FC = () => {
  const { activeCustomerId, refreshProfile } = useAuth();
  const [activeView, setActiveView] = useState<HubklubView>('dashboard');
  const [summary, setSummary] = useState<HubklubSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Screen 16: Redeem selection
  const [selectedRedeemAmount, setSelectedRedeemAmount] = useState<number>(1000);
  const [isRedeeming, setIsRedeeming] = useState(false);

  // Screen 17: History filter tab
  const [historyTab, setHistoryTab] = useState<'All' | 'Earned' | 'Redeemed' | 'Expired'>('All');

  const fetchLoyaltyData = async () => {
    setIsLoading(true);
    try {
      const data = await apiClient.getLoyaltySummary();
      setSummary(data);
    } catch (e) {
      console.warn('Failed to load loyalty data', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLoyaltyData();
  }, [activeCustomerId]);

  const handleRedeemPoints = async () => {
    setIsRedeeming(true);
    try {
      await apiClient.redeemPointsDemo(
        selectedRedeemAmount,
        `red_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`
      );
      Alert.alert(
        'Redemption Confirmed',
        `Successfully redeemed ${selectedRedeemAmount} points (₹${selectedRedeemAmount} discount applied).`
      );
      await fetchLoyaltyData();
      await refreshProfile();
      setActiveView('dashboard');
    } catch (err: any) {
      Alert.alert('Redemption Failed', err.message || 'Unable to redeem points.');
    } finally {
      setIsRedeeming(false);
    }
  };

  const availablePoints = summary?.balance?.available_points ?? 2500;
  const annualSpend = summary?.annual_bonus?.accumulated_spend_inr ?? 62000;
  const annualThreshold = 100000;
  const progressPercent = Math.min(100, Math.round((annualSpend / annualThreshold) * 100));
  const pointsEarnedYear = summary?.annual_bonus?.points_earned_this_year ?? 3100;

  // SCREEN 14: MEMBERSHIP ELIGIBILITY
  if (activeView === 'eligibility') {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.topHeader}>
          <TouchableOpacity onPress={() => setActiveView('dashboard')} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color="#111111" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>HUBKLUB</Text>
          <View style={{ width: 24 }} />
        </View>

        <ScrollView contentContainerStyle={styles.screenPadding} showsVerticalScrollIndicator={false}>
          <Text style={styles.screenTitle}>Membership Eligibility</Text>
          <Text style={styles.screenSubtitle}>
            Make a one-time purchase of ₹1,000 or more to enroll in HUBKLUB membership.
          </Text>

          <View style={styles.eligibilityCard}>
            <View style={styles.eligibilityRow}>
              <Text style={styles.eligibilitySpent}>₹ 650 <Text style={styles.eligibilityTarget}>/ 1,000</Text></Text>
              <Text style={styles.eligibilityPercent}>65%</Text>
            </View>

            <View style={styles.progressBarTrack}>
              <View style={[styles.progressBarFill, { width: '65%' }]} />
            </View>
          </View>

          <TouchableOpacity
            style={styles.blackActionBtn}
            onPress={() => setActiveView('dashboard')}
            activeOpacity={0.88}
          >
            <Text style={styles.blackActionBtnText}>Continue Shopping</Text>
          </TouchableOpacity>

          <View style={styles.alreadyMemberBox}>
            <Text style={styles.alreadyMemberText}>Already a member?</Text>
            <Text style={styles.alreadyMemberSub}>Sign in to view your benefits.</Text>
            <TouchableOpacity
              style={styles.signInLinkBtn}
              onPress={() => setActiveView('dashboard')}
            >
              <Text style={styles.signInLinkText}>Sign In</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // SCREEN 15: POINTS & EARNING RULES
  if (activeView === 'rules') {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.topHeader}>
          <TouchableOpacity onPress={() => setActiveView('dashboard')} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color="#111111" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>HUBKLUB</Text>
          <View style={{ width: 24 }} />
        </View>

        <ScrollView contentContainerStyle={styles.screenPadding} showsVerticalScrollIndicator={false}>
          <Text style={styles.screenTitle}>Points Earning Rules</Text>

          {/* Rates Table matching Screen 15 */}
          <View style={styles.tableCard}>
            <View style={styles.tableHeaderRow}>
              <Text style={styles.tableHeadLeft}>Purchase Value Range</Text>
              <Text style={styles.tableHeadRight}>Points Rate</Text>
            </View>

            <View style={styles.tableDataRow}>
              <Text style={styles.tableCellLeft}>Up to ₹20,000</Text>
              <Text style={styles.tableCellRight}>3%</Text>
            </View>

            <View style={styles.tableDataRow}>
              <Text style={styles.tableCellLeft}>₹20,001 - ₹50,000</Text>
              <Text style={styles.tableCellRight}>5%</Text>
            </View>

            <View style={[styles.tableDataRow, { borderBottomWidth: 0 }]}>
              <Text style={styles.tableCellLeft}>₹50,001 and above</Text>
              <Text style={styles.tableCellRight}>6%</Text>
            </View>
          </View>

          <Text style={styles.footnoteText}>
            Rates are configurable and may be based on either invoice value or accumulated purchases. Please confirm with The HUB team.
          </Text>

          {/* Annual Bonus Card */}
          <View style={styles.bonusCard}>
            <View style={styles.bonusIconBox}>
              <Ionicons name="gift-outline" size={22} color="#C5A880" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.bonusTitle}>Annual Bonus</Text>
              <Text style={styles.bonusDesc}>
                At ₹1,00,000+ annual purchases, get 20% bonus on total points earned in the year.
              </Text>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // SCREEN 16: REDEEM POINTS
  if (activeView === 'redeem') {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.topHeader}>
          <TouchableOpacity onPress={() => setActiveView('dashboard')} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color="#111111" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Redeem Points</Text>
          <View style={{ width: 24 }} />
        </View>

        <ScrollView contentContainerStyle={styles.screenPadding} showsVerticalScrollIndicator={false}>
          {/* Available Points Box */}
          <View style={styles.balanceInfoBox}>
            <Text style={styles.balanceInfoLabel}>Available Points</Text>
            <Text style={styles.balanceInfoValue}>
              {availablePoints.toLocaleString('en-IN')}
            </Text>
            <Text style={styles.balanceInfoSub}>₹ {availablePoints.toLocaleString('en-IN')} value</Text>
          </View>

          <Text style={styles.selectAmountTitle}>Select Redemption Amount</Text>

          {/* Radio Options: 500, 1000, 2000 */}
          {[500, 1000, 2000].map((amt) => {
            const isSelected = selectedRedeemAmount === amt;
            return (
              <TouchableOpacity
                key={amt}
                style={[styles.radioCard, isSelected && styles.radioCardSelected]}
                onPress={() => setSelectedRedeemAmount(amt)}
                activeOpacity={0.8}
              >
                <View style={styles.radioRowLeft}>
                  <View style={[styles.radioCircle, isSelected && styles.radioCircleActive]}>
                    {isSelected && <View style={styles.radioDot} />}
                  </View>
                  <Text style={styles.radioPointsText}>{amt.toLocaleString('en-IN')}</Text>
                </View>
                <Text style={styles.radioValueText}>₹{amt.toLocaleString('en-IN')}</Text>
              </TouchableOpacity>
            );
          })}

          <TouchableOpacity
            style={styles.blackActionBtn}
            onPress={handleRedeemPoints}
            disabled={isRedeeming}
            activeOpacity={0.88}
          >
            {isRedeeming ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={styles.blackActionBtnText}>Redeem Now</Text>
            )}
          </TouchableOpacity>

          <Text style={styles.footnoteCenter}>
            1 point = ₹1 redemption value. Please confirm eligible products and redemption rules with The HUB team.
          </Text>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // SCREEN 17: POINTS HISTORY
  if (activeView === 'history') {
    const transactions = [
      { id: '1', title: 'Purchase Bonus', date: '16 Apr 2025', expires: '5 Apr 2027', points: 150, type: 'earn' },
      { id: '2', title: 'Redemption', date: '10 Apr 2025', points: -500, type: 'redeem' },
      { id: '3', title: 'Purchase Bonus', date: '05 Apr 2025', expires: '5 Apr 2027', points: 300, type: 'earn' },
      { id: '4', title: 'Purchase Bonus', date: '28 Mar 2025', expires: '28 Mar 2027', points: 200, type: 'earn' },
      { id: '5', title: 'Expired Points', date: '15 Mar 2025', expires: '15 Mar 2025', points: -100, type: 'expired' },
    ];

    const filtered = transactions.filter((tx) => {
      if (historyTab === 'All') return true;
      if (historyTab === 'Earned') return tx.type === 'earn';
      if (historyTab === 'Redeemed') return tx.type === 'redeem';
      if (historyTab === 'Expired') return tx.type === 'expired';
      return true;
    });

    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.topHeader}>
          <TouchableOpacity onPress={() => setActiveView('dashboard')} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color="#111111" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Points History</Text>
          <View style={{ width: 24 }} />
        </View>

        {/* Filter Tabs matching Screen 17 */}
        <View style={styles.historyTabsRow}>
          {(['All', 'Earned', 'Redeemed', 'Expired'] as const).map((tab) => (
            <TouchableOpacity
              key={tab}
              style={[styles.historyTab, historyTab === tab && styles.historyTabActive]}
              onPress={() => setHistoryTab(tab)}
            >
              <Text style={[styles.historyTabText, historyTab === tab && styles.historyTabTextActive]}>
                {tab}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <ScrollView contentContainerStyle={styles.screenPadding} showsVerticalScrollIndicator={false}>
          {filtered.map((tx) => {
            const isPositive = tx.points > 0;
            return (
              <View key={tx.id} style={styles.txRow}>
                <View style={styles.txLeft}>
                  <View style={styles.txIconBox}>
                    <Ionicons
                      name={tx.type === 'earn' ? 'gift-outline' : tx.type === 'redeem' ? 'bag-check-outline' : 'alert-circle-outline'}
                      size={18}
                      color="#C5A880"
                    />
                  </View>
                  <View>
                    <Text style={styles.txTitle}>{tx.title}</Text>
                    <Text style={styles.txDate}>{tx.date}</Text>
                  </View>
                </View>

                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={[styles.txPointsText, isPositive ? styles.pointsGreen : styles.pointsRed]}>
                    {isPositive ? `+${tx.points}` : `${tx.points}`}
                  </Text>
                  {tx.expires && (
                    <Text style={styles.txExpiryText}>{tx.expires}</Text>
                  )}
                </View>
              </View>
            );
          })}
        </ScrollView>
      </SafeAreaView>
    );
  }

  // SCREEN 18: POINTS EXPIRY
  if (activeView === 'expiry') {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.topHeader}>
          <TouchableOpacity onPress={() => setActiveView('dashboard')} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color="#111111" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Points Expiry</Text>
          <View style={{ width: 24 }} />
        </View>

        <ScrollView contentContainerStyle={styles.screenPadding} showsVerticalScrollIndicator={false}>
          {/* Warning Banner matching Screen 18 */}
          <View style={styles.expiryAlertCard}>
            <Ionicons name="time-outline" size={24} color="#C5A880" style={{ marginRight: 12 }} />
            <View style={{ flex: 1 }}>
              <Text style={styles.expiryAlertTitle}>Points Expiring Soon</Text>
              <Text style={styles.expiryAlertDesc}>500 points will expire on 15 May 2025</Text>
            </View>
          </View>

          <Text style={styles.expiryDetailsHeader}>Expiry Details</Text>

          {/* Expiry Table */}
          <View style={styles.expiryTable}>
            <View style={styles.expiryTableHeader}>
              <Text style={styles.expiryTh}>Points</Text>
              <Text style={styles.expiryTh}>Earned On</Text>
              <Text style={styles.expiryThRight}>Expires On</Text>
            </View>

            {[
              { pts: '500', earned: '15 Mar 2025', expires: '15 May 2025', urgent: true },
              { pts: '300', earned: '05 Feb 2025', expires: '05 Apr 2027', urgent: false },
              { pts: '200', earned: '10 Jan 2025', expires: '10 Jan 2027', urgent: false },
              { pts: '100', earned: '20 Dec 2024', expires: '20 Dec 2026', urgent: false },
            ].map((row, idx) => (
              <View key={idx} style={styles.expiryTableRow}>
                <Text style={[styles.expiryTd, row.urgent && styles.urgentText]}>{row.pts}</Text>
                <Text style={styles.expiryTd}>{row.earned}</Text>
                <Text style={[styles.expiryTdRight, row.urgent && styles.urgentText]}>{row.expires}</Text>
              </View>
            ))}
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // SCREEN 13: MAIN HUBKLUB DASHBOARD
  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.topHeader}>
        <Text style={styles.dashboardHeaderTitle}>HUBKLUB</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Sub-view switcher shortcuts */}
        <View style={styles.shortcutsRow}>
          <TouchableOpacity onPress={() => setActiveView('eligibility')} style={styles.shortcutChip}>
            <Text style={styles.shortcutText}>Eligibility</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setActiveView('rules')} style={styles.shortcutChip}>
            <Text style={styles.shortcutText}>Earning Rules</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setActiveView('history')} style={styles.shortcutChip}>
            <Text style={styles.shortcutText}>History</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setActiveView('expiry')} style={styles.shortcutChip}>
            <Text style={styles.shortcutText}>Expiry</Text>
          </TouchableOpacity>
        </View>

        {/* Gold Member Card matching Screen 13 */}
        <View style={styles.goldMemberCard}>
          <View style={styles.cardHeaderRow}>
            <View style={styles.tierShieldRow}>
              <Ionicons name="shield-checkmark" size={18} color="#C5A880" />
              <View style={{ marginLeft: 8 }}>
                <Text style={styles.tierName}>Gold Member</Text>
                <Text style={styles.tierMemberSince}>Member since Apr 2025</Text>
              </View>
            </View>
          </View>

          <View style={styles.pointsColumnsRow}>
            <View style={styles.pointsCol}>
              <Text style={styles.pointsColLabel}>Available Points</Text>
              <Text style={styles.pointsColVal}>{availablePoints.toLocaleString('en-IN')}</Text>
            </View>

            <View style={styles.pointsCol}>
              <Text style={styles.pointsColLabel}>Redemption Value</Text>
              <Text style={styles.pointsColVal}>₹ {availablePoints.toLocaleString('en-IN')}</Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.cardRedeemBtn}
            onPress={() => setActiveView('redeem')}
            activeOpacity={0.85}
          >
            <Text style={styles.cardRedeemText}>Redeem Points</Text>
          </TouchableOpacity>
        </View>

        {/* Your Progress Section matching Screen 13 */}
        <View style={styles.progressSection}>
          <Text style={styles.progressSectionTitle}>Your Progress</Text>

          <View style={styles.progressCard}>
            <View style={styles.progressHeaderRow}>
              <Text style={styles.progressLabel}>Annual Spending (Current Year)</Text>
              <Text style={styles.progressPercent}>{progressPercent}%</Text>
            </View>

            <Text style={styles.spendNumbers}>
              ₹ {new Intl.NumberFormat('en-IN').format(annualSpend)}{' '}
              <Text style={styles.spendTarget}>/ ₹ 1,00,000</Text>
            </Text>

            <View style={styles.progressBarTrack}>
              <View style={[styles.progressBarFill, { width: `${progressPercent}%` }]} />
            </View>

            <View style={styles.pointsEarnedRow}>
              <Text style={styles.pointsEarnedLabel}>Points Earned (Current Year)</Text>
              <Text style={styles.pointsEarnedVal}>{pointsEarnedYear.toLocaleString('en-IN')}</Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  topHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    height: 52,
    borderBottomWidth: 1,
    borderBottomColor: '#F2F2F2',
  },
  dashboardHeaderTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#111111',
    letterSpacing: 0.5,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111111',
  },
  backBtn: {
    padding: 6,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    paddingBottom: 40,
  },
  screenPadding: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    paddingBottom: 40,
  },
  shortcutsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
    flexWrap: 'wrap',
  },
  shortcutChip: {
    backgroundColor: '#F5F5F7',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  shortcutText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#111111',
  },

  // Screen 13: Gold Member Card
  goldMemberCard: {
    backgroundColor: '#F7F3EC',
    borderRadius: 12,
    padding: 18,
    borderWidth: 1,
    borderColor: '#EAE1D0',
    marginBottom: 20,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  tierShieldRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  tierName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111111',
  },
  tierMemberSince: {
    fontSize: 11,
    color: '#8E8E93',
    marginTop: 1,
  },
  pointsColumnsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  pointsCol: {
    flex: 1,
  },
  pointsColLabel: {
    fontSize: 11,
    color: '#666666',
    marginBottom: 4,
  },
  pointsColVal: {
    fontSize: 22,
    fontWeight: '800',
    color: '#111111',
  },
  cardRedeemBtn: {
    backgroundColor: '#111111',
    borderRadius: 8,
    height: 42,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardRedeemText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },

  // Your Progress
  progressSection: {
    marginTop: 6,
  },
  progressSectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111111',
    marginBottom: 10,
  },
  progressCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#EEEEEE',
    borderRadius: 10,
    padding: 16,
  },
  progressHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  progressLabel: {
    fontSize: 12,
    color: '#666666',
  },
  progressPercent: {
    fontSize: 11,
    fontWeight: '700',
    color: '#8E8E93',
  },
  spendNumbers: {
    fontSize: 16,
    fontWeight: '800',
    color: '#111111',
    marginTop: 6,
    marginBottom: 10,
  },
  spendTarget: {
    fontSize: 13,
    fontWeight: '500',
    color: '#8E8E93',
  },
  progressBarTrack: {
    height: 6,
    backgroundColor: '#F0F0F0',
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 16,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#C5A880',
    borderRadius: 3,
  },
  pointsEarnedRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#F2F2F2',
    paddingTop: 12,
  },
  pointsEarnedLabel: {
    fontSize: 12,
    color: '#666666',
  },
  pointsEarnedVal: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111111',
  },

  // Screen 14 Styles
  screenTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#111111',
    marginBottom: 6,
  },
  screenSubtitle: {
    fontSize: 13,
    color: '#666666',
    lineHeight: 18,
    marginBottom: 20,
  },
  eligibilityCard: {
    backgroundColor: '#F8F8F8',
    borderRadius: 8,
    padding: 16,
    marginBottom: 20,
  },
  eligibilityRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 10,
  },
  eligibilitySpent: {
    fontSize: 16,
    fontWeight: '800',
    color: '#111111',
  },
  eligibilityTarget: {
    fontSize: 13,
    fontWeight: '500',
    color: '#8E8E93',
  },
  eligibilityPercent: {
    fontSize: 11,
    fontWeight: '700',
    color: '#2E7D32',
  },
  blackActionBtn: {
    backgroundColor: '#111111',
    height: 48,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  blackActionBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  alreadyMemberBox: {
    alignItems: 'center',
    marginTop: 20,
  },
  alreadyMemberText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#111111',
    marginBottom: 2,
  },
  alreadyMemberSub: {
    fontSize: 12,
    color: '#8E8E93',
    marginBottom: 12,
  },
  signInLinkBtn: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  signInLinkText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#111111',
  },

  // Screen 15 Styles
  tableCard: {
    borderWidth: 1,
    borderColor: '#EEEEEE',
    borderRadius: 8,
    overflow: 'hidden',
    marginBottom: 12,
  },
  tableHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#F5F5F7',
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  tableHeadLeft: {
    fontSize: 12,
    fontWeight: '700',
    color: '#111111',
  },
  tableHeadRight: {
    fontSize: 12,
    fontWeight: '700',
    color: '#111111',
  },
  tableDataRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F2F2F2',
  },
  tableCellLeft: {
    fontSize: 12,
    color: '#444444',
  },
  tableCellRight: {
    fontSize: 12,
    fontWeight: '700',
    color: '#111111',
  },
  footnoteText: {
    fontSize: 11,
    color: '#8E8E93',
    lineHeight: 16,
    marginBottom: 24,
  },
  bonusCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FBF8F3',
    borderWidth: 1,
    borderColor: '#EFE5CE',
    borderRadius: 8,
    padding: 14,
    gap: 12,
  },
  bonusIconBox: {
    marginTop: 2,
  },
  bonusTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#111111',
    marginBottom: 2,
  },
  bonusDesc: {
    fontSize: 12,
    color: '#666666',
    lineHeight: 17,
  },

  // Screen 16 Styles
  balanceInfoBox: {
    backgroundColor: '#F8F8F8',
    borderRadius: 8,
    padding: 16,
    marginBottom: 20,
    alignItems: 'center',
  },
  balanceInfoLabel: {
    fontSize: 12,
    color: '#666666',
    marginBottom: 4,
  },
  balanceInfoValue: {
    fontSize: 28,
    fontWeight: '800',
    color: '#111111',
  },
  balanceInfoSub: {
    fontSize: 12,
    color: '#8E8E93',
    marginTop: 2,
  },
  selectAmountTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111111',
    marginBottom: 12,
  },
  radioCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#E8E8E8',
    borderRadius: 8,
    marginBottom: 10,
  },
  radioCardSelected: {
    borderColor: '#111111',
    backgroundColor: '#FDFDFD',
  },
  radioRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  radioCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#D1D1D6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioCircleActive: {
    borderColor: '#111111',
  },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#111111',
  },
  radioPointsText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111111',
  },
  radioValueText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111111',
  },
  footnoteCenter: {
    fontSize: 11,
    color: '#8E8E93',
    textAlign: 'center',
    lineHeight: 16,
  },

  // Screen 17 Styles
  historyTabsRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F2F2F2',
  },
  historyTab: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#F5F5F7',
  },
  historyTabActive: {
    backgroundColor: '#111111',
  },
  historyTabText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666666',
  },
  historyTabTextActive: {
    color: '#FFFFFF',
  },
  txRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F2F2F2',
  },
  txLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  txIconBox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F8F8F8',
    justifyContent: 'center',
    alignItems: 'center',
  },
  txTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#111111',
  },
  txDate: {
    fontSize: 11,
    color: '#8E8E93',
    marginTop: 2,
  },
  txPointsText: {
    fontSize: 13,
    fontWeight: '700',
  },
  pointsGreen: {
    color: '#2E7D32',
  },
  pointsRed: {
    color: '#E53935',
  },
  txExpiryText: {
    fontSize: 10,
    color: '#8E8E93',
    marginTop: 2,
  },

  // Screen 18 Styles
  expiryAlertCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FBF8F3',
    borderWidth: 1,
    borderColor: '#EFE5CE',
    borderRadius: 8,
    padding: 14,
    marginBottom: 20,
  },
  expiryAlertTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#111111',
    marginBottom: 2,
  },
  expiryAlertDesc: {
    fontSize: 12,
    color: '#666666',
  },
  expiryDetailsHeader: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111111',
    marginBottom: 10,
  },
  expiryTable: {
    borderWidth: 1,
    borderColor: '#EEEEEE',
    borderRadius: 8,
    overflow: 'hidden',
  },
  expiryTableHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#F5F5F7',
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  expiryTh: {
    flex: 1,
    fontSize: 12,
    fontWeight: '700',
    color: '#111111',
  },
  expiryThRight: {
    flex: 1,
    fontSize: 12,
    fontWeight: '700',
    color: '#111111',
    textAlign: 'right',
  },
  expiryTableRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F2F2F2',
  },
  expiryTd: {
    flex: 1,
    fontSize: 12,
    color: '#444444',
  },
  expiryTdRight: {
    flex: 1,
    fontSize: 12,
    color: '#444444',
    textAlign: 'right',
  },
  urgentText: {
    color: '#E53935',
    fontWeight: '700',
  },
});
