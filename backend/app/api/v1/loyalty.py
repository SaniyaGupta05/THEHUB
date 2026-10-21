from fastapi import APIRouter, Header, HTTPException, Query, Body
from typing import List, Optional, Dict, Any
from app.models.schemas import (
    HubklubMembershipStatus,
    HubklubBalance,
    HubklubAnnualBonusProgress,
    HubklubSummary,
    PointsTransaction,
    LoyaltyEnrollmentRequest,
    LoyaltyRedemptionRequest,
    LoyaltyRedemptionResponse,
)
from app.services.loyalty_service import loyalty_service
from app.config import settings

router = APIRouter(prefix="/loyalty", tags=["HUBKLUB Loyalty"])

def get_active_customer_id(x_customer_id: Optional[str] = Header(None)) -> str:
    return x_customer_id or "cust_demo"

@router.get("/membership", response_model=HubklubMembershipStatus)
def get_membership_status(x_customer_id: Optional[str] = Header(None)):
    """
    Get customer's HUBKLUB membership status and ₹1,000 threshold progress.
    """
    cid = get_active_customer_id(x_customer_id)
    return loyalty_service.get_membership(cid)

@router.post("/enrollment/demo", response_model=HubklubMembershipStatus)
def enroll_customer_demo(
    request: Optional[LoyaltyEnrollmentRequest] = None,
    x_customer_id: Optional[str] = Header(None),
):
    """
    Enroll an eligible customer in HUBKLUB loyalty program (demo mode).
    Validates that single purchase >= ₹1,000 requirement is met.
    """
    cid = (request.customer_id if request else None) or get_active_customer_id(x_customer_id)
    try:
        return loyalty_service.enroll(cid)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/balance", response_model=HubklubBalance)
def get_points_balance(x_customer_id: Optional[str] = Header(None)):
    """
    Get current loyalty points balance and rupee equivalence (1 pt = ₹1).
    Displays points expiring soon and expiry batches (2 years validity).
    """
    cid = get_active_customer_id(x_customer_id)
    return loyalty_service.get_balance(cid)

@router.get("/transactions", response_model=List[PointsTransaction])
def list_points_transactions(x_customer_id: Optional[str] = Header(None)):
    """
    Get full ledger of earned, redeemed, bonus, and expiring points.
    """
    cid = get_active_customer_id(x_customer_id)
    return loyalty_service.get_transactions(cid)

@router.get("/summary", response_model=HubklubSummary)
def get_loyalty_summary(x_customer_id: Optional[str] = Header(None)):
    """
    Aggregated dashboard view for the HUBKLUB screen:
    - Membership status and tier
    - Points balance & rupee conversion
    - Annual spend & progress toward ₹1,00,000 threshold (20% bonus)
    - Recent transactions & active rate bands (3%, 5%, 6%)
    """
    cid = get_active_customer_id(x_customer_id)
    return loyalty_service.get_summary(cid)

@router.get("/redemption-options")
def get_redemption_options(x_customer_id: Optional[str] = Header(None)):
    """
    Fetch redemption guidelines, conversion rate (1 pt = ₹1), and available balance.
    """
    cid = get_active_customer_id(x_customer_id)
    balance = loyalty_service.get_balance(cid)
    return {
        "customer_id": cid,
        "available_points": balance.available_points,
        "redemption_value_inr": balance.redemption_value_inr,
        "rate_rule": "1 HUBKLUB Point = ₹1.00",
        "redemption_increments": [100, 250, 500, 1000, 2000, balance.available_points],
        "is_demo": True,
        "notice": "Loyalty points redemption is simulated for demo orders.",
    }

@router.post("/redemptions/demo", response_model=LoyaltyRedemptionResponse)
def redeem_points_demo(
    request: LoyaltyRedemptionRequest,
    x_customer_id: Optional[str] = Header(None),
):
    """
    Simulated points redemption.
    Validates that:
    1. Customer has sufficient points.
    2. Duplicate request is prevented via idempotency key.
    3. Proper deduction and rupee discount is applied.
    """
    cid = x_customer_id or request.customer_id
    if request.customer_id != cid:
        request.customer_id = cid

    try:
        return loyalty_service.redeem_points(request)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except PermissionError as e:
        raise HTTPException(status_code=403, detail=str(e))

@router.get("/calculate-points")
def calculate_points_endpoint(
    amount: float = Query(..., ge=0, description="Purchase bill amount in INR"),
    x_customer_id: Optional[str] = Header(None),
):
    """
    Real-time Points Count Engine:
    Calculates rate slab, base points, rupee value, annual milestone progress,
    and 20% annual bonus points for any given spend amount.
    """
    cid = get_active_customer_id(x_customer_id)
    cust = loyalty_service.get_customer(cid)
    current_annual_spend = cust.annual_spend_current_year if cust else 0.0

    # Rate slab matching
    rate = 0.03
    slab_name = "Up to ₹20,000 (3% Back)"
    for band in settings.LOYALTY_RATE_BANDS:
        if band["min"] <= amount <= band["max"]:
            rate = band["rate"]
            slab_name = f"{band['rate']*100:.0f}% Back"
            break

    base_points = int(round(amount * rate))
    rupee_val = base_points * settings.LOYALTY_POINT_RUPEE_VALUE

    new_annual_spend = current_annual_spend + amount
    threshold = settings.LOYALTY_ANNUAL_BONUS_SPEND_THRESHOLD
    bonus_achieved = new_annual_spend >= threshold
    bonus_points = int(round(base_points * 0.20)) if bonus_achieved else 0
    total_points = base_points + bonus_points

    return {
        "amount": amount,
        "rate_percent": round(rate * 100, 1),
        "slab_name": slab_name,
        "base_points": base_points,
        "rupee_equivalent": rupee_val,
        "annual_spend_before": current_annual_spend,
        "annual_spend_after": new_annual_spend,
        "annual_threshold": threshold,
        "bonus_achieved": bonus_achieved,
        "bonus_points": bonus_points,
        "total_points": total_points,
        "total_rupee_value": total_points * settings.LOYALTY_POINT_RUPEE_VALUE,
        "is_demo": True,
    }

@router.post("/simulate-credit")
def simulate_credit_endpoint(
    payload: Dict[str, Any] = Body(...),
    x_customer_id: Optional[str] = Header(None),
):
    """
    Interactive test credit for demo:
    Allows user to test adding a purchase in the Points Counter and immediately
    credits points to their active customer ledger.
    """
    cid = get_active_customer_id(x_customer_id)
    amount = float(payload.get("amount", 0.0))
    if amount <= 0:
        raise HTTPException(status_code=400, detail="Amount must be greater than 0.")

    tx = loyalty_service.credit_points(cid, amount)
    summary = loyalty_service.get_summary(cid)

    return {
        "success": True,
        "credited_points": tx.points,
        "transaction": tx,
        "updated_balance": summary.balance.available_points,
        "summary": summary,
    }

