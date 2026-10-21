from abc import ABC, abstractmethod
from typing import List, Optional, Dict, Any
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

class HubklubAdapterBase(ABC):
    """
    Abstract interface for HUBKLUB / Tally ERP loyalty operations.
    The existing HUBKLUB/Tally system is the authoritative source of truth for
    membership status, balances, and redemption validation.
    """

    @abstractmethod
    def is_live(self) -> bool:
        """Returns True if connected to live Tally/HUBKLUB integration, False if mock."""
        pass

    @abstractmethod
    def get_customer_profile(self, customer_id: str) -> Optional[CustomerProfile]:
        """Fetch customer profile data."""
        pass

    @abstractmethod
    def get_membership_status(self, customer_id: str) -> HubklubMembershipStatus:
        """Check customer eligibility against ₹1,000 threshold and membership standing."""
        pass

    @abstractmethod
    def enroll_customer(self, customer_id: str) -> HubklubMembershipStatus:
        """Enroll eligible customer into HUBKLUB loyalty program."""
        pass

    @abstractmethod
    def get_points_balance(self, customer_id: str) -> HubklubBalance:
        """Fetch available loyalty points balance and rupee equivalence (1 pt = ₹1)."""
        pass

    @abstractmethod
    def get_annual_bonus_progress(self, customer_id: str) -> HubklubAnnualBonusProgress:
        """Calculate progress towards ₹1,00,000 annual spend and 20% bonus points."""
        pass

    @abstractmethod
    def get_transaction_history(self, customer_id: str) -> List[PointsTransaction]:
        """Fetch full points earning, redemption, and expiry history."""
        pass

    @abstractmethod
    def calculate_estimated_points_for_purchase(self, purchase_amount: float) -> int:
        """Calculate estimated points earned on a purchase based on configured rate bands."""
        pass

    @abstractmethod
    def validate_and_redeem_points(
        self, request: LoyaltyRedemptionRequest
    ) -> LoyaltyRedemptionResponse:
        """
        Validate balance, check duplicate request via idempotency key,
        and execute redemption.
        """
        pass

    @abstractmethod
    def credit_earned_points(
        self, customer_id: str, purchase_amount: float, order_id: str
    ) -> PointsTransaction:
        """Simulate crediting loyalty points upon order creation."""
        pass

    def find_customer(self, query: str) -> Optional[CustomerProfile]:
        """Search customer by phone, ID, name, or email."""
        return None

    def register_customer(
        self,
        first_name: str,
        last_name: str,
        email: str,
        phone: str,
        password: Optional[str] = None,
    ) -> CustomerProfile:
        """Register a new customer account."""
        raise NotImplementedError
