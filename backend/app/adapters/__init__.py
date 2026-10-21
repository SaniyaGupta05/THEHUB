from app.config import settings
from app.adapters.shopify_base import ShopifyAdapterBase
from app.adapters.mock_shopify import MockShopifyAdapter
from app.adapters.live_shopify import LiveShopifyAdapter
from app.adapters.db_shopify import DBShopifyAdapter
from app.adapters.hubklub_base import HubklubAdapterBase
from app.adapters.mock_hubklub import MockHubklubAdapter
from app.adapters.live_hubklub import LiveHubklubAdapter
from app.adapters.db_hubklub import DBHubklubAdapter

# Factory / Singleton instances
_shopify_adapter: ShopifyAdapterBase = None
_hubklub_adapter: HubklubAdapterBase = None

def get_shopify_adapter() -> ShopifyAdapterBase:
    global _shopify_adapter
    if _shopify_adapter is None:
        if settings.SHOPIFY_INTEGRATION_MODE == "live" and settings.SHOPIFY_STOREFRONT_ACCESS_TOKEN:
            _shopify_adapter = LiveShopifyAdapter()
        elif settings.SHOPIFY_INTEGRATION_MODE == "mock":
            _shopify_adapter = MockShopifyAdapter()
        else:
            _shopify_adapter = DBShopifyAdapter()
    return _shopify_adapter

def get_hubklub_adapter() -> HubklubAdapterBase:
    global _hubklub_adapter
    if _hubklub_adapter is None:
        if settings.HUBKLUB_INTEGRATION_MODE == "live" and settings.HUBKLUB_TALLY_ENDPOINT:
            _hubklub_adapter = LiveHubklubAdapter()
        elif settings.HUBKLUB_INTEGRATION_MODE == "mock":
            _hubklub_adapter = MockHubklubAdapter()
        else:
            _hubklub_adapter = DBHubklubAdapter()
    return _hubklub_adapter
