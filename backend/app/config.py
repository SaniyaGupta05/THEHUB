from pydantic_settings import BaseSettings
from typing import List, Dict
import os

class LoyaltyRateBand(BaseSettings):
    max_amount: float
    rate_percent: float

class Settings(BaseSettings):
    APP_NAME: str = "The HUB & HUBKLUB Loyalty API"
    APP_VERSION: str = "1.0.0"
    API_V1_PREFIX: str = "/api/v1"
    DEBUG: bool = True
    
    # Mode flags
    DEMO_MODE: bool = True  # True allows simulated demo checkout without real credit cards
    SHOPIFY_INTEGRATION_MODE: str = "db"  # "db" | "mock" | "live"
    HUBKLUB_INTEGRATION_MODE: str = "db"  # "db" | "mock" | "live"

    # Future Live Credentials (empty in demo mode, never exposed to client)
    SHOPIFY_STORE_DOMAIN: str = "3tmnjg-dw.myshopify.com"
    SHOPIFY_STOREFRONT_ACCESS_TOKEN: str = ""
    SHOPIFY_ADMIN_API_ACCESS_TOKEN: str = ""
    HUBKLUB_TALLY_ENDPOINT: str = ""
    HUBKLUB_TALLY_API_KEY: str = ""

    # Database (defaults to local SQLite hubklub_app.db)
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./hubklub_app.db")

    # Loyalty Rules Configuration (as specified in project brief)
    # Eligibility requirement: one-time purchase of ₹1,000 or more
    LOYALTY_ELIGIBILITY_MIN_SINGLE_PURCHASE: float = 1000.0

    # Points earning rate bands:
    # Up to ₹20,000 -> 3%
    # ₹20,001 to ₹50,000 -> 5%
    # ₹50,001 and above -> 6%
    LOYALTY_RATE_BANDS: List[Dict[str, float]] = [
        {"min": 0.0, "max": 20000.0, "rate": 0.03},
        {"min": 20000.01, "max": 50000.0, "rate": 0.05},
        {"min": 50000.01, "max": float("inf"), "rate": 0.06},
    ]

    # Annual bonus rule: ₹1,00,000 accumulated spending in a year -> 20% bonus of points earned in that year
    LOYALTY_ANNUAL_BONUS_SPEND_THRESHOLD: float = 100000.0
    LOYALTY_ANNUAL_BONUS_MULTIPLIER: float = 0.20

    # Redemption rule: 1 point = ₹1
    LOYALTY_POINT_RUPEE_VALUE: float = 1.0

    # Validity rule: Accumulated points valid for 2 years (730 days)
    LOYALTY_POINTS_EXPIRY_DAYS: int = 730

    class Config:
        env_file = ".env"
        extra = "allow"

settings = Settings()
