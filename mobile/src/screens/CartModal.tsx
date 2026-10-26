import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Image,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { CheckoutModal } from './CheckoutModal';
import { Order } from '../types';

interface CartModalProps {
  visible: boolean;
  onClose: () => void;
  onOrderSuccess?: (order: Order) => void;
}

export const CartModal: React.FC<CartModalProps> = ({
  visible,
  onClose,
  onOrderSuccess,
}) => {
  const {
    items,
    subtotal,
    shippingFee,
    updateQuantity,
    removeItem,
    clearCart,
    loyaltyDiscount,
    redeemedPoints,
    applyLoyaltyDiscount,
  } = useCart();
  const { pointsBalance } = useAuth();
  const [showCheckout, setShowCheckout] = useState(false);
  const [couponApplied, setCouponApplied] = useState(false);

  const couponDiscount = couponApplied ? Math.round(subtotal * 0.1) : 0;
  const currentTotal = Math.max(0, subtotal + shippingFee - loyaltyDiscount - couponDiscount);

  const formattedSubtotal = `₹ ${new Intl.NumberFormat('en-IN').format(subtotal)}`;
  const formattedShipping = shippingFee === 0 ? '₹ 0' : `₹ ${shippingFee}`;
  const formattedCoupon = `- ₹ ${new Intl.NumberFormat('en-IN').format(couponDiscount)}`;
  const formattedLoyalty = `- ₹ ${new Intl.NumberFormat('en-IN').format(loyaltyDiscount)}`;
  const formattedTotal = `₹ ${new Intl.NumberFormat('en-IN').format(currentTotal)}`;

  const handleTogglePoints = () => {
    if (redeemedPoints > 0) {
      applyLoyaltyDiscount(0);
    } else {
      const maxPts = Math.min(pointsBalance, subtotal);
      applyLoyaltyDiscount(maxPts);
    }
  };

  const handleClearCart = () => {
    Alert.alert('Clear Bag', 'Are you sure you want to remove all items from your cart?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Clear', style: 'destructive', onPress: clearCart },
    ]);
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="fullScreen" onRequestClose={onClose}>
      <SafeAreaView style={styles.safeArea}>
        {/* Header matching prototype Screen 8 */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.navBtn}>
            <Ionicons name="arrow-back" size={24} color="#111111" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>My Cart</Text>
          <TouchableOpacity
            onPress={handleClearCart}
            style={styles.navBtn}
            disabled={items.length === 0}
          >
            <Ionicons name="trash-outline" size={20} color={items.length > 0 ? '#111111' : '#CCC'} />
          </TouchableOpacity>
        </View>

        {items.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="bag-handle-outline" size={56} color="#CCC" />
            <Text style={styles.emptyTitle}>Your Cart is Empty</Text>
            <Text style={styles.emptySubtitle}>
              Explore our collections and add your favourite pieces to your bag.
            </Text>
            <TouchableOpacity style={styles.shopBtn} onPress={onClose}>
              <Text style={styles.shopBtnText}>Continue Shopping</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
              {/* Cart Items List */}
              {items.map((item) => {
                const itemId = item.id || item.variant_id;
                return (
                  <View key={itemId} style={styles.itemRow}>
                    <Image source={{ uri: item.image }} style={styles.itemThumb} resizeMode="cover" />

                    <View style={styles.itemInfo}>
                      <View style={styles.titleRow}>
                        <Text style={styles.itemTitle} numberOfLines={1}>{item.product_title}</Text>
                        <TouchableOpacity onPress={() => removeItem(itemId)} style={styles.itemTrashBtn}>
                          <Ionicons name="trash-outline" size={16} color="#8E8E93" />
                        </TouchableOpacity>
                      </View>

                      <Text style={styles.variantText}>
                        {item.color || 'Standard'} | {item.size || 'M'}
                      </Text>

                      <View style={styles.priceAndStepperRow}>
                        <Text style={styles.itemPrice}>
                          ₹ {new Intl.NumberFormat('en-IN').format(item.price)}
                        </Text>

                        <View style={styles.stepperContainer}>
                          <TouchableOpacity
                            style={styles.stepperBtn}
                            onPress={() => updateQuantity(itemId, item.quantity - 1)}
                          >
                            <Ionicons name="remove" size={14} color="#111111" />
                          </TouchableOpacity>

                          <Text style={styles.stepperQuantity}>{item.quantity}</Text>

                          <TouchableOpacity
                            style={styles.stepperBtn}
                            onPress={() => updateQuantity(itemId, item.quantity + 1)}
                          >
                            <Ionicons name="add" size={14} color="#111111" />
                          </TouchableOpacity>
                        </View>
                      </View>
                    </View>
                  </View>
                );
              })}

              {/* Apply Coupon Row matching Screen 8 */}
              <TouchableOpacity
                style={[styles.couponRow, couponApplied && styles.couponRowActive]}
                onPress={() => setCouponApplied(!couponApplied)}
                activeOpacity={0.8}
              >
                <View style={styles.couponLeft}>
                  <Ionicons
                    name={couponApplied ? "checkmark-circle" : "pricetag-outline"}
                    size={18}
                    color={couponApplied ? "#10B981" : "#111111"}
                  />
                  <Text style={[styles.couponText, couponApplied && { color: "#10B981", fontWeight: '700' }]}>
                    {couponApplied ? 'Coupon Applied: HUBKLUB10 (10% Off)' : 'Apply Coupon (HUBKLUB10)'}
                  </Text>
                </View>
                <Ionicons
                  name={couponApplied ? "close" : "chevron-forward"}
                  size={18}
                  color={couponApplied ? "#10B981" : "#C7C7CC"}
                />
              </TouchableOpacity>

              {/* HUBKLUB Points Redemption Card */}
              {pointsBalance > 0 && (
                <TouchableOpacity
                  style={[styles.loyaltyCard, redeemedPoints > 0 && styles.loyaltyCardActive]}
                  onPress={handleTogglePoints}
                  activeOpacity={0.85}
                >
                  <View style={styles.loyaltyLeft}>
                    <View style={styles.loyaltyIconBox}>
                      <Ionicons name="sparkles" size={16} color="#D4AF37" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.loyaltyTitle}>Redeem HUBKLUB Points</Text>
                      <Text style={styles.loyaltySub}>
                        {redeemedPoints > 0
                          ? `Using ${redeemedPoints} pts for ₹${redeemedPoints} instant discount`
                          : `You have ${pointsBalance.toLocaleString('en-IN')} pts (Worth ₹${pointsBalance.toLocaleString('en-IN')})`}
                      </Text>
                    </View>
                  </View>
                  <View style={[styles.loyaltyActionBadge, redeemedPoints > 0 && styles.loyaltyActionBadgeActive]}>
                    <Text style={[styles.loyaltyActionText, redeemedPoints > 0 && styles.loyaltyActionTextActive]}>
                      {redeemedPoints > 0 ? 'Applied ✓' : 'Redeem'}
                    </Text>
                  </View>
                </TouchableOpacity>
              )}

              {/* Order Summary Card */}
              <View style={styles.summaryCard}>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Subtotal</Text>
                  <Text style={styles.summaryValue}>{formattedSubtotal}</Text>
                </View>

                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Shipping</Text>
                  <Text style={[styles.summaryValue, shippingFee === 0 && { color: '#2E7D32' }]}>
                    {formattedShipping}
                  </Text>
                </View>

                {couponDiscount > 0 && (
                  <View style={styles.summaryRow}>
                    <Text style={[styles.summaryLabel, { color: '#059669' }]}>Coupon HUBKLUB10 (10% Off)</Text>
                    <Text style={[styles.summaryValue, { color: '#059669' }]}>{formattedCoupon}</Text>
                  </View>
                )}

                {loyaltyDiscount > 0 && (
                  <View style={styles.summaryRow}>
                    <Text style={[styles.summaryLabel, { color: '#D4AF37' }]}>
                      HUBKLUB Points ({redeemedPoints} pts)
                    </Text>
                    <Text style={[styles.summaryValue, { color: '#D4AF37' }]}>{formattedLoyalty}</Text>
                  </View>
                )}

                <View style={[styles.summaryRow, styles.totalRow]}>
                  <Text style={styles.totalLabel}>Total</Text>
                  <Text style={styles.totalValue}>{formattedTotal}</Text>
                </View>
              </View>
            </ScrollView>

            {/* Sticky Bottom Checkout Button */}
            <View style={styles.bottomBar}>
              <TouchableOpacity
                style={styles.checkoutBtn}
                onPress={() => setShowCheckout(true)}
                activeOpacity={0.88}
              >
                <Text style={styles.checkoutBtnText}>Checkout</Text>
              </TouchableOpacity>
            </View>
          </>
        )}

        {/* Checkout Modal */}
        <CheckoutModal
          visible={showCheckout}
          onClose={() => setShowCheckout(false)}
          onOrderSuccess={(order) => {
            setShowCheckout(false);
            onClose();
            if (onOrderSuccess) onOrderSuccess(order);
          }}
        />
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    height: 52,
    borderBottomWidth: 1,
    borderBottomColor: '#F2F2F2',
  },
  navBtn: {
    padding: 6,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
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
  shopBtn: {
    backgroundColor: '#111111',
    paddingHorizontal: 22,
    paddingVertical: 12,
    borderRadius: 6,
  },
  shopBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingBottom: 90,
  },
  itemRow: {
    flexDirection: 'row',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F2F2F2',
    gap: 14,
  },
  itemThumb: {
    width: 80,
    height: 100,
    borderRadius: 6,
    backgroundColor: '#F8F8F8',
  },
  itemInfo: {
    flex: 1,
    justifyContent: 'space-between',
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  itemTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111111',
    flex: 1,
    marginRight: 8,
  },
  itemTrashBtn: {
    padding: 4,
  },
  variantText: {
    fontSize: 12,
    color: '#8E8E93',
    marginTop: 2,
  },
  priceAndStepperRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
  },
  itemPrice: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111111',
  },
  stepperContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 6,
    overflow: 'hidden',
  },
  stepperBtn: {
    width: 28,
    height: 28,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  stepperQuantity: {
    paddingHorizontal: 10,
    fontSize: 12,
    fontWeight: '600',
    color: '#111111',
  },
  couponRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F2F2F2',
    marginTop: 6,
  },
  couponLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  couponText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#111111',
  },
  summaryCard: {
    paddingVertical: 16,
    gap: 10,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 13,
    color: '#666666',
  },
  summaryValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#111111',
  },
  totalRow: {
    paddingTop: 10,
    marginTop: 6,
    borderTopWidth: 1,
    borderTopColor: '#EEEEEE',
  },
  totalLabel: {
    fontSize: 15,
    fontWeight: '800',
    color: '#111111',
  },
  totalValue: {
    fontSize: 16,
    fontWeight: '800',
    color: '#111111',
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#EEEEEE',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  checkoutBtn: {
    height: 48,
    backgroundColor: '#111111',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkoutBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  couponRowActive: {
    borderColor: '#10B981',
    backgroundColor: '#F0FDF4',
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  loyaltyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 10,
    backgroundColor: '#FAF5EE',
    borderWidth: 1,
    borderColor: '#E5D5C0',
    marginTop: 10,
  },
  loyaltyCardActive: {
    backgroundColor: '#FDFBF7',
    borderColor: '#D4AF37',
  },
  loyaltyLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
    paddingRight: 8,
  },
  loyaltyIconBox: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5D5C0',
  },
  loyaltyTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#111111',
  },
  loyaltySub: {
    fontSize: 11,
    color: '#785A28',
    marginTop: 1,
  },
  loyaltyActionBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    backgroundColor: '#111111',
  },
  loyaltyActionBadgeActive: {
    backgroundColor: '#D4AF37',
  },
  loyaltyActionText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  loyaltyActionTextActive: {
    color: '#111111',
  },
});
