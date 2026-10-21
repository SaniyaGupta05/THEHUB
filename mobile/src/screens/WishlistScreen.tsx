import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useWishlist } from '../context/WishlistContext';
import { Product } from '../types';
import { ProductDetailModal } from './ProductDetailModal';

interface WishlistScreenProps {
  onNavigateHome: () => void;
  onCartPress: () => void;
}

export const WishlistScreen: React.FC<WishlistScreenProps> = ({
  onNavigateHome,
  onCartPress,
}) => {
  const { wishlist, toggleWishlist, moveToCart } = useWishlist();
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  return (
    <SafeAreaView style={styles.container}>
      {/* Header matching prototype Screen 7 */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Wishlist</Text>
      </View>

      {wishlist.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="heart-outline" size={56} color="#CCCCCC" />
          <Text style={styles.emptyTitle}>Your Wishlist is Empty</Text>
          <Text style={styles.emptySubtitle}>
            Save your favourite kurtas, bandi sets, sherwanis, and luxury menswear here.
          </Text>
          <TouchableOpacity style={styles.exploreBtn} onPress={onNavigateHome}>
            <Text style={styles.exploreBtnText}>Continue Shopping</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {wishlist.map((item) => {
            const formattedPrice = `₹ ${new Intl.NumberFormat('en-IN').format(item.price)}`;
            const formattedCompare = item.compare_at_price
              ? `₹ ${new Intl.NumberFormat('en-IN').format(item.compare_at_price)}`
              : null;
            const discount = item.compare_at_price && item.compare_at_price > item.price
              ? Math.round(((item.compare_at_price - item.price) / item.compare_at_price) * 100)
              : null;

            return (
              <View key={item.id} style={styles.wishlistItemRow}>
                {/* Product Thumbnail */}
                <TouchableOpacity
                  onPress={() => setSelectedProduct(item)}
                  activeOpacity={0.85}
                  style={styles.thumbnailContainer}
                >
                  <Image source={{ uri: item.images[0] }} style={styles.thumbnail} resizeMode="cover" />
                </TouchableOpacity>

                {/* Details */}
                <View style={styles.itemDetails}>
                  <View style={styles.titleAndActions}>
                    <TouchableOpacity
                      onPress={() => setSelectedProduct(item)}
                      style={{ flex: 1, marginRight: 8 }}
                    >
                      <Text style={styles.itemTitle} numberOfLines={1}>{item.title}</Text>
                      <View style={styles.priceRow}>
                        <Text style={styles.price}>{formattedPrice}</Text>
                        {formattedCompare && (
                          <Text style={styles.comparePrice}>{formattedCompare}</Text>
                        )}
                        {discount && (
                          <Text style={styles.discountText}>{discount}% OFF</Text>
                        )}
                      </View>
                    </TouchableOpacity>

                    <View style={styles.actionIcons}>
                      <TouchableOpacity onPress={() => toggleWishlist(item)} style={styles.iconBtn}>
                        <Ionicons name="heart" size={18} color="#E53935" />
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.iconBtn}>
                        <Ionicons name="ellipsis-horizontal" size={18} color="#8E8E93" />
                      </TouchableOpacity>
                    </View>
                  </View>

                  {/* Move to Cart Button */}
                  <TouchableOpacity
                    style={styles.moveToCartBtn}
                    onPress={() => moveToCart(item)}
                    activeOpacity={0.85}
                  >
                    <Text style={styles.moveToCartText}>Move to Cart</Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          })}
        </ScrollView>
      )}

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
  header: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F2F2F2',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#111111',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111111',
    marginTop: 14,
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 13,
    color: '#888888',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 18,
  },
  exploreBtn: {
    backgroundColor: '#111111',
    paddingHorizontal: 22,
    paddingVertical: 12,
    borderRadius: 6,
  },
  exploreBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingBottom: 40,
  },
  wishlistItemRow: {
    flexDirection: 'row',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F2F2F2',
    gap: 14,
  },
  thumbnailContainer: {
    width: 80,
    height: 100,
    borderRadius: 6,
    overflow: 'hidden',
    backgroundColor: '#F8F8F8',
  },
  thumbnail: {
    width: '100%',
    height: '100%',
  },
  itemDetails: {
    flex: 1,
    justifyContent: 'space-between',
  },
  titleAndActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  itemTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#111111',
    marginBottom: 4,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  price: {
    fontSize: 13,
    fontWeight: '700',
    color: '#111111',
  },
  comparePrice: {
    fontSize: 11,
    color: '#8E8E93',
    textDecorationLine: 'line-through',
  },
  discountText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#E53935',
  },
  actionIcons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  iconBtn: {
    padding: 4,
  },
  moveToCartBtn: {
    backgroundColor: '#111111',
    alignSelf: 'flex-start',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 6,
    marginTop: 8,
  },
  moveToCartText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
});
