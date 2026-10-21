from fastapi import APIRouter, Header, HTTPException, Body
from typing import Optional
from app.models.schemas import Cart, CartItemCreate, CartItemUpdate
from app.services.cart_service import cart_service

router = APIRouter(prefix="/cart", tags=["Cart"])

def get_active_customer_id(x_customer_id: Optional[str] = Header(None)) -> str:
    """Extract customer ID from header, defaulting to demo customer."""
    return x_customer_id or "cust_demo"

@router.get("", response_model=Cart)
def get_cart(x_customer_id: Optional[str] = Header(None)):
    """Retrieve the current shopping cart for customer session."""
    cid = get_active_customer_id(x_customer_id)
    return cart_service.get_cart(cid)

@router.post("/items", response_model=Cart)
def add_item_to_cart(
    item: CartItemCreate, x_customer_id: Optional[str] = Header(None)
):
    """Add a product variant and quantity to the cart."""
    cid = get_active_customer_id(x_customer_id)
    try:
        return cart_service.add_item(
            customer_id=cid,
            product_id=item.product_id,
            variant_id=item.variant_id,
            quantity=item.quantity,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.patch("/items/{item_id}", response_model=Cart)
def update_cart_item(
    item_id: str,
    update: CartItemUpdate,
    x_customer_id: Optional[str] = Header(None),
):
    """Update item quantity in cart. Setting quantity to 0 removes the item."""
    cid = get_active_customer_id(x_customer_id)
    try:
        return cart_service.update_item_quantity(
            customer_id=cid, item_id=item_id, quantity=update.quantity
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.delete("/items/{item_id}", response_model=Cart)
def remove_cart_item(
    item_id: str, x_customer_id: Optional[str] = Header(None)
):
    """Remove an item completely from the cart."""
    cid = get_active_customer_id(x_customer_id)
    try:
        return cart_service.remove_item(customer_id=cid, item_id=item_id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
