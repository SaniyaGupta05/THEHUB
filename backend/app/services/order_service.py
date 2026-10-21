import uuid
from typing import List, Optional
from app.adapters import get_shopify_adapter, get_hubklub_adapter
from app.models.schemas import (
    Order,
    DemoCheckoutRequest,
    LoyaltyRedemptionRequest,
)
from app.config import settings

class OrderService:
    @property
    def shopify(self):
        return get_shopify_adapter()

    @property
    def hubklub(self):
        return get_hubklub_adapter()

    def checkout_demo(self, request: DemoCheckoutRequest) -> Order:
        cart = self.shopify.get_cart(request.customer_id)
        if not cart.items and request.items:
            cart.items = list(request.items)
            cart.subtotal = sum(item.total_price for item in cart.items)
            cart.shipping_fee = 0.0 if cart.subtotal >= 2000 else 150.0

        if not cart.items:
            raise ValueError("Cart is empty.")

        loyalty_discount_inr = 0.0

        # If customer opted to redeem loyalty points during checkout
        if request.points_to_redeem > 0:
            idempotency_key = request.idempotency_key or f"idem_chk_{uuid.uuid4().hex[:10]}"
            redemption_req = LoyaltyRedemptionRequest(
                customer_id=request.customer_id,
                points_to_redeem=request.points_to_redeem,
                idempotency_key=idempotency_key,
            )
            # Validate and redeem via HUBKLUB adapter
            redemption_resp = self.hubklub.validate_and_redeem_points(redemption_req)
            loyalty_discount_inr = redemption_resp.rupee_discount_applied

        # Calculate estimated loyalty points earned on the cash portion of the purchase
        payable_amount = max(0.0, cart.subtotal - loyalty_discount_inr)
        estimated_points_earned = self.hubklub.calculate_estimated_points_for_purchase(payable_amount)

        # Create demo order in commerce system
        order = self.shopify.create_order(
            request=request,
            loyalty_discount_inr=loyalty_discount_inr,
            points_earned=estimated_points_earned,
        )

        # Credit points to customer loyalty account (if eligible/member)
        if estimated_points_earned > 0:
            self.hubklub.credit_earned_points(
                customer_id=request.customer_id,
                purchase_amount=payable_amount,
                order_id=order.id,
            )

        return order

    def get_customer_orders(self, customer_id: str) -> List[Order]:
        return self.shopify.get_orders_for_customer(customer_id)

    def get_order_details(self, order_id: str, customer_id: str) -> Optional[Order]:
        return self.shopify.get_order_by_id(order_id, customer_id)

order_service = OrderService()
