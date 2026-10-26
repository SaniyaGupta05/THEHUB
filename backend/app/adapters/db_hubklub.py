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
    Address,
)
from app.config import settings
from app.db.session import SessionLocal
from app.db.models import DBCustomer, DBPointsTransaction, DBIdempotencyKey, DBStaffInvoice

def _ensure_utc(dt: Optional[datetime]) -> Optional[datetime]:
    if dt is None:
        return None
    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt

class DBHubklubAdapter(HubklubAdapterBase):
    """
    Persistent Database implementation of HubklubAdapterBase using SQLite/PostgreSQL.
    Stores customer loyalty profiles, point balances, transaction ledger, and idempotency records.
    """

    def is_live(self) -> bool:
        return True  # Operating against a real persistent database

    def _convert_db_customer(self, c: DBCustomer) -> CustomerProfile:
        tier_val = None
        if c.tier:
            try:
                tier_val = LoyaltyTier(c.tier)
            except Exception:
                tier_val = LoyaltyTier.CLASSIC
        raw_addresses: List[Dict[str, Any]] = c.saved_addresses if isinstance(c.saved_addresses, list) else []
        addresses = [Address(**a) for a in raw_addresses if isinstance(a, dict)]

        return CustomerProfile(
            id=c.id,
            first_name=c.first_name,
            last_name=c.last_name,
            email=c.email,
            phone=c.phone,
            member_since=_ensure_utc(c.member_since) or datetime.now(timezone.utc),
            is_hubklub_member=c.is_hubklub_member,
            membership_number=c.membership_number,
            tier=tier_val,
            max_single_purchase=c.max_single_purchase,
            annual_spend_current_year=c.annual_spend_current_year,
            lifetime_spend=c.lifetime_spend,
            saved_addresses=addresses,
        )

    def get_customer_profile(self, customer_id: str) -> Optional[CustomerProfile]:
        db = SessionLocal()
        try:
            c = db.query(DBCustomer).filter(DBCustomer.id == customer_id).first()
            if not c:
                return self.find_customer(customer_id)
            return self._convert_db_customer(c)
        finally:
            db.close()

    def find_customer(self, query: str) -> Optional[CustomerProfile]:
        q = query.strip().lower()
        if not q:
            return None

        db = SessionLocal()
        try:
            # 1. Exact ID
            c = db.query(DBCustomer).filter(DBCustomer.id == q).first()
            if c:
                return self._convert_db_customer(c)

            # 2. Email or Membership Number match
            c = db.query(DBCustomer).filter(
                (DBCustomer.email.ilike(q)) | (DBCustomer.membership_number.ilike(q))
            ).first()
            if c:
                return self._convert_db_customer(c)

            # 3. Match by phone digits (10 digits comparison)
            q_digits = "".join(ch for ch in q if ch.isdigit())
            if q_digits and len(q_digits) >= 10:
                all_customers = db.query(DBCustomer).all()
                for cust in all_customers:
                    c_digits = "".join(ch for ch in (cust.phone or "") if ch.isdigit())
                    if len(c_digits) >= 10 and c_digits[-10:] == q_digits[-10:]:
                        return self._convert_db_customer(cust)

            # 4. Match by name (only if query is not a phone number)
            if not q_digits or len(q_digits) < 4:
                all_customers = db.query(DBCustomer).all()
                for cust in all_customers:
                    full = f"{cust.first_name} {cust.last_name}".lower()
                    if q in full or q in cust.first_name.lower() or q in cust.last_name.lower():
                        return self._convert_db_customer(cust)

            return None
        finally:
            db.close()

    def calculate_estimated_points_for_purchase(self, purchase_amount: float) -> int:
        for band in settings.LOYALTY_RATE_BANDS:
            if band["min"] <= purchase_amount <= band["max"]:
                return int(round(purchase_amount * band["rate"]))
        return int(round(purchase_amount * 0.03))

    def get_membership_status(self, customer_id: str) -> HubklubMembershipStatus:
        db = SessionLocal()
        try:
            c = db.query(DBCustomer).filter(DBCustomer.id == customer_id).first()
            if not c:
                # Try finding existing customer by phone digits or email
                q_digits = "".join(ch for ch in customer_id if ch.isdigit())
                if q_digits and len(q_digits) >= 10:
                    for cust in db.query(DBCustomer).all():
                        c_digits = "".join(ch for ch in (cust.phone or "") if ch.isdigit())
                        if len(c_digits) >= 10 and c_digits[-10:] == q_digits[-10:]:
                            c = cust
                            break
            if not c:
                # Check if there are in-store invoices for this customer
                q_digits = "".join(ch for ch in customer_id if ch.isdigit())
                invs = db.query(DBStaffInvoice).all()
                matching_invs = []
                for inv in invs:
                    inv_digits = "".join(ch for ch in (inv.customer_phone or "") if ch.isdigit())
                    if (q_digits and len(q_digits) >= 10 and len(inv_digits) >= 10 and q_digits[-10:] == inv_digits[-10:]) or inv.customer_id == customer_id:
                        matching_invs.append(inv)

                now = datetime.now(timezone.utc)
                if matching_invs:
                    first_inv = matching_invs[0]
                    name_parts = (first_inv.customer_name or "Store Customer").split(" ", 1)
                    fn = name_parts[0]
                    ln = name_parts[1] if len(name_parts) > 1 else ""
                    max_single = max((float(i.gross_amount or 0) for i in matching_invs), default=0.0)
                    total_spend = sum((float(i.net_payable or i.gross_amount or 0) for i in matching_invs))
                    total_pts = sum((int(i.points_earned_this_bill or 0) for i in matching_invs))
                    is_mem = max_single >= 1000.0
                    tier_str = "Gold" if total_spend >= 100000.0 else "Classic"

                    c = DBCustomer(
                        id=customer_id,
                        first_name=fn,
                        last_name=ln,
                        email=f"{customer_id}@hubklub.in",
                        phone=first_inv.customer_phone or "+91 90000 00000",
                        member_since=now,
                        is_hubklub_member=is_mem,
                        membership_number=f"HK-POS-{uuid.uuid4().hex[:6].upper()}" if is_mem else None,
                        tier=tier_str,
                        max_single_purchase=max_single,
                        annual_spend_current_year=total_spend,
                        lifetime_spend=total_spend,
                        available_points=total_pts,
                    )
                else:
                    # Default guest row
                    c = DBCustomer(
                        id=customer_id,
                        first_name="Guest",
                        last_name="Customer",
                        email=f"{customer_id}@hubklub.in",
                        phone="+91 90000 00000",
                        member_since=now,
                        is_hubklub_member=False,
                        tier="Classic",
                        max_single_purchase=0.0,
                        annual_spend_current_year=0.0,
                        lifetime_spend=0.0,
                        available_points=0,
                    )
                db.add(c)
                db.commit()
                db.refresh(c)

            threshold = settings.LOYALTY_ELIGIBILITY_MIN_SINGLE_PURCHASE
            max_purchase = c.max_single_purchase or c.lifetime_spend or 0.0
            is_eligible = max_purchase >= threshold
            progress = min(100.0, round((max_purchase / threshold) * 100.0, 1))

            tier_enum = None
            if c.tier:
                try:
                    tier_enum = LoyaltyTier(c.tier)
                except Exception:
                    tier_enum = LoyaltyTier.CLASSIC

            if c.is_hubklub_member:
                msg = f"Active HUBKLUB {c.tier or 'Classic'} Member. Enjoy exclusive rewards and point redemption."
            elif is_eligible:
                msg = f"Congratulations! Your single purchase of ₹{max_purchase:,.0f} qualifies you for HUBKLUB membership enrollment."
            else:
                shortfall = threshold - max_purchase
                msg = f"Make a single purchase of at least ₹{threshold:,.0f} to unlock HUBKLUB membership (₹{shortfall:,.0f} more needed)."

            return HubklubMembershipStatus(
                customer_id=customer_id,
                is_member=c.is_hubklub_member,
                membership_number=c.membership_number,
                tier=tier_enum,
                is_eligible=is_eligible,
                max_single_purchase=max_purchase,
                eligibility_threshold=threshold,
                progress_percent=progress,
                eligibility_message=msg,
                enrolled_at=_ensure_utc(c.created_at) if c.is_hubklub_member else None,
                is_demo=False,
            )
        finally:
            db.close()

    def enroll_customer(self, customer_id: str) -> HubklubMembershipStatus:
        db = SessionLocal()
        try:
            status = self.get_membership_status(customer_id)
            if status.is_member:
                return status

            if not status.is_eligible:
                raise ValueError(
                    f"Customer '{customer_id}' is not yet eligible for HUBKLUB membership. "
                    f"A one-time purchase of at least ₹{settings.LOYALTY_ELIGIBILITY_MIN_SINGLE_PURCHASE:,.0f} is required."
                )

            c = db.query(DBCustomer).filter(DBCustomer.id == customer_id).first()
            if not c:
                raise ValueError("Customer not found.")

            c.is_hubklub_member = True
            if c.annual_spend_current_year >= 100000.0:
                c.tier = "Platinum"
            elif c.annual_spend_current_year >= 50000.0:
                c.tier = "Gold"
            else:
                c.tier = "Classic"

            c.membership_number = f"HK-{datetime.now(timezone.utc).year}-{uuid.uuid4().hex[:5].upper()}"
            db.commit()
            return self.get_membership_status(customer_id)
        except Exception as e:
            db.rollback()
            raise e
        finally:
            db.close()

    def get_points_balance(self, customer_id: str) -> HubklubBalance:
        db = SessionLocal()
        try:
            c = db.query(DBCustomer).filter(DBCustomer.id == customer_id).first()
            available_points = max(0, c.available_points if c else 0)
            rupee_val = available_points * settings.LOYALTY_POINT_RUPEE_VALUE

            now = datetime.now(timezone.utc)
            txs = (
                db.query(DBPointsTransaction)
                .filter(DBPointsTransaction.customer_id == customer_id)
                .order_by(DBPointsTransaction.timestamp.asc())
                .all()
            )

            earn_batches = []
            total_redeemed = 0
            for tx in txs:
                if tx.type in ("earn", "bonus"):
                    exp_dt = _ensure_utc(tx.expiry_date) if tx.expiry_date else (
                        _ensure_utc(tx.timestamp) + timedelta(days=settings.LOYALTY_POINTS_EXPIRY_DAYS)
                    )
                    earn_batches.append({
                        "points": tx.points,
                        "expiry_date": exp_dt,
                        "timestamp": _ensure_utc(tx.timestamp),
                    })
                elif tx.type == "redeem":
                    total_redeemed += abs(tx.points)

            earn_batches.sort(key=lambda b: b["expiry_date"])
            remaining_redeem = total_redeemed
            active_batches: List[PointsExpiryBatch] = []
            expiring_soon = 0
            earliest_expiry: Optional[datetime] = None

            for b in earn_batches:
                if remaining_redeem >= b["points"]:
                    remaining_redeem -= b["points"]
                    continue

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

            active_batches.sort(key=lambda b: _ensure_utc(b.expiry_date))

            return HubklubBalance(
                customer_id=customer_id,
                available_points=available_points,
                redemption_value_inr=rupee_val,
                expiring_soon_points=expiring_soon,
                expiring_soon_date=earliest_expiry,
                points_batches=active_batches,
                is_demo=False,
            )
        finally:
            db.close()

    def get_annual_bonus_progress(self, customer_id: str) -> HubklubAnnualBonusProgress:
        db = SessionLocal()
        try:
            c = db.query(DBCustomer).filter(DBCustomer.id == customer_id).first()
            current_year = datetime.now(timezone.utc).year
            annual_spend = c.annual_spend_current_year if c else 0.0
            threshold = settings.LOYALTY_ANNUAL_BONUS_SPEND_THRESHOLD
            pts_earned_year = c.points_earned_current_year if c else 0

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
                is_demo=False,
            )
        finally:
            db.close()

    def get_transaction_history(self, customer_id: str) -> List[PointsTransaction]:
        db = SessionLocal()
        try:
            txs = (
                db.query(DBPointsTransaction)
                .filter(DBPointsTransaction.customer_id == customer_id)
                .order_by(DBPointsTransaction.timestamp.desc())
                .all()
            )
            return [
                PointsTransaction(
                    id=t.id,
                    customer_id=t.customer_id,
                    type=TransactionType(t.type),
                    points=t.points,
                    rupee_equivalent=t.rupee_equivalent,
                    order_id=t.order_id,
                    description=t.description,
                    timestamp=_ensure_utc(t.timestamp),
                    expiry_date=_ensure_utc(t.expiry_date),
                    status=t.status,
                )
                for t in txs
            ]
        finally:
            db.close()

    def validate_and_redeem_points(
        self, request: LoyaltyRedemptionRequest
    ) -> LoyaltyRedemptionResponse:
        db = SessionLocal()
        try:
            # Check Idempotency Key in DB
            idem = db.query(DBIdempotencyKey).filter(DBIdempotencyKey.key == request.idempotency_key).first()
            if idem:
                resp_data: Dict[str, Any] = idem.response_json if isinstance(idem.response_json, dict) else {}
                cached = LoyaltyRedemptionResponse(**resp_data)
                if cached.customer_id != request.customer_id:
                    raise PermissionError("Access violation: Idempotency key belongs to another customer.")
                return cached

            c = db.query(DBCustomer).filter(DBCustomer.id == request.customer_id).first()
            available = c.available_points if c else 0
            if not c or available < request.points_to_redeem:
                raise ValueError(
                    f"Insufficient points balance. Requested: {request.points_to_redeem} points, "
                    f"Available: {available} points."
                )

            # Deduct points
            c.available_points -= request.points_to_redeem
            rupee_discount = request.points_to_redeem * settings.LOYALTY_POINT_RUPEE_VALUE
            now = datetime.now(timezone.utc)

            tx_id = f"tx_red_{uuid.uuid4().hex[:8]}"
            tx = DBPointsTransaction(
                id=tx_id,
                customer_id=request.customer_id,
                type="redeem",
                points=-request.points_to_redeem,
                rupee_equivalent=-rupee_discount,
                order_id=request.order_id,
                description=f"Loyalty Points Redemption ({request.points_to_redeem} pts = ₹{rupee_discount:,.0f} discount)",
                timestamp=now,
                expiry_date=None,
                status="Redeemed",
            )
            db.add(tx)

            resp = LoyaltyRedemptionResponse(
                transaction_id=tx_id,
                customer_id=request.customer_id,
                points_redeemed=request.points_to_redeem,
                rupee_discount_applied=rupee_discount,
                remaining_points=c.available_points,
                remaining_rupee_value=c.available_points * settings.LOYALTY_POINT_RUPEE_VALUE,
                status="Redemption Confirmed",
                is_demo=False,
                message=f"Successfully applied ₹{rupee_discount:,.0f} loyalty discount to order.",
            )

            # Save Idempotency
            db_idem = DBIdempotencyKey(
                key=request.idempotency_key,
                customer_id=request.customer_id,
                response_json=resp.model_dump(),
                created_at=now,
            )
            db.add(db_idem)
            db.commit()
            return resp
        except Exception as e:
            db.rollback()
            raise e
        finally:
            db.close()

    def credit_earned_points(
        self, customer_id: str, purchase_amount: float, order_id: str
    ) -> PointsTransaction:
        db = SessionLocal()
        try:
            c = db.query(DBCustomer).filter(DBCustomer.id == customer_id).first()
            now = datetime.now(timezone.utc)
            if not c:
                c = DBCustomer(
                    id=customer_id,
                    first_name="Customer",
                    last_name="Member",
                    email=f"{customer_id}@hubklub.in",
                    phone="+91 90000 00000",
                    member_since=now,
                    is_hubklub_member=True,
                    tier="Classic",
                    max_single_purchase=purchase_amount,
                    annual_spend_current_year=purchase_amount,
                    lifetime_spend=purchase_amount,
                    available_points=0,
                )
                db.add(c)
                db.flush()

            pts = self.calculate_estimated_points_for_purchase(purchase_amount)
            c.available_points = (c.available_points or 0) + pts
            c.points_earned_current_year = (c.points_earned_current_year or 0) + pts
            c.annual_spend_current_year = (c.annual_spend_current_year or 0.0) + purchase_amount
            c.lifetime_spend = (c.lifetime_spend or 0.0) + purchase_amount
            if purchase_amount > (c.max_single_purchase or 0.0):
                c.max_single_purchase = purchase_amount

            # Auto-enroll if single purchase >= 1000
            if not c.is_hubklub_member and purchase_amount >= settings.LOYALTY_ELIGIBILITY_MIN_SINGLE_PURCHASE:
                c.is_hubklub_member = True
                if not c.membership_number:
                    c.membership_number = f"HK-{now.year}-{uuid.uuid4().hex[:5].upper()}"

            # Tier upgrade check
            if c.annual_spend_current_year >= 100000.0:
                c.tier = "Platinum"
            elif c.annual_spend_current_year >= 50000.0:
                c.tier = "Gold"

            expiry = now + timedelta(days=settings.LOYALTY_POINTS_EXPIRY_DAYS)
            tx_id = f"tx_earn_{uuid.uuid4().hex[:8]}"
            tx = DBPointsTransaction(
                id=tx_id,
                customer_id=customer_id,
                type="earn",
                points=pts,
                rupee_equivalent=pts * settings.LOYALTY_POINT_RUPEE_VALUE,
                order_id=order_id,
                description=f"Earned points on purchase ₹{purchase_amount:,.0f} (Order: {order_id})",
                timestamp=now,
                expiry_date=expiry,
                status="Active",
            )
            db.add(tx)
            db.commit()

            return PointsTransaction(
                id=tx.id,
                customer_id=customer_id,
                type=TransactionType.EARN,
                points=pts,
                rupee_equivalent=pts * settings.LOYALTY_POINT_RUPEE_VALUE,
                order_id=order_id,
                description=tx.description,
                timestamp=now,
                expiry_date=expiry,
                status="Active",
            )
        except Exception as e:
            db.rollback()
            raise e
        finally:
            db.close()

    def register_customer(
        self,
        first_name: str,
        last_name: str,
        email: str,
        phone: str,
        password: Optional[str] = None,
    ) -> CustomerProfile:
        db = SessionLocal()
        try:
            cid = f"cust_{uuid.uuid4().hex[:8]}"
            now = datetime.now(timezone.utc)
            db_cust = DBCustomer(
                id=cid,
                first_name=first_name.strip(),
                last_name=last_name.strip(),
                email=email.strip().lower(),
                phone=phone.strip(),
                member_since=now,
                is_hubklub_member=False,
                membership_number=f"HK{uuid.uuid4().hex[:6].upper()}",
                tier="Classic",
                max_single_purchase=0.0,
                annual_spend_current_year=0.0,
                lifetime_spend=0.0,
                available_points=0,
                saved_addresses=[],
            )
            db.add(db_cust)
            db.commit()
            db.refresh(db_cust)
            return self._convert_db_customer(db_cust)
        except Exception as e:
            db.rollback()
            raise e
        finally:
            db.close()
