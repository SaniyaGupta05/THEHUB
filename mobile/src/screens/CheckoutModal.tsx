import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { apiClient } from '../api/client';
import { Order } from '../types';

interface CheckoutModalProps {
  visible: boolean;
  onClose: () => void;
  onOrderSuccess: (order: Order) => void;
}

export const CheckoutModal: React.FC<CheckoutModalProps> = ({
  visible,
  onClose,
  onOrderSuccess,
}) => {
  const { items, subtotal, shippingFee, clearCart } = useCart();
  const { customerProfile, refreshProfile } = useAuth();

  const [contactEmail, setContactEmail] = useState(customerProfile?.email || 'demo@thehub.in');
  const [contactPhone, setContactPhone] = useState(customerProfile?.phone || '+91 98765 43210');
  const [fullName, setFullName] = useState(
    customerProfile ? `${customerProfile.first_name} ${customerProfile.last_name}` : 'John Doe'
  );
  const [street, setStreet] = useState('123, Green Park, New Delhi');
  const [cityState, setCityState] = useState('New Delhi, Delhi - 110016');
  const [editingAddress, setEditingAddress] = useState(false);
  const [editingContact, setEditingContact] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [completedOrder, setCompletedOrder] = useState<Order | null>(null);

  const formattedSubtotal = `₹ ${new Intl.NumberFormat('en-IN').format(subtotal)}`;
  const formattedShipping = shippingFee === 0 ? '₹ 0' : `₹ ${shippingFee}`;
  const totalAmount = subtotal + shippingFee;
  const formattedTotal = `₹ ${new Intl.NumberFormat('en-IN').format(totalAmount)}`;

  const handlePlaceOrder = async () => {
    setIsSubmitting(true);
    try {
      const order = await apiClient.demoCheckout({
        shipping_address: {
          full_name: fullName,
          phone: contactPhone,
          street: street,
          city: 'New Delhi',
          state: 'Delhi',
          pincode: '110016',
          country: 'India',
        },
        items,
        points_to_redeem: 0,
        idempotency_key: `chk_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      });

      clearCart();
      setCompletedOrder(order);
      await refreshProfile();
    } catch (e) {
      // Fallback completed order
      const fallbackOrder: Order = {
        id: `ord_${Date.now()}`,
        order_number: `HUB${Math.floor(100000000 + Math.random() * 900000000)}`,
        customer_id: 'cust_demo',
        items: items.map((i) => ({
          product_id: i.product_id,
          variant_id: i.variant_id,
          product_title: i.product_title,
          quantity: i.quantity,
          unit_price: i.price,
          total_price: i.price * i.quantity,
          image: i.image,
        })),
        subtotal,
        tax: 0,
        shipping: shippingFee,
        discount_amount: 0,
        points_redeemed: 0,
        points_earned_estimated: Math.round(totalAmount * 0.05),
        total_amount: totalAmount,
        status: 'Delivered',
        shipping_address: {
          full_name: fullName,
          phone: contactPhone,
          street: street,
          city: 'New Delhi',
          state: 'Delhi',
          pincode: '110016',
          country: 'India',
        },
        created_at: new Date().toISOString(),
        is_demo: true,
      };
      clearCart();
      setCompletedOrder(fallbackOrder);
      await refreshProfile();
    } finally {
      setIsSubmitting(false);
    }
  };

  // SCREEN 10: ORDER CONFIRMATION
  if (completedOrder) {
    return (
      <Modal visible={visible} animationType="fade" presentationStyle="fullScreen">
        <SafeAreaView style={styles.safeArea}>
          <ScrollView contentContainerStyle={styles.confirmationContent}>
            {/* Checkmark icon with warm taupe/gold accent */}
            <View style={styles.confirmCheckCircle}>
              <Ionicons name="checkmark" size={38} color="#FFFFFF" />
            </View>

            <Text style={styles.confirmTitle}>Thank You!</Text>
            <Text style={styles.confirmSubtitle}>
              Your order has been placed successfully.
            </Text>

            {/* Order Details Card */}
            <View style={styles.confirmCard}>
              <Text style={styles.confirmOrderNumber}>
                Order ID: {completedOrder.order_number}
              </Text>
              <Text style={styles.confirmOrderDate}>
                Order Date: {new Date(completedOrder.created_at).toLocaleDateString('en-GB', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                })}
              </Text>
            </View>

            {/* Action Buttons */}
            <TouchableOpacity
              style={styles.viewOrderBtn}
              onPress={() => {
                onOrderSuccess(completedOrder);
              }}
              activeOpacity={0.88}
            >
              <Text style={styles.viewOrderBtnText}>View Order Details</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.continueShoppingLink}
              onPress={() => {
                onClose();
              }}
              activeOpacity={0.7}
            >
              <Text style={styles.continueShoppingText}>Continue Shopping</Text>
            </TouchableOpacity>

            {/* Demo Order Notice */}
            <View style={styles.demoNoticeBanner}>
              <Ionicons name="bag-outline" size={24} color="#8E8E93" style={{ marginRight: 12 }} />
              <View style={{ flex: 1 }}>
                <Text style={styles.demoNoticeTitle}>This is a demo order</Text>
                <Text style={styles.demoNoticeSub}>No real payment has been processed.</Text>
              </View>
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>
    );
  }

  // SCREEN 9: CHECKOUT (DEMO)
  return (
    <Modal visible={visible} animationType="slide" presentationStyle="fullScreen" onRequestClose={onClose}>
      <SafeAreaView style={styles.safeArea}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.navBtn}>
            <Ionicons name="arrow-back" size={24} color="#111111" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Checkout (Demo)</Text>
          <View style={{ width: 24 }} />
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* Stepper matching prototype Screen 9: (1) Shipping - (2) Payment - (3) Review */}
          <View style={styles.stepperRow}>
            <View style={styles.stepItem}>
              <View style={[styles.stepCircle, styles.stepCircleActive]}>
                <Text style={[styles.stepNumber, styles.stepNumberActive]}>1</Text>
              </View>
              <Text style={[styles.stepLabel, styles.stepLabelActive]}>Shipping</Text>
            </View>
            <View style={styles.stepLine} />

            <View style={styles.stepItem}>
              <View style={styles.stepCircle}>
                <Text style={styles.stepNumber}>2</Text>
              </View>
              <Text style={styles.stepLabel}>Payment</Text>
            </View>
            <View style={styles.stepLine} />

            <View style={styles.stepItem}>
              <View style={styles.stepCircle}>
                <Text style={styles.stepNumber}>3</Text>
              </View>
              <Text style={styles.stepLabel}>Review</Text>
            </View>
          </View>

          {/* Contact Information Card */}
          <View style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Contact Information</Text>
              <TouchableOpacity onPress={() => setEditingContact(!editingContact)}>
                <Text style={styles.editLink}>{editingContact ? 'Done' : 'Edit'}</Text>
              </TouchableOpacity>
            </View>

            {editingContact ? (
              <View style={styles.editInputsBox}>
                <TextInput
                  style={styles.textInput}
                  value={contactEmail}
                  onChangeText={setContactEmail}
                  placeholder="Email"
                />
                <TextInput
                  style={styles.textInput}
                  value={contactPhone}
                  onChangeText={setContactPhone}
                  placeholder="Phone"
                />
              </View>
            ) : (
              <View>
                <Text style={styles.infoLine}>{contactEmail}</Text>
                <Text style={styles.infoLineSecondary}>{contactPhone}</Text>
              </View>
            )}
          </View>

          {/* Delivery Address Card */}
          <View style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Delivery Address</Text>
              <TouchableOpacity onPress={() => setEditingAddress(!editingAddress)}>
                <Text style={styles.editLink}>{editingAddress ? 'Done' : 'Edit'}</Text>
              </TouchableOpacity>
            </View>

            {editingAddress ? (
              <View style={styles.editInputsBox}>
                <TextInput
                  style={styles.textInput}
                  value={fullName}
                  onChangeText={setFullName}
                  placeholder="Full Name"
                />
                <TextInput
                  style={styles.textInput}
                  value={street}
                  onChangeText={setStreet}
                  placeholder="Street Address"
                />
                <TextInput
                  style={styles.textInput}
                  value={cityState}
                  onChangeText={setCityState}
                  placeholder="City, State - Pincode"
                />
              </View>
            ) : (
              <View>
                <Text style={styles.infoLine}>{fullName}</Text>
                <Text style={styles.infoLineSecondary}>{street}</Text>
                <Text style={styles.infoLineSecondary}>{cityState}</Text>
              </View>
            )}
          </View>

          {/* Order Summary Card */}
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Order Summary</Text>

            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Items ({items.reduce((s, i) => s + i.quantity, 0)})</Text>
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

          <Text style={styles.demoNoteText}>Demo Checkout - No real payment</Text>
        </ScrollView>

        {/* Sticky Place Order Button */}
        <View style={styles.bottomBar}>
          <TouchableOpacity
            style={styles.placeOrderBtn}
            onPress={handlePlaceOrder}
            disabled={isSubmitting}
            activeOpacity={0.88}
          >
            {isSubmitting ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={styles.placeOrderText}>Place Order (Demo)</Text>
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
  scrollContent: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    paddingBottom: 90,
  },
  stepperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 16,
    paddingHorizontal: 20,
  },
  stepItem: {
    alignItems: 'center',
    gap: 4,
  },
  stepCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#F0F0F0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepCircleActive: {
    backgroundColor: '#C5A880',
  },
  stepNumber: {
    fontSize: 12,
    fontWeight: '700',
    color: '#8E8E93',
  },
  stepNumberActive: {
    color: '#FFFFFF',
  },
  stepLabel: {
    fontSize: 10,
    color: '#8E8E93',
    fontWeight: '500',
  },
  stepLabelActive: {
    color: '#111111',
    fontWeight: '700',
  },
  stepLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E0E0E0',
    marginHorizontal: 8,
    marginTop: -14,
  },
  sectionCard: {
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F2F2F2',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111111',
  },
  editLink: {
    fontSize: 12,
    color: '#8E8E93',
    fontWeight: '600',
  },
  infoLine: {
    fontSize: 13,
    color: '#111111',
    fontWeight: '500',
    marginBottom: 2,
  },
  infoLineSecondary: {
    fontSize: 12,
    color: '#666666',
    lineHeight: 18,
  },
  editInputsBox: {
    gap: 8,
    marginTop: 4,
  },
  textInput: {
    backgroundColor: '#F8F8F8',
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 13,
    color: '#111111',
    borderWidth: 1,
    borderColor: '#E8E8E8',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
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
    marginTop: 10,
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
  demoNoteText: {
    fontSize: 11,
    color: '#8E8E93',
    textAlign: 'center',
    marginTop: 20,
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
  placeOrderBtn: {
    height: 48,
    backgroundColor: '#111111',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeOrderText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.5,
  },

  // Confirmation Screen Styles
  confirmationContent: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 40,
  },
  confirmCheckCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#C5A880',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  confirmTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#111111',
    marginBottom: 6,
  },
  confirmSubtitle: {
    fontSize: 14,
    color: '#666666',
    textAlign: 'center',
    marginBottom: 24,
  },
  confirmCard: {
    width: '100%',
    backgroundColor: '#F8F8F8',
    borderRadius: 8,
    padding: 16,
    borderWidth: 1,
    borderColor: '#EEEEEE',
    alignItems: 'center',
    gap: 6,
    marginBottom: 24,
  },
  confirmOrderNumber: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111111',
  },
  confirmOrderDate: {
    fontSize: 12,
    color: '#8E8E93',
  },
  viewOrderBtn: {
    width: '100%',
    height: 48,
    backgroundColor: '#111111',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
  },
  viewOrderBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  continueShoppingLink: {
    paddingVertical: 8,
    marginBottom: 36,
  },
  continueShoppingText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#111111',
    textDecorationLine: 'underline',
  },
  demoNoticeBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FAFAF8',
    borderWidth: 1,
    borderColor: '#E8E8E8',
    borderRadius: 8,
    padding: 14,
    width: '100%',
  },
  demoNoticeTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#111111',
    marginBottom: 2,
  },
  demoNoticeSub: {
    fontSize: 11,
    color: '#8E8E93',
  },
});
