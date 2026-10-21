import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, SHADOWS } from '../constants/theme';
import { BannerCarousel } from '../components/BannerCarousel';
import { ProductCard } from '../components/ProductCard';
import { ProductDetailModal } from './ProductDetailModal';
import { DemoBadge } from '../components/DemoBadge';
import { apiClient } from '../api/client';
import { Product, Collection } from '../types';

interface HomeScreenProps {
  onNavigateCategories: (category?: string) => void;
  onNavigateHubklub: () => void;
  onCartPress: () => void;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({
  onNavigateCategories,
  onNavigateHubklub,
  onCartPress,
}) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  useEffect(() => {
    const loadHomeData = async () => {
      setIsLoading(true);
      try {
        const [prods, cols] = await Promise.all([
          apiClient.getProducts(),
          apiClient.getCollections(),
        ]);
        setProducts(prods);
        setCollections(cols);
      } catch (e) {
        console.warn('Failed to load home data', e);
      } finally {
        setIsLoading(false);
      }
    };
    loadHomeData();
  }, []);

  const featuredProducts = products.filter((p) => p.featured || p.is_sale);
  const bestSellers = products.length > 0 ? products : featuredProducts;

  const circleCategories = [
    { id: 'c_kurtas', name: 'Kurta Pajama', image: 'https://cdn.shopify.com/s/files/1/0593/8918/2049/files/Prithvi.webp?v=1790074668' },
    { id: 'c_bandi', name: 'Bandi Set', image: 'https://cdn.shopify.com/s/files/1/0593/8918/2049/files/Prithvi_b.webp?v=1790074705' },
    { id: 'c_sherwani', name: 'Sherwani', image: 'https://cdn.shopify.com/s/files/1/0593/8918/2049/files/The_HUB_Website.jpg?v=1758865025' },
    { id: 'c_indo', name: 'Indo Western', image: 'https://cdn.shopify.com/s/files/1/0593/8918/2049/files/HUB_JAGNIVAS2025_WEBSITE_IMG_005_C.webp?v=1765358167' },
    { id: 'c_jodhpuri', name: 'Jodhpuri Suit', image: 'https://cdn.shopify.com/s/files/1/0593/8918/2049/files/HUB_JAGNIVAS2025_WEBSITE_IMG_018_A.webp?v=1765358030' },
    { id: 'c_suits', name: 'Suits & Tux', image: 'https://cdn.shopify.com/s/files/1/0593/8918/2049/files/HUB_JAGNIVAS2025_WEBSITE_IMG_006_B_c54ceec9-e92c-430d-9d09-0f40de3996e6.webp?v=1765358848' },
    { id: 'c_haldi', name: 'Haldi Dress', image: 'https://cdn.shopify.com/s/files/1/0593/8918/2049/files/Kesariya.webp?v=1790074972' },
    { id: 'c_wedding', name: 'Wedding Outfits', image: 'https://cdn.shopify.com/s/files/1/0593/8918/2049/files/HUB_JAGNIVAS2025_WEBSITE_IMG_020_C.webp?v=1780031969' },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Search Bar matching prototype */}
        <TouchableOpacity
          style={styles.searchBar}
          onPress={() => onNavigateCategories()}
          activeOpacity={0.85}
        >
          <Ionicons name="search-outline" size={18} color="#888888" style={{ marginRight: 8 }} />
          <Text style={styles.searchPlaceholder}>Search for kurtas, bandi sets, sherwanis...</Text>
          <Ionicons name="mic-outline" size={18} color="#888888" />
        </TouchableOpacity>

        {/* Hero Banner: New Festive & Wedding Arrivals */}
        <View style={styles.heroBanner}>
          <View style={styles.heroTextContainer}>
            <Text style={styles.heroSubtitle}>THE HUB FLAGSHIP</Text>
            <Text style={styles.heroTitle}>Festive Couture{'\n'}For You</Text>
            <TouchableOpacity
              style={styles.heroShopNowBtn}
              onPress={() => onNavigateCategories('Kurta Pajama')}
              activeOpacity={0.85}
            >
              <Text style={styles.heroShopNowText}>Shop Now</Text>
            </TouchableOpacity>
          </View>

          <Image
            source={{ uri: 'https://cdn.shopify.com/s/files/1/0593/8918/2049/files/Prithvi.webp?v=1790074668' }}
            style={styles.heroImage}
            resizeMode="cover"
          />
        </View>

        {/* Circular Categories Row */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.circleCategoriesRow}
        >
          {circleCategories.map((cat) => (
            <TouchableOpacity
              key={cat.id}
              style={styles.circleCatItem}
              onPress={() => onNavigateCategories(cat.name)}
              activeOpacity={0.8}
            >
              <View style={styles.circleImageContainer}>
                <Image source={{ uri: cat.image }} style={styles.circleImage} />
              </View>
              <Text style={styles.circleLabel}>{cat.name}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Featured Collections Section */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>Featured Collections</Text>
          <TouchableOpacity onPress={() => onNavigateCategories()}>
            <Text style={styles.viewAllText}>View All</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.featuredCollectionsGrid}>
          <TouchableOpacity
            style={styles.featuredCard}
            onPress={() => onNavigateCategories('Kurta Pajama')}
            activeOpacity={0.9}
          >
            <Image
              source={{ uri: 'https://cdn.shopify.com/s/files/1/0593/8918/2049/files/Prithvi_a.webp?v=1790074688' }}
              style={styles.featuredCardImage}
              resizeMode="cover"
            />
            <View style={styles.featuredCardOverlay}>
              <Text style={styles.featuredCardTitle}>Kurta Pajama</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.featuredCard}
            onPress={() => onNavigateCategories('Bandi Set')}
            activeOpacity={0.9}
          >
            <Image
              source={{ uri: 'https://cdn.shopify.com/s/files/1/0593/8918/2049/files/Prithvi_b.webp?v=1790074705' }}
              style={styles.featuredCardImage}
              resizeMode="cover"
            />
            <View style={styles.featuredCardOverlay}>
              <Text style={styles.featuredCardTitle}>Bandi Set</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Best Sellers Section */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>Best Sellers</Text>
          <TouchableOpacity onPress={() => onNavigateCategories()}>
            <Text style={styles.viewAllText}>View All</Text>
          </TouchableOpacity>
        </View>

        {isLoading ? (
          <ActivityIndicator size="small" color="#111" style={{ marginVertical: 30 }} />
        ) : (
          <View style={styles.productGrid}>
            {bestSellers.map((p) => (
              <View key={p.id} style={{ width: '48%' }}>
                <ProductCard product={p} onPress={() => setSelectedProduct(p)} />
              </View>
            ))}
          </View>
        )}
      </ScrollView>


      {/* Product Detail Modal */}
      <ProductDetailModal
        product={selectedProduct}
        visible={!!selectedProduct}
        onClose={() => setSelectedProduct(null)}
        onCartPress={onCartPress}
      />
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
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F7',
    marginHorizontal: 16,
    marginTop: 10,
    marginBottom: 14,
    paddingHorizontal: 14,
    height: 44,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#EAEAEA',
  },
  searchPlaceholder: {
    flex: 1,
    fontSize: 13,
    color: '#8E8E93',
  },
  heroBanner: {
    flexDirection: 'row',
    backgroundColor: '#161616',
    marginHorizontal: 16,
    borderRadius: 10,
    overflow: 'hidden',
    height: 155,
    marginBottom: 18,
  },
  heroTextContainer: {
    flex: 1.1,
    paddingLeft: 18,
    paddingVertical: 18,
    justifyContent: 'center',
  },
  heroSubtitle: {
    fontSize: 11,
    color: '#D4AF37',
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  heroTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
    lineHeight: 22,
    marginBottom: 12,
  },
  heroShopNowBtn: {
    backgroundColor: '#FFFFFF',
    alignSelf: 'flex-start',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
  },
  heroShopNowText: {
    color: '#000000',
    fontSize: 11,
    fontWeight: '700',
  },
  heroImage: {
    flex: 0.9,
    height: '100%',
  },
  circleCategoriesRow: {
    paddingHorizontal: 16,
    gap: 16,
    marginBottom: 20,
  },
  circleCatItem: {
    alignItems: 'center',
  },
  circleImageContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    overflow: 'hidden',
    backgroundColor: '#F0F0F0',
    borderWidth: 1,
    borderColor: '#E8E8E8',
    marginBottom: 6,
  },
  circleImage: {
    width: '100%',
    height: '100%',
  },
  circleLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#222222',
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginHorizontal: 16,
    marginBottom: 10,
    marginTop: 6,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#111111',
  },
  viewAllText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#888888',
  },
  featuredCollectionsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginHorizontal: 16,
    marginBottom: 20,
  },
  featuredCard: {
    width: '48%',
    height: 190,
    borderRadius: 8,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: '#222',
  },
  featuredCardImage: {
    width: '100%',
    height: '100%',
  },
  featuredCardOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
  },
  featuredCardTitle: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  productGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
});

