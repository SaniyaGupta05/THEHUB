import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Image,
  ScrollView,
  TouchableOpacity,
  Share,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Product, ProductVariant } from '../types';
import { useCart } from '../context/CartContext';
import { useWishlist } from '../context/WishlistContext';

interface ProductDetailModalProps {
  product: Product | null;
  visible: boolean;
  onClose: () => void;
  onCartPress?: () => void;
}

export const ProductDetailModal: React.FC<ProductDetailModalProps> = ({
  product,
  visible,
  onClose,
  onCartPress,
}) => {
  if (!product) return null;

  const { addItem, itemCount } = useCart();
  const { isInWishlist, toggleWishlist } = useWishlist();
  const wishlisted = isInWishlist(product.id);

  const [selectedVariant, setSelectedVariant] = useState<ProductVariant>(
    product.variants.find((v) => v.available) || product.variants[0]
  );
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [selectedSize, setSelectedSize] = useState('M');
  const [selectedColor, setSelectedColor] = useState('Multi');
  const [addedToast, setAddedToast] = useState(false);

  const formattedPrice = `₹ ${new Intl.NumberFormat('en-IN').format(selectedVariant.price)}`;
  const formattedComparePrice = product.compare_at_price
    ? `₹ ${new Intl.NumberFormat('en-IN').format(product.compare_at_price)}`
    : null;

  const discountPercent =
    product.compare_at_price && product.compare_at_price > product.price
      ? Math.round(((product.compare_at_price - product.price) / product.compare_at_price) * 100)
      : null;

  const sizes = ['XS', 'S', 'M', 'L', 'XL'];
  const colors = [
    { name: 'Multi', color: '#D4AF37' },
    { name: 'Blush', color: '#E8C5B0' },
    { name: 'Black', color: '#222222' },
  ];

  const handleShare = async () => {
    try {
      await Share.share({
        message: `Check out ${product.title} on THE HUB: ${formattedPrice}`,
      });
    } catch (e) {}
  };

  const handleAddToCart = () => {
    addItem(product, selectedVariant, 1);
    setAddedToast(true);
    setTimeout(() => setAddedToast(false), 2000);
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="fullScreen" onRequestClose={onClose}>
      <SafeAreaView style={styles.safeArea}>
        {/* Top Navigation Bar: Back arrow, Heart, Share */}
        <View style={styles.topNavBar}>
          <TouchableOpacity onPress={onClose} style={styles.navIconBtn}>
            <Ionicons name="arrow-back" size={24} color="#111111" />
          </TouchableOpacity>

          <View style={styles.topNavRight}>
            <TouchableOpacity onPress={() => toggleWishlist(product)} style={styles.navIconBtn}>
              <Ionicons
                name={wishlisted ? 'heart' : 'heart-outline'}
                size={22}
                color={wishlisted ? '#E53935' : '#111111'}
              />
            </TouchableOpacity>
            <TouchableOpacity onPress={handleShare} style={styles.navIconBtn}>
              <Ionicons name="share-social-outline" size={22} color="#111111" />
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          {/* Main Image Carousel */}
          <View style={styles.imageBox}>
            <Image
              source={{ uri: product.images[activeImageIndex] || product.images[0] }}
              style={styles.mainImage}
              resizeMode="cover"
            />
          </View>

          {/* Pagination Dots */}
          <View style={styles.paginationDots}>
            {(product.images.length > 1 ? product.images : [1, 2, 3, 4]).map((_, idx) => (
              <TouchableOpacity
                key={idx}
                onPress={() => setActiveImageIndex(idx % product.images.length)}
                style={[
                  styles.dot,
                  (activeImageIndex % (product.images.length || 1)) === idx && styles.dotActive,
                ]}
              />
            ))}
          </View>

          {/* Product Info Section */}
          <View style={styles.infoSection}>
            <Text style={styles.productTitle}>{product.title}</Text>

            {/* Rating row: ★★★★☆ 4.5 (124) */}
            <View style={styles.ratingRow}>
              <View style={styles.starsRow}>
                {[1, 2, 3, 4].map((s) => (
                  <Ionicons key={s} name="star" size={13} color="#D4AF37" />
                ))}
                <Ionicons name="star-outline" size={13} color="#D4AF37" />
              </View>
              <Text style={styles.ratingScore}>{product.rating ? product.rating.toFixed(1) : '4.5'}</Text>
              <Text style={styles.reviewCount}>({product.review_count || 124})</Text>
            </View>

            {/* Price Row: ₹ 2,499, strikethrough ₹ 3,999, 38% OFF */}
            <View style={styles.priceRow}>
              <Text style={styles.priceText}>{formattedPrice}</Text>
              {formattedComparePrice && (
                <Text style={styles.comparePriceText}>{formattedComparePrice}</Text>
              )}
              {discountPercent && (
                <Text style={styles.discountBadge}>{discountPercent}% OFF</Text>
              )}
            </View>

            {/* Color Selector */}
            <View style={styles.optionSection}>
              <Text style={styles.optionLabel}>Colour: <Text style={{ fontWeight: '600' }}>{selectedColor}</Text></Text>
              <View style={styles.colorSwatchesRow}>
                {colors.map((c) => {
                  const isSelected = selectedColor === c.name;
                  return (
                    <TouchableOpacity
                      key={c.name}
                      onPress={() => setSelectedColor(c.name)}
                      style={[
                        styles.colorSwatchRing,
                        isSelected && styles.colorSwatchRingActive,
                      ]}
                    >
                      <View style={[styles.colorSwatchCircle, { backgroundColor: c.color }]} />
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Size Selector */}
            <View style={styles.optionSection}>
              <Text style={styles.optionLabel}>Size</Text>
              <View style={styles.sizesRow}>
                {sizes.map((s) => {
                  const isSelected = selectedSize === s;
                  return (
                    <TouchableOpacity
                      key={s}
                      onPress={() => setSelectedSize(s)}
                      style={[styles.sizePill, isSelected && styles.sizePillActive]}
                    >
                      <Text style={[styles.sizePillText, isSelected && styles.sizePillTextActive]}>
                        {s}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Product Description */}
            <View style={styles.descriptionSection}>
              <Text style={styles.descTitle}>Product Details</Text>
              <Text style={styles.descText}>{product.description}</Text>
            </View>
          </View>
        </ScrollView>

        {/* Bottom Sticky Action Bar: Add to Cart button + Cart Icon Button */}
        <View style={styles.bottomBar}>
          <TouchableOpacity
            style={styles.addToCartBtn}
            onPress={handleAddToCart}
            activeOpacity={0.88}
          >
            <Text style={styles.addToCartText}>
              {addedToast ? 'ADDED TO CART ✓' : 'Add to Cart'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.cartIconBtn}
            onPress={() => {
              onClose();
              if (onCartPress) onCartPress();
            }}
            activeOpacity={0.8}
          >
            <Ionicons name="bag-handle-outline" size={22} color="#111111" />
            {itemCount > 0 && (
              <View style={styles.cartBadge}>
                <Text style={styles.cartBadgeText}>{itemCount}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  topNavBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    height: 48,
  },
  navIconBtn: {
    padding: 6,
  },
  topNavRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  scrollContent: {
    paddingBottom: 90,
  },
  imageBox: {
    width: '100%',
    height: 420,
    backgroundColor: '#F8F8F8',
  },
  mainImage: {
    width: '100%',
    height: '100%',
  },
  paginationDots: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    marginTop: 12,
    marginBottom: 8,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#D1D1D6',
  },
  dotActive: {
    backgroundColor: '#111111',
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  infoSection: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  productTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111111',
    marginBottom: 6,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 10,
  },
  starsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  ratingScore: {
    fontSize: 12,
    fontWeight: '700',
    color: '#111111',
    marginLeft: 4,
  },
  reviewCount: {
    fontSize: 12,
    color: '#8E8E93',
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  priceText: {
    fontSize: 18,
    fontWeight: '800',
    color: '#111111',
  },
  comparePriceText: {
    fontSize: 13,
    color: '#8E8E93',
    textDecorationLine: 'line-through',
  },
  discountBadge: {
    fontSize: 12,
    fontWeight: '700',
    color: '#E53935',
  },
  optionSection: {
    marginBottom: 16,
  },
  optionLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: '#555555',
    marginBottom: 8,
  },
  colorSwatchesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  colorSwatchRing: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
  },
  colorSwatchRingActive: {
    borderColor: '#111111',
  },
  colorSwatchCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
  },
  sizesRow: {
    flexDirection: 'row',
    gap: 8,
  },
  sizePill: {
    width: 44,
    height: 36,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  sizePillActive: {
    backgroundColor: '#111111',
    borderColor: '#111111',
  },
  sizePillText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#111111',
  },
  sizePillTextActive: {
    color: '#FFFFFF',
  },
  descriptionSection: {
    marginTop: 10,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#F2F2F2',
  },
  descTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#111111',
    marginBottom: 6,
  },
  descText: {
    fontSize: 13,
    color: '#666666',
    lineHeight: 20,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#EEEEEE',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  addToCartBtn: {
    flex: 1,
    height: 48,
    backgroundColor: '#111111',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addToCartText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  cartIconBtn: {
    width: 48,
    height: 48,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  cartBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    backgroundColor: '#111111',
    borderRadius: 7,
    minWidth: 14,
    height: 14,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 2,
  },
  cartBadgeText: {
    color: '#FFFFFF',
    fontSize: 8,
    fontWeight: '800',
  },
});
