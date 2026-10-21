from typing import List, Optional, Dict, Any
from app.adapters import get_hubklub_adapter
from app.models.schemas import (
    CustomerProfile,
    HubklubMembershipStatus,
    HubklubBalance,
    HubklubAnnualBonusProgress,
    HubklubSummary,
    PointsTransaction,
    LoyaltyRedemptionRequest,
    LoyaltyRedemptionResponse,
)
from app.config import settings

class LoyaltyService:
    @property
    def adapter(self):
        return get_hubklub_adapter()

    def get_customer(self, customer_id: str) -> Optional[CustomerProfile]:
        return self.adapter.get_customer_profile(customer_id)

    def find_customer(self, query: str) -> Optional[CustomerProfile]:
        return self.adapter.find_customer(query)

    def get_membership(self, customer_id: str) -> HubklubMembershipStatus:
        return self.adapter.get_membership_status(customer_id)

    def enroll(self, customer_id: str) -> HubklubMembershipStatus:
        return self.adapter.enroll_customer(customer_id)

    def get_balance(self, customer_id: str) -> HubklubBalance:
        return self.adapter.get_points_balance(customer_id)

    def get_annual_bonus(self, customer_id: str) -> HubklubAnnualBonusProgress:
        return self.adapter.get_annual_bonus_progress(customer_id)

    def get_transactions(self, customer_id: str) -> List[PointsTransaction]:
        return self.adapter.get_transaction_history(customer_id)

    def get_summary(self, customer_id: str) -> HubklubSummary:
        membership = self.get_membership(customer_id)
        balance = self.get_balance(customer_id)
        annual_bonus = self.get_annual_bonus(customer_id)
        recent_txs = self.get_transactions(customer_id)[:10]

        return HubklubSummary(
            membership=membership,
            balance=balance,
            annual_bonus=annual_bonus,
            recent_transactions=recent_txs,
            active_rate_bands=settings.LOYALTY_RATE_BANDS,
            is_demo=True,
        )

    def calculate_points_for_spend(self, amount: float) -> int:
        return self.adapter.calculate_estimated_points_for_purchase(amount)

    def credit_points(self, customer_id: str, amount: float) -> PointsTransaction:
        import uuid
        order_id = f"DEMO-{uuid.uuid4().hex[:6].upper()}"
        return self.adapter.credit_earned_points(customer_id, amount, order_id)

    def redeem_points(self, request: LoyaltyRedemptionRequest) -> LoyaltyRedemptionResponse:
        return self.adapter.validate_and_redeem_points(request)

    def register_customer(
        self,
        first_name: str,
        last_name: str,
        email: str,
        phone: str,
        password: Optional[str] = None,
    ) -> CustomerProfile:
        return self.adapter.register_customer(first_name, last_name, email, phone, password)

loyalty_service = LoyaltyService()
