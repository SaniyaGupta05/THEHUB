# HUBKLUB / Tally ERP Loyalty Integration Guide

## 1. System Responsibility & Source of Truth

The existing HUBKLUB system (powered by the Tally ERP extension) is the **authoritative source of truth** for:
- Official customer membership status and enrollment records.
- Authoritative points balance.
- Point transactions and redemption validations.
- Expiration and annual bonus allocation.

The mobile app and FastAPI backend do not maintain independent ledger balances in production; they query and post transactions to HUBKLUB via the `HubklubAdapter`.

---

## 2. Business Rules & Ambiguities Requiring Confirmation

During prototype implementation, specific ambiguities were identified in the published promotional material. These have been made configurable in `backend/app/config.py` and require official sign-off from The HUB management:

### 1. Points Earning Calculation Basis
- **Published Rule**:
  - Up to ₹20,000 -> 3%
  - ₹20,001 to ₹50,000 -> 5%
  - ₹50,001 and above -> 6%
- **Ambiguity**: Does the rate apply to **each individual invoice/purchase**, or does it depend on the customer's **cumulative lifetime or annual spend tier**?
- **Current Prototype Behavior**: Implemented per invoice purchase amount (e.g., an invoice of ₹24,500 earns 5% = 1,225 pts; an invoice of ₹68,000 earns 6% = 4,080 pts).
- **Action Required**: Confirm whether a member who has spent > ₹50,000 in aggregate earns 6% on subsequent ₹5,000 purchases, or if each bill is tiered individually.

### 2. Definition of "Year" for the ₹1,00,000 Annual Bonus
- **Published Rule**: Accumulated purchases $\ge$ ₹1,00,000 in a year receive a 20% bonus of total points earned during that year.
- **Ambiguity**: Does "year" refer to:
  1. The Indian Financial Year (April 1 to March 31)?
  2. The Calendar Year (January 1 to December 31)?
  3. The 365-day rolling period from the member's initial enrollment date?
- **Current Prototype Behavior**: Defaults to the Calendar Year.
- **Action Required**: Confirm the exact fiscal/membership year window.

### 3. Order Returns and Cancellations
- **Ambiguity**: How does Tally adjust loyalty balances if an item is returned or cancelled?
- **Recommendation**: Adapter supports `reversal` and `adjustment` transaction types with audit references to original order numbers.

### 4. Redemption Restrictions
- **Published Rule**: 1 HUBKLUB point = ₹1 redemption value.
- **Ambiguity**: Is there a minimum redemption threshold (e.g. minimum 500 points)? Is there a maximum cap per order (e.g., up to 30% of order value)? Can points be redeemed on already discounted or end-of-season sale items?
- **Current Prototype Behavior**: Permits full balance redemption against subtotal.
- **Action Required**: Provide redemption limit rules for POS and digital checkout.

---

## 3. Tally ERP Secure Architecture

```
+------------------+         HTTPS / mTLS          +-----------------------+
|  FastAPI Backend | ----------------------------> |  Tally Cloud Gateway  |
|  (Cloud Hosted)  |  (API Key + Idempotency Key)  |  (Secure Bridge)      |
+------------------+                               +-----------+-----------+
                                                               | LAN / VPN
                                                               v
                                                   +-----------------------+
                                                   |   TallyPrime Server   |
                                                   |   (Store / Office)    |
                                                   +-----------------------+
```

### Critical Security Constraints
1. **Never expose Tally directly to the public Internet**: Tally XML/ODBC servers lack native DDoS, rate-limiting, and modern token-based auth defenses.
2. **Use an API Gateway / Bridge**: Deploy a secure lightweight agent on the local network that polls or exposes a secured mTLS webhook to the backend.
3. **Idempotency Keys**: All point debit requests must transmit a unique UUID `idempotency_key` so network timeouts or retries never result in duplicate point deductions.
