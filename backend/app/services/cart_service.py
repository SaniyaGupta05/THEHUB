from app.adapters import get_shopify_adapter
from app.models.schemas import Cart

class CartService:
    @property
    def adapter(self):
        return get_shopify_adapter()

    def get_cart(self, customer_id: str) -> Cart:
        return self.adapter.get_cart(customer_id)

    def add_item(
        self, customer_id: str, product_id: str, variant_id: str, quantity: int
    ) -> Cart:
        return self.adapter.add_to_cart(customer_id, product_id, variant_id, quantity)

    def update_item_quantity(self, customer_id: str, item_id: str, quantity: int) -> Cart:
        return self.adapter.update_cart_item(customer_id, item_id, quantity)

    def remove_item(self, customer_id: str, item_id: str) -> Cart:
        return self.adapter.remove_from_cart(customer_id, item_id)

cart_service = CartService()
