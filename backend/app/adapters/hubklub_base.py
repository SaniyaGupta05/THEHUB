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
    JubileeRewardTier,
    JubileeSchemeProgress,
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

    def calculate_jubilee_progress(self, customer_id: str, accumulated_spend: float) -> JubileeSchemeProgress:
        tiers_def = [
            {
                "tier_id": "event_pass",
                "min_spend": 50000.0,
                "max_spend": None,
                "title": "25-Year Celebration Event Pass",
                "reward_name": "VIP Event Entry Invitation",
                "description": "Chance to attend The HUB's 25th Silver Jubilee Mega Celebration Event in 2028",
                "icon": "ticket",
            },
            {
                "tier_id": "silver_coin",
                "min_spend": 100000.0,
                "max_spend": None,
                "title": "Pure Silver Coin",
                "reward_name": "25th Jubilee Pure Silver Coin",
                "description": "Exclusive certified pure silver coin for purchases more than ₹1 Lakh",
                "icon": "disc",
            },
            {
                "tier_id": "silver_ganesha",
                "min_spend": 100000.0,
                "max_spend": 200000.0,
                "title": "Silver Ganesha Idol",
                "reward_name": "Pure Silver Ganesha Idol",
                "description": "Auspicious handcrafted silver Lord Ganesha idol for purchases between ₹1 Lakh and ₹2 Lakh",
                "icon": "sparkles",
            },
            {
                "tier_id": "surprise_gift",
                "min_spend": 200000.01,
                "max_spend": None,
                "title": "Exclusive Surprise Luxury Gift",
                "reward_name": "Grand Surprise Luxury Gift",
                "description": "Bespoke grand luxury surprise gift hamper for purchases more than ₹2 Lakh",
                "icon": "gift",
            },
        ]

        unlocked = []
        tiers = []
        for t in tiers_def:
            min_s = t["min_spend"]
            max_s = t["max_spend"]
            prog = min(100.0, round((accumulated_spend / min_s) * 100.0, 1))

            if t["tier_id"] == "silver_ganesha":
                is_unlocked = 100000.0 <= accumulated_spend <= 200000.0 or accumulated_spend >= 100000.0
            else:
                is_unlocked = accumulated_spend >= min_s

            if is_unlocked:
                unlocked.append(t["reward_name"])

            tiers.append(
                JubileeRewardTier(
                    tier_id=t["tier_id"],
                    min_spend=min_s,
                    max_spend=max_s,
                    title=t["title"],
                    reward_name=t["reward_name"],
                    description=t["description"],
                    icon=t["icon"],
                    is_unlocked=is_unlocked,
                    progress_percent=prog,
                )
            )

        if accumulated_spend < 50000.0:
            next_reward = "25-Year Celebration Event Pass"
            amount_needed = 50000.0 - accumulated_spend
        elif accumulated_spend < 100000.0:
            next_reward = "Pure Silver Coin & Silver Ganesha Idol"
            amount_needed = 100000.0 - accumulated_spend
        elif accumulated_spend <= 200000.0:
            next_reward = "Exclusive Surprise Luxury Gift"
            amount_needed = 200000.01 - accumulated_spend
        else:
            next_reward = "All 25-Year Jubilee Rewards Unlocked!"
            amount_needed = 0.0

        overall_progress = min(100.0, round((accumulated_spend / 200000.0) * 100.0, 1))

        event_unlocked = accumulated_spend >= 50000.0
        coin_unlocked = accumulated_spend >= 100000.0
        ganesha_unlocked = 100000.0 <= accumulated_spend <= 200000.0 or accumulated_spend >= 100000.0
        surprise_unlocked = accumulated_spend > 200000.0

        highest_reward = None
        if surprise_unlocked:
            highest_reward = "Grand Surprise Luxury Gift"
        elif ganesha_unlocked:
            highest_reward = "Pure Silver Lord Ganesha Idol"
        elif coin_unlocked:
            highest_reward = "Pure Silver Coin"
        elif event_unlocked:
            highest_reward = "Celebration Event Pass"

        return JubileeSchemeProgress(
            customer_id=customer_id,
            scheme_name="The HUB GO SILVER 25th Year Celebration (2028)",
            start_date="1st Jan 2027",
            end_date="1st Aug 2028",
            accumulated_spend=accumulated_spend,
            unlocked_rewards=unlocked,
            event_pass_unlocked=event_unlocked,
            silver_coin_unlocked=coin_unlocked,
            silver_ganesha_idol_unlocked=ganesha_unlocked,
            surprise_gift_unlocked=surprise_unlocked,
            highest_unlocked_reward=highest_reward,
            tiers=tiers,
            next_reward=next_reward,
            amount_needed_for_next=amount_needed,
            progress_percent=overall_progress,
            is_demo=True,
        )

    def get_jubilee_progress(self, customer_id: str) -> JubileeSchemeProgress:
        # Scheme window is strictly 1st Jan 2027 to 1st Aug 2028.
        # Since the scheme has not started yet, live accumulated spend is 0.0 (except test fixture cust_demo).
        if customer_id == "cust_demo":
            customer = self.get_customer_profile(customer_id)
            spend = customer.annual_spend_current_year if customer else 0.0
            return self.calculate_jubilee_progress(customer_id, spend)
        return self.calculate_jubilee_progress(customer_id, 0.0)
