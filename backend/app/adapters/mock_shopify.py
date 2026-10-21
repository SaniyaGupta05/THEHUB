import json
import os
import uuid
from datetime import datetime, timezone
from typing import List, Optional, Dict
from app.adapters.shopify_base import ShopifyAdapterBase
from app.models.schemas import (
    Product,
    ProductVariant,
    Collection,
    Cart,
    CartItem,
    Order,
    OrderItem,
    DemoCheckoutRequest,
    Address,
)

class MockShopifyAdapter(ShopifyAdapterBase):
    """
    Mock implementation of ShopifyAdapterBase using authentic The HUB sample catalogue.
    Clearly marks all generated carts and orders with `is_demo = True`.
    """

    def __init__(self, data_dir: Optional[str] = None):
        if not data_dir:
            base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
            data_dir = os.path.join(base_dir, "data")
        self.data_dir = data_dir

        self._products: List[Product] = []
        self._collections: List[Collection] = []
        self._carts: Dict[str, Cart] = {}
        self._orders: Dict[str, Order] = {}

        self._load_data()
        self._seed_sample_orders()

    def is_live(self) -> bool:
        return False

    def _load_data(self):
        products_file = os.path.join(self.data_dir, "sample_products.json")
        collections_file = os.path.join(self.data_dir, "sample_collections.json")

        if os.path.exists(products_file):
            with open(products_file, "r", encoding="utf-8") as f:
                raw_prods = json.load(f)
                self._products = [Product(**p) for p in raw_prods]

        if os.path.exists(collections_file):
            with open(collections_file, "r", encoding="utf-8") as f:
                raw_cols = json.load(f)
                self._collections = [Collection(**c) for c in raw_cols]

    def _seed_sample_orders(self):
        ord1 = Order(
            id="ord_demo_101",
            order_number="HUB-2026-9041",
            customer_id="cust_demo",
            items=[
                OrderItem(
                    product_id="prod_1",
                    variant_id="var_1_m",
                    product_title="Prithvi Patchwork Mirror Kurta",
                    quantity=1,
                    unit_price=15195.0,
                    total_price=15195.0,
                    image="https://cdn.shopify.com/s/files/1/0593/8918/2049/files/Prithvi.webp?v=1790074668",
                )
            ],
            subtotal=15195.0,
            tax=0.0,
            shipping=0.0,
            discount_amount=0.0,
            points_redeemed=0,
            points_earned_estimated=455,
            total_amount=15195.0,
            status="Delivered (Sample Order)",
            shipping_address=Address(
                full_name="Aarav Patel",
                phone="+91 98250 12345",
                street="14 Alkapuri Chambers, R.C. Dutt Road",
                city="Vadodara",
                state="Gujarat",
                pincode="390007",
                country="India",
            ),
            created_at=datetime(2026, 9, 25, 14, 20, 0, tzinfo=timezone.utc),
            is_demo=True,
        )
        self._orders[ord1.id] = ord1

    def get_products(
        self,
        category: Optional[str] = None,
        query: Optional[str] = None,
        min_price: Optional[float] = None,
        max_price: Optional[float] = None,
        sort_by: Optional[str] = None,
    ) -> List[Product]:
        results = list(self._products)

        if category:
            cat_lower = category.lower()
            results = [p for p in results if cat_lower in p.category.lower()]

        if query:
            q_lower = query.lower()
            results = [
                p
                for p in results
                if q_lower in p.title.lower()
                or q_lower in p.description.lower()
                or any(q_lower in tag.lower() for tag in p.tags)
            ]

        if min_price is not None:
            results = [p for p in results if p.price >= min_price]

        if max_price is not None:
            results = [p for p in results if p.price <= max_price]

        if sort_by == "price_asc":
            results = sorted(results, key=lambda x: x.price)
        elif sort_by == "price_desc":
            results = sorted(results, key=lambda x: x.price, reverse=True)
        elif sort_by == "newest":
            results = sorted(results, key=lambda x: x.is_new, reverse=True)
        elif sort_by == "rating":
            results = sorted(results, key=lambda x: x.rating, reverse=True)

        return results

    def get_product_by_id(self, product_id: str) -> Optional[Product]:
        for p in self._products:
            if p.id == product_id or p.handle == product_id:
                return p
        return None

    def get_collections(self) -> List[Collection]:
        return list(self._collections)

    def _recalculate_cart(self, cart: Cart) -> Cart:
        subtotal = sum(item.total_price for item in cart.items)
        cart.subtotal = round(subtotal, 2)
        cart.shipping_fee = 0.0 if (cart.subtotal >= 2000.0 or cart.subtotal == 0) else 150.0
        cart.estimated_tax = 0.0
        cart.total = max(0.0, round(cart.subtotal + cart.shipping_fee - cart.loyalty_discount, 2))
        return cart

    def get_cart(self, customer_id: str) -> Cart:
        if customer_id not in self._carts:
            self._carts[customer_id] = Cart(
                id=f"cart_{customer_id}",
                items=[],
                subtotal=0.0,
                estimated_tax=0.0,
                shipping_fee=0.0,
                loyalty_discount=0.0,
                total=0.0,
                is_demo=True,
                currency="INR",
            )
        return self._recalculate_cart(self._carts[customer_id])

    def add_to_cart(
        self, customer_id: str, product_id: str, variant_id: str, quantity: int
    ) -> Cart:
        cart = self.get_cart(customer_id)
        product = self.get_product_by_id(product_id)
        if not product:
            raise ValueError(f"Product '{product_id}' not found.")

        target_variant = next((v for v in product.variants if v.id == variant_id), None)
        if not target_variant:
            raise ValueError(f"Variant '{variant_id}' not found on product '{product_id}'.")

        if not target_variant.available:
            raise ValueError(f"Variant '{target_variant.title}' is currently out of stock.")

        existing_item = next(
            (i for i in cart.items if i.product_id == product_id and i.variant_id == variant_id),
            None,
        )
        if existing_item:
            existing_item.quantity += quantity
            existing_item.total_price = round(existing_item.quantity * existing_item.price, 2)
        else:
            new_item = CartItem(
                id=f"ci_{uuid.uuid4().hex[:8]}",
                product_id=product.id,
                variant_id=target_variant.id,
                product_title=product.title,
                variant_title=target_variant.title,
                price=target_variant.price,
                quantity=quantity,
                total_price=round(target_variant.price * quantity, 2),
                image=product.images[0] if product.images else None,
                size=target_variant.size,
                color=target_variant.color,
            )
            cart.items.append(new_item)

        return self._recalculate_cart(cart)

    def update_cart_item(self, customer_id: str, item_id: str, quantity: int) -> Cart:
        cart = self.get_cart(customer_id)
        item = next((i for i in cart.items if i.id == item_id), None)
        if not item:
            raise ValueError(f"Cart item '{item_id}' not found.")

        if quantity <= 0:
            cart.items = [i for i in cart.items if i.id != item_id]
        else:
            item.quantity = quantity
            item.total_price = round(item.quantity * item.price, 2)

        return self._recalculate_cart(cart)

    def remove_from_cart(self, customer_id: str, item_id: str) -> Cart:
        return self.update_cart_item(customer_id, item_id, 0)

    def create_order(
        self,
        request: DemoCheckoutRequest,
        loyalty_discount_inr: float = 0.0,
        points_earned: int = 0,
    ) -> Order:
        cart = self.get_cart(request.customer_id)
        if not cart.items and request.items:
            cart.items = list(request.items)
            self._recalculate_cart(cart)

        if not cart.items:
            raise ValueError("Cart is empty. Cannot checkout.")

        order_id = f"ord_{uuid.uuid4().hex[:10]}"
        order_num = f"HUB-DEMO-{uuid.uuid4().hex[:6].upper()}"

        order_items = [
            OrderItem(
                product_id=ci.product_id,
                variant_id=ci.variant_id,
                product_title=ci.product_title,
                quantity=ci.quantity,
                unit_price=ci.price,
                total_price=ci.total_price,
                image=ci.image,
            )
            for ci in cart.items
        ]

        subtotal = cart.subtotal
        shipping = cart.shipping_fee
        tax = cart.estimated_tax
        final_total = max(0.0, round(subtotal + shipping + tax - loyalty_discount_inr, 2))

        order = Order(
            id=order_id,
            order_number=order_num,
            customer_id=request.customer_id,
            items=order_items,
            subtotal=subtotal,
            tax=tax,
            shipping=shipping,
            discount_amount=loyalty_discount_inr,
            points_redeemed=request.points_to_redeem,
            points_earned_estimated=points_earned,
            total_amount=final_total,
            status="Confirmed (Demo Order)",
            shipping_address=request.shipping_address,
            created_at=datetime.now(timezone.utc),
            is_demo=True,
        )

        self._orders[order.id] = order
        cart.items = []
        self._recalculate_cart(cart)

        return order

    def get_orders_for_customer(self, customer_id: str) -> List[Order]:
        return [
            o
            for o in self._orders.values()
            if o.customer_id == customer_id
        ]

    def get_order_by_id(self, order_id: str, customer_id: str) -> Optional[Order]:
        order = self._orders.get(order_id)
        if order and order.customer_id == customer_id:
            return order
        return None
