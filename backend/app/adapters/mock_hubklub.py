import json
import os
import uuid
from datetime import datetime, timezone, timedelta
from typing import List, Optional, Dict, Any
from app.adapters.hubklub_base import HubklubAdapterBase
from app.models.schemas import (
    CustomerProfile,
    HubklubMembershipStatus,
    HubklubBalance,
    HubklubAnnualBonusProgress,
    HubklubSummary,
    PointsTransaction,
    PointsExpiryBatch,
    LoyaltyRedemptionRequest,
    LoyaltyRedemptionResponse,
    LoyaltyTier,
    TransactionType,
)
from app.config import settings

def _ensure_utc(dt: Optional[datetime]) -> Optional[datetime]:
    if dt is None:
        return None
    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt

class MockHubklubAdapter(HubklubAdapterBase):
    """
    Mock implementation of HubklubAdapterBase using authentic loyalty business rules.
    Accurately demonstrates:
    1. One-time purchase >= ₹1,000 eligibility condition.
    2. Configurable rate bands (3%, 5%, 6%).
    3. ₹1,00,000 annual spend threshold with 20% annual bonus.
    4. 1 Point = ₹1 redemption value.
    5. 2-year validity and expiry breakdown.
    6. Idempotency protection against duplicate redemptions.
    """

    def __init__(self, data_dir: Optional[str] = None):
        if not data_dir:
            base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
            data_dir = os.path.join(base_dir, "data")
        self.data_dir = data_dir

        self._customers: Dict[str, CustomerProfile] = {}
        self._accounts: Dict[str, Dict[str, Any]] = {}
        self._processed_idempotency_keys: Dict[str, LoyaltyRedemptionResponse] = {}

        self._load_data()

    def is_live(self) -> bool:
        return False

    def _load_data(self):
        loyalty_file = os.path.join(self.data_dir, "sample_loyalty_data.json")
        if os.path.exists(loyalty_file):
            with open(loyalty_file, "r", encoding="utf-8") as f:
                raw_data = json.load(f)

                # Load customers
                for cid, cdata in raw_data.get("customers", {}).items():
                    self._customers[cid] = CustomerProfile(**cdata)

                # Load accounts and transaction histories
                for aid, adata in raw_data.get("loyalty_accounts", {}).items():
                    txs = [PointsTransaction(**t) for t in adata.get("transactions", [])]
                    self._accounts[aid] = {
                        "available_points": adata.get("available_points", 0),
                        "points_earned_current_year": adata.get("points_earned_current_year", 0),
                        "annual_bonus_awarded": adata.get("annual_bonus_awarded", False),
                        "annual_bonus_points": adata.get("annual_bonus_points", 0),
                        "transactions": txs,
                    }

    def get_customer_profile(self, customer_id: str) -> Optional[CustomerProfile]:
        return self._customers.get(customer_id)

    def find_customer(self, query: str) -> Optional[CustomerProfile]:
        q = query.strip().lower()
        if not q:
            return None

        # 1. Match exact ID or key
        if q in self._customers:
            return self._customers[q]

        # 2. Match by phone digits (exact 10 digits required)
        q_digits = "".join(ch for ch in q if ch.isdigit())
        if q_digits and len(q_digits) >= 10:
            for c in self._customers.values():
                c_digits = "".join(ch for ch in (c.phone or "") if ch.isdigit())
                if c_digits == q_digits or c_digits.endswith(q_digits[-10:]):
                    return c

        # 3. Match by name or exact email/membership (only if query is not a phone number)
        if not q_digits or len(q_digits) < 4:
            for c in self._customers.values():
                full = f"{c.first_name} {c.last_name}".lower()
                if q in full or q in c.first_name.lower() or q in c.last_name.lower():
                    return c
                if c.email and q == c.email.lower():
                    return c
                if c.membership_number and q == c.membership_number.lower():
                    return c

        return None

    def calculate_estimated_points_for_purchase(self, purchase_amount: float) -> int:
        if purchase_amount <= 0:
            return 0
        if purchase_amount <= 20000.0:
            return int(round(purchase_amount * 0.03))
        elif purchase_amount <= 50000.0:
            return int(round(purchase_amount * 0.05))
        else:
            return int(round(purchase_amount * 0.06))

    def get_membership_status(self, customer_id: str) -> HubklubMembershipStatus:
        customer = self.get_customer_profile(customer_id)
        if not customer:
            customer = CustomerProfile(
                id=customer_id,
                first_name="Guest",
                last_name="Customer",
                email=f"{customer_id}@example.com",
                phone="+91 90000 00000",
                member_since=datetime.now(timezone.utc),
                is_hubklub_member=False,
                annual_spend_current_year=0.0,
                lifetime_spend=0.0,
            )
            self._customers[customer_id] = customer

        threshold = settings.LOYALTY_ELIGIBILITY_MIN_SINGLE_PURCHASE  # ₹1,000
        max_purchase = getattr(customer, "max_single_purchase", customer.lifetime_spend)
        is_eligible = max_purchase >= threshold
        progress = min(100.0, round((max_purchase / threshold) * 100.0, 1))

        if customer.is_hubklub_member:
            msg = f"Active HUBKLUB {getattr(customer, 'tier', 'Classic')} Member. Enjoy exclusive rewards and point redemption."
        elif is_eligible:
            msg = f"Congratulations! Your single purchase of ₹{max_purchase:,.0f} qualifies you for HUBKLUB membership enrollment."
        else:
            shortfall = threshold - max_purchase
            msg = f"Make a single purchase of at least ₹{threshold:,.0f} to unlock HUBKLUB membership (₹{shortfall:,.0f} more needed)."

        return HubklubMembershipStatus(
            customer_id=customer_id,
            is_member=customer.is_hubklub_member,
            membership_number=getattr(customer, "membership_number", None),
            tier=getattr(customer, "tier", None),
            is_eligible=is_eligible,
            max_single_purchase=max_purchase,
            eligibility_threshold=threshold,
            progress_percent=progress,
            eligibility_message=msg,
            enrolled_at=datetime.now(timezone.utc) if customer.is_hubklub_member else None,
            is_demo=True,
        )

    def enroll_customer(self, customer_id: str) -> HubklubMembershipStatus:
        status = self.get_membership_status(customer_id)
        if status.is_member:
            return status

        if not status.is_eligible:
            raise ValueError(
                f"Customer '{customer_id}' is not yet eligible for HUBKLUB membership. "
                f"A one-time purchase of at least ₹{settings.LOYALTY_ELIGIBILITY_MIN_SINGLE_PURCHASE:,.0f} is required."
            )

        customer = self._customers[customer_id]
        customer.is_hubklub_member = True
        customer_tier = LoyaltyTier.CLASSIC
        if customer.annual_spend_current_year >= 100000.0:
            customer_tier = LoyaltyTier.PLATINUM
        elif customer.annual_spend_current_year >= 50000.0:
            customer_tier = LoyaltyTier.GOLD

        setattr(customer, "tier", customer_tier)
        mem_num = f"HK-{datetime.now(timezone.utc).year}-{uuid.uuid4().hex[:5].upper()}"
        setattr(customer, "membership_number", mem_num)

        if customer_id not in self._accounts:
            self._accounts[customer_id] = {
                "available_points": 0,
                "points_earned_current_year": 0,
                "annual_bonus_awarded": False,
                "annual_bonus_points": 0,
                "transactions": [],
            }

        return self.get_membership_status(customer_id)

    def get_points_balance(self, customer_id: str) -> HubklubBalance:
        account = self._accounts.get(customer_id)
        if not account:
            return HubklubBalance(
                customer_id=customer_id,
                available_points=0,
                redemption_value_inr=0.0,
                expiring_soon_points=0,
                expiring_soon_date=None,
                points_batches=[],
                is_demo=True,
            )

        available_points = max(0, account.get("available_points", 0))
        rupee_val = available_points * settings.LOYALTY_POINT_RUPEE_VALUE

        now = datetime.now(timezone.utc)

        # FIFO Step 1: Collect all EARN & BONUS batches and total redeemed points
        earn_batches = []
        total_redeemed = 0

        for tx in account.get("transactions", []):
            if tx.type in (TransactionType.EARN, TransactionType.BONUS):
                exp_dt = _ensure_utc(tx.expiry_date) if tx.expiry_date else (
                    _ensure_utc(tx.timestamp) + timedelta(days=settings.LOYALTY_POINTS_EXPIRY_DAYS)
                )
                earn_batches.append({
                    "points": tx.points,
                    "expiry_date": exp_dt,
                    "timestamp": _ensure_utc(tx.timestamp),
                })
            elif tx.type == TransactionType.REDEEM:
                total_redeemed += abs(tx.points)

        # FIFO Step 2: Sort earn batches by expiry date ascending (earliest expiring first)
        earn_batches.sort(key=lambda b: b["expiry_date"])

        # FIFO Step 3: Deduct redeemed points against earliest expiring batches first
        remaining_redeem = total_redeemed
        active_batches: List[PointsExpiryBatch] = []
        expiring_soon = 0
        earliest_expiry: Optional[datetime] = None

        for b in earn_batches:
            if remaining_redeem >= b["points"]:
                # Entire batch consumed by past redemptions
                remaining_redeem -= b["points"]
                continue

            # Unredeemed portion of batch
            unredeemed_pts = b["points"] - remaining_redeem
            remaining_redeem = 0

            days_left = (b["expiry_date"] - now).days
            if days_left > 0:
                active_batches.append(
                    PointsExpiryBatch(
                        points=unredeemed_pts,
                        rupee_equivalent=unredeemed_pts * settings.LOYALTY_POINT_RUPEE_VALUE,
                        expiry_date=b["expiry_date"],
                        days_remaining=days_left,
                    )
                )
                if days_left <= 60:
                    expiring_soon += unredeemed_pts
                    if earliest_expiry is None or b["expiry_date"] < earliest_expiry:
                        earliest_expiry = b["expiry_date"]

        # Ensure active batches are sorted by expiry
        active_batches.sort(key=lambda b: _ensure_utc(b.expiry_date))

        return HubklubBalance(
            customer_id=customer_id,
            available_points=available_points,
            redemption_value_inr=rupee_val,
            expiring_soon_points=expiring_soon,
            expiring_soon_date=earliest_expiry,
            points_batches=active_batches,
            is_demo=True,
        )

    def get_annual_bonus_progress(self, customer_id: str) -> HubklubAnnualBonusProgress:
        customer = self.get_customer_profile(customer_id)
        current_year = datetime.now(timezone.utc).year
        annual_spend = customer.annual_spend_current_year if customer else 0.0
        threshold = settings.LOYALTY_ANNUAL_BONUS_SPEND_THRESHOLD

        account = self._accounts.get(customer_id, {})
        pts_earned_year = account.get("points_earned_current_year", 0)
        progress = min(100.0, round((annual_spend / threshold) * 100.0, 1))
        bonus_achieved = annual_spend >= threshold

        estimated_bonus_pts = int(round(pts_earned_year * settings.LOYALTY_ANNUAL_BONUS_MULTIPLIER))
        bonus_val_inr = estimated_bonus_pts * settings.LOYALTY_POINT_RUPEE_VALUE

        return HubklubAnnualBonusProgress(
            customer_id=customer_id,
            current_year=current_year,
            accumulated_spend_inr=annual_spend,
            annual_threshold_inr=threshold,
            progress_percent=progress,
            bonus_achieved=bonus_achieved,
            points_earned_this_year=pts_earned_year,
            estimated_annual_bonus_points=estimated_bonus_pts,
            estimated_bonus_value_inr=bonus_val_inr,
            is_demo=True,
        )

    def get_transaction_history(self, customer_id: str) -> List[PointsTransaction]:
        account = self._accounts.get(customer_id)
        if not account:
            return []
        return sorted(
            account.get("transactions", []),
            key=lambda t: _ensure_utc(t.timestamp),
            reverse=True,
        )

    def validate_and_redeem_points(
        self, request: LoyaltyRedemptionRequest
    ) -> LoyaltyRedemptionResponse:
        if request.idempotency_key in self._processed_idempotency_keys:
            cached_resp = self._processed_idempotency_keys[request.idempotency_key]
            if cached_resp.customer_id != request.customer_id:
                raise PermissionError("Access violation: Idempotency key belongs to another customer.")
            return cached_resp

        account = self._accounts.get(request.customer_id)
        if not account or account["available_points"] < request.points_to_redeem:
            available = account["available_points"] if account else 0
            raise ValueError(
                f"Insufficient points balance. Requested: {request.points_to_redeem} points, "
                f"Available: {available} points."
            )

        account["available_points"] -= request.points_to_redeem
        rupee_discount = request.points_to_redeem * settings.LOYALTY_POINT_RUPEE_VALUE

        tx = PointsTransaction(
            id=f"tx_red_{uuid.uuid4().hex[:8]}",
            customer_id=request.customer_id,
            type=TransactionType.REDEEM,
            points=-request.points_to_redeem,
            rupee_equivalent=-rupee_discount,
            order_id=request.order_id,
            description=f"Loyalty Points Redemption ({request.points_to_redeem} pts = ₹{rupee_discount:,.0f} discount)",
            timestamp=datetime.now(timezone.utc),
            expiry_date=None,
            status="Redeemed",
        )
        account.setdefault("transactions", []).append(tx)

        resp = LoyaltyRedemptionResponse(
            transaction_id=tx.id,
            customer_id=request.customer_id,
            points_redeemed=request.points_to_redeem,
            rupee_discount_applied=rupee_discount,
            remaining_points=account["available_points"],
            remaining_rupee_value=account["available_points"] * settings.LOYALTY_POINT_RUPEE_VALUE,
            status="Simulated Redemption Confirmed",
            is_demo=True,
            message=f"Successfully applied ₹{rupee_discount:,.0f} loyalty discount to order.",
        )

        self._processed_idempotency_keys[request.idempotency_key] = resp
        return resp

    def credit_earned_points(
        self, customer_id: str, purchase_amount: float, order_id: str
    ) -> PointsTransaction:
        if customer_id not in self._accounts:
            self._accounts[customer_id] = {
                "available_points": 0,
                "points_earned_current_year": 0,
                "annual_bonus_awarded": False,
                "annual_bonus_points": 0,
                "transactions": [],
            }
        account = self._accounts[customer_id]

        pts = self.calculate_estimated_points_for_purchase(purchase_amount)
        account["available_points"] += pts
        account["points_earned_current_year"] += pts

        expiry = datetime.now(timezone.utc) + timedelta(days=settings.LOYALTY_POINTS_EXPIRY_DAYS)

        tx = PointsTransaction(
            id=f"tx_earn_{uuid.uuid4().hex[:8]}",
            customer_id=customer_id,
            type=TransactionType.EARN,
            points=pts,
            rupee_equivalent=pts * settings.LOYALTY_POINT_RUPEE_VALUE,
            order_id=order_id,
            description=f"Earned points on purchase ₹{purchase_amount:,.0f} (Order: {order_id})",
            timestamp=datetime.now(timezone.utc),
            expiry_date=expiry,
            status="Active",
        )
        account.setdefault("transactions", []).append(tx)

        cust = self.get_customer_profile(customer_id)
        if cust:
            cust.annual_spend_current_year += purchase_amount
            cust.lifetime_spend += purchase_amount
            if purchase_amount > getattr(cust, "max_single_purchase", 0.0):
                setattr(cust, "max_single_purchase", purchase_amount)

            # Annual Bonus check: On accumulated purchase of INR 1,00,000 and above, get 20% bonus of total points earned in the year
            if cust.annual_spend_current_year >= settings.LOYALTY_ANNUAL_BONUS_SPEND_THRESHOLD:
                target_bonus = int(round(account.get("points_earned_current_year", 0) * settings.LOYALTY_ANNUAL_BONUS_MULTIPLIER))
                delta_bonus = target_bonus - account.get("annual_bonus_points", 0)
                if delta_bonus > 0:
                    account["available_points"] += delta_bonus
                    account["annual_bonus_points"] = target_bonus
                    account["annual_bonus_awarded"] = True
                    bonus_tx = PointsTransaction(
                        id=f"tx_bonus_{uuid.uuid4().hex[:8]}",
                        customer_id=customer_id,
                        type=TransactionType.BONUS,
                        points=delta_bonus,
                        rupee_equivalent=delta_bonus * settings.LOYALTY_POINT_RUPEE_VALUE,
                        order_id=order_id,
                        description=f"20% Annual Milestone Bonus (+{delta_bonus} pts) for ₹1,00,000+ accumulated spend",
                        timestamp=datetime.now(timezone.utc),
                        expiry_date=expiry,
                        status="Active",
                    )
                    account.setdefault("transactions", []).append(bonus_tx)

        return tx

    def register_customer(
        self,
        first_name: str,
        last_name: str,
        email: str,
        phone: str,
        password: Optional[str] = None,
    ) -> CustomerProfile:
        import uuid
        cid = f"cust_{uuid.uuid4().hex[:8]}"
        now = datetime.now(timezone.utc)
        profile = CustomerProfile(
            id=cid,
            first_name=first_name.strip(),
            last_name=last_name.strip(),
            email=email.strip().lower(),
            phone=phone.strip(),
            member_since=now,
            is_hubklub_member=False,
            membership_number=f"HK{uuid.uuid4().hex[:6].upper()}",
            tier=LoyaltyTier.CLASSIC,
            max_single_purchase=0.0,
            annual_spend_current_year=0.0,
            lifetime_spend=0.0,
            saved_addresses=[],
        )
        self._customers[cid] = profile
        self._accounts[cid] = {
            "available_points": 0,
            "points_earned_current_year": 0,
            "annual_bonus_awarded": False,
            "annual_bonus_points": 0,
            "transactions": [],
        }
        return profile

