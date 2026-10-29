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
    JubileeSchemeProgress,
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

    # Rate slab matching for "THE POINT THAT MATTERS"
    if amount <= 20000.0:
        rate = 0.03
        slab_name = "Up To ₹ 20,000 (3% of invoice value)"
    elif amount <= 50000.0:
        rate = 0.05
        slab_name = "₹ 20,001 to ₹ 50,000 (5% of invoice value)"
    else:
        rate = 0.06
        slab_name = "₹ 50,001 and above (6% of invoice value)"

    base_points = int(round(amount * rate))
    rupee_val = base_points * settings.LOYALTY_POINT_RUPEE_VALUE

    new_annual_spend = current_annual_spend + amount
    threshold = settings.LOYALTY_ANNUAL_BONUS_SPEND_THRESHOLD
    bonus_achieved = new_annual_spend >= threshold
    bonus_points = int(round(base_points * 0.20)) if bonus_achieved else 0
    total_points = base_points + bonus_points

    return {
        "scheme_name": "THE POINT THAT MATTERS",
        "tagline": "You earn points on every purchase",
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
        "points_validity": "Accumulated points validity: 2 Years",
        "redemption_rule": "Each point is equivelant to redemption of Rs. 1",
        "is_demo": True,
    }

@router.get("/scheme")
def get_loyalty_scheme_details():
    """
    Returns exact scheme specifications for THE POINT THAT MATTERS.
    """
    return {
        "title": "THE POINT THAT MATTERS",
        "tagline": "You earn points on every purchase",
        "single_purchase_rule": "Points rate slabs (3%, 5%, 6%) apply strictly per single purchase invoice amount. Invoices are evaluated individually.",
        "tiers": [
            {
                "range": "Up To ₹ 20,000",
                "rate": 0.03,
                "rate_percent": 3,
                "benefit": "Get 3% of invoice value",
            },
            {
                "range": "₹ 20,001 to ₹ 50,000",
                "rate": 0.05,
                "rate_percent": 5,
                "benefit": "Get 5% of invoice value",
            },
            {
                "range": "₹ 50,001 and above",
                "rate": 0.06,
                "rate_percent": 6,
                "benefit": "Get 6% of invoice value",
            },
        ],
        "annual_bonus": {
            "threshold_inr": 100000.0,
            "bonus_multiplier": 0.20,
            "description": "On accumalated purchase of INR 1,00,000 and above, you get 20% bonus of the total points earned in the year",
        },
        "redemption": {
            "rupee_equivalent_per_point": 1.0,
            "description": "Each point is equivelant to redemption of Rs. 1",
        },
        "validity": {
            "years": 2,
            "days": 730,
            "description": "Accumulated points validity: 2 Years",
        },
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

@router.get("/jubilee", response_model=JubileeSchemeProgress)
def get_customer_jubilee_progress(x_customer_id: Optional[str] = Header(None)):
    """
    Returns current customer's 25-Year Silver Jubilee Scheme progress (2027 - 2028).
    Tracks accumulated purchase toward Celebration Event Pass, Silver Coin,
    Silver Ganesha Idol, and Exclusive Surprise Gift.
    """
    cid = get_active_customer_id(x_customer_id)
    return loyalty_service.get_jubilee_progress(cid)

@router.get("/jubilee/rules")
def get_jubilee_scheme_rules():
    """
    Official terms and tiers for The HUB 25th Silver Jubilee Celebration (2028).
    Active Period: 1st Jan 2027 to 1st Aug 2028.
    """
    return {
        "scheme_name": "The HUB 25th Silver Jubilee Celebration (2028)",
        "occasion": "Celebrating 25 Glorious Years of The HUB (2003 - 2028)",
        "active_period": {
            "start_date": "1st January 2027",
            "end_date": "1st August 2028",
            "duration_months": 19,
        },
        "basis": "Accumulated purchases made between 1st Jan 2027 and 1st Aug 2028",
        "tiers": [
            {
                "tier": "Tier 1: Event Pass",
                "eligibility": "Accumulated purchase more than ₹50,000",
                "reward": "Exclusive Invitation / Pass to attend the 25-Year Silver Jubilee Mega Celebration Event",
                "badge": "25th Jubilee VIP Pass",
            },
            {
                "tier": "Tier 2: Pure Silver Coin",
                "eligibility": "Accumulated purchase more than ₹1,00,000",
                "reward": "Certified 25th Anniversary Commemorative Pure Silver Coin",
                "badge": "Silver Coin",
            },
            {
                "tier": "Tier 3: Silver Ganesha Idol",
                "eligibility": "Accumulated purchase between ₹1,00,000 and ₹2,00,000",
                "reward": "Auspicious Handcrafted Pure Silver Lord Ganesha Idol (Upgraded Gift)",
                "badge": "Silver Ganesha Idol",
            },
            {
                "tier": "Tier 4: Grand Surprise Gift",
                "eligibility": "Accumulated purchase more than ₹2,00,000",
                "reward": "Exclusive Grand Surprise Luxury Gift Hamper + VIP Celebration Hospitality",
                "badge": "Surprise Luxury Gift",
            },
        ],
    }

