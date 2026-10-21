from abc import ABC, abstractmethod
from typing import List, Optional, Dict, Any
from app.models.schemas import Product, Collection, Cart, Order, DemoCheckoutRequest

class ShopifyAdapterBase(ABC):
    """
    Abstract interface for Shopify Storefront & Customer API operations.
    Keeps commerce domain cleanly separated from the mobile app and loyalty system.
    """

    @abstractmethod
    def is_live(self) -> bool:
        """Returns True if connected to live Shopify API, False if in mock/demo mode."""
        pass

    @abstractmethod
    def get_products(
        self,
        category: Optional[str] = None,
        query: Optional[str] = None,
        min_price: Optional[float] = None,
        max_price: Optional[float] = None,
        sort_by: Optional[str] = None,
    ) -> List[Product]:
        """Fetch filtered and sorted products."""
        pass

    @abstractmethod
    def get_product_by_id(self, product_id: str) -> Optional[Product]:
        """Fetch single product details with all variants."""
        pass

    @abstractmethod
    def get_collections(self) -> List[Collection]:
        """Fetch active catalogue collections."""
        pass

    @abstractmethod
    def get_cart(self, customer_id: str) -> Cart:
        """Get or initialize cart for customer session."""
        pass

    @abstractmethod
    def add_to_cart(
        self, customer_id: str, product_id: str, variant_id: str, quantity: int
    ) -> Cart:
        """Add item variant to cart."""
        pass

    @abstractmethod
    def update_cart_item(self, customer_id: str, item_id: str, quantity: int) -> Cart:
        """Update quantity of an item in cart."""
        pass

    @abstractmethod
    def remove_from_cart(self, customer_id: str, item_id: str) -> Cart:
        """Remove item from cart."""
        pass

    @abstractmethod
    def create_order(
        self,
        request: DemoCheckoutRequest,
        loyalty_discount_inr: float = 0.0,
        points_earned: int = 0,
    ) -> Order:
        """Process checkout and generate order record."""
        pass

    @abstractmethod
    def get_orders_for_customer(self, customer_id: str) -> List[Order]:
        """Fetch order history for a customer."""
        pass

    @abstractmethod
    def get_order_by_id(self, order_id: str, customer_id: str) -> Optional[Order]:
        """Fetch specific order with data isolation check."""
        pass
