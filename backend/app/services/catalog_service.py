from typing import List, Optional
from app.adapters import get_shopify_adapter
from app.models.schemas import Product, Collection

class CatalogService:
    @property
    def adapter(self):
        return get_shopify_adapter()

    def get_products(
        self,
        category: Optional[str] = None,
        query: Optional[str] = None,
        min_price: Optional[float] = None,
        max_price: Optional[float] = None,
        sort_by: Optional[str] = None,
    ) -> List[Product]:
        return self.adapter.get_products(
            category=category,
            query=query,
            min_price=min_price,
            max_price=max_price,
            sort_by=sort_by,
        )

    def get_product_by_id(self, product_id: str) -> Optional[Product]:
        return self.adapter.get_product_by_id(product_id)

    def get_collections(self) -> List[Collection]:
        return self.adapter.get_collections()

catalog_service = CatalogService()
