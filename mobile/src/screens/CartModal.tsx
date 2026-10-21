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
    total,
  } = useCart();
  const [showCheckout, setShowCheckout] = useState(false);
  const [couponApplied, setCouponApplied] = useState(false);

  const formattedSubtotal = `₹ ${new Intl.NumberFormat('en-IN').format(subtotal)}`;
  const formattedShipping = shippingFee === 0 ? '₹ 0' : `₹ ${shippingFee}`;
  const formattedTotal = `₹ ${new Intl.NumberFormat('en-IN').format(total)}`;

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
              {items.map((item) => (
                <View key={item.variant_id} style={styles.itemRow}>
                  <Image source={{ uri: item.image }} style={styles.itemThumb} resizeMode="cover" />

                  <View style={styles.itemInfo}>
                    <View style={styles.titleRow}>
                      <Text style={styles.itemTitle} numberOfLines={1}>{item.product_title}</Text>
                      <TouchableOpacity onPress={() => removeItem(item.variant_id)} style={styles.itemTrashBtn}>
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
                          onPress={() => updateQuantity(item.variant_id, item.quantity - 1)}
                        >
                          <Ionicons name="remove" size={14} color="#111111" />
                        </TouchableOpacity>

                        <Text style={styles.stepperQuantity}>{item.quantity}</Text>

                        <TouchableOpacity
                          style={styles.stepperBtn}
                          onPress={() => updateQuantity(item.variant_id, item.quantity + 1)}
                        >
                          <Ionicons name="add" size={14} color="#111111" />
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>
                </View>
              ))}

              {/* Apply Coupon Row matching Screen 8 */}
              <TouchableOpacity
                style={styles.couponRow}
                onPress={() => setCouponApplied(!couponApplied)}
                activeOpacity={0.8}
              >
                <View style={styles.couponLeft}>
                  <Ionicons name="pricetag-outline" size={18} color="#111111" />
                  <Text style={styles.couponText}>
                    {couponApplied ? 'Coupon Applied: HUBKLUB10' : 'Apply Coupon'}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color="#C7C7CC" />
              </TouchableOpacity>

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
});
