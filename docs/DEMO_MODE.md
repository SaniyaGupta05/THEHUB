# Demo Mode & Simulated Services Documentation

## 1. Overview

Because live Shopify Storefront API keys, Tally extension access, and production payment gateways are currently unconfigured, the application operates in **Demo Mode**. 

Demo Mode provides a 100% functional, end-to-end shopping and loyalty experience without communicating with external paid systems.

### Core Guarantees of Demo Mode
1. **Clear UI Attribution**: Every demo cart, order, points balance, and loyalty transaction is visibly marked with a **"Demo / Sample"** badge.
2. **No False Claims**: The application does not pretend that payments have processed or that points are credited in live Tally.
3. **No Credential Leaks**: Live credentials are not stubbed into client code.
4. **Idempotency & Isolation**: Even in mock mode, business rules (idempotency, duplicate protection, data isolation between customers) are strictly enforced and verified by automated tests.

---

## 2. Configured Test Accounts

The mock dataset contains four pre-configured customer accounts representing each critical loyalty milestone:

| Customer ID | Name | Role & Scenario | Key Verification Criteria |
|-------------|------|-----------------|---------------------------|
| `cust_demo` | Aarav Patel | Active Gold Member (₹1.15L annual spend) | Has surpassed ₹1,00,000 annual spend; awarded 20% bonus points; has points available for redemption (1 pt = ₹1) and points expiring soon. |
| `cust_ineligible` | Rohan Shah | Ineligible Customer (Only ₹850 single purchase) | Has single purchase ₹850 (< ₹1,000 threshold); progress bar shows 85%; enrollment endpoint returns 400 with specific shortfall message. |
| `cust_eligible` | Vikram Mehta | Eligible Non-Member (₹15,195 single purchase) | Single purchase exceeds ₹1,000 threshold; progress bar shows 100%; can click "Enroll in HUBKLUB" to activate membership. |
| `cust_below_bonus` | Dev Desai | Active Classic Member (₹45,000 annual spend) | Below ₹1,00,000 threshold; progress bar shows 45%; estimated bonus calculates correctly at 20% of current year earnings upon milestone completion. |

In the mobile app's **Account** tab, users can tap **"Switch Demo Profile"** to instantly test the app from any of these customer perspectives.

---

## 3. Configured Loyalty Business Rules

All rates and thresholds are managed via backend configuration (`app/config.py`) rather than hardcoded:

1. **Eligibility Threshold**:
   - Condition: Single purchase $\ge$ ₹1,000.
2. **Earning Rate Bands**:
   - Up to ₹20,000: 3%
   - ₹20,001 to ₹50,000: 5%
   - ₹50,001 and above: 6%
3. **Annual Milestone Bonus**:
   - Condition: Annual accumulated spend in current year $\ge$ ₹1,00,000.
   - Reward: 20% bonus of total points earned in that year.
4. **Redemption Value**:
   - Rate: 1 HUBKLUB Point = ₹1.00.
5. **Validity**:
   - Points valid for 2 years (730 days) from transaction timestamp.

---

## 4. Header Indicators

Every HTTP response sent by the backend includes the following custom diagnostic headers:
```http
X-TheHub-Demo-Mode: true
X-TheHub-Shopify-Adapter: mock
X-TheHub-Loyalty-Adapter: mock
```
This enables both frontend clients and auditing tools to programmatically identify simulation boundaries.
