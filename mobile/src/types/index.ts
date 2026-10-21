export interface ProductVariant {
  id: string;
  title: string;
  sku?: string;
  price: number;
  compare_at_price?: number;
  available: boolean;
  size?: string;
  color?: string;
}

export interface Product {
  id: string;
  title: string;
  handle: string;
  description: string;
  vendor: string;
  category: string;
  tags: string[];
  price: number;
  compare_at_price?: number;
  is_sale: boolean;
  images: string[];
  variants: ProductVariant[];
  available: boolean;
  featured: boolean;
  is_new: boolean;
  rating: number;
  review_count: number;
}

export interface Collection {
  id: string;
  title: string;
  handle: string;
  description: string;
  image?: string;
  product_count: number;
}

export interface CartItem {
  id: string;
  product_id: string;
  variant_id: string;
  product_title: string;
  variant_title: string;
  price: number;
  quantity: number;
  total_price: number;
  image?: string;
  size?: string;
  color?: string;
}

export interface Cart {
  id: string;
  items: CartItem[];
  subtotal: number;
  estimated_tax: number;
  shipping_fee: number;
  loyalty_discount: number;
  total: number;
  is_demo: boolean;
  currency: string;
}

export interface Address {
  full_name: string;
  phone: string;
  street: string;
  city: string;
  state: string;
  pincode: string;
  country: string;
}

export interface OrderItem {
  product_id: string;
  variant_id: string;
  product_title: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  image?: string;
}

export interface Order {
  id: string;
  order_number: string;
  customer_id: string;
  items: OrderItem[];
  subtotal: number;
  tax: number;
  shipping: number;
  discount_amount: number;
  points_redeemed: number;
  points_earned_estimated: number;
  total_amount: number;
  status: string;
  shipping_address: Address;
  created_at: string;
  is_demo: boolean;
}

export interface CustomerProfile {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  member_since: string;
  is_hubklub_member: boolean;
  membership_number?: string;
  tier?: 'Classic' | 'Gold' | 'Platinum';
  max_single_purchase: number;
  annual_spend_current_year: number;
  lifetime_spend: number;
  saved_addresses: Address[];
}

export interface PointsTransaction {
  id: string;
  customer_id: string;
  type: 'earn' | 'redeem' | 'bonus' | 'expired' | 'adjustment';
  points: number;
  rupee_equivalent: number;
  order_id?: string;
  description: string;
  timestamp: string;
  expiry_date?: string;
  status: string;
}

export interface PointsExpiryBatch {
  points: number;
  rupee_equivalent: number;
  expiry_date: string;
  days_remaining: number;
}

export interface HubklubMembershipStatus {
  customer_id: string;
  is_member: boolean;
  membership_number?: string;
  tier?: 'Classic' | 'Gold' | 'Platinum';
  is_eligible: boolean;
  max_single_purchase: number;
  eligibility_threshold: number;
  progress_percent: number;
  eligibility_message: string;
  enrolled_at?: string;
  is_demo: boolean;
}

export interface HubklubBalance {
  customer_id: string;
  available_points: number;
  redemption_value_inr: number;
  expiring_soon_points: number;
  expiring_soon_date?: string;
  points_batches: PointsExpiryBatch[];
  is_demo: boolean;
}

export interface HubklubAnnualBonusProgress {
  customer_id: string;
  current_year: number;
  accumulated_spend_inr: number;
  annual_threshold_inr: number;
  progress_percent: number;
  bonus_achieved: boolean;
  points_earned_this_year: number;
  estimated_annual_bonus_points: number;
  estimated_bonus_value_inr: number;
  is_demo: boolean;
}

export interface HubklubSummary {
  membership: HubklubMembershipStatus;
  balance: HubklubBalance;
  annual_bonus: HubklubAnnualBonusProgress;
  recent_transactions: PointsTransaction[];
  active_rate_bands: Array<{ min: number; max: number; rate: number }>;
  is_demo: boolean;
}

export interface PointsCalculationResult {
  amount: number;
  rate_percent: number;
  slab_name: string;
  base_points: number;
  rupee_equivalent: number;
  annual_spend_before: number;
  annual_spend_after: number;
  annual_threshold: number;
  bonus_achieved: boolean;
  bonus_points: number;
  total_points: number;
  total_rupee_value: number;
  is_demo: boolean;
}

