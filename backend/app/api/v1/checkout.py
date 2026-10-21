from fastapi import APIRouter, HTTPException, Header
from typing import Optional
from app.models.schemas import Order, DemoCheckoutRequest
from app.services.order_service import order_service

router = APIRouter(prefix="/checkout", tags=["Checkout"])

@router.post("/demo", response_model=Order)
def demo_checkout(
    request: DemoCheckoutRequest,
    x_customer_id: Optional[str] = Header(None),
):
    """
    Simulated demo checkout endpoint.
    Processes mock order creation, applies demo loyalty point redemption if requested,
    calculates estimated loyalty points earned, and clears the cart.
    Clearly labelled as Demo Order. Real payment credentials are never requested or stored.
    """
    # Enforce customer-level isolation
    active_cid = x_customer_id or request.customer_id
    if request.customer_id != active_cid:
        request.customer_id = active_cid

    try:
        return order_service.checkout_demo(request)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Checkout error: {str(e)}")
