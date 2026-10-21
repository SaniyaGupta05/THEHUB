from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime
from enum import Enum

# --- Common & Integration Enums ---
class IntegrationMode(str, Enum):
    MOCK = "mock"
    LIVE = "live"

class LoyaltyTier(str, Enum):
    CLASSIC = "Classic"
    GOLD = "Gold"
    PLATINUM = "Platinum"

class TransactionType(str, Enum):
    EARN = "earn"
    REDEEM = "redeem"
    BONUS = "bonus"
    EXPIRED = "expired"
    ADJUSTMENT = "adjustment"

# --- Catalogue Models ---
class ProductVariant(BaseModel):
    id: str
    title: str
    sku: Optional[str] = None
    price: float
    compare_at_price: Optional[float] = None
    available: bool = True
    size: Optional[str] = None
    color: Optional[str] = None

class Product(BaseModel):
    id: str
    title: str
    handle: str
    description: str
    vendor: str = "THE HUB"
    category: str
    tags: List[str] = []
    price: float
    compare_at_price: Optional[float] = None
    is_sale: bool = False
    images: List[str] = []
    variants: List[ProductVariant] = []
    available: bool = True
    featured: bool = False
    is_new: bool = False
    rating: float = 4.8
    review_count: int = 24

class Collection(BaseModel):
    id: str
    title: str
    handle: str
    description: str
    image: Optional[str] = None
    product_count: int = 0

# --- Cart Models ---
class CartItemCreate(BaseModel):
    product_id: str
    variant_id: str
    quantity: int = Field(gt=0, default=1)

class CartItemUpdate(BaseModel):
    quantity: int = Field(ge=0)

class CartItem(BaseModel):
    id: str
    product_id: str
    variant_id: str
    product_title: str
    variant_title: str
    price: float
    quantity: int
    total_price: float
    image: Optional[str] = None
    size: Optional[str] = None
    color: Optional[str] = None

class Cart(BaseModel):
    id: str
    items: List[CartItem] = []
    subtotal: float = 0.0
    estimated_tax: float = 0.0
    shipping_fee: float = 0.0
    loyalty_discount: float = 0.0
    total: float = 0.0
    is_demo: bool = True
    currency: str = "INR"

# --- Demo Checkout & Order Models ---
class Address(BaseModel):
    full_name: str
    phone: str
    street: str
    city: str
    state: str
    pincode: str
    country: str = "India"

class DemoCheckoutRequest(BaseModel):
    customer_id: str
    shipping_address: Address
    points_to_redeem: int = 0
    idempotency_key: Optional[str] = None
    items: Optional[List[CartItem]] = None

class OrderItem(BaseModel):
    product_id: str
    variant_id: str
    product_title: str
    quantity: int
    unit_price: float
    total_price: float
    image: Optional[str] = None

class Order(BaseModel):
    id: str
    order_number: str
    customer_id: str
    items: List[OrderItem]
    subtotal: float
    tax: float
    shipping: float
    discount_amount: float = 0.0
    points_redeemed: int = 0
    points_earned_estimated: int = 0
    total_amount: float
    status: str = "Confirmed (Simulated)"
    shipping_address: Address
    created_at: datetime
    is_demo: bool = True

# --- Customer Models ---
class CustomerProfile(BaseModel):
    id: str
    first_name: str
    last_name: str
    email: str
    phone: str
    member_since: datetime
    is_hubklub_member: bool
    membership_number: Optional[str] = None
    tier: Optional[LoyaltyTier] = None
    max_single_purchase: float = 0.0
    annual_spend_current_year: float = 0.0
    lifetime_spend: float = 0.0
    saved_addresses: List[Address] = []

class CustomerRegisterRequest(BaseModel):
    first_name: str
    last_name: str
    email: str
    phone: str
    password: Optional[str] = None

class CustomerLoginRequest(BaseModel):
    identifier: str
    password: Optional[str] = None

# --- HUBKLUB Loyalty Models ---
class PointsTransaction(BaseModel):
    id: str
    customer_id: str
    type: TransactionType
    points: int
    rupee_equivalent: float
    order_id: Optional[str] = None
    description: str
    timestamp: datetime
    expiry_date: Optional[datetime] = None
    status: str = "Active"

class PointsExpiryBatch(BaseModel):
    points: int
    rupee_equivalent: float
    expiry_date: datetime
    days_remaining: int

class HubklubMembershipStatus(BaseModel):
    customer_id: str
    is_member: bool
    membership_number: Optional[str] = None
    tier: Optional[LoyaltyTier] = None
    is_eligible: bool
    max_single_purchase: float
    eligibility_threshold: float = 1000.0
    progress_percent: float
    eligibility_message: str
    enrolled_at: Optional[datetime] = None
    is_demo: bool = True

class HubklubBalance(BaseModel):
    customer_id: str
    available_points: int
    redemption_value_inr: float
    expiring_soon_points: int = 0
    expiring_soon_date: Optional[datetime] = None
    points_batches: List[PointsExpiryBatch] = []
    is_demo: bool = True

class HubklubAnnualBonusProgress(BaseModel):
    customer_id: str
    current_year: int
    accumulated_spend_inr: float
    annual_threshold_inr: float = 100000.0
    progress_percent: float
    bonus_achieved: bool
    points_earned_this_year: int
    estimated_annual_bonus_points: int
    estimated_bonus_value_inr: float
    is_demo: bool = True

class HubklubSummary(BaseModel):
    membership: HubklubMembershipStatus
    balance: HubklubBalance
    annual_bonus: HubklubAnnualBonusProgress
    recent_transactions: List[PointsTransaction] = []
    active_rate_bands: List[Dict[str, Any]] = []
    is_demo: bool = True

class LoyaltyEnrollmentRequest(BaseModel):
    customer_id: str

class LoyaltyRedemptionRequest(BaseModel):
    customer_id: str
    points_to_redeem: int = Field(gt=0)
    order_id: Optional[str] = None
    idempotency_key: str

class LoyaltyRedemptionResponse(BaseModel):
    transaction_id: str
    customer_id: str
    points_redeemed: int
    rupee_discount_applied: float
    remaining_points: int
    remaining_rupee_value: float
    status: str = "Simulated Redemption Confirmed"
    is_demo: bool = True
    message: str
