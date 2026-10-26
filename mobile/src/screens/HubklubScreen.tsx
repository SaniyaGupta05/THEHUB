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
  const { activeCustomerId, customerProfile, pointsBalance, isLoggedIn, refreshProfile, openAuthModal } = useAuth();
  const [activeView, setActiveView] = useState<HubklubView>('dashboard');
  const [summary, setSummary] = useState<HubklubSummary | null>(null);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isEnrolling, setIsEnrolling] = useState(false);

  // Screen 16: Redeem selection
  const [selectedRedeemAmount, setSelectedRedeemAmount] = useState<number>(1000);
  const [isRedeeming, setIsRedeeming] = useState(false);

  // Screen 17: History filter tab
  const [historyTab, setHistoryTab] = useState<'All' | 'Earned' | 'Redeemed' | 'Expired'>('All');

  const fetchLoyaltyData = async () => {
    setIsLoading(true);
    try {
      const [data, txList] = await Promise.all([
        apiClient.getLoyaltySummary().catch(() => null),
        apiClient.getLoyaltyTransactions().catch(() => []),
      ]);
      setSummary(data);
      setTransactions(Array.isArray(txList) ? txList : []);
    } catch (e) {
      console.warn('Failed to load loyalty data', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLoyaltyData();
  }, [activeCustomerId]);

  const handleEnroll = async () => {
    setIsEnrolling(true);
    try {
      await apiClient.enrollLoyaltyDemo();
      Alert.alert(
        'Welcome to HUBKLUB!',
        'You have successfully enrolled in HUBKLUB Membership. Enjoy earning reward points on all your purchases!'
      );
      await refreshProfile();
      await fetchLoyaltyData();
    } catch (err: any) {
      Alert.alert('Enrollment Error', err.message || 'Unable to complete enrollment.');
    } finally {
      setIsEnrolling(false);
    }
  };

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

  const availablePoints = typeof pointsBalance === 'number' ? pointsBalance : (summary?.balance?.available_points ?? 0);
  const annualSpend = customerProfile?.annual_spend_current_year ?? summary?.annual_bonus?.accumulated_spend_inr ?? 0;
  const annualThreshold = 100000;
  const progressPercent = Math.min(100, Math.round((annualSpend / annualThreshold) * 100));
  const pointsEarnedYear = summary?.annual_bonus?.points_earned_this_year ?? Math.round(annualSpend * 0.05);

  // SCREEN 14: MEMBERSHIP ELIGIBILITY
  if (activeView === 'eligibility') {
    const isEnrolledMember = Boolean(customerProfile?.is_hubklub_member || summary?.membership?.is_member);
    const maxSingle = customerProfile?.max_single_purchase ?? summary?.membership?.max_single_purchase ?? 0;
    const threshold = summary?.membership?.eligibility_threshold ?? 1000;
    const isEligibleToEnroll = isEnrolledMember || maxSingle >= threshold || Boolean(summary?.membership?.is_eligible);
    const eligibilityProgress = isEnrolledMember ? 100 : Math.min(100, Math.round((maxSingle / threshold) * 100));
    const memberTier = customerProfile?.tier || summary?.membership?.tier || 'Classic';
    const memberNum = customerProfile?.membership_number || summary?.membership?.membership_number || 'Active Member';

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
            {isEnrolledMember
              ? 'Your HUBKLUB membership is active and verified across all store counters & online.'
              : 'Make a one-time purchase of ₹1,000 or more to enroll in HUBKLUB membership.'}
          </Text>

          <View style={styles.eligibilityCard}>
            <View style={styles.eligibilityRow}>
              {isEnrolledMember ? (
                <View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Ionicons name="shield-checkmark" size={18} color="#D4AF37" />
                    <Text style={{ fontSize: 16, fontWeight: '700', color: '#111111' }}>
                      Active {memberTier} Member
                    </Text>
                  </View>
                  <Text style={{ fontSize: 12, color: '#777777', marginTop: 2 }}>
                    ID: {memberNum}
                  </Text>
                </View>
              ) : (
                <Text style={styles.eligibilitySpent}>
                  ₹ {maxSingle.toLocaleString('en-IN')}{' '}
                  <Text style={styles.eligibilityTarget}>/ {threshold.toLocaleString('en-IN')}</Text>
                </Text>
              )}
              <Text style={styles.eligibilityPercent}>{eligibilityProgress}%</Text>
            </View>

            <View style={styles.progressBarTrack}>
              <View style={[styles.progressBarFill, { width: `${eligibilityProgress}%` }]} />
            </View>

            <Text style={{ fontSize: 13, color: '#555555', marginTop: 12, lineHeight: 18 }}>
              {isEnrolledMember
                ? `You have qualified and enrolled in HUBKLUB. Enjoy 1 pt = ₹1 redemption value and up to 6% points back on every in-store and online purchase.`
                : isEligibleToEnroll
                ? `Congratulations! Your single purchase of ₹${maxSingle.toLocaleString('en-IN')} qualifies you for instant HUBKLUB membership.`
                : `Spend ₹${(threshold - maxSingle).toLocaleString('en-IN')} more on a single purchase to unlock lifetime membership rewards.`}
            </Text>
          </View>

          {isEnrolledMember ? (
            <TouchableOpacity
              style={styles.blackActionBtn}
              onPress={() => setActiveView('dashboard')}
              activeOpacity={0.88}
            >
              <Text style={styles.blackActionBtnText}>View HUBKLUB Dashboard</Text>
            </TouchableOpacity>
          ) : isEligibleToEnroll ? (
            <TouchableOpacity
              style={styles.blackActionBtn}
              onPress={handleEnroll}
              disabled={isEnrolling}
              activeOpacity={0.88}
            >
              {isEnrolling ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.blackActionBtnText}>Enroll in HUBKLUB Now</Text>
              )}
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={styles.blackActionBtn}
              onPress={() => setActiveView('dashboard')}
              activeOpacity={0.88}
            >
              <Text style={styles.blackActionBtnText}>Continue Shopping</Text>
            </TouchableOpacity>
          )}

          {!isLoggedIn && (
            <View style={styles.alreadyMemberBox}>
              <Text style={styles.alreadyMemberText}>Already a member?</Text>
              <Text style={styles.alreadyMemberSub}>Sign in to view your benefits.</Text>
              <TouchableOpacity
                style={styles.signInLinkBtn}
                onPress={() => openAuthModal('signin')}
              >
                <Text style={styles.signInLinkText}>Sign In</Text>
              </TouchableOpacity>
            </View>
          )}
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
    const filtered = transactions.filter((tx) => {
      const pts = Number(tx.points) || 0;
      if (historyTab === 'All') return true;
      if (historyTab === 'Earned') return tx.type === 'earn' || tx.type === 'bonus' || pts > 0;
      if (historyTab === 'Redeemed') return tx.type === 'redeem' || pts < 0;
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
          {filtered.length === 0 ? (
            <View style={{ alignItems: 'center', justifyContent: 'center', paddingVertical: 60 }}>
              <Ionicons name="receipt-outline" size={48} color="#CCCCCC" />
              <Text style={{ fontSize: 16, fontWeight: '600', color: '#111111', marginTop: 16 }}>
                No Points Transactions Found
              </Text>
              <Text style={{ fontSize: 13, color: '#777777', textAlign: 'center', marginTop: 6, paddingHorizontal: 30 }}>
                Points earned on in-store bills and online purchases will automatically appear here.
              </Text>
            </View>
          ) : (
            filtered.map((tx) => {
              const pts = Number(tx.points) || 0;
              const isPositive = pts > 0;
              const title =
                tx.description ||
                tx.title ||
                (tx.type === 'earn' ? 'Purchase Points Earned' : tx.type === 'redeem' ? 'Points Redeemed' : 'Bonus Points');
              const rawDate = tx.timestamp || tx.date || '';
              const dateParsed = new Date(rawDate);
              const dateStr = !isNaN(dateParsed.getTime())
                ? dateParsed.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
                : rawDate.split(',')[0] || rawDate;

              return (
                <View key={tx.id} style={styles.txRow}>
                  <View style={styles.txLeft}>
                    <View style={styles.txIconBox}>
                      <Ionicons
                        name={
                          tx.type === 'earn' || tx.type === 'bonus' || pts > 0
                            ? 'gift-outline'
                            : tx.type === 'redeem'
                            ? 'bag-check-outline'
                            : 'alert-circle-outline'
                        }
                        size={18}
                        color="#C5A880"
                      />
                    </View>
                    <View style={{ flex: 1, marginRight: 8 }}>
                      <Text style={styles.txTitle} numberOfLines={2}>
                        {title}
                      </Text>
                      <Text style={styles.txDate}>{dateStr}</Text>
                    </View>
                  </View>

                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={[styles.txPointsText, isPositive ? styles.pointsGreen : styles.pointsRed]}>
                      {isPositive ? `+${pts}` : `${pts}`}
                    </Text>
                    {tx.expiry_date && (
                      <Text style={styles.txExpiryText}>
                        Exp:{' '}
                        {!isNaN(new Date(tx.expiry_date).getTime())
                          ? new Date(tx.expiry_date).toLocaleDateString('en-GB', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric',
                            })
                          : tx.expiry_date}
                      </Text>
                    )}
                  </View>
                </View>
              );
            })
          )}
        </ScrollView>
      </SafeAreaView>
    );
  }

  // SCREEN 18: POINTS EXPIRY
  if (activeView === 'expiry') {
    const rawBatches = summary?.balance?.points_batches;
    const hasBatches = rawBatches && rawBatches.length > 0;
    const displayBatches = hasBatches
      ? rawBatches.map((b) => ({
          pts: `${b.points}`,
          earned: '2026',
          expires: !isNaN(new Date(b.expiry_date).getTime())
            ? new Date(b.expiry_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
            : `${b.days_remaining} days`,
          urgent: b.days_remaining <= 30,
        }))
      : availablePoints > 0
      ? [
          {
            pts: `${availablePoints}`,
            earned: 'Current Active',
            expires: '24 Months Validity',
            urgent: false,
          },
        ]
      : [];

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
              <Text style={styles.expiryAlertTitle}>
                {availablePoints > 0 ? 'Points Validity Tracking' : 'No Expiring Points'}
              </Text>
              <Text style={styles.expiryAlertDesc}>
                {availablePoints > 0
                  ? `${availablePoints.toLocaleString('en-IN')} points are valid across 24 months from earning.`
                  : 'Your points balance is currently 0.'}
              </Text>
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

            {displayBatches.length === 0 ? (
              <View style={{ paddingVertical: 20, alignItems: 'center' }}>
                <Text style={{ color: '#888888', fontSize: 13 }}>No expiring points on record.</Text>
              </View>
            ) : (
              displayBatches.map((row, idx) => (
                <View key={idx} style={styles.expiryTableRow}>
                  <Text style={[styles.expiryTd, row.urgent && styles.urgentText]}>{row.pts}</Text>
                  <Text style={styles.expiryTd}>{row.earned}</Text>
                  <Text style={[styles.expiryTdRight, row.urgent && styles.urgentText]}>{row.expires}</Text>
                </View>
              ))
            )}
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  const userTier = customerProfile?.tier || summary?.membership?.tier || (annualSpend >= 100000 ? 'Gold' : 'Classic');
  const memberSinceDate = customerProfile?.member_since ? new Date(customerProfile.member_since) : null;
  const memberSinceStr =
    memberSinceDate && !isNaN(memberSinceDate.getTime())
      ? `Member since ${memberSinceDate.toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })}`
      : 'Active HUBKLUB Member';

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

        {/* Dynamic Member Card matching Screen 13 */}
        <View style={styles.goldMemberCard}>
          <View style={styles.cardHeaderRow}>
            <View style={styles.tierShieldRow}>
              <Ionicons name="shield-checkmark" size={18} color="#C5A880" />
              <View style={{ marginLeft: 8 }}>
                <Text style={styles.tierName}>{userTier} Member</Text>
                <Text style={styles.tierMemberSince}>{memberSinceStr}</Text>
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
