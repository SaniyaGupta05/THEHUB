import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  Alert,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Switch,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { DEMO_CUSTOMERS } from '../constants/config';
import { useAuth } from '../context/AuthContext';
import { apiClient } from '../api/client';
import { Order } from '../types';

interface AccountScreenProps {
  onNavigateTab?: (tab: 'home' | 'categories' | 'wishlist' | 'hubklub' | 'account') => void;
}

export const AccountScreen: React.FC<AccountScreenProps> = ({ onNavigateTab }) => {
  const {
    activeCustomerId,
    customerProfile,
    switchCustomer,
    isLoggedIn,
    login,
    register,
    loginByIdentifier,
    logout,
    pointsBalance,
    isMember,
    authModalVisible,
    authModalTab,
    openAuthModal,
    closeAuthModal,
  } = useAuth();

  const [orders, setOrders] = useState<Order[]>([]);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [activeSubView, setActiveSubView] = useState<'menu' | 'orders' | 'profile' | 'notifications'>('menu');
  const [orderFilter, setOrderFilter] = useState<'All' | 'Processing' | 'Delivered'>('All');
  const [authError, setAuthError] = useState<string | null>(null);

  // Profile Edit State
  const [editFirstName, setEditFirstName] = useState('');
  const [editLastName, setEditLastName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  // Preferences State
  const [prefOrderUpdates, setPrefOrderUpdates] = useState(true);
  const [prefPointsAlerts, setPrefPointsAlerts] = useState(true);
  const [prefPromos, setPrefPromos] = useState(true);
  const [prefWhatsapp, setPrefWhatsapp] = useState(false);

  // Notifications State
  const [notifications, setNotifications] = useState([
    {
      id: 'notif_1',
      title: 'HUBKLUB Points Credited',
      message: 'Earned 4,080 points on Royal Ivory Tapestry Sherwani Set (₹68,000).',
      time: '2 hours ago',
      type: 'points' as const,
      read: false,
    },
    {
      id: 'notif_2',
      title: '20% Annual Bonus Unlocked',
      message: 'Congratulations! You surpassed ₹1,00,000 annual spend and unlocked Gold 20% bonus points.',
      time: '1 day ago',
      type: 'bonus' as const,
      read: false,
    },
    {
      id: 'notif_3',
      title: 'Order Dispatched',
      message: 'Your order #HK-2024-88412 is on the way. Estimated delivery in 2 days.',
      time: '2 days ago',
      type: 'order' as const,
      read: false,
    },
    {
      id: 'notif_4',
      title: 'Points Expiry Notice',
      message: '450 points expire on 25 Oct. Redeem them on your next in-store or online purchase.',
      time: '3 days ago',
      type: 'alert' as const,
      read: true,
    },
    {
      id: 'notif_5',
      title: 'VIP Private Autumn Preview',
      message: 'Gold Members receive 24-hr exclusive early access to our Autumn Haute Couture drop.',
      time: '5 days ago',
      type: 'promo' as const,
      read: true,
    },
  ]);
  const [notifFilter, setNotifFilter] = useState<'all' | 'unread'>('all');

  useEffect(() => {
    if (customerProfile) {
      setEditFirstName(customerProfile.first_name || '');
      setEditLastName(customerProfile.last_name || '');
      setEditPhone(customerProfile.phone || '');
    }
  }, [customerProfile]);

  const handleSaveProfile = () => {
    if (!editFirstName.trim()) {
      Alert.alert('Required Field', 'First name cannot be empty.');
      return;
    }
    setIsSavingProfile(true);
    setTimeout(() => {
      setIsSavingProfile(false);
      Alert.alert('Profile Updated', 'Your profile details and notification preferences have been saved.');
    }, 600);
  };

  const handleMarkAllNotifsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const toggleNotifRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: !n.read } : n))
    );
  };

  const isGuest = !isLoggedIn || activeCustomerId === 'guest' || !customerProfile;
  const [isRefreshingOrders, setIsRefreshingOrders] = useState(false);

  const fetchOrders = async () => {
    if (isGuest) {
      setOrders([]);
      return;
    }
    try {
      const data = await apiClient.getOrders();
      setOrders(Array.isArray(data) ? data : []);
    } catch (e) {
      console.warn('Failed to load orders', e);
      setOrders([]);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [activeCustomerId, isLoggedIn, isGuest, activeSubView]);

  const onRefreshOrders = async () => {
    setIsRefreshingOrders(true);
    await fetchOrders();
    setIsRefreshingOrders(false);
  };

  const handleLogoutConfirm = () => {
    setShowLogoutConfirm(false);
    logout();
  };


  const displayName = !isGuest && customerProfile
    ? `${customerProfile.first_name || ''} ${customerProfile.last_name || ''}`.trim() || 'Valued Member'
    : 'Guest Shopper';
  const displayEmail = !isGuest && customerProfile?.email
    ? customerProfile.email
    : 'Sign in or create account to access orders & HUBKLUB points';
  const initials = !isGuest && customerProfile
    ? `${customerProfile?.first_name?.[0] || ''}${customerProfile?.last_name?.[0] || ''}`.toUpperCase() || 'HB'
    : '';

  const safeOrders = Array.isArray(orders) ? orders : [];
  const filteredOrders = safeOrders.filter((ord) => {
    if (!ord) return false;
    const status = (ord.status || '').toLowerCase();
    if (orderFilter === 'All') return true;
    if (orderFilter === 'Delivered') {
      return status.includes('delivered') || status.includes('confirmed') || status.includes('completed') || status.includes('synced');
    }
    if (orderFilter === 'Processing') return status.includes('processing') || status.includes('shipped');
    return true;
  });

  // SCREEN 11: MY ORDERS VIEW
  if (activeSubView === 'orders') {
    return (
      <SafeAreaView style={styles.container}>
        {/* Header */}
        <View style={styles.subHeader}>
          <TouchableOpacity onPress={() => setActiveSubView('menu')} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color="#111111" />
          </TouchableOpacity>
          <Text style={styles.subHeaderTitle}>My Orders</Text>
          <View style={{ width: 24 }} />
        </View>

        {/* Filter Tabs: All, Processing, Delivered */}
        <View style={styles.ordersFilterRow}>
          {(['All', 'Processing', 'Delivered'] as const).map((tab) => (
            <TouchableOpacity
              key={tab}
              style={[styles.orderFilterTab, orderFilter === tab && styles.orderFilterTabActive]}
              onPress={() => setOrderFilter(tab)}
            >
              <Text style={[styles.orderFilterText, orderFilter === tab && styles.orderFilterTextActive]}>
                {tab}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <ScrollView
          contentContainerStyle={styles.ordersScrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={isRefreshingOrders} onRefresh={onRefreshOrders} tintColor="#C5A880" />
          }
        >
          {isGuest ? (
            <View style={styles.emptyOrders}>
              <Ionicons name="lock-closed-outline" size={48} color="#C5A880" />
              <Text style={styles.emptyOrdersTitle}>Sign In to View Orders</Text>
              <Text style={styles.emptyOrdersSub}>Your store bills, receipts, and order history are linked to your account.</Text>
              <TouchableOpacity
                style={styles.signInPrimaryBtn}
                onPress={() => openAuthModal('signin')}
              >
                <Text style={styles.signInPrimaryBtnText}>Sign In / Register</Text>
              </TouchableOpacity>
            </View>
          ) : filteredOrders.length === 0 ? (
            <View style={styles.emptyOrders}>
              <Ionicons name="receipt-outline" size={48} color="#CCC" />
              <Text style={styles.emptyOrdersTitle}>No orders in this category</Text>
              <Text style={styles.emptyOrdersSub}>In-store bills and online purchases will automatically appear here with point credits.</Text>
            </View>
          ) : (
            filteredOrders.map((ord) => {
              const isStoreBill = ord.order_number.startsWith('HUB-POS') || ord.id.startsWith('inv_');
              const isDelivered = ord.status.toLowerCase().includes('delivered') || ord.status.toLowerCase().includes('confirmed') || ord.status.toLowerCase().includes('completed') || ord.status.toLowerCase().includes('synced');
              const isShipped = ord.status.toLowerCase().includes('shipped');
              const statusPillStyle = isStoreBill ? styles.pillStoreBill : isDelivered ? styles.pillDelivered : isShipped ? styles.pillShipped : styles.pillProcessing;
              const statusTextStyle = isStoreBill ? styles.pillTextStoreBill : isDelivered ? styles.pillTextDelivered : isShipped ? styles.pillTextShipped : styles.pillTextProcessing;
              const statusLabel = isStoreBill ? 'In-Store Bill' : isDelivered ? 'Delivered' : isShipped ? 'Shipped' : 'Processing';

              return (
                <View key={ord.id} style={styles.orderCard}>
                  <View style={styles.orderTopRow}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      {isStoreBill && <Ionicons name="storefront-outline" size={16} color="#C5A880" />}
                      <Text style={styles.orderIdText}>#{ord.order_number}</Text>
                    </View>
                    <View style={[styles.statusPill, statusPillStyle]}>
                      <Text style={[styles.statusPillText, statusTextStyle]}>{statusLabel}</Text>
                    </View>
                  </View>

                  <Text style={styles.orderMetaText}>
                    {new Date(ord.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}{' '}
                    • ₹ {new Intl.NumberFormat('en-IN').format(ord.total_amount)}
                  </Text>

                  {ord.items && ord.items.length > 0 && (
                    <Text style={{ fontSize: 12, color: '#555555', marginTop: 4 }}>
                      {ord.items.map((i) => i.product_title).join(', ')}
                    </Text>
                  )}

                  <View style={styles.orderBottomBar}>
                    <Text style={styles.orderStoreTag}>
                      {isStoreBill ? 'THE HUB • Vadodara Store Counter' : 'Online Store Order'}
                    </Text>
                    {Boolean(ord.points_earned_estimated && ord.points_earned_estimated > 0) && (
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                        <Ionicons name="sparkles" size={12} color="#C5A880" />
                        <Text style={styles.orderPointsTag}>
                          +{ord.points_earned_estimated} pts earned
                        </Text>
                      </View>
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

  // SCREEN: PROFILE & SETTINGS VIEW
  if (activeSubView === 'profile') {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.subHeader}>
          <TouchableOpacity onPress={() => setActiveSubView('menu')} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color="#111111" />
          </TouchableOpacity>
          <Text style={styles.subHeaderTitle}>Profile & Settings</Text>
          <View style={{ width: 24 }} />
        </View>

        <ScrollView contentContainerStyle={styles.profileScrollContent} showsVerticalScrollIndicator={false}>
          {/* Header Profile Badge */}
          <View style={styles.profileHeroBox}>
            <View style={styles.profileHeroAvatar}>
              <Text style={styles.profileHeroAvatarText}>{initials}</Text>
            </View>
            <Text style={styles.profileHeroName}>{displayName}</Text>
            <View style={styles.profileHeroTierRow}>
              <View style={styles.tierPill}>
                <Text style={styles.tierPillText}>{isMember ? 'Gold Member' : 'Classic'}</Text>
              </View>
              {customerProfile?.membership_number && (
                <Text style={styles.profileHeroMemberNo}>{customerProfile.membership_number}</Text>
              )}
            </View>
          </View>

          {/* Section 1: Personal Details */}
          <View style={styles.profileSectionCard}>
            <Text style={styles.profileSectionTitle}>Personal Information</Text>

            <View style={styles.inputRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.fieldLabel}>First Name</Text>
                <TextInput
                  style={styles.fieldInput}
                  value={editFirstName}
                  onChangeText={setEditFirstName}
                  placeholder="First Name"
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.fieldLabel}>Last Name</Text>
                <TextInput
                  style={styles.fieldInput}
                  value={editLastName}
                  onChangeText={setEditLastName}
                  placeholder="Last Name"
                />
              </View>
            </View>

            <View style={{ marginTop: 14 }}>
              <Text style={styles.fieldLabel}>Mobile Number</Text>
              <View style={styles.verifiedFieldRow}>
                <TextInput
                  style={[styles.fieldInput, { flex: 1 }]}
                  value={editPhone}
                  onChangeText={setEditPhone}
                  keyboardType="phone-pad"
                  placeholder="Phone Number"
                />
                <View style={styles.verifiedTag}>
                  <Ionicons name="checkmark-circle" size={14} color="#10B981" />
                  <Text style={styles.verifiedText}>Verified</Text>
                </View>
              </View>
            </View>

            <View style={{ marginTop: 14 }}>
              <Text style={styles.fieldLabel}>Registered Email</Text>
              <View style={styles.verifiedFieldRow}>
                <TextInput
                  style={[styles.fieldInput, { flex: 1, backgroundColor: '#F9FAFB', color: '#6B7280' }]}
                  value={customerProfile?.email || ''}
                  editable={false}
                  placeholder="Email Address"
                />
                <View style={styles.verifiedTag}>
                  <Ionicons name="checkmark-circle" size={14} color="#10B981" />
                  <Text style={styles.verifiedText}>Linked</Text>
                </View>
              </View>
            </View>

            <TouchableOpacity
              style={[styles.saveProfileBtn, isSavingProfile && { opacity: 0.7 }]}
              onPress={handleSaveProfile}
              disabled={isSavingProfile}
            >
              {isSavingProfile ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.saveProfileBtnText}>Save Profile Updates</Text>
              )}
            </TouchableOpacity>
          </View>

          {/* Section 2: HUBKLUB Membership Overview */}
          <View style={styles.membershipCardSummary}>
            <View style={styles.membershipCardTop}>
              <View>
                <Text style={styles.membershipCardBrand}>THE HUB • HUBKLUB</Text>
                <Text style={styles.membershipCardTier}>
                  {isMember ? 'Gold Elite Membership' : 'Classic Membership'}
                </Text>
              </View>
              <Ionicons name="shield-checkmark" size={32} color="#D4AF37" />
            </View>

            <View style={styles.membershipCardStats}>
              <View>
                <Text style={styles.membershipStatLabel}>POINTS BALANCE</Text>
                <Text style={styles.membershipStatVal}>{pointsBalance.toLocaleString('en-IN')} pts</Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={styles.membershipStatLabel}>REDEMPTION WORTH</Text>
                <Text style={styles.membershipStatVal}>₹{pointsBalance.toLocaleString('en-IN')}</Text>
              </View>
            </View>

            <TouchableOpacity
              style={styles.membershipCardCta}
              onPress={() => {
                if (onNavigateTab) {
                  onNavigateTab('hubklub');
                } else {
                  Alert.alert('HUBKLUB Tab', 'Go to the HUBKLUB tab in the bottom bar.');
                }
              }}
            >
              <Text style={styles.membershipCardCtaText}>Open Full Loyalty Dashboard</Text>
              <Ionicons name="arrow-forward" size={16} color="#111111" />
            </TouchableOpacity>
          </View>

          {/* Section 3: Notification & Communication Preferences */}
          <View style={styles.profileSectionCard}>
            <Text style={styles.profileSectionTitle}>Communication & Alerts</Text>

            <View style={styles.prefRow}>
              <View style={{ flex: 1, paddingRight: 12 }}>
                <Text style={styles.prefLabel}>Order & Delivery Tracking</Text>
                <Text style={styles.prefSub}>Instant push notifications for parcel dispatches</Text>
              </View>
              <Switch
                value={prefOrderUpdates}
                onValueChange={setPrefOrderUpdates}
                trackColor={{ false: '#E5E7EB', true: '#C5A880' }}
                thumbColor="#FFFFFF"
              />
            </View>

            <View style={styles.prefDivider} />

            <View style={styles.prefRow}>
              <View style={{ flex: 1, paddingRight: 12 }}>
                <Text style={styles.prefLabel}>HUBKLUB Points & Expiry Alerts</Text>
                <Text style={styles.prefSub}>Reminders before your loyalty points expire</Text>
              </View>
              <Switch
                value={prefPointsAlerts}
                onValueChange={setPrefPointsAlerts}
                trackColor={{ false: '#E5E7EB', true: '#C5A880' }}
                thumbColor="#FFFFFF"
              />
            </View>

            <View style={styles.prefDivider} />

            <View style={styles.prefRow}>
              <View style={{ flex: 1, paddingRight: 12 }}>
                <Text style={styles.prefLabel}>VIP Private Sales & Previews</Text>
                <Text style={styles.prefSub}>First look at member-only seasonal drops</Text>
              </View>
              <Switch
                value={prefPromos}
                onValueChange={setPrefPromos}
                trackColor={{ false: '#E5E7EB', true: '#C5A880' }}
                thumbColor="#FFFFFF"
              />
            </View>

            <View style={styles.prefDivider} />

            <View style={styles.prefRow}>
              <View style={{ flex: 1, paddingRight: 12 }}>
                <Text style={styles.prefLabel}>WhatsApp Concierge Updates</Text>
                <Text style={styles.prefSub}>Receive receipts & order updates directly on WhatsApp</Text>
              </View>
              <Switch
                value={prefWhatsapp}
                onValueChange={setPrefWhatsapp}
                trackColor={{ false: '#E5E7EB', true: '#C5A880' }}
                thumbColor="#FFFFFF"
              />
            </View>
          </View>

          {/* Section 4: Account Actions */}
          <View style={styles.accountActionSection}>
            <TouchableOpacity
              style={styles.switchPersonaBtn}
              onPress={() => {
                setActiveSubView('menu');
                openAuthModal('signin');
              }}
            >
              <Ionicons name="swap-horizontal" size={18} color="#C5A880" />
              <Text style={styles.switchPersonaBtnText}>Switch Account / Quick Personas</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.profileLogoutBtn}
              onPress={() => setShowLogoutConfirm(true)}
            >
              <Ionicons name="log-out-outline" size={18} color="#D32F2F" />
              <Text style={styles.profileLogoutBtnText}>Log Out of THE HUB</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // SCREEN: NOTIFICATIONS VIEW
  if (activeSubView === 'notifications') {
    const unreadCount = notifications.filter((n) => !n.read).length;
    const filteredNotifs = notifFilter === 'unread' ? notifications.filter((n) => !n.read) : notifications;

    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.subHeader}>
          <TouchableOpacity onPress={() => setActiveSubView('menu')} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color="#111111" />
          </TouchableOpacity>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Text style={styles.subHeaderTitle}>Notifications</Text>
            {unreadCount > 0 && (
              <View style={styles.notifBadgePill}>
                <Text style={styles.notifBadgeText}>{unreadCount} new</Text>
              </View>
            )}
          </View>
          <TouchableOpacity onPress={handleMarkAllNotifsRead} style={styles.markReadTopBtn}>
            <Text style={styles.markReadTopText}>Mark Read</Text>
          </TouchableOpacity>
        </View>

        {/* Filter Tabs: All, Unread */}
        <View style={styles.ordersFilterRow}>
          <TouchableOpacity
            style={[styles.orderFilterTab, notifFilter === 'all' && styles.orderFilterTabActive]}
            onPress={() => setNotifFilter('all')}
          >
            <Text style={[styles.orderFilterText, notifFilter === 'all' && styles.orderFilterTextActive]}>
              All ({notifications.length})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.orderFilterTab, notifFilter === 'unread' && styles.orderFilterTabActive]}
            onPress={() => setNotifFilter('unread')}
          >
            <Text style={[styles.orderFilterText, notifFilter === 'unread' && styles.orderFilterTextActive]}>
              Unread ({unreadCount})
            </Text>
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.notifScrollContent} showsVerticalScrollIndicator={false}>
          {filteredNotifs.length === 0 ? (
            <View style={styles.emptyOrders}>
              <Ionicons name="notifications-off-outline" size={48} color="#CCC" />
              <Text style={styles.emptyOrdersTitle}>No notifications</Text>
              <Text style={styles.emptyOrdersSub}>You are all caught up with your orders and points.</Text>
            </View>
          ) : (
            filteredNotifs.map((item) => {
              const iconName =
                item.type === 'points'
                  ? 'star'
                  : item.type === 'bonus'
                  ? 'sparkles'
                  : item.type === 'order'
                  ? 'cube'
                  : item.type === 'alert'
                  ? 'time'
                  : 'gift';

              const iconColor =
                item.type === 'points' || item.type === 'bonus'
                  ? '#D4AF37'
                  : item.type === 'order'
                  ? '#3B82F6'
                  : item.type === 'alert'
                  ? '#EF4444'
                  : '#8B5CF6';

              return (
                <TouchableOpacity
                  key={item.id}
                  style={[styles.notifCard, !item.read && styles.notifCardUnread]}
                  onPress={() => toggleNotifRead(item.id)}
                  activeOpacity={0.8}
                >
                  <View style={[styles.notifIconCircle, { backgroundColor: `${iconColor}15` }]}>
                    <Ionicons name={iconName as any} size={20} color={iconColor} />
                  </View>

                  <View style={{ flex: 1 }}>
                    <View style={styles.notifCardTopRow}>
                      <Text style={[styles.notifCardTitle, !item.read && { fontWeight: '700' }]}>
                        {item.title}
                      </Text>
                      {!item.read && <View style={styles.unreadDot} />}
                    </View>
                    <Text style={styles.notifCardMsg}>{item.message}</Text>
                    <Text style={styles.notifCardTime}>{item.time}</Text>
                  </View>
                </TouchableOpacity>
              );
            })
          )}
        </ScrollView>
      </SafeAreaView>
    );
  }

  // SCREEN 12: ACCOUNT MENU VIEW
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Profile Card Header matching Screen 12: Initials Circle, Name, Email */}
        <View style={styles.profileHeader}>
          <View style={[styles.avatarCircle, isGuest && styles.avatarCircleGuest]}>
            {isGuest ? (
              <Ionicons name="person-outline" size={26} color="#8E8E93" />
            ) : (
              <Text style={styles.avatarText}>{initials}</Text>
            )}
          </View>
          <View style={styles.profileDetails}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <Text style={styles.profileName}>{displayName}</Text>
              {!isGuest && (
                <View style={styles.tierPill}>
                  <Text style={styles.tierPillText}>
                    {isMember ? 'Gold Member' : 'Classic'}
                  </Text>
                </View>
              )}
            </View>
            <Text style={styles.profileEmail} numberOfLines={1}>{displayEmail}</Text>
            {!isGuest && pointsBalance > 0 && (
              <Text style={styles.pointsSnippet}>★ {pointsBalance.toLocaleString('en-IN')} HUBKLUB Points</Text>
            )}
          </View>
        </View>

        {/* Guest Banner if not signed in */}
        {isGuest && (
          <View style={styles.guestBanner}>
            <View style={{ flex: 1 }}>
              <Text style={styles.guestBannerTitle}>Welcome to THE HUB</Text>
              <Text style={styles.guestBannerSub}>Create an account or sign in to earn points & get free delivery.</Text>
            </View>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <TouchableOpacity
                style={styles.guestCreateBtn}
                onPress={() => openAuthModal('create')}
                activeOpacity={0.85}
              >
                <Text style={styles.guestCreateBtnText}>Create Account</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.guestSignInBtn}
                onPress={() => openAuthModal('signin')}
                activeOpacity={0.85}
              >
                <Text style={styles.guestSignInBtnText}>Sign In</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Menu Items matching prototype Screen 12 */}
        <View style={styles.menuContainer}>
          {/* 1. Profile & Settings / Create or Switch Persona */}
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => (isGuest ? openAuthModal('signin') : setActiveSubView('profile'))}
            activeOpacity={0.7}
          >
            <View style={styles.menuItemLeft}>
              <Ionicons name="person-outline" size={20} color="#111111" />
              <View>
                <Text style={styles.menuItemLabel}>Profile & Settings</Text>
                <Text style={styles.menuItemSublabel}>
                  {isGuest ? 'Create account or sign in' : 'Personal info, membership & preferences'}
                </Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#C7C7CC" />
          </TouchableOpacity>

          {/* 2. Saved Addresses */}
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => {
              if (isGuest) {
                openAuthModal('signin');
              } else {
                Alert.alert('Saved Addresses', '123, Green Park, New Delhi - 110016\nContact: +91 98765 43210');
              }
            }}
            activeOpacity={0.7}
          >
            <View style={styles.menuItemLeft}>
              <Ionicons name="bookmark-outline" size={20} color="#111111" />
              <Text style={styles.menuItemLabel}>Saved Addresses</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#C7C7CC" />
          </TouchableOpacity>

          {/* 3. Order History & In-Store Bills */}
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => setActiveSubView('orders')}
            activeOpacity={0.7}
          >
            <View style={styles.menuItemLeft}>
              <Ionicons name="receipt-outline" size={20} color="#111111" />
              <View>
                <Text style={styles.menuItemLabel}>My Orders & Store Bills</Text>
                <Text style={styles.menuItemSublabel}>In-store billing receipts & online tracking</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#C7C7CC" />
          </TouchableOpacity>

          {/* 4. Wishlist */}
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => {
              if (onNavigateTab) {
                onNavigateTab('wishlist');
              } else {
                Alert.alert('Wishlist', 'You can view and manage your saved items directly from the Wishlist tab in the bottom bar.');
              }
            }}
            activeOpacity={0.7}
          >
            <View style={styles.menuItemLeft}>
              <Ionicons name="heart-outline" size={20} color="#111111" />
              <View>
                <Text style={styles.menuItemLabel}>Wishlist</Text>
                <Text style={styles.menuItemSublabel}>View and manage your saved luxury items</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#C7C7CC" />
          </TouchableOpacity>

          {/* 5. HUBKLUB Membership */}
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => {
              if (onNavigateTab) {
                onNavigateTab('hubklub');
              } else {
                Alert.alert('HUBKLUB Membership', 'Explore the HUBKLUB tab in the bottom bar for tier benefits, rates, balance, and points history.');
              }
            }}
            activeOpacity={0.7}
          >
            <View style={styles.menuItemLeft}>
              <Ionicons name="shield-checkmark-outline" size={20} color="#111111" />
              <View>
                <Text style={styles.menuItemLabel}>HUBKLUB Membership</Text>
                <Text style={styles.menuItemSublabel}>
                  {isMember ? 'Gold Elite Tier' : 'Classic Tier'} • {pointsBalance.toLocaleString('en-IN')} available points
                </Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#C7C7CC" />
          </TouchableOpacity>

          {/* 6. Notifications */}
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => setActiveSubView('notifications')}
            activeOpacity={0.7}
          >
            <View style={styles.menuItemLeft}>
              <Ionicons name="notifications-outline" size={20} color="#111111" />
              <View>
                <Text style={styles.menuItemLabel}>Notifications</Text>
                <Text style={styles.menuItemSublabel}>
                  {notifications.filter((n) => !n.read).length > 0
                    ? `${notifications.filter((n) => !n.read).length} unread updates & point credits`
                    : 'Points credits, order status & VIP alerts'}
                </Text>
              </View>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              {notifications.filter((n) => !n.read).length > 0 && (
                <View style={styles.menuUnreadBadge}>
                  <Text style={styles.menuUnreadBadgeText}>
                    {notifications.filter((n) => !n.read).length}
                  </Text>
                </View>
              )}
              <Ionicons name="chevron-forward" size={18} color="#C7C7CC" />
            </View>
          </TouchableOpacity>

          {/* 7. Help & Support */}
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => Alert.alert('Help & Support', 'THE HUB Concierge\nEmail: concierge@thehub.in\nPhone: +91 98250 12345')}
            activeOpacity={0.7}
          >
            <View style={styles.menuItemLeft}>
              <Ionicons name="help-circle-outline" size={20} color="#111111" />
              <Text style={styles.menuItemLabel}>Help & Support</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#C7C7CC" />
          </TouchableOpacity>

          {/* 8. Logout (or Sign In / Create Account if Guest) */}
          {isGuest ? (
            <TouchableOpacity
              style={[styles.menuItem, styles.menuItemSignIn]}
              onPress={() => openAuthModal('signin')}
              activeOpacity={0.7}
            >
              <View style={styles.menuItemLeft}>
                <Ionicons name="log-in-outline" size={20} color="#C5A880" />
                <Text style={[styles.menuItemLabel, { color: '#C5A880', fontWeight: '700' }]}>
                  Sign In / Create Account
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#C5A880" />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => setShowLogoutConfirm(true)}
              activeOpacity={0.7}
            >
              <View style={styles.menuItemLeft}>
                <Ionicons name="log-out-outline" size={20} color="#D32F2F" />
                <Text style={[styles.menuItemLabel, { color: '#D32F2F' }]}>Logout</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#C7C7CC" />
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>

      {/* Logout Confirmation Bottom Modal */}
      <Modal
        visible={showLogoutConfirm}
        transparent
        animationType="fade"
        onRequestClose={() => setShowLogoutConfirm(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.confirmModalContainer}>
            <View style={styles.confirmIconBox}>
              <Ionicons name="log-out-outline" size={30} color="#D32F2F" />
            </View>
            <Text style={styles.confirmTitle}>Log Out of THE HUB?</Text>
            <Text style={styles.confirmMessage}>
              Are you sure you want to log out? You can sign back in anytime to access your orders, points, and saved items.
            </Text>

            <View style={styles.confirmActionsRow}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setShowLogoutConfirm(false)}
                activeOpacity={0.8}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.logoutDestructiveBtn}
                onPress={handleLogoutConfirm}
                activeOpacity={0.8}
              >
                <Text style={styles.logoutDestructiveBtnText}>Log Out</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  scrollContent: {
    paddingBottom: 40,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 20,
    gap: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F2F2F2',
  },
  avatarCircle: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: '#C5A880',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarCircleGuest: {
    backgroundColor: '#F5F5F7',
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
  profileDetails: {
    flex: 1,
  },
  profileName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111111',
    marginBottom: 2,
  },
  tierPill: {
    backgroundColor: '#FAF5EE',
    borderWidth: 1,
    borderColor: '#C5A880',
    borderRadius: 10,
    paddingHorizontal: 7,
    paddingVertical: 1,
  },
  tierPillText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#C5A880',
  },
  profileEmail: {
    fontSize: 12,
    color: '#8E8E93',
  },
  pointsSnippet: {
    fontSize: 11,
    fontWeight: '600',
    color: '#C5A880',
    marginTop: 3,
  },
  guestBanner: {
    backgroundColor: '#FAF7F2',
    marginHorizontal: 16,
    marginTop: 14,
    marginBottom: 6,
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E8DEC8',
    gap: 12,
  },
  guestBannerTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#111111',
    marginBottom: 2,
  },
  guestBannerSub: {
    fontSize: 11,
    color: '#666666',
  },
  guestCreateBtn: {
    flex: 1,
    backgroundColor: '#111111',
    height: 38,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  guestCreateBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  guestSignInBtn: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#111111',
    height: 38,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  guestSignInBtnText: {
    color: '#111111',
    fontSize: 12,
    fontWeight: '700',
  },
  menuContainer: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F2F2F2',
  },
  menuItemSignIn: {
    backgroundColor: '#FAF7F2',
    paddingHorizontal: 12,
    borderRadius: 8,
    marginTop: 8,
    borderBottomWidth: 0,
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  menuItemLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#111111',
  },
  menuItemSublabel: {
    fontSize: 11,
    color: '#8E8E93',
    marginTop: 1,
  },

  // Screen 11: Orders View Styles
  subHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    height: 52,
    borderBottomWidth: 1,
    borderBottomColor: '#F2F2F2',
  },
  backBtn: {
    padding: 6,
  },
  subHeaderTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111111',
  },
  ordersFilterRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F2F2F2',
  },
  orderFilterTab: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#F5F5F7',
  },
  orderFilterTabActive: {
    backgroundColor: '#C5A880',
  },
  orderFilterText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666666',
  },
  orderFilterTextActive: {
    color: '#FFFFFF',
  },
  ordersScrollContent: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingBottom: 40,
  },
  emptyOrders: {
    alignItems: 'center',
    marginTop: 60,
    paddingHorizontal: 30,
  },
  emptyOrdersTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111111',
    marginTop: 12,
    marginBottom: 4,
  },
  emptyOrdersSub: {
    fontSize: 12,
    color: '#8E8E93',
    textAlign: 'center',
  },
  signInPrimaryBtn: {
    backgroundColor: '#111111',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    marginTop: 16,
  },
  signInPrimaryBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  orderCard: {
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F2F2F2',
  },
  orderTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  orderIdText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#111111',
  },
  statusPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  pillDelivered: {
    backgroundColor: '#E8F5E9',
  },
  pillShipped: {
    backgroundColor: '#E3F2FD',
  },
  pillProcessing: {
    backgroundColor: '#FFF3E0',
  },
  statusPillText: {
    fontSize: 10,
    fontWeight: '700',
  },
  pillTextDelivered: {
    color: '#2E7D32',
  },
  pillTextShipped: {
    color: '#1565C0',
  },
  pillTextProcessing: {
    color: '#E65100',
  },
  pillStoreBill: {
    backgroundColor: '#FAF5ED',
    borderWidth: 1,
    borderColor: '#E8DBC5',
  },
  pillTextStoreBill: {
    color: '#9C7A4A',
    fontWeight: '700',
  },
  orderMetaText: {
    fontSize: 12,
    color: '#666666',
    marginBottom: 4,
  },
  demoOrderTag: {
    fontSize: 11,
    color: '#8E8E93',
  },
  orderBottomBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F5F5F7',
  },
  orderStoreTag: {
    fontSize: 11,
    color: '#8E8E93',
    fontWeight: '500',
  },
  orderPointsTag: {
    fontSize: 11,
    fontWeight: '700',
    color: '#C5A880',
  },

  // Modal Common Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  authModalContainer: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#111111',
  },
  tabToggleRow: {
    flexDirection: 'row',
    backgroundColor: '#F5F5F7',
    borderRadius: 10,
    padding: 4,
    marginBottom: 16,
  },
  tabToggleBtn: {
    flex: 1,
    paddingVertical: 9,
    alignItems: 'center',
    borderRadius: 8,
  },
  tabToggleBtnActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  tabToggleText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#8E8E93',
  },
  tabToggleTextActive: {
    color: '#111111',
    fontWeight: '700',
  },
  formContainer: {
    gap: 14,
  },
  formSubtitle: {
    fontSize: 12,
    color: '#666666',
    lineHeight: 17,
  },
  inputRow: {
    flexDirection: 'row',
    gap: 10,
  },
  inputGroup: {
    gap: 6,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#333333',
    marginBottom: 4,
  },
  textInput: {
    height: 44,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 13,
    color: '#111111',
    backgroundColor: '#FAFAFA',
  },
  benefitsBox: {
    backgroundColor: '#FAF7F2',
    borderRadius: 8,
    padding: 12,
    gap: 8,
    borderWidth: 1,
    borderColor: '#EFE8DC',
    marginVertical: 4,
  },
  benefitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  benefitText: {
    fontSize: 12,
    color: '#444444',
  },
  authErrorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FFEBEE',
    borderWidth: 1,
    borderColor: '#FFCDD2',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    marginTop: 2,
    marginBottom: 4,
  },
  authErrorText: {
    color: '#D32F2F',
    fontSize: 12,
    fontWeight: '600',
    flex: 1,
  },
  primaryActionBtn: {
    backgroundColor: '#111111',
    height: 48,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 6,
  },
  primaryActionBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  loginInputRow: {
    flexDirection: 'row',
    gap: 8,
  },
  inlineSignInBtn: {
    backgroundColor: '#C5A880',
    paddingHorizontal: 16,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  inlineSignInBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginVertical: 10,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#EAEAEA',
  },
  dividerText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#999999',
    letterSpacing: 1,
  },
  personaOptionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E8E8E8',
    marginBottom: 8,
    gap: 12,
  },
  personaOptionSelected: {
    borderColor: '#C5A880',
    backgroundColor: '#FAF7F2',
  },
  personaRadio: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: '#C5A880',
    justifyContent: 'center',
    alignItems: 'center',
  },
  personaRadioInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#C5A880',
  },
  personaOptionName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#111111',
  },
  personaOptionDesc: {
    fontSize: 11,
    color: '#666666',
    marginTop: 2,
  },

  // Logout Confirmation Modal
  confirmModalContainer: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    alignItems: 'center',
  },
  confirmIconBox: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#FFEBEE',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  confirmTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#111111',
    marginBottom: 8,
  },
  confirmMessage: {
    fontSize: 13,
    color: '#666666',
    textAlign: 'center',
    lineHeight: 19,
    marginBottom: 20,
    paddingHorizontal: 12,
  },
  confirmActionsRow: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  cancelBtn: {
    flex: 1,
    height: 46,
    borderRadius: 8,
    backgroundColor: '#F5F5F7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111111',
  },
  logoutDestructiveBtn: {
    flex: 1,
    height: 46,
    borderRadius: 8,
    backgroundColor: '#D32F2F',
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoutDestructiveBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  // Profile & Settings Styles
  profileScrollContent: {
    paddingBottom: 40,
    paddingHorizontal: 16,
  },
  profileHeroBox: {
    alignItems: 'center',
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    marginBottom: 16,
  },
  profileHeroAvatar: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: '#C5A880',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
    shadowColor: '#C5A880',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  profileHeroAvatarText: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: 1,
  },
  profileHeroName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111111',
    marginBottom: 6,
  },
  profileHeroTierRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  profileHeroMemberNo: {
    fontSize: 11,
    color: '#6B7280',
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  profileSectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 16,
    marginBottom: 16,
  },
  profileSectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111111',
    marginBottom: 14,
    letterSpacing: 0.2,
  },
  fieldLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#4B5563',
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  fieldInput: {
    height: 44,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    paddingHorizontal: 12,
    fontSize: 14,
    color: '#111111',
  },
  verifiedFieldRow: {
    flexDirection: 'row',
    alignItems: 'center',
    position: 'relative',
  },
  verifiedTag: {
    position: 'absolute',
    right: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  verifiedText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#059669',
  },
  saveProfileBtn: {
    marginTop: 18,
    height: 44,
    backgroundColor: '#111111',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  saveProfileBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
  membershipCardSummary: {
    backgroundColor: '#1E1B18',
    borderRadius: 14,
    padding: 18,
    marginBottom: 16,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 5,
  },
  membershipCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  membershipCardBrand: {
    fontSize: 11,
    color: '#C5A880',
    fontWeight: '700',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  membershipCardTier: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '800',
    marginTop: 2,
  },
  membershipCardStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    marginBottom: 14,
  },
  membershipStatLabel: {
    fontSize: 10,
    color: '#9CA3AF',
    fontWeight: '700',
    letterSpacing: 0.8,
    marginBottom: 2,
  },
  membershipStatVal: {
    fontSize: 17,
    fontWeight: '800',
    color: '#D4AF37',
  },
  membershipCardCta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#C5A880',
    paddingVertical: 10,
    borderRadius: 8,
  },
  membershipCardCtaText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#111111',
  },
  prefRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
  },
  prefLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#111111',
    marginBottom: 2,
  },
  prefSub: {
    fontSize: 11,
    color: '#6B7280',
    lineHeight: 15,
  },
  prefDivider: {
    height: 1,
    backgroundColor: '#F3F4F6',
  },
  accountActionSection: {
    gap: 10,
    marginTop: 6,
  },
  switchPersonaBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 44,
    borderRadius: 8,
    backgroundColor: '#FAF5EE',
    borderWidth: 1,
    borderColor: '#C5A880',
  },
  switchPersonaBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#C5A880',
  },
  profileLogoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 44,
    borderRadius: 8,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FCA5A5',
  },
  profileLogoutBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#DC2626',
  },
  // Notifications Screen Styles
  notifBadgePill: {
    backgroundColor: '#DC2626',
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 1,
  },
  notifBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  markReadTopBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  markReadTopText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#C5A880',
  },
  notifScrollContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 40,
    gap: 10,
  },
  notifCard: {
    flexDirection: 'row',
    gap: 12,
    padding: 14,
    borderRadius: 12,
    backgroundColor: '#FAFAFA',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  notifCardUnread: {
    backgroundColor: '#FFFFFF',
    borderColor: '#C5A880',
    shadowColor: '#C5A880',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 2,
  },
  notifIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 2,
  },
  notifCardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  notifCardTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#111111',
    flex: 1,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#D4AF37',
    marginLeft: 6,
  },
  notifCardMsg: {
    fontSize: 12,
    color: '#4B5563',
    lineHeight: 17,
    marginBottom: 6,
  },
  notifCardTime: {
    fontSize: 10,
    color: '#9CA3AF',
    fontWeight: '500',
  },
  menuUnreadBadge: {
    backgroundColor: '#DC2626',
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    minWidth: 18,
    alignItems: 'center',
  },
  menuUnreadBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#FFFFFF',
  },
});
