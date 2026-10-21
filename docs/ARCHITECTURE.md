# System Architecture: The HUB & HUBKLUB Shopping App

## 1. Architectural Philosophy & Domain Separation

The application architecture strictly enforces separation of concerns across three core domains:

```
+------------------------------------------------------------------------------+
|                        MOBILE CLIENT (React Native / Expo)                   |
|  - Bottom Tabs: Home | Categories | Wishlist | HUBKLUB | Account             |
|  - Cart & Checkout UI  - Variant Selectors  - Loyalty Redemption Slider      |
+---------------------------------------+--------------------------------------+
                                        |  REST API (JSON)
                                        v
+------------------------------------------------------------------------------+
|                       APP BACKEND (Python FastAPI)                           |
|  - Security Perimeter & Token Vault   - Idempotency Engine                   |
|  - Data Isolation Middleware          - Configurable Loyalty Calculator      |
+---------------------+----------------------------------+---------------------+
                      |                                  |
                      v                                  v
+-----------------------------------+  +---------------------------------------+
|         SHOPIFY ADAPTER           |  |           HUBKLUB ADAPTER             |
| - Catalogue, Products, Variants   |  | - Official Membership Status          |
| - Collections, Prices, Media      |  | - Authoritative Points Balance        |
| - Cart Management & Orders        |  | - Transaction Ledger & 2-Yr Expiry    |
| - Live Storefront API / Mock      |  | - Tally Connector / Gateway / Mock    |
+-----------------------------------+  +---------------------------------------+
```

### Domain Boundaries

1. **Commerce Domain (Shopify)**:
   - Source of truth for product catalog, categories, inventory availability, variant pricing, order records, and fulfillment status.
   - Handles public product metadata and checkout pipelines.

2. **Loyalty & Membership Domain (HUBKLUB / Tally ERP)**:
   - Source of truth for customer membership tier, points balance, points earn rates, annual bonuses, ledger transactions, and point redemption authorization.
   - Authoritative for points validity (2-year lifespan).

3. **Application Orchestration Layer (FastAPI Backend)**:
   - Serves as the secure mediator between the mobile app and third-party systems.
   - **Never exposes secrets to the mobile client**: Shopify Admin API secrets, Storefront private tokens, and Tally internal endpoints remain strictly contained within the backend.
   - Provides unified error handling, customer-level data isolation, and idempotency tracking.

---

## 2. Adapter Pattern Design

Both external integrations are structured around clean abstract interfaces:

### Shopify Adapter (`app/adapters/shopify_base.py`)
- `MockShopifyAdapter`: Supplies authentic products and collections derived from The HUB's live website (`thehub.in`), manages in-memory demo carts, and generates simulated orders tagged with `is_demo = True`.
- `LiveShopifyAdapter`: Implements the same interface for Shopify Storefront GraphQL API. When credentials are not yet configured, it fails gracefully with operational guidance without crashing the application.

### HUBKLUB Adapter (`app/adapters/hubklub_base.py`)
- `MockHubklubAdapter`: Implements the verified business rules:
  - ₹1,000 single purchase eligibility threshold.
  - 3%, 5%, and 6% points earning bands.
  - ₹1,00,000 annual spend bonus (20% bonus points).
  - 1 Point = ₹1 redemption value.
  - 2-year expiration tracking.
  - Idempotency key protection against duplicate redemptions.
- `LiveHubklubAdapter`: Skeleton for the future secure Tally connector or middleware microservice. Tally ERP is never exposed directly to the public Internet.

---

## 3. Security Perimeter & Data Isolation

- **Client Isolation**: All customer endpoints (`/api/v1/me`, `/api/v1/orders`, `/api/v1/loyalty/*`) require customer context (`X-Customer-Id` header or authenticated JWT in live mode).
- **Access Violation Rejection**: The backend explicitly prevents Customer A from querying or redeeming orders/points belonging to Customer B (verified by automated tests).
- **Idempotency Protection**: Every redemption request requires a unique `idempotency_key`. If duplicate network calls occur, the system replays the cached transaction rather than debiting points twice.

---

## 4. Mobile Client Architecture

- **Framework**: React Native 0.83 / Expo SDK 55, TypeScript, Expo Router.
- **Styling**: Tailored design system reflecting The HUB's brand identity (Ivory Cream `#FAFAF7`, Obsidian Charcoal `#111111`, Antique Brass/Gold `#C5A059`, and Crisp White `#FFFFFF`).
- **State Management**:
  - `CartContext`: Local responsive cart with quantity adjustments, free shipping badges, and variant checks.
  - `WishlistContext`: Saved items with add-to-cart migration.
  - `AuthContext`: Demo customer switching (Demo Aarav, Ineligible Rohan, Eligible Vikram, Below-Bonus Dev) allowing instant manual testing of all loyalty criteria.
