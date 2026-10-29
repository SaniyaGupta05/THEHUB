import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { apiClient } from '../api/client';
import { HubklubSummary, JubileeSchemeProgress } from '../types';
import { PointsCalculator } from '../components/PointsCalculator';

type HubklubView =
  | 'dashboard' // Screen 13
  | 'eligibility' // Screen 14
  | 'rules' // Screen 15
  | 'redeem' // Screen 16
  | 'history' // Screen 17
  | 'expiry' // Screen 18
  | 'jubilee'; // 25-Year Silver Jubilee Celebration Scheme

const GO_SILVER_LOGO = require('../../assets/go_silver_logo.png');

export const HubklubScreen: React.FC = () => {
  const { activeCustomerId, customerProfile, pointsBalance, isLoggedIn, refreshProfile, openAuthModal } = useAuth();
  const [activeView, setActiveView] = useState<HubklubView>('dashboard');
  const [summary, setSummary] = useState<HubklubSummary | null>(null);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [jubilee, setJubilee] = useState<JubileeSchemeProgress | null>(null);
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
      const [data, txList, jub] = await Promise.all([
        apiClient.getLoyaltySummary().catch(() => null),
        apiClient.getLoyaltyTransactions().catch(() => []),
        apiClient.getJubileeProgress().catch(() => null),
      ]);
      setSummary(data);
      setTransactions(Array.isArray(txList) ? txList : []);
      if (jub) {
        setJubilee(jub);
      } else if (data?.jubilee_scheme) {
        setJubilee(data.jubilee_scheme);
      }
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

  const pointsFromTx = transactions.reduce((acc, tx) => acc + (Number(tx.points) || 0), 0);
  const availablePoints = Math.max(
    typeof pointsBalance === 'number' ? pointsBalance : 0,
    summary?.balance?.available_points ?? 0,
    pointsFromTx > 0 ? pointsFromTx : 0,
    apiClient.getPointsBalance(activeCustomerId) ?? 0
  );
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

  // SCREEN 15: THE POINT THAT MATTERS
  if (activeView === 'rules') {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.topHeader}>
          <TouchableOpacity onPress={() => setActiveView('dashboard')} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color="#111111" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>THE POINT THAT MATTERS</Text>
          <View style={{ width: 24 }} />
        </View>

        <ScrollView contentContainerStyle={styles.screenPadding} showsVerticalScrollIndicator={false}>
          {/* Header Card */}
          <View style={styles.schemeHeroCard}>
            <View style={styles.schemeBadge}>
              <Ionicons name="sparkles" size={13} color="#D4AF37" />
              <Text style={styles.schemeBadgeText}>OFFICIAL LOYALTY SCHEME</Text>
            </View>
            <Text style={styles.schemeHeroTitle}>THE POINT THAT MATTERS</Text>
            <Text style={styles.schemeHeroSubtitle}>You earn points on every purchase</Text>
          </View>

          {/* Single Purchase Rule Banner */}
          <View style={styles.singlePurchaseRuleBox}>
            <Ionicons name="information-circle" size={18} color="#D4AF37" style={{ marginTop: 1 }} />
            <View style={{ flex: 1 }}>
              <Text style={styles.singlePurchaseRuleTitle}>SINGLE PURCHASE INVOICE RULE</Text>
              <Text style={styles.singlePurchaseRuleDesc}>
                Points rates (3%, 5%, 6%) are earned strictly on the value of each single purchase bill. Bills are not combined to determine slab rates.
              </Text>
            </View>
          </View>

          {/* Slabs Table matching exact scheme */}
          <View style={styles.tableCard}>
            <View style={styles.tableHeaderRow}>
              <Text style={styles.tableHeadLeft}>Single Invoice Value</Text>
              <Text style={styles.tableHeadRight}>Points Earned</Text>
            </View>

            <View style={styles.tableDataRow}>
              <View>
                <Text style={styles.tableCellLeft}>Up To ₹ 20,000</Text>
                <Text style={styles.tableCellSub}>Single purchase bill</Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={styles.tableCellRight}>Get 3%</Text>
                <Text style={styles.tableCellSub}>of invoice value</Text>
              </View>
            </View>

            <View style={styles.tableDataRow}>
              <View>
                <Text style={styles.tableCellLeft}>₹ 20,001 to ₹ 50,000</Text>
                <Text style={styles.tableCellSub}>Single purchase bill</Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={styles.tableCellRight}>Get 5%</Text>
                <Text style={styles.tableCellSub}>of invoice value</Text>
              </View>
            </View>

            <View style={[styles.tableDataRow, { borderBottomWidth: 0 }]}>
              <View>
                <Text style={styles.tableCellLeft}>₹ 50,001 and above</Text>
                <Text style={styles.tableCellSub}>Single purchase bill</Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={styles.tableCellRight}>Get 6%</Text>
                <Text style={styles.tableCellSub}>of invoice value</Text>
              </View>
            </View>
          </View>

          {/* Annual Bonus Card */}
          <View style={styles.bonusHighlightCard}>
            <View style={styles.bonusIconCircle}>
              <Ionicons name="trophy" size={22} color="#D4AF37" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.bonusHighlightTitle}>20% Annual Milestone Bonus</Text>
              <Text style={styles.bonusHighlightDesc}>
                On accumalated purchase of INR 1,00,000 and above, you get 20% bonus of the total points earned in the year
              </Text>
            </View>
          </View>

          {/* Core Scheme Rules: Redemption & Validity */}
          <View style={styles.schemeDualRow}>
            <View style={styles.schemeDualBox}>
              <View style={styles.schemeDualIconCircle}>
                <Ionicons name="pricetag" size={18} color="#D4AF37" />
              </View>
              <Text style={styles.schemeDualLabel}>Redemption</Text>
              <Text style={styles.schemeDualValue}>1 Point = ₹ 1</Text>
              <Text style={styles.schemeDualSub}>
                Each point is equivelant to redemption of Rs. 1
              </Text>
            </View>

            <View style={styles.schemeDualBox}>
              <View style={styles.schemeDualIconCircle}>
                <Ionicons name="time" size={18} color="#D4AF37" />
              </View>
              <Text style={styles.schemeDualLabel}>Points Validity</Text>
              <Text style={styles.schemeDualValue}>2 Years</Text>
              <Text style={styles.schemeDualSub}>
                Accumulated points validity: 2 Years
              </Text>
            </View>
          </View>

          {/* Interactive Calculator */}
          <View style={{ marginTop: 20 }}>
            <PointsCalculator
              onPointsCredited={() => {
                fetchLoyaltyData();
                refreshProfile();
              }}
            />
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
            <Text style={styles.balanceInfoLabel}>AVAILABLE POINTS BALANCE</Text>
            <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6, marginVertical: 4 }}>
              <Text style={styles.balanceInfoValue}>
                {availablePoints.toLocaleString('en-IN')}
              </Text>
              <Text style={{ fontSize: 16, fontWeight: '800', color: '#D4AF37' }}>PTS</Text>
            </View>
            <View style={styles.rupeeValuePill}>
              <Ionicons name="pricetag" size={13} color="#D4AF37" />
              <Text style={styles.rupeeValueText}>
                Worth ₹{availablePoints.toLocaleString('en-IN')} Cash Value (1 pt = ₹1)
              </Text>
            </View>
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

  // SCREEN: GO SILVER CELEBRATION SCHEME (2027 - 2028)
  if (activeView === 'jubilee') {
    const accSpend = jubilee?.accumulated_spend ?? 0;
    const progress = Math.min(100, Math.round((accSpend / 200000) * 100));

    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.topHeader}>
          <TouchableOpacity onPress={() => setActiveView('dashboard')} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color="#111111" />
          </TouchableOpacity>
          <View style={styles.headerLogoTitleWrap}>
            <Image source={GO_SILVER_LOGO} style={styles.headerGoSilverLogo} resizeMode="contain" />
            <Text style={styles.headerTitle}>Go silver (2027-2028)</Text>
          </View>
          <View style={{ width: 24 }} />
        </View>

        <ScrollView contentContainerStyle={styles.screenPadding} showsVerticalScrollIndicator={false}>
          {/* Hero Celebration Banner in Pure Silver Tone */}
          <View style={styles.jubileeHeroCard}>
            {/* Upcoming Status Badge on its own line */}
            <View style={styles.jubileeHeroBadgeRow}>
              <View style={styles.jubileeHeroBadge}>
                <Ionicons name="time-outline" size={13} color="#0F172A" />
                <Text style={styles.jubileeHeroBadgeText}>UPCOMING SCHEME • STARTS 1 JAN 2027</Text>
              </View>
            </View>

            {/* Title & Medallion Row */}
            <View style={styles.jubileeHeroTitleRow}>
              <View style={{ flex: 1, paddingRight: 12 }}>
                <Text style={styles.jubileeHeroTitle}>Go silver (2027-2028)</Text>
                <Text style={styles.jubileeHeroTagline}>25th Anniversary Celebration</Text>
              </View>
              <Image source={GO_SILVER_LOGO} style={styles.jubileeHeroLogo} resizeMode="contain" />
            </View>
            <Text style={styles.jubileeHeroSubtitle}>
              THE HUB is completing 25 glorious years in 2028! The exclusive Go Silver Celebration Scheme officially begins on 1st January 2027. All in-store and online purchases billed between 1st Jan 2027 and 1st Aug 2028 will automatically accumulate toward certified pure silver gifts and VIP celebration event passes.
            </Text>

            <View style={styles.jubileeHeroDatesRow}>
              <View style={styles.jubileeDatePill}>
                <Ionicons name="calendar-outline" size={13} color="#E2E8F0" />
                <Text style={styles.jubileeDatePillText}>1 Jan 2027 – 1 Aug 2028</Text>
              </View>
              <View style={styles.jubileeDurationPill}>
                <Text style={styles.jubileeDurationPillText}>19 Months Window</Text>
              </View>
              <View style={[styles.jubileeDurationPill, { backgroundColor: 'rgba(56, 189, 248, 0.15)', borderColor: '#38BDF8' }]}>
                <Text style={[styles.jubileeDurationPillText, { color: '#38BDF8', fontWeight: '700' }]}>Event Not Started Yet</Text>
              </View>
            </View>
          </View>

          {/* User Progress Tracker Card in Silver Tone */}
          <View style={styles.jubileeTrackerCard}>
            <View style={styles.jubileeTrackerHeader}>
              <View>
                <Text style={styles.jubileeTrackerLabel}>YOUR GO SILVER ACCUMULATED SPEND</Text>
                <Text style={styles.jubileeTrackerAmount}>
                  ₹ {accSpend.toLocaleString('en-IN')}
                </Text>
                <Text style={styles.jubileeStartsNotice}>
                  {accSpend === 0
                    ? 'Event not started yet • Purchases will begin accumulating from 1 Jan 2027'
                    : 'Accumulation active for 2027-2028'}
                </Text>
              </View>
              <View style={styles.jubileeTargetBox}>
                <Text style={styles.jubileeTargetPercent}>{progress}%</Text>
                <Text style={styles.jubileeTargetLabel}>of ₹2,00,000</Text>
              </View>
            </View>

            <View style={styles.jubileeProgressBarTrack}>
              <View style={[styles.jubileeProgressBarFill, { width: `${progress}%` }]} />
            </View>

            <Text style={styles.jubileeNextGoalText}>
              {accSpend === 0
                ? '⏳ The Go Silver Celebration Scheme period starts on 1st January 2027. All purchases billed during the 19-month window will accumulate here to unlock certified pure silver rewards and event passes!'
                : jubilee?.surprise_gift_unlocked
                ? '🎉 Congratulations! You have unlocked ALL 4 GO SILVER Rewards, including the Grand Surprise Luxury Gift & Event Entry!'
                : jubilee?.silver_ganesha_idol_unlocked
                ? `You have unlocked the Pure Silver Ganesha Idol & Event Pass! Spend ₹${Math.max(0, 200000 - accSpend).toLocaleString('en-IN')} more to unlock the Grand Surprise Luxury Gift.`
                : jubilee?.silver_coin_unlocked
                ? `You have unlocked the Pure Silver Coin & Event Pass! Spend ₹${Math.max(0, 200000 - accSpend).toLocaleString('en-IN')} more for the Grand Surprise Gift.`
                : jubilee?.event_pass_unlocked
                ? `You have unlocked the GO SILVER Celebration Event Pass! Spend ₹${Math.max(0, 100000 - accSpend).toLocaleString('en-IN')} more to unlock the Certified Pure Silver Coin.`
                : `Spend ₹${Math.max(0, 50000 - accSpend).toLocaleString('en-IN')} on purchases during 2027-2028 to unlock your GO SILVER Celebration Event Pass.`}
            </Text>
          </View>

          {/* Milestone 1: Event Pass */}
          <View style={[styles.milestoneCard, jubilee?.event_pass_unlocked && styles.milestoneCardActive]}>
            <View style={styles.milestoneIconWrap}>
              <Text style={{ fontSize: 26 }}>🎟️</Text>
            </View>
            <View style={{ flex: 1 }}>
              <View style={styles.milestoneHeaderRow}>
                <Text style={styles.milestoneTitle}>GO SILVER Event Pass</Text>
                <View style={[styles.milestoneStatusBadge, jubilee?.event_pass_unlocked ? styles.badgeUnlocked : styles.badgeLocked]}>
                  <Text style={[styles.milestoneStatusText, jubilee?.event_pass_unlocked ? styles.statusUnlockedText : styles.statusLockedText]}>
                    {jubilee?.event_pass_unlocked ? 'UNLOCKED' : 'SPEND > ₹50,000'}
                  </Text>
                </View>
              </View>
              <Text style={styles.milestoneCriteria}>Qualification: Spend more than ₹50,000</Text>
              <Text style={styles.milestoneDesc}>
                Exclusive Invitation Pass to attend THE HUB's grand 25-Year GO SILVER Celebration Mega Event with gala dinner, fashion showcase, and live entertainment.
              </Text>
            </View>
          </View>

          {/* Milestone 2: Silver Coin */}
          <View style={[styles.milestoneCard, jubilee?.silver_coin_unlocked && styles.milestoneCardActive]}>
            <View style={[styles.milestoneIconWrap, styles.milestoneCoinIconWrap]}>
              <Image source={GO_SILVER_LOGO} style={styles.milestoneCoinImg} resizeMode="contain" />
            </View>
            <View style={{ flex: 1 }}>
              <View style={styles.milestoneHeaderRow}>
                <Text style={styles.milestoneTitle}>Certified Pure Silver Coin</Text>
                <View style={[styles.milestoneStatusBadge, jubilee?.silver_coin_unlocked ? styles.badgeUnlocked : styles.badgeLocked]}>
                  <Text style={[styles.milestoneStatusText, jubilee?.silver_coin_unlocked ? styles.statusUnlockedText : styles.statusLockedText]}>
                    {jubilee?.silver_coin_unlocked ? 'UNLOCKED' : 'SPEND > ₹1,00,000'}
                  </Text>
                </View>
              </View>
              <Text style={styles.milestoneCriteria}>Qualification: Spend more than ₹1,00,000</Text>
              <Text style={styles.milestoneDesc}>
                Custom-minted 25th Anniversary Certified Pure Silver Coin (999 Purity) hallmarked with THE HUB commemorative anniversary insignia.
              </Text>
            </View>
          </View>

          {/* Milestone 3: Silver Ganesha Idol */}
          <View style={[styles.milestoneCard, jubilee?.silver_ganesha_idol_unlocked && styles.milestoneCardActive]}>
            <View style={styles.milestoneIconWrap}>
              <Text style={{ fontSize: 26 }}>🪔</Text>
            </View>
            <View style={{ flex: 1 }}>
              <View style={styles.milestoneHeaderRow}>
                <Text style={styles.milestoneTitle}>Pure Silver Lord Ganesha Idol</Text>
                <View style={[styles.milestoneStatusBadge, jubilee?.silver_ganesha_idol_unlocked ? styles.badgeUnlocked : styles.badgeLocked]}>
                  <Text style={[styles.milestoneStatusText, jubilee?.silver_ganesha_idol_unlocked ? styles.statusUnlockedText : styles.statusLockedText]}>
                    {jubilee?.silver_ganesha_idol_unlocked ? 'UNLOCKED' : '₹1,00,000 TO ₹2,00,000'}
                  </Text>
                </View>
              </View>
              <Text style={styles.milestoneCriteria}>Qualification: Spend between ₹1,00,000 and ₹2,00,000</Text>
              <Text style={styles.milestoneDesc}>
                Auspicious handcrafted Pure Silver Lord Ganesha Idol — an upgraded divine keepsake symbolizing prosperity, auspicious beginnings, and enduring grace.
              </Text>
            </View>
          </View>

          {/* Milestone 4: Surprise Luxury Gift */}
          <View style={[styles.milestoneCard, jubilee?.surprise_gift_unlocked && styles.milestoneCardActive]}>
            <View style={styles.milestoneIconWrap}>
              <Text style={{ fontSize: 26 }}>🎁</Text>
            </View>
            <View style={{ flex: 1 }}>
              <View style={styles.milestoneHeaderRow}>
                <Text style={styles.milestoneTitle}>Grand Surprise Luxury Gift</Text>
                <View style={[styles.milestoneStatusBadge, jubilee?.surprise_gift_unlocked ? styles.badgeUnlocked : styles.badgeLocked]}>
                  <Text style={[styles.milestoneStatusText, jubilee?.surprise_gift_unlocked ? styles.statusUnlockedText : styles.statusLockedText]}>
                    {jubilee?.surprise_gift_unlocked ? 'UNLOCKED' : 'SPEND > ₹2,00,000'}
                  </Text>
                </View>
              </View>
              <Text style={styles.milestoneCriteria}>Qualification: Spend more than ₹2,00,000</Text>
              <Text style={styles.milestoneDesc}>
                The ultimate GO SILVER tribute! An exclusive Grand Surprise Luxury Gift Hamper with curated bespoke merchandise and VIP concierge hospitality at the celebration.
              </Text>
            </View>
          </View>

          {/* Scheme Information & FAQs */}
          <View style={styles.jubileeInfoBox}>
            <View style={styles.jubileeInfoTitleRow}>
              <Ionicons name="information-circle" size={18} color="#94A3B8" />
              <Text style={styles.jubileeInfoTitle}>GO SILVER DETAILS & FAQ</Text>
            </View>
            <View style={styles.jubileeFaqItem}>
              <Text style={styles.faqQ}>How are purchases accumulated?</Text>
              <Text style={styles.faqA}>
                All in-store and online purchases billed to your registered mobile number between 1st January 2027 and 1st August 2028 are automatically accumulated under your GO SILVER ledger.
              </Text>
            </View>
            <View style={styles.jubileeFaqItem}>
              <Text style={styles.faqQ}>Do I still earn normal HUBKLUB reward points?</Text>
              <Text style={styles.faqA}>
                YES! You continue earning standard HUBKLUB points (3% to 6% per invoice + 20% annual points bonus at ₹1L) completely unaffected. These GO SILVER physical rewards and event entry are special bonus gifts.
              </Text>
            </View>
            <View style={styles.jubileeFaqItem}>
              <Text style={styles.faqQ}>When and where will the gifts be distributed?</Text>
              <Text style={styles.faqA}>
                Physical silver gifts (Coin / Ganesha Idol / Surprise Gift) and celebration passes will be handed over to qualifying members during THE HUB's 25th Year GO SILVER Celebration Event in August 2028.
              </Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.blackActionBtn}
            onPress={() => setActiveView('dashboard')}
            activeOpacity={0.88}
          >
            <Text style={styles.blackActionBtnText}>Back to HUBKLUB Dashboard</Text>
          </TouchableOpacity>
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
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Sub-view switcher shortcuts */}
        <View style={styles.shortcutsRow}>
          <TouchableOpacity onPress={() => setActiveView('eligibility')} style={styles.shortcutChip}>
            <Text style={styles.shortcutText}>Eligibility</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setActiveView('rules')} style={styles.shortcutChip}>
            <Text style={styles.shortcutText}>The Point That Matters</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setActiveView('jubilee')} style={[styles.shortcutChip, styles.jubileeShortcutChip]}>
            <Image source={GO_SILVER_LOGO} style={styles.shortcutLogoImg} resizeMode="contain" />
            <Text style={[styles.shortcutText, styles.jubileeShortcutText]}>Go silver (2027-2028)</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setActiveView('history')} style={styles.shortcutChip}>
            <Text style={styles.shortcutText}>History</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setActiveView('expiry')} style={styles.shortcutChip}>
            <Text style={styles.shortcutText}>Expiry</Text>
          </TouchableOpacity>
        </View>

        {/* Luxury HUBKLUB VIP Member & Points Card */}
        <View style={styles.goldMemberCard}>
          <View style={styles.cardHeaderRow}>
            <View style={styles.tierShieldRow}>
              <View style={styles.goldIconBadge}>
                <Ionicons name="sparkles" size={16} color="#D4AF37" />
              </View>
              <View style={{ marginLeft: 10 }}>
                <Text style={styles.tierName}>{userTier} Member</Text>
                <Text style={styles.tierMemberSince}>{memberSinceStr}</Text>
              </View>
            </View>
            <View style={styles.hubklubWatermarkPill}>
              <Text style={styles.hubklubWatermarkText}>HUBKLUB</Text>
            </View>
          </View>

          {/* Prominent High-Visibility Points Section */}
          <View style={styles.prominentPointsContainer}>
            <Text style={styles.prominentPointsLabel}>AVAILABLE POINTS BALANCE</Text>
            <View style={styles.prominentPointsNumberRow}>
              <Text style={styles.prominentPointsValue}>
                {availablePoints.toLocaleString('en-IN')}
              </Text>
              <Text style={styles.prominentPointsUnit}>PTS</Text>
            </View>

            <View style={styles.rupeeValuePill}>
              <Ionicons name="pricetag" size={13} color="#D4AF37" />
              <Text style={styles.rupeeValueText}>
                Worth ₹{availablePoints.toLocaleString('en-IN')} Cash Value (1 pt = ₹1)
              </Text>
            </View>
          </View>

          <View style={styles.cardActionsRow}>
            <TouchableOpacity
              style={styles.cardRedeemBtn}
              onPress={() => setActiveView('redeem')}
              activeOpacity={0.85}
            >
              <Ionicons name="gift" size={15} color="#111111" style={{ marginRight: 6 }} />
              <Text style={styles.cardRedeemText}>Redeem Points</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.cardHistoryBtn}
              onPress={() => setActiveView('history')}
              activeOpacity={0.85}
            >
              <Text style={styles.cardHistoryBtnText}>History</Text>
            </TouchableOpacity>
          </View>
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

        {/* THE POINT THAT MATTERS Scheme Promo Section */}
        <View style={styles.schemeDashboardSection}>
          <View style={styles.schemeDashboardHeaderRow}>
            <Text style={styles.progressSectionTitle}>THE POINT THAT MATTERS</Text>
            <TouchableOpacity onPress={() => setActiveView('rules')}>
              <Text style={styles.seeAllRulesText}>View Details &gt;</Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity
            style={styles.schemePromoCard}
            onPress={() => setActiveView('rules')}
            activeOpacity={0.9}
          >
            <View style={styles.schemePromoTop}>
              <View style={styles.schemePromoPill}>
                <Ionicons name="sparkles" size={12} color="#D4AF37" />
                <Text style={styles.schemePromoPillText}>EARN ON EVERY PURCHASE</Text>
              </View>
              <Text style={styles.schemePromoRateHighlight}>Up to 6% Points Back</Text>
            </View>
            <View style={styles.schemePromoGrid}>
              <View style={styles.schemePromoItem}>
                <Text style={styles.schemePromoItemSlab}>Up To ₹ 20,000</Text>
                <Text style={styles.schemePromoItemRate}>3% Back</Text>
              </View>
              <View style={styles.schemePromoItemDivider} />
              <View style={styles.schemePromoItem}>
                <Text style={styles.schemePromoItemSlab}>₹ 20,001 - ₹ 50,000</Text>
                <Text style={styles.schemePromoItemRate}>5% Back</Text>
              </View>
              <View style={styles.schemePromoItemDivider} />
              <View style={styles.schemePromoItem}>
                <Text style={styles.schemePromoItemSlab}>₹ 50,001 & Above</Text>
                <Text style={styles.schemePromoItemRate}>6% Back</Text>
              </View>
            </View>
            <View style={styles.schemePromoFooter}>
              <View style={styles.schemePromoFootItem}>
                <Ionicons name="gift-outline" size={13} color="#D4AF37" />
                <Text style={styles.schemePromoFootText}>20% Annual Bonus at ₹1L+ spend</Text>
              </View>
              <View style={styles.schemePromoFootItem}>
                <Ionicons name="time-outline" size={13} color="#D4AF37" />
                <Text style={styles.schemePromoFootText}>1 pt = ₹1 • 2 Yrs Validity</Text>
              </View>
            </View>
          </TouchableOpacity>
        </View>

        {/* GO SILVER Scheme Promo Card */}
        <View style={styles.jubileeDashboardSection}>
          <View style={styles.schemeDashboardHeaderRow}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Image source={GO_SILVER_LOGO} style={styles.mainHeadingLogo} resizeMode="contain" />
              <Text style={styles.progressSectionTitle}>Go silver (2027-2028)</Text>
            </View>
            <TouchableOpacity onPress={() => setActiveView('jubilee')}>
              <Text style={styles.seeAllRulesText}>View Scheme &gt;</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={styles.jubileePromoCard}
            onPress={() => setActiveView('jubilee')}
            activeOpacity={0.9}
          >
            <View style={styles.jubileePromoTopRow}>
              <View style={styles.jubileeBadgePill}>
                <Image source={GO_SILVER_LOGO} style={styles.jubileeBadgeMiniLogo} resizeMode="contain" />
                <Text style={styles.jubileeBadgePillText}>UPCOMING SCHEME</Text>
              </View>
              <View style={styles.jubileeDateBadge}>
                <Ionicons name="calendar-outline" size={11} color="#CBD5E1" />
                <Text style={styles.jubileeDatesText}>1 Jan 2027 – 1 Aug 2028</Text>
              </View>
            </View>

            <View style={styles.jubileePromoBodyRow}>
              <View style={{ flex: 1, paddingRight: 10 }}>
                <Text style={styles.jubileeCardHeadline}>
                  Go silver (2027-2028)
                </Text>
                <Text style={styles.jubileeCardSub}>
                  Scheme starts 1st Jan 2027. All purchases between Jan 2027 and Aug 2028 accumulate toward certified pure silver gifts & VIP event passes.
                </Text>
              </View>
              <Image source={GO_SILVER_LOGO} style={styles.jubileePromoLogo} resizeMode="contain" />
            </View>

            {/* Quick 4 milestones pill grid */}
            <View style={styles.jubileePillGrid}>
              <View style={[styles.jubileeMilestonePill, jubilee?.event_pass_unlocked ? styles.jubileePillUnlocked : null]}>
                <Text style={styles.jubileePillEmoji}>🎟️</Text>
                <View>
                  <Text style={styles.jubileePillTitle}>Event Pass</Text>
                  <Text style={styles.jubileePillSpend}>Spend &gt; ₹50k</Text>
                </View>
              </View>
              <View style={[styles.jubileeMilestonePill, jubilee?.silver_coin_unlocked ? styles.jubileePillUnlocked : null]}>
                <Image source={GO_SILVER_LOGO} style={styles.jubileePillLogoImg} resizeMode="contain" />
                <View>
                  <Text style={styles.jubileePillTitle}>Silver Coin</Text>
                  <Text style={styles.jubileePillSpend}>Spend &gt; ₹1L</Text>
                </View>
              </View>
              <View style={[styles.jubileeMilestonePill, jubilee?.silver_ganesha_idol_unlocked ? styles.jubileePillUnlocked : null]}>
                <Text style={styles.jubileePillEmoji}>🪔</Text>
                <View>
                  <Text style={styles.jubileePillTitle}>Silver Ganesha</Text>
                  <Text style={styles.jubileePillSpend}>₹1L – ₹2L</Text>
                </View>
              </View>
              <View style={[styles.jubileeMilestonePill, jubilee?.surprise_gift_unlocked ? styles.jubileePillUnlocked : null]}>
                <Text style={styles.jubileePillEmoji}>🎁</Text>
                <View>
                  <Text style={styles.jubileePillTitle}>Surprise Gift</Text>
                  <Text style={styles.jubileePillSpend}>Spend &gt; ₹2L</Text>
                </View>
              </View>
            </View>

            <View style={styles.jubileePromoFooterRow}>
              <View>
                <Text style={styles.jubileeSpendTrackerText}>
                  Accumulated Spend:{' '}
                  <Text style={{ fontWeight: '800', color: '#E2E8F0' }}>
                    ₹{(jubilee?.accumulated_spend ?? 0).toLocaleString('en-IN')}
                  </Text>
                </Text>
                <Text style={styles.jubileeStartsFootnote}>Event not started • Starts 1st Jan 2027</Text>
              </View>
              <View style={styles.jubileeViewBtn}>
                <Text style={styles.jubileeViewBtnText}>View Details</Text>
                <Ionicons name="arrow-forward" size={13} color="#0F172A" />
              </View>
            </View>
          </TouchableOpacity>
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
  topHeaderBrandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dashboardBrandLogo: {
    width: 90,
    height: 28,
  },
  hubklubTagBadge: {
    backgroundColor: '#C5A880',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 5,
  },
  hubklubTagText: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#111111',
    letterSpacing: 0.8,
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

  // Screen 13: Luxury Gold Member Card
  goldMemberCard: {
    backgroundColor: '#161616',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1.5,
    borderColor: '#C5A880',
    marginBottom: 20,
    shadowColor: '#C5A880',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 5,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(197, 168, 128, 0.25)',
    paddingBottom: 12,
  },
  tierShieldRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  goldIconBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(212, 175, 55, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#D4AF37',
  },
  tierName: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  tierMemberSince: {
    fontSize: 11,
    color: '#C5A880',
    marginTop: 2,
    fontWeight: '500',
  },
  hubklubWatermarkPill: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  hubklubWatermarkText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#E0E0E0',
    letterSpacing: 1.2,
  },
  prominentPointsContainer: {
    marginVertical: 4,
    marginBottom: 16,
  },
  prominentPointsLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#C5A880',
    letterSpacing: 1.2,
    marginBottom: 4,
  },
  prominentPointsNumberRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
  },
  prominentPointsValue: {
    fontSize: 38,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: -0.5,
  },
  prominentPointsUnit: {
    fontSize: 16,
    fontWeight: '800',
    color: '#D4AF37',
  },
  rupeeValuePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(212, 175, 55, 0.12)',
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    marginTop: 8,
    gap: 6,
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.3)',
  },
  rupeeValueText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#E8D5B5',
  },
  cardActionsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  cardRedeemBtn: {
    flex: 2,
    backgroundColor: '#C5A880',
    borderRadius: 8,
    height: 44,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardRedeemText: {
    color: '#111111',
    fontSize: 14,
    fontWeight: '800',
  },
  cardHistoryBtn: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 8,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  cardHistoryBtnText: {
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
    backgroundColor: '#161616',
    borderRadius: 14,
    padding: 20,
    marginBottom: 20,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#C5A880',
    shadowColor: '#C5A880',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  balanceInfoLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#C5A880',
    letterSpacing: 1.2,
    marginBottom: 4,
  },
  balanceInfoValue: {
    fontSize: 36,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: -0.5,
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

  // THE POINT THAT MATTERS Styles
  singlePurchaseRuleBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FBF8F3',
    borderWidth: 1,
    borderColor: '#EFE5CE',
    borderRadius: 8,
    padding: 12,
    marginBottom: 14,
    gap: 10,
  },
  singlePurchaseRuleTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#9E7D3B',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  singlePurchaseRuleDesc: {
    fontSize: 11,
    color: '#555555',
    lineHeight: 16,
  },
  schemeHeroCard: {
    backgroundColor: '#161616',
    borderRadius: 12,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#C5A880',
  },
  schemeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(212, 175, 55, 0.15)',
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    marginBottom: 8,
  },
  schemeBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#D4AF37',
    letterSpacing: 0.8,
  },
  schemeHeroTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 0.6,
  },
  schemeHeroSubtitle: {
    fontSize: 13,
    color: '#C5A880',
    marginTop: 4,
    fontWeight: '500',
  },
  tableCellSub: {
    fontSize: 10,
    color: '#8E8E93',
    marginTop: 2,
  },
  bonusHighlightCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFDF9',
    borderWidth: 1,
    borderColor: '#E8D8BF',
    borderRadius: 10,
    padding: 14,
    marginBottom: 14,
    gap: 12,
  },
  bonusIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F7EEDF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bonusHighlightTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#111111',
  },
  bonusHighlightDesc: {
    fontSize: 11,
    color: '#666666',
    marginTop: 2,
    lineHeight: 16,
  },
  schemeDualRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 10,
  },
  schemeDualBox: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#EEEEEE',
    borderRadius: 10,
    padding: 12,
  },
  schemeDualIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FAF5EE',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  schemeDualLabel: {
    fontSize: 11,
    color: '#8E8E93',
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  schemeDualValue: {
    fontSize: 15,
    fontWeight: '800',
    color: '#111111',
    marginVertical: 2,
  },
  schemeDualSub: {
    fontSize: 10,
    color: '#666666',
    lineHeight: 14,
  },

  // Dashboard Promo Card
  schemeDashboardSection: {
    marginTop: 20,
  },
  schemeDashboardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  seeAllRulesText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#C5A880',
  },
  schemePromoCard: {
    backgroundColor: '#1C1C1E',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#333333',
  },
  schemePromoTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  schemePromoPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(212, 175, 55, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  schemePromoPillText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#D4AF37',
    letterSpacing: 0.5,
  },
  schemePromoRateHighlight: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  schemePromoGrid: {
    flexDirection: 'row',
    backgroundColor: '#262628',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 6,
    alignItems: 'center',
    marginBottom: 12,
  },
  schemePromoItem: {
    flex: 1,
    alignItems: 'center',
  },
  schemePromoItemSlab: {
    fontSize: 10,
    color: '#AAAAAA',
    marginBottom: 2,
    textAlign: 'center',
  },
  schemePromoItemRate: {
    fontSize: 13,
    fontWeight: '800',
    color: '#D4AF37',
  },
  schemePromoItemDivider: {
    width: 1,
    height: 24,
    backgroundColor: '#3E3E42',
  },
  schemePromoFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#2C2C2E',
    paddingTop: 10,
  },
  schemePromoFootItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  schemePromoFootText: {
    fontSize: 10,
    color: '#CCCCCC',
  },
  jubileeShortcutChip: {
    backgroundColor: '#0F172A',
    borderColor: '#CBD5E1',
    borderWidth: 1.2,
    flexDirection: 'row',
    alignItems: 'center',
  },
  jubileeShortcutText: {
    color: '#F1F5F9',
    fontWeight: '800',
  },
  jubileeHeroCard: {
    backgroundColor: '#161A23',
    borderRadius: 16,
    padding: 22,
    marginBottom: 18,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    shadowColor: '#E2E8F0',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.28,
    shadowRadius: 14,
    elevation: 6,
  },
  headerLogoTitleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerGoSilverLogo: {
    width: 26,
    height: 26,
    borderRadius: 13,
  },
  mainHeadingLogo: {
    width: 22,
    height: 22,
    borderRadius: 11,
  },
  jubileeStartsNotice: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 3,
    fontStyle: 'italic',
  },
  jubileeStartsFootnote: {
    fontSize: 10,
    color: '#94A3B8',
    marginTop: 2,
  },
  jubileeHeroBadgeRow: {
    marginBottom: 12,
  },
  jubileeHeroTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  jubileeHeroTagline: {
    fontSize: 12,
    color: '#CBD5E1',
    fontWeight: '600',
    marginTop: 2,
  },
  jubileeHeroLogo: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 2,
    borderColor: '#CBD5E1',
    backgroundColor: '#0F172A',
  },
  jubileeBadgeMiniLogo: {
    width: 14,
    height: 14,
    borderRadius: 7,
  },
  shortcutLogoImg: {
    width: 15,
    height: 15,
    borderRadius: 7.5,
    marginRight: 4,
  },
  milestoneCoinIconWrap: {
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  milestoneCoinImg: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  jubileePromoBodyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  jubileePromoLogo: {
    width: 58,
    height: 58,
    borderRadius: 29,
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    backgroundColor: '#0F172A',
  },
  jubileePillLogoImg: {
    width: 18,
    height: 18,
    borderRadius: 9,
  },
  jubileeHeroBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F8FAFC',
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    shadowColor: '#CBD5E1',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  jubileeHeroBadgeText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#0F172A',
    letterSpacing: 0.8,
  },
  jubileeHeroTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 0.4,
    marginBottom: 8,
  },
  jubileeHeroSubtitle: {
    fontSize: 13,
    color: '#CBD5E1',
    lineHeight: 20,
    marginBottom: 16,
  },
  jubileeHeroDatesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  jubileeDatePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(248, 250, 252, 0.08)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#94A3B8',
  },
  jubileeDatePillText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#F8FAFC',
  },
  jubileeDurationPill: {
    backgroundColor: 'rgba(226, 232, 240, 0.12)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(226, 232, 240, 0.22)',
    justifyContent: 'center',
  },
  jubileeDurationPillText: {
    fontSize: 10.5,
    color: '#CBD5E1',
    fontWeight: '600',
  },
  jubileeTrackerCard: {
    backgroundColor: '#161A23',
    borderRadius: 14,
    padding: 18,
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    marginBottom: 18,
    shadowColor: '#CBD5E1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.22,
    shadowRadius: 10,
    elevation: 4,
  },
  jubileeTrackerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  jubileeTrackerLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#94A3B8',
    letterSpacing: 0.8,
  },
  jubileeTrackerAmount: {
    fontSize: 24,
    fontWeight: '900',
    color: '#FFFFFF',
    marginTop: 2,
    letterSpacing: 0.5,
  },
  jubileeTargetBox: {
    alignItems: 'flex-end',
  },
  jubileeTargetPercent: {
    fontSize: 20,
    fontWeight: '900',
    color: '#E2E8F0',
  },
  jubileeTargetLabel: {
    fontSize: 10,
    color: '#94A3B8',
  },
  jubileeProgressBarTrack: {
    height: 7,
    backgroundColor: '#272E3F',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(226, 232, 240, 0.15)',
  },
  jubileeProgressBarFill: {
    height: '100%',
    backgroundColor: '#E2E8F0',
    borderRadius: 4,
  },
  jubileeNextGoalText: {
    fontSize: 12.5,
    color: '#CBD5E1',
    lineHeight: 19,
    marginTop: 10,
    fontWeight: '600',
  },
  milestoneCard: {
    flexDirection: 'row',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 12,
    gap: 12,
  },
  milestoneCardActive: {
    backgroundColor: '#F1F5F9',
    borderColor: '#94A3B8',
    borderWidth: 1.5,
  },
  milestoneIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  milestoneHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 3,
    flexWrap: 'wrap',
    gap: 4,
  },
  milestoneTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
  },
  milestoneStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  badgeUnlocked: {
    backgroundColor: '#E2E8F0',
  },
  badgeLocked: {
    backgroundColor: '#F3F4F6',
  },
  milestoneStatusText: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  statusUnlockedText: {
    color: '#0F172A',
  },
  statusLockedText: {
    color: '#6B7280',
  },
  milestoneCriteria: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
    marginBottom: 4,
  },
  milestoneDesc: {
    fontSize: 12,
    color: '#64748B',
    lineHeight: 17,
  },
  jubileeInfoBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    marginTop: 6,
    marginBottom: 20,
  },
  jubileeInfoTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
  },
  jubileeInfoTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: 0.5,
  },
  jubileeFaqItem: {
    marginBottom: 10,
  },
  faqQ: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 2,
  },
  faqA: {
    fontSize: 11,
    color: '#64748B',
    lineHeight: 16,
  },
  jubileeDashboardSection: {
    marginTop: 18,
    marginBottom: 10,
  },
  jubileePromoCard: {
    backgroundColor: '#161A23',
    borderRadius: 16,
    padding: 18,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    shadowColor: '#E2E8F0',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.28,
    shadowRadius: 12,
    elevation: 5,
  },
  jubileePromoTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 12,
  },
  jubileeBadgePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 8,
    paddingVertical: 3.5,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  jubileeBadgePillText: {
    fontSize: 9,
    fontWeight: '900',
    color: '#0F172A',
    letterSpacing: 0.8,
  },
  jubileeDateBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(248, 250, 252, 0.08)',
    paddingHorizontal: 8,
    paddingVertical: 3.5,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(203, 213, 225, 0.28)',
  },
  jubileeDatesText: {
    fontSize: 10,
    color: '#E2E8F0',
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  jubileeCardHeadline: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 5,
    lineHeight: 21,
  },
  jubileeCardSub: {
    fontSize: 11.5,
    color: '#94A3B8',
    lineHeight: 17,
    marginBottom: 14,
  },
  jubileePillGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 7,
    marginBottom: 14,
  },
  jubileeMilestonePill: {
    flex: 1,
    minWidth: '47%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#1E2330',
    paddingVertical: 8,
    paddingHorizontal: 9,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#2F374A',
  },
  jubileePillUnlocked: {
    borderColor: '#E2E8F0',
    backgroundColor: '#273042',
    borderWidth: 1.2,
  },
  jubileePillEmoji: {
    fontSize: 16,
  },
  jubileePillTitle: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  jubileePillSpend: {
    fontSize: 9,
    color: '#94A3B8',
    fontWeight: '600',
  },
  jubileePromoFooterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#282F3E',
    paddingTop: 12,
  },
  jubileeSpendTrackerText: {
    fontSize: 11.5,
    color: '#CBD5E1',
  },
  jubileeViewBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  jubileeViewBtnText: {
    fontSize: 10.5,
    fontWeight: '900',
    color: '#0F172A',
  },
});
