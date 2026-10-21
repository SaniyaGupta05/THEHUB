from fastapi import APIRouter, Header, HTTPException
from typing import List, Optional
from app.models.schemas import CustomerProfile, Order
from app.services.loyalty_service import loyalty_service
from app.services.order_service import order_service

router = APIRouter(tags=["Customer & Orders"])

def get_active_customer_id(x_customer_id: Optional[str] = Header(None)) -> str:
    return x_customer_id or "cust_demo"

@router.get("/me", response_model=CustomerProfile)
def get_customer_profile(x_customer_id: Optional[str] = Header(None)):
    """Fetch current customer profile with isolation enforced by header."""
    cid = get_active_customer_id(x_customer_id)
    profile = loyalty_service.get_customer(cid)
    if not profile:
        # Fallback profile for guest or dynamic session
        return CustomerProfile(
            id=cid,
            first_name="Guest",
            last_name="Shopper",
            email=f"{cid}@example.com",
            phone="+91 90000 00000",
            member_since="2026-01-01T00:00:00Z",
            is_hubklub_member=False,
            annual_spend_current_year=0.0,
            lifetime_spend=0.0,
            saved_addresses=[],
        )
    return profile

@router.get("/orders", response_model=List[Order])
def list_customer_orders(x_customer_id: Optional[str] = Header(None)):
    """Fetch customer's own order history. Enforces isolation."""
    cid = get_active_customer_id(x_customer_id)
    return order_service.get_customer_orders(cid)

@router.get("/orders/{order_id}", response_model=Order)
def get_order_detail(order_id: str, x_customer_id: Optional[str] = Header(None)):
    """Fetch specific order. Validates that order belongs to active customer."""
    cid = get_active_customer_id(x_customer_id)
    order = order_service.get_order_details(order_id, cid)
    if not order:
        raise HTTPException(
            status_code=404,
            detail=f"Order '{order_id}' not found or access denied for customer.",
        )
    return order

from app.models.schemas import CustomerRegisterRequest, CustomerLoginRequest

@router.post("/register", response_model=CustomerProfile)
@router.post("/customer/register", response_model=CustomerProfile)
def register_customer(req: CustomerRegisterRequest):
    """Register a new customer account."""
    if not req.first_name.strip() or not req.last_name.strip():
        raise HTTPException(status_code=400, detail="First name and last name are required.")
    if not req.email.strip() or "@" not in req.email:
        raise HTTPException(status_code=400, detail="A valid email address is required.")
    if not req.phone.strip():
        raise HTTPException(status_code=400, detail="Phone number is required.")

    # Check for existing account by email or phone
    existing = loyalty_service.find_customer(req.email) or loyalty_service.find_customer(req.phone)
    if existing:
        return existing

    return loyalty_service.register_customer(
        first_name=req.first_name,
        last_name=req.last_name,
        email=req.email,
        phone=req.phone,
        password=req.password,
    )

@router.post("/login", response_model=CustomerProfile)
@router.post("/customer/login", response_model=CustomerProfile)
def login_customer(req: CustomerLoginRequest):
    """Login using email, phone, or customer ID."""
    ident = req.identifier.strip()
    cust = loyalty_service.find_customer(ident) or loyalty_service.get_customer(ident)
    if not cust:
        raise HTTPException(status_code=404, detail="No customer found with that identifier.")
    return cust

