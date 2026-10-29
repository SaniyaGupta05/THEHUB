from typing import List, Optional
from app.adapters.hubklub_base import HubklubAdapterBase
from app.models.schemas import (
    CustomerProfile,
    HubklubMembershipStatus,
    HubklubBalance,
    HubklubAnnualBonusProgress,
    PointsTransaction,
    LoyaltyRedemptionRequest,
    LoyaltyRedemptionResponse,
)
from app.config import settings

class LiveHubklubAdapter(HubklubAdapterBase):
    """
    Prepared live HUBKLUB / Tally connector adapter.
    Tally ERP operates locally or via secured middleware/gateway.
    This adapter protects the ERP by enforcing:
    1. Authorized mutual TLS / Gateway API key.
    2. Non-exposure of Tally internal endpoints directly to the mobile app.
    3. Safe idempotency and audit logs.
    """

    def __init__(self):
        self.endpoint = settings.HUBKLUB_TALLY_ENDPOINT
        self.api_key = settings.HUBKLUB_TALLY_API_KEY

    def is_live(self) -> bool:
        return bool(self.endpoint and self.api_key)

    def _ensure_configured(self):
        if not self.is_live():
            raise NotImplementedError(
                "Live Tally/HUBKLUB integration is not configured. "
                "Ensure HUBKLUB_TALLY_ENDPOINT and HUBKLUB_TALLY_API_KEY are configured in backend environment."
            )

    def get_customer_profile(self, customer_id: str) -> Optional[CustomerProfile]:
        self._ensure_configured()
        return None

    def get_membership_status(self, customer_id: str) -> HubklubMembershipStatus:
        self._ensure_configured()
        raise NotImplementedError()

    def enroll_customer(self, customer_id: str) -> HubklubMembershipStatus:
        self._ensure_configured()
        raise NotImplementedError()

    def get_points_balance(self, customer_id: str) -> HubklubBalance:
        self._ensure_configured()
        raise NotImplementedError()

    def get_annual_bonus_progress(self, customer_id: str) -> HubklubAnnualBonusProgress:
        self._ensure_configured()
        raise NotImplementedError()

    def get_transaction_history(self, customer_id: str) -> List[PointsTransaction]:
        self._ensure_configured()
        return []

    def calculate_estimated_points_for_purchase(self, purchase_amount: float) -> int:
        if purchase_amount <= 0:
            return 0
        if purchase_amount <= 20000.0:
            return int(round(purchase_amount * 0.03))
        elif purchase_amount <= 50000.0:
            return int(round(purchase_amount * 0.05))
        else:
            return int(round(purchase_amount * 0.06))

    def validate_and_redeem_points(
        self, request: LoyaltyRedemptionRequest
    ) -> LoyaltyRedemptionResponse:
        self._ensure_configured()
        raise NotImplementedError("Live redemption must call authoritative Tally loyalty gateway.")

    def credit_earned_points(
        self, customer_id: str, purchase_amount: float, order_id: str
    ) -> PointsTransaction:
        self._ensure_configured()
        raise NotImplementedError()
