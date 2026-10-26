import uuid
from datetime import datetime, timezone
from typing import List, Optional
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
from app.db.session import SessionLocal
from app.db.models import DBProduct, DBProductVariant, DBCollection, DBCart, DBOrder, DBStaffInvoice, DBCustomer
from app.config import settings

def _ensure_utc(dt: Optional[datetime]) -> Optional[datetime]:
    if dt is None:
        return None
    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt

class DBShopifyAdapter(ShopifyAdapterBase):
    """
    Persistent Database implementation of ShopifyAdapterBase using SQLite/PostgreSQL.
    Persists catalogue, carts, and customer orders permanently.
    """

    def is_live(self) -> bool:
        return False

    def _convert_db_product(self, p: DBProduct) -> Product:
        variants = [
            ProductVariant(
                id=v.id,
                title=v.title,
                sku=v.sku,
                price=v.price,
                compare_at_price=v.compare_at_price,
                available=v.available,
                size=v.size,
                color=v.color,
            )
            for v in (p.variants or [])
        ]
        return Product(
            id=p.id,
            title=p.title,
            handle=p.handle,
            description=p.description,
            vendor=p.vendor,
            category=p.category,
            tags=p.tags or [],
            price=p.price,
            compare_at_price=p.compare_at_price,
            is_sale=p.is_sale,
            images=p.images or [],
            variants=variants,
            available=p.available,
            featured=p.featured,
            is_new=p.is_new,
            rating=p.rating,
            review_count=p.review_count,
        )

    def get_products(
        self,
        category: Optional[str] = None,
        query: Optional[str] = None,
        min_price: Optional[float] = None,
        max_price: Optional[float] = None,
        sort_by: Optional[str] = None,
    ) -> List[Product]:
        db = SessionLocal()
        try:
            q = db.query(DBProduct)
            if category:
                q = q.filter(DBProduct.category.ilike(f"%{category}%"))
            if min_price is not None:
                q = q.filter(DBProduct.price >= min_price)
            if max_price is not None:
                q = q.filter(DBProduct.price <= max_price)

            db_prods = q.all()
            results = [self._convert_db_product(p) for p in db_prods]

            if query:
                ql = query.lower()
                results = [
                    p for p in results
                    if ql in p.title.lower()
                    or ql in p.description.lower()
                    or any(ql in tag.lower() for tag in p.tags)
                ]

            if sort_by == "price_asc":
                results = sorted(results, key=lambda x: x.price)
            elif sort_by == "price_desc":
                results = sorted(results, key=lambda x: x.price, reverse=True)
            elif sort_by == "newest":
                results = sorted(results, key=lambda x: x.is_new, reverse=True)
            elif sort_by == "rating":
                results = sorted(results, key=lambda x: x.rating, reverse=True)

            return results
        finally:
            db.close()

    def get_product_by_id(self, product_id: str) -> Optional[Product]:
        db = SessionLocal()
        try:
            p = db.query(DBProduct).filter(
                (DBProduct.id == product_id) | (DBProduct.handle == product_id)
            ).first()
            if not p:
                return None
            return self._convert_db_product(p)
        finally:
            db.close()

    def get_collections(self) -> List[Collection]:
        db = SessionLocal()
        try:
            cols = db.query(DBCollection).all()
            return [
                Collection(
                    id=c.id,
                    title=c.title,
                    handle=c.handle,
                    description=c.description,
                    image=c.image,
                    product_count=c.product_count,
                )
                for c in cols
            ]
        finally:
            db.close()

    def _recalculate_cart(self, cart: Cart) -> Cart:
        subtotal = sum(item.total_price for item in cart.items)
        cart.subtotal = round(subtotal, 2)
        cart.shipping_fee = 0.0 if (cart.subtotal >= 2000.0 or cart.subtotal == 0) else 150.0
        cart.estimated_tax = 0.0
        cart.total = max(0.0, round(cart.subtotal + cart.shipping_fee - cart.loyalty_discount, 2))
        return cart

    def get_cart(self, customer_id: str) -> Cart:
        db = SessionLocal()
        try:
            db_cart = db.query(DBCart).filter(DBCart.customer_id == customer_id).first()
            if not db_cart:
                return Cart(
                    id=f"cart_{customer_id}",
                    items=[],
                    subtotal=0.0,
                    estimated_tax=0.0,
                    shipping_fee=0.0,
                    loyalty_discount=0.0,
                    total=0.0,
                    is_demo=False,
                    currency="INR",
                )
            items = [CartItem(**item) for item in (db_cart.items or [])]
            cart = Cart(
                id=f"cart_{customer_id}",
                items=items,
                subtotal=db_cart.subtotal,
                estimated_tax=db_cart.estimated_tax,
                shipping_fee=db_cart.shipping_fee,
                loyalty_discount=db_cart.loyalty_discount,
                total=db_cart.total,
                is_demo=False,
                currency="INR",
            )
            return self._recalculate_cart(cart)
        finally:
            db.close()

    def _save_cart(self, db, customer_id: str, cart: Cart):
        db_cart = db.query(DBCart).filter(DBCart.customer_id == customer_id).first()
        items_json = [item.model_dump() for item in cart.items]
        if not db_cart:
            db_cart = DBCart(
                customer_id=customer_id,
                items=items_json,
                subtotal=cart.subtotal,
                shipping_fee=cart.shipping_fee,
                estimated_tax=cart.estimated_tax,
                loyalty_discount=cart.loyalty_discount,
                total=cart.total,
            )
            db.add(db_cart)
        else:
            db_cart.items = items_json
            db_cart.subtotal = cart.subtotal
            db_cart.shipping_fee = cart.shipping_fee
            db_cart.estimated_tax = cart.estimated_tax
            db_cart.loyalty_discount = cart.loyalty_discount
            db_cart.total = cart.total
        db.commit()

    def add_to_cart(
        self, customer_id: str, product_id: str, variant_id: str, quantity: int
    ) -> Cart:
        db = SessionLocal()
        try:
            product = self.get_product_by_id(product_id)
            if not product:
                raise ValueError(f"Product '{product_id}' not found.")

            target_variant = next((v for v in product.variants if v.id == variant_id), None)
            if not target_variant:
                raise ValueError(f"Variant '{variant_id}' not found on product '{product_id}'.")

            if not target_variant.available:
                raise ValueError(f"Variant '{target_variant.title}' is currently out of stock.")

            cart = self.get_cart(customer_id)
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

            cart = self._recalculate_cart(cart)
            self._save_cart(db, customer_id, cart)
            return cart
        finally:
            db.close()

    def update_cart_item(self, customer_id: str, item_id: str, quantity: int) -> Cart:
        db = SessionLocal()
        try:
            cart = self.get_cart(customer_id)
            item = next((i for i in cart.items if i.id == item_id), None)
            if not item:
                raise ValueError(f"Cart item '{item_id}' not found.")

            if quantity <= 0:
                cart.items = [i for i in cart.items if i.id != item_id]
            else:
                item.quantity = quantity
                item.total_price = round(item.quantity * item.price, 2)

            cart = self._recalculate_cart(cart)
            self._save_cart(db, customer_id, cart)
            return cart
        finally:
            db.close()

    def remove_from_cart(self, customer_id: str, item_id: str) -> Cart:
        return self.update_cart_item(customer_id, item_id, 0)

    def create_order(
        self,
        request: DemoCheckoutRequest,
        loyalty_discount_inr: float = 0.0,
        points_earned: int = 0,
    ) -> Order:
        db = SessionLocal()
        try:
            cart = self.get_cart(request.customer_id)
            if not cart.items and request.items:
                cart.items = list(request.items)
                self._recalculate_cart(cart)

            if not cart.items:
                raise ValueError("Cart is empty. Cannot checkout.")

            order_id = f"ord_{uuid.uuid4().hex[:10]}"
            order_num = f"HUB-ORD-{datetime.now(timezone.utc).year}-{uuid.uuid4().hex[:5].upper()}"

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
            now = datetime.now(timezone.utc)

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
                status="Confirmed",
                shipping_address=request.shipping_address,
                created_at=now,
                is_demo=settings.DEMO_MODE,
            )

            db_order = DBOrder(
                id=order.id,
                order_number=order.order_number,
                customer_id=order.customer_id,
                items=[oi.model_dump() for oi in order.items],
                subtotal=order.subtotal,
                tax=order.tax,
                shipping=order.shipping,
                discount_amount=order.discount_amount,
                points_redeemed=order.points_redeemed,
                points_earned_estimated=order.points_earned_estimated,
                total_amount=order.total_amount,
                status=order.status,
                payment_method="Online",
                shipping_address=order.shipping_address.model_dump(),
                channel="online",
                created_at=now,
                is_demo=False,
            )
            db.add(db_order)

            # Clear cart in DB
            db_cart = db.query(DBCart).filter(DBCart.customer_id == request.customer_id).first()
            if db_cart:
                db_cart.items = []
                db_cart.subtotal = 0.0
                db_cart.shipping_fee = 0.0
                db_cart.total = 0.0

            db.commit()
            return order
        except Exception as e:
            db.rollback()
            raise e
        finally:
            db.close()

    def get_orders_for_customer(self, customer_id: str) -> List[Order]:
        db = SessionLocal()
        try:
            db_orders = (
                db.query(DBOrder)
                .filter(DBOrder.customer_id == customer_id)
                .order_by(DBOrder.created_at.desc())
                .all()
            )
            results = []
            existing_numbers = set()

            for o in db_orders:
                existing_numbers.add(o.order_number)
                items = [OrderItem(**i) for i in (o.items or [])]
                addr = Address(**(o.shipping_address or {
                    "full_name": "Customer",
                    "phone": "",
                    "street": "",
                    "city": "Vadodara",
                    "state": "Gujarat",
                    "pincode": "390007",
                    "country": "India"
                }))
                results.append(
                    Order(
                        id=o.id,
                        order_number=o.order_number,
                        customer_id=o.customer_id,
                        items=items,
                        subtotal=o.subtotal,
                        tax=o.tax,
                        shipping=o.shipping,
                        discount_amount=o.discount_amount,
                        points_redeemed=o.points_redeemed,
                        points_earned_estimated=o.points_earned_estimated,
                        total_amount=o.total_amount,
                        status=o.status,
                        shipping_address=addr,
                        created_at=_ensure_utc(o.created_at),
                        is_demo=o.is_demo,
                    )
                )

            # 2. Also fetch all in-store POS bills / invoices created for this customer
            c = db.query(DBCustomer).filter(DBCustomer.id == customer_id).first()
            phone_digits = "".join(ch for ch in (c.phone or "") if ch.isdigit()) if c else ""

            all_invoices = db.query(DBStaffInvoice).order_by(DBStaffInvoice.timestamp.desc()).all()

            for inv in all_invoices:
                # Check match by customer_id or phone number digits
                is_match = False
                if inv.customer_id == customer_id:
                    is_match = True
                elif phone_digits and len(phone_digits) >= 10:
                    inv_digits = "".join(ch for ch in (inv.customer_phone or "") if ch.isdigit())
                    if len(inv_digits) >= 10 and inv_digits[-10:] == phone_digits[-10:]:
                        is_match = True

                if is_match and inv.invoice_number not in existing_numbers:
                    existing_numbers.add(inv.invoice_number)
                    store_addr = Address(
                        full_name=inv.customer_name or (f"{c.first_name} {c.last_name}" if c else "Customer"),
                        phone=inv.customer_phone or (c.phone if c else ""),
                        street="THE HUB • In-Store Counter (RC Dutt Road)",
                        city="Vadodara",
                        state="Gujarat",
                        pincode="390007",
                        country="India"
                    )
                    results.append(
                        Order(
                            id=inv.id,
                            order_number=inv.invoice_number,
                            customer_id=customer_id,
                            items=[
                                OrderItem(
                                    product_id="store_pos_item",
                                    variant_id="store_pos_var",
                                    product_title="In-Store Retail Purchase (THE HUB Vadodara)",
                                    quantity=1,
                                    unit_price=inv.gross_amount,
                                    total_price=inv.gross_amount,
                                )
                            ],
                            subtotal=inv.gross_amount,
                            tax=0.0,
                            shipping=0.0,
                            discount_amount=inv.loyalty_discount_inr or 0.0,
                            points_redeemed=inv.points_redeemed or 0,
                            points_earned_estimated=inv.points_earned_this_bill or 0,
                            total_amount=inv.net_payable,
                            status="Delivered",
                            shipping_address=store_addr,
                            created_at=_ensure_utc(inv.timestamp) or datetime.now(timezone.utc),
                            is_demo=False,
                        )
                    )

            # Sort combined orders chronologically descending
            results.sort(key=lambda x: x.created_at or datetime.min.replace(tzinfo=timezone.utc), reverse=True)
            return results
        finally:
            db.close()

    def get_order_by_id(self, order_id: str, customer_id: str) -> Optional[Order]:
        orders = self.get_orders_for_customer(customer_id)
        for o in orders:
            if o.id == order_id or o.order_number == order_id:
                return o
        return None
