from datetime import datetime, timezone
from sqlalchemy import (
    Column,
    String,
    Float,
    Integer,
    Boolean,
    DateTime,
    Text,
    JSON,
    ForeignKey,
)
from sqlalchemy.orm import relationship
from app.db.session import Base

def utc_now():
    return datetime.now(timezone.utc)

class DBCustomer(Base):
    __tablename__ = "customers"

    id = Column(String(64), primary_key=True)
    first_name = Column(String(100), nullable=False)
    last_name = Column(String(100), nullable=False)
    email = Column(String(150), index=True, nullable=False)
    phone = Column(String(50), index=True, nullable=False)
    password_hash = Column(String(255), nullable=True)
    member_since = Column(DateTime(timezone=True), default=utc_now)
    is_hubklub_member = Column(Boolean, default=False)
    membership_number = Column(String(50), unique=True, nullable=True, index=True)
    tier = Column(String(50), default="Classic")
    max_single_purchase = Column(Float, default=0.0)
    annual_spend_current_year = Column(Float, default=0.0)
    lifetime_spend = Column(Float, default=0.0)
    available_points = Column(Integer, default=0)
    points_earned_current_year = Column(Integer, default=0)
    annual_bonus_awarded = Column(Boolean, default=False)
    annual_bonus_points = Column(Integer, default=0)
    saved_addresses = Column(JSON, default=list)
    created_at = Column(DateTime(timezone=True), default=utc_now)
    updated_at = Column(DateTime(timezone=True), default=utc_now, onupdate=utc_now)

    transactions = relationship("DBPointsTransaction", back_populates="customer", cascade="all, delete-orphan")


class DBPointsTransaction(Base):
    __tablename__ = "points_transactions"

    id = Column(String(64), primary_key=True)
    customer_id = Column(String(64), ForeignKey("customers.id"), nullable=False, index=True)
    type = Column(String(32), nullable=False)  # earn, redeem, bonus, expired, adjustment
    points = Column(Integer, nullable=False)
    rupee_equivalent = Column(Float, nullable=False)
    order_id = Column(String(64), nullable=True)
    description = Column(String(255), nullable=False)
    timestamp = Column(DateTime(timezone=True), default=utc_now, index=True)
    expiry_date = Column(DateTime(timezone=True), nullable=True)
    status = Column(String(32), default="Active")

    customer = relationship("DBCustomer", back_populates="transactions")


class DBProduct(Base):
    __tablename__ = "products"

    id = Column(String(64), primary_key=True)
    title = Column(String(255), nullable=False)
    handle = Column(String(255), unique=True, index=True, nullable=False)
    description = Column(Text, nullable=False)
    vendor = Column(String(100), default="THE HUB")
    category = Column(String(100), index=True, nullable=False)
    tags = Column(JSON, default=list)
    price = Column(Float, nullable=False)
    compare_at_price = Column(Float, nullable=True)
    is_sale = Column(Boolean, default=False)
    images = Column(JSON, default=list)
    available = Column(Boolean, default=True)
    featured = Column(Boolean, default=False)
    is_new = Column(Boolean, default=False)
    rating = Column(Float, default=4.8)
    review_count = Column(Integer, default=24)
    created_at = Column(DateTime(timezone=True), default=utc_now)

    variants = relationship("DBProductVariant", back_populates="product", cascade="all, delete-orphan")


class DBProductVariant(Base):
    __tablename__ = "product_variants"

    id = Column(String(64), primary_key=True)
    product_id = Column(String(64), ForeignKey("products.id"), nullable=False, index=True)
    title = Column(String(100), nullable=False)
    sku = Column(String(100), nullable=True)
    price = Column(Float, nullable=False)
    compare_at_price = Column(Float, nullable=True)
    available = Column(Boolean, default=True)
    size = Column(String(50), nullable=True)
    color = Column(String(50), nullable=True)

    product = relationship("DBProduct", back_populates="variants")


class DBCollection(Base):
    __tablename__ = "collections"

    id = Column(String(64), primary_key=True)
    title = Column(String(150), nullable=False)
    handle = Column(String(150), unique=True, index=True, nullable=False)
    description = Column(Text, nullable=False)
    image = Column(String(500), nullable=True)
    product_count = Column(Integer, default=0)


class DBCart(Base):
    __tablename__ = "carts"

    customer_id = Column(String(64), primary_key=True)
    items = Column(JSON, default=list)
    subtotal = Column(Float, default=0.0)
    shipping_fee = Column(Float, default=0.0)
    estimated_tax = Column(Float, default=0.0)
    loyalty_discount = Column(Float, default=0.0)
    total = Column(Float, default=0.0)
    updated_at = Column(DateTime(timezone=True), default=utc_now, onupdate=utc_now)


class DBOrder(Base):
    __tablename__ = "orders"

    id = Column(String(64), primary_key=True)
    order_number = Column(String(100), unique=True, index=True, nullable=False)
    customer_id = Column(String(64), nullable=False, index=True)
    items = Column(JSON, default=list)
    subtotal = Column(Float, nullable=False)
    tax = Column(Float, default=0.0)
    shipping = Column(Float, default=0.0)
    discount_amount = Column(Float, default=0.0)
    points_redeemed = Column(Integer, default=0)
    points_earned_estimated = Column(Integer, default=0)
    total_amount = Column(Float, nullable=False)
    status = Column(String(50), default="Confirmed")
    payment_method = Column(String(50), default="Card/UPI")
    shipping_address = Column(JSON, nullable=True)
    channel = Column(String(30), default="online")
    created_at = Column(DateTime(timezone=True), default=utc_now, index=True)
    is_demo = Column(Boolean, default=False)


class DBStaffInvoice(Base):
    __tablename__ = "staff_invoices"

    id = Column(String(64), primary_key=True)
    invoice_number = Column(String(100), unique=True, index=True, nullable=False)
    tally_voucher_no = Column(String(100), index=True, nullable=False)
    customer_id = Column(String(64), nullable=False, index=True)
    customer_name = Column(String(150), nullable=False)
    customer_phone = Column(String(50), nullable=False)
    customer_tier = Column(String(50), default="Classic")
    gross_amount = Column(Float, nullable=False)
    loyalty_discount_inr = Column(Float, default=0.0)
    points_redeemed = Column(Integer, default=0)
    net_payable = Column(Float, nullable=False)
    payment_method = Column(String(50), default="Card/UPI")
    points_earned_this_bill = Column(Integer, default=0)
    cashier = Column(String(100), default="Kavita Sharma")
    status = Column(String(50), default="COMPLETED & TALLY SYNCED")
    timestamp = Column(DateTime(timezone=True), default=utc_now, index=True)


class DBStaffUser(Base):
    __tablename__ = "staff_users"

    id = Column(String(64), primary_key=True)
    username = Column(String(100), unique=True, index=True, nullable=False)
    password = Column(String(100), nullable=False)
    full_name = Column(String(150), nullable=False)
    role = Column(String(50), default="staff")
    store_location = Column(String(200), default="The HUB • Spentha Complex, Alkapuri, Vadodara")


class DBIdempotencyKey(Base):
    __tablename__ = "idempotency_keys"

    key = Column(String(128), primary_key=True)
    customer_id = Column(String(64), nullable=False, index=True)
    response_json = Column(JSON, nullable=False)
    created_at = Column(DateTime(timezone=True), default=utc_now)
