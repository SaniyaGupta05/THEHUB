import React from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Product } from '../types';
import { COLORS, SPACING, SHADOWS } from '../constants/theme';
import { useWishlist } from '../context/WishlistContext';

interface ProductCardProps {
  product: Product;
  onPress: () => void;
}

export const ProductCard: React.FC<ProductCardProps> = ({ product, onPress }) => {
  const { isInWishlist, toggleWishlist } = useWishlist();
  const wishlisted = isInWishlist(product.id);

  const formattedPrice = `₹ ${new Intl.NumberFormat('en-IN').format(product.price)}`;
  const formattedComparePrice = product.compare_at_price
    ? `₹ ${new Intl.NumberFormat('en-IN').format(product.compare_at_price)}`
    : null;

  const discountPercent =
    product.compare_at_price && product.compare_at_price > product.price
      ? Math.round(((product.compare_at_price - product.price) / product.compare_at_price) * 100)
      : null;

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.88}>
      <View style={styles.imageContainer}>
        <Image
          source={{ uri: product.images[0] || 'https://via.placeholder.com/400x500' }}
          style={styles.image}
          resizeMode="cover"
        />

        <TouchableOpacity
          style={styles.wishlistButton}
          onPress={() => toggleWishlist(product)}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons
            name={wishlisted ? 'heart' : 'heart-outline'}
            size={18}
            color={wishlisted ? '#E53935' : '#111'}
          />
        </TouchableOpacity>
      </View>

      <View style={styles.infoContainer}>
        <Text style={styles.title} numberOfLines={1}>
          {product.title}
        </Text>

        <View style={styles.priceRow}>
          <Text style={styles.price}>{formattedPrice}</Text>
          {formattedComparePrice && (
            <Text style={styles.comparePrice}>{formattedComparePrice}</Text>
          )}
          {discountPercent && (
            <Text style={styles.discountText}>{discountPercent}% OFF</Text>
          )}
        </View>

        <View style={styles.metaRow}>
          <View style={styles.ratingRow}>
            <Ionicons name="star" size={11} color="#C5A880" />
            <Text style={styles.ratingText}>
              {product.rating ? product.rating.toFixed(1) : '4.5'}
            </Text>
            <Text style={styles.reviewCountText}>
              ({product.review_count || 124})
            </Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    overflow: 'hidden',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#EEEEEE',
  },
  imageContainer: {
    width: '100%',
    aspectRatio: 0.78,
    backgroundColor: '#F8F8F8',
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  wishlistButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoContainer: {
    paddingHorizontal: 8,
    paddingVertical: 10,
  },
  title: {
    fontSize: 13,
    fontWeight: '600',
    color: '#111111',
    letterSpacing: 0.2,
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
    color: '#888888',
    textDecorationLine: 'line-through',
  },
  discountText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#E53935',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  ratingText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#111111',
  },
  reviewCountText: {
    fontSize: 10,
    color: '#888888',
  },
});

