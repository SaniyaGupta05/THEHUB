import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Text, StatusBar, LogBox } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import { CartProvider } from './src/context/CartContext';
import { WishlistProvider, useWishlist } from './src/context/WishlistContext';
import { Header } from './src/components/Header';
import { HomeScreen } from './src/screens/HomeScreen';
import { CategoriesScreen } from './src/screens/CategoriesScreen';
import { WishlistScreen } from './src/screens/WishlistScreen';
import { HubklubScreen } from './src/screens/HubklubScreen';
import { AccountScreen } from './src/screens/AccountScreen';
import { CartModal } from './src/screens/CartModal';
import { OnboardingModal } from './src/components/OnboardingModal';

LogBox.ignoreLogs([
  'Cannot connect to Expo CLI',
]);

const queryClient = new QueryClient();

type TabType = 'home' | 'categories' | 'wishlist' | 'hubklub' | 'account';

function MainAppContent() {
  const [activeTab, setActiveTab] = useState<TabType>('home');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string | undefined>(undefined);
  const [showCart, setShowCart] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const { wishlist } = useWishlist();
  const { openAuthModal } = useAuth();

  const handleNavigateCategories = (category?: string) => {
    setSelectedCategoryFilter(category);
    setActiveTab('categories');
  };

  const handleNavigateHome = () => {
    setActiveTab('home');
  };

  const handleNavigateHubklub = () => {
    setActiveTab('hubklub');
  };

  return (
    <SafeAreaView style={styles.safeContainer}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* Main Header matching prototype */}
      <Header
        onSearchPress={() => {
          setSelectedCategoryFilter(undefined);
          setActiveTab('categories');
        }}
        onCartPress={() => setShowCart(true)}
        onHubklubPress={handleNavigateHubklub}
        onOnboardingPress={() => setShowOnboarding(true)}
      />

      {/* Main Screen Body */}
      <View style={styles.screenContainer}>
        {activeTab === 'home' && (
          <HomeScreen
            onNavigateCategories={handleNavigateCategories}
            onNavigateHubklub={handleNavigateHubklub}
            onCartPress={() => setShowCart(true)}
          />
        )}

        {activeTab === 'categories' && (
          <CategoriesScreen
            initialCategory={selectedCategoryFilter}
            onCartPress={() => setShowCart(true)}
          />
        )}

        {activeTab === 'wishlist' && (
          <WishlistScreen
            onNavigateHome={handleNavigateHome}
            onCartPress={() => setShowCart(true)}
          />
        )}

        {activeTab === 'hubklub' && <HubklubScreen />}

        {activeTab === 'account' && <AccountScreen />}
      </View>

      {/* Bottom Navigation Bar matching prototype diagram */}
      <View style={styles.tabBar}>
        {/* 1. Home */}
        <TouchableOpacity
          style={styles.tabItem}
          onPress={() => setActiveTab('home')}
          activeOpacity={0.7}
        >
          <Ionicons
            name={activeTab === 'home' ? 'home' : 'home-outline'}
            size={22}
            color={activeTab === 'home' ? '#111111' : '#8E8E93'}
          />
          <Text style={[styles.tabLabel, activeTab === 'home' && styles.tabLabelActive]}>
            Home
          </Text>
        </TouchableOpacity>

        {/* 2. Categories */}
        <TouchableOpacity
          style={styles.tabItem}
          onPress={() => {
            setSelectedCategoryFilter(undefined);
            setActiveTab('categories');
          }}
          activeOpacity={0.7}
        >
          <Ionicons
            name={activeTab === 'categories' ? 'grid' : 'grid-outline'}
            size={22}
            color={activeTab === 'categories' ? '#111111' : '#8E8E93'}
          />
          <Text style={[styles.tabLabel, activeTab === 'categories' && styles.tabLabelActive]}>
            Categories
          </Text>
        </TouchableOpacity>

        {/* 3. Wishlist */}
        <TouchableOpacity
          style={styles.tabItem}
          onPress={() => setActiveTab('wishlist')}
          activeOpacity={0.7}
        >
          <View style={{ position: 'relative' }}>
            <Ionicons
              name={activeTab === 'wishlist' ? 'heart' : 'heart-outline'}
              size={22}
              color={activeTab === 'wishlist' ? '#111111' : '#8E8E93'}
            />
            {wishlist.length > 0 && (
              <View style={styles.wishlistBadge}>
                <Text style={styles.wishlistBadgeText}>{wishlist.length}</Text>
              </View>
            )}
          </View>
          <Text style={[styles.tabLabel, activeTab === 'wishlist' && styles.tabLabelActive]}>
            Wishlist
          </Text>
        </TouchableOpacity>

        {/* 4. HUBKLUB */}
        <TouchableOpacity
          style={styles.tabItem}
          onPress={() => setActiveTab('hubklub')}
          activeOpacity={0.7}
        >
          <Ionicons
            name={activeTab === 'hubklub' ? 'shield-checkmark' : 'shield-outline'}
            size={22}
            color={activeTab === 'hubklub' ? '#111111' : '#8E8E93'}
          />
          <Text style={[styles.tabLabel, activeTab === 'hubklub' && styles.tabLabelActive]}>
            HUBKLUB
          </Text>
        </TouchableOpacity>

        {/* 5. Account */}
        <TouchableOpacity
          style={styles.tabItem}
          onPress={() => setActiveTab('account')}
          activeOpacity={0.7}
        >
          <Ionicons
            name={activeTab === 'account' ? 'person' : 'person-outline'}
            size={22}
            color={activeTab === 'account' ? '#111111' : '#8E8E93'}
          />
          <Text style={[styles.tabLabel, activeTab === 'account' && styles.tabLabelActive]}>
            Account
          </Text>
        </TouchableOpacity>
      </View>

      {/* Shopping Bag Modal */}
      <CartModal
        visible={showCart}
        onClose={() => setShowCart(false)}
        onOrderSuccess={() => {
          setActiveTab('account');
        }}
      />

      {/* Onboarding & Splash Prototype Modal */}
      <OnboardingModal
        visible={showOnboarding}
        onClose={() => setShowOnboarding(false)}
        onSignInPress={() => {
          setActiveTab('account');
          openAuthModal('signin');
        }}
      />
    </SafeAreaView>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <CartProvider>
            <WishlistProvider>
              <MainAppContent />
            </WishlistProvider>
          </CartProvider>
        </AuthProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  safeContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  screenContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  tabBar: {
    flexDirection: 'row',
    height: 56,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingBottom: 2,
  },
  tabItem: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
    minWidth: 55,
  },
  tabLabel: {
    fontSize: 10,
    color: '#8E8E93',
    fontWeight: '500',
    marginTop: 3,
  },
  tabLabelActive: {
    color: '#111111',
    fontWeight: '700',
  },
  wishlistBadge: {
    position: 'absolute',
    top: -2,
    right: -6,
    backgroundColor: '#E53935',
    borderRadius: 7,
    minWidth: 14,
    height: 14,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 2,
  },
  wishlistBadgeText: {
    color: '#FFFFFF',
    fontSize: 8,
    fontWeight: '800',
  },
});
