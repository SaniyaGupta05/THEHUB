# The HUB — Shopping App with HUBKLUB Loyalty Membership

A production-oriented mobile shopping application for **The HUB** (`https://thehub.in/`), the premier luxury men's ethnic, bridal, and festive wear label in Vadodara, Gujarat. Inspired by modern high-end retail shopping experiences (such as Shoppers Stop), the application combines a modern mobile shopping journey with a dedicated **HUBKLUB** loyalty rewards program.

---

## 1. Project Overview & Features

### A. Mobile Shopping Experience
- **Bottom Navigation**: 5 main tabs — **Home**, **Categories**, **Wishlist**, **HUBKLUB**, and **Account**.
- **Header**: Luxury branding, quick search entry point, and cart bag icon with reactive item count badge.
- **Home**: Promotional banners, curated collection shortcuts (Bandi Sets, Kurtas, Sherwanis, Blazers, Silk), HUBKLUB teaser card, Featured Masterpieces, and New Arrivals.
- **Categories & Search**: Keyword search across titles, descriptions, and tags; category pills; price range filtering (<₹15k, ₹15k–₹30k, >₹30k); sorting (Price Low–High, High–Low, Rating, Newest).
- **Product Details**: Multi-image gallery, description, size pills with out-of-stock validation, quantity counter, wishlist toggle, and **real-time HUBKLUB points earning estimator**.
- **Shopping Bag & Cart**: Responsive item list, variant and color tags, quantity adjustments, item removal, complimentary express delivery threshold tracker (Free over ₹2,000), and loyalty discount deduction.
- **Demo Checkout**: Customer contact details, delivery address validation, points redemption toggle, order summary breakdown, and simulated order generation (`is_demo: true`).
- **Customer Account & Personas**: Profile information, saved addresses, order history with tracking status, and an interactive **Demo Persona Switcher** allowing instant testing from all 4 customer perspectives.

### B. HUBKLUB Loyalty Membership Module
- **Membership Eligibility**: Real-time progress bar tracking the published condition: **one-time single purchase of ₹1,000 or more**. Eligible customers can click to enroll immediately.
- **Configurable Earning Rates**:
  - Up to ₹20,000: **3% Points Back**
  - ₹20,001 to ₹50,000: **5% Points Back**
  - ₹50,001 and above: **6% Points Back**
  *(Rates and thresholds are configured in backend settings rather than hardcoded).*
- **Annual Milestone Bonus**: Progress tracking toward **₹1,00,000 accumulated annual spend**; upon completion, awards an **estimated 20% bonus** on all points earned during the year.
- **Redemption Value**: Displays **1 HUBKLUB Point = ₹1.00 redemption value** (e.g. 3,450 points = ₹3,450 discount).
- **Points Validity & Expiry**: 2-year validity (730 days) tracked at transaction level with **"Expiring Soon"** alerts for points within 60 days of expiry.
- **Interactive Points Redemption**: Modal with quick preset chips (100, 250, 500, 1000, 2000, Max), balance validation, duplicate-request protection via `idempotency_key`, and live ledger updates.

---

## 2. Architecture & Integration Design

```
+---------------------------------------------------------------------------------+
|                       MOBILE CLIENT (React Native / Expo)                       |
|   - Bottom Tabs: Home | Categories | Wishlist | HUBKLUB | Account               |
|   - Cart & Checkout UI   - Variant Selectors   - Loyalty Redemption Slider      |
+----------------------------------------+----------------------------------------+
                                         |  REST API (JSON)
                                         v
+---------------------------------------------------------------------------------+
|                        APP BACKEND (Python FastAPI)                             |
|   - Security Perimeter & Token Vault    - Idempotency Protection Engine         |
|   - Customer-level Data Isolation       - Configurable Loyalty Calculator       |
+---------------------+-----------------------------------+-----------------------+
                      |                                   |
                      v                                   v
+------------------------------------+   +----------------------------------------+
|          SHOPIFY ADAPTER           |   |            HUBKLUB ADAPTER             |
|  - MockShopifyAdapter (Active)     |   |  - MockHubklubAdapter (Active)         |
|  - LiveShopifyAdapter (Prepared)   |   |  - LiveHubklubAdapter (Prepared)       |
+------------------------------------+   +----------------------------------------+
```

### Domain Separation
- **Shopify**: Authoritative for product catalog, collections, variants, pricing, inventory availability, and order records.
- **HUBKLUB / Tally ERP**: Authoritative for membership tier, loyalty balance, transaction ledger, and redemption validation.
- **FastAPI Backend**: Orchestrates commerce and loyalty workflows, enforces customer data isolation, and **safeguards private tokens from ever leaking to the mobile client**.

---

## 3. Project Folder Structure

```
HubKlub/
├── backend/
│   ├── app/
│   │   ├── api/
│   │   │   └── v1/
│   │   │       ├── catalog.py          # Products, search, collections
│   │   │       ├── cart.py             # Cart items, quantity updates
│   │   │       ├── checkout.py         # Demo checkout & order creation
│   │   │       ├── customer.py         # Customer profile & isolated orders
│   │   │       └── loyalty.py          # HUBKLUB membership, balance, redemption
│   │   ├── adapters/
│   │   │   ├── shopify_base.py         # Abstract interface for Shopify
│   │   │   ├── mock_shopify.py         # Working mock adapter with sample catalog
│   │   │   ├── live_shopify.py         # Production Storefront API skeleton
│   │   │   ├── hubklub_base.py         # Abstract interface for HUBKLUB/Tally
│   │   │   ├── mock_hubklub.py         # Working loyalty adapter with business rules
│   │   │   └── live_hubklub.py         # Secure Tally ERP gateway skeleton
│   │   ├── data/
│   │   │   ├── sample_products.json    # Authentic The HUB products & variants
│   │   │   ├── sample_collections.json # Authentic categories (Bandi, Kurtas, etc.)
│   │   │   └── sample_loyalty_data.json# Pre-seeded test personas & transactions
│   │   ├── models/
│   │   │   └── schemas.py              # Pydantic schemas for all models
│   │   ├── services/
│   │   │   ├── catalog_service.py
│   │   │   ├── cart_service.py
│   │   │   ├── loyalty_service.py
│   │   │   └── order_service.py
│   │   ├── config.py                   # Configurable loyalty rates & settings
│   │   └── main.py                     # FastAPI app, CORS, OpenAPI & demo headers
│   ├── tests/
│   │   ├── conftest.py
│   │   ├── test_catalog.py             # Product search, filters, variants
│   │   ├── test_cart_checkout.py       # Cart operations & demo checkout
│   │   ├── test_loyalty_rules.py       # 10 specific project loyalty test cases
│   │   └── test_customer_isolation.py  # Multi-tenant data isolation & idempotency
│   └── requirements.txt
├── mobile/
│   ├── src/
│   │   ├── api/
│   │   │   └── client.ts               # API client with session customer headers
│   │   ├── components/
│   │   │   ├── Header.tsx              # Brand header with cart badge
│   │   │   ├── DemoBadge.tsx           # Subtle simulated mode indicator
│   │   │   ├── ProductCard.tsx         # Product card with formatted prices & tags
│   │   │   ├── BannerCarousel.tsx      # Promotional banners
│   │   │   ├── LoyaltyTierCard.tsx     # Gold metallic HUBKLUB card
│   │   │   └── PointsProgressBar.tsx   # Milestone progress bars
│   │   ├── constants/
│   │   │   ├── theme.ts                # The HUB color tokens (Obsidian, Gold, Ivory)
│   │   │   └── config.ts               # API endpoints & demo customer personas
│   │   ├── context/
│   │   │   ├── AuthContext.tsx         # Customer profile & persona switcher
│   │   │   ├── CartContext.tsx         # Shopping bag state & free shipping logic
│   │   │   └── WishlistContext.tsx     # Wishlist state & move-to-bag
│   │   ├── screens/
│   │   │   ├── HomeScreen.tsx
│   │   │   ├── CategoriesScreen.tsx
│   │   │   ├── ProductDetailModal.tsx
│   │   │   ├── WishlistScreen.tsx
│   │   │   ├── HubklubScreen.tsx       # Dedicated loyalty dashboard
│   │   │   ├── CartModal.tsx
│   │   │   ├── CheckoutModal.tsx
│   │   │   └── AccountScreen.tsx
│   │   └── types/
│   │       └── index.ts                # TypeScript interfaces
│   ├── App.tsx                         # 5-tab navigation shell
│   └── package.json
├── docs/
│   ├── ARCHITECTURE.md                 # Complete system design & data flow
│   ├── DEMO_MODE.md                    # Details of simulated services & personas
│   ├── SHOPIFY_INTEGRATION.md          # Storefront API & transition guide
│   ├── HUBKLUB_INTEGRATION.md          # Tally ERP gateway & rule confirmation questions
│   └── TESTING.md                      # Test suite documentation & actual results
├── .env.example
└── README.md
```

---

## 4. Installation & Run Commands (Windows PowerShell)

### Prerequisites
- Python 3.10+ (Tested on Python 3.14.7)
- Node.js v18+ (Tested on Node v24.21.0)
- npm 10+ (Tested on npm 11.19.0)

### 1. Setup & Run the FastAPI Backend
Open a PowerShell terminal:
```powershell
# Navigate to the backend directory
cd d:\website\HubKlub\backend

# Install backend dependencies
pip install -r requirements.txt

# Start the FastAPI server (runs on http://localhost:8000)
python -m uvicorn app.main:app --reload --port 8000
```
- Interactive API Documentation (Swagger UI): `http://localhost:8000/docs`
- Alternative Documentation (ReDoc): `http://localhost:8000/redoc`
- API Health Status: `http://localhost:8000/health`

### 2. Setup & Run the Mobile App (Expo)
Open a second PowerShell terminal:
```powershell
# Navigate to the mobile directory
cd d:\website\HubKlub\mobile

# Start Expo (Press 'w' in terminal for Web, or scan QR code with Expo Go on Android/iOS)
npx expo start -c
```

### 3. Setup & Run the Store POS Billing Counter & Admin Portal
Open a third PowerShell terminal in the workspace root:
```powershell
cd d:\website\HubKlub

# Launch the Shoppers Stop-Style POS Billing Counter & Staff Portal (runs on http://localhost:5173)
npm run admin
```
- **Store Billing Counter URL**: `http://localhost:5173`
- **Cashier Terminal Login**: `vadodara_staff` / `Staff@123`
- **Store Manager Login**: `admin` / `Admin@123`
npm run web
```

---

## 5. Automated Tests & Actual Results

Run the full automated test suite using pytest:
```powershell
python -m pytest backend\tests -v
```

### Actual Test Execution Output
```text
============================= test session starts =============================
platform win32 -- Python 3.14.7, pytest-9.1.1, pluggy-1.6.0
rootdir: D:\website\HubKlub
plugins: anyio-4.15.1, asyncio-1.4.0
collected 20 items

backend/tests/test_cart_checkout.py::test_cart_workflow PASSED           [  5%]
backend/tests/test_cart_checkout.py::test_demo_checkout_flow PASSED      [ 10%]
backend/tests/test_catalog.py::test_root_status PASSED                   [ 15%]
backend/tests/test_catalog.py::test_list_products PASSED                 [ 20%]
backend/tests/test_catalog.py::test_filter_products_by_category PASSED   [ 25%]
backend/tests/test_catalog.py::test_filter_products_by_price_range PASSED [ 30%]
backend/tests/test_catalog.py::test_search_products PASSED               [ 35%]
backend/tests/test_catalog.py::test_get_product_detail_and_variants PASSED [ 40%]
backend/tests/test_catalog.py::test_get_product_not_found PASSED         [ 45%]
backend/tests/test_catalog.py::test_list_collections PASSED              [ 50%]
backend/tests/test_customer_isolation.py::test_customer_data_isolation PASSED [ 55%]
backend/tests/test_loyalty_rules.py::test_eligibility_not_met PASSED     [ 60%]
backend/tests/test_loyalty_rules.py::test_eligibility_met_and_enrollment PASSED [ 65%]
backend/tests/test_loyalty_rules.py::test_rate_bands_3_5_6_percent PASSED [ 70%]
backend/tests/test_loyalty_rules.py::test_annual_bonus_below_threshold PASSED [ 75%]
backend/tests/test_loyalty_rules.py::test_annual_bonus_achieved_20_percent PASSED [ 80%]
backend/tests/test_loyalty_rules.py::test_redemption_rupee_equivalence PASSED [ 85%]
backend/tests/test_loyalty_rules.py::test_insufficient_points_rejection PASSED [ 90%]
backend/tests/test_loyalty_rules.py::test_points_expiry_breakdown PASSED [ 95%]
backend/tests/test_loyalty_rules.py::test_duplicate_redemption_idempotency PASSED [100%]

======================= 20 passed, 2 warnings in 0.13s ========================
```

---

## 6. Pre-configured Demo Customer Personas

The prototype includes 4 personas to test each requirement directly in the UI:

1. **Aarav Patel (`cust_demo`) — Active Gold Member**:
   - Lifetime spend ₹1.78L, annual spend current year ₹1.15L (has met ₹1 Lakh threshold).
   - Unlocked 20% Annual Bonus (+1,024 bonus points).
   - Available balance: 3,450 points = **₹3,450 redemption value**.
   - Contains points expiring within 30 days to test the validity breakdown.
2. **Rohan Shah (`cust_ineligible`) — Ineligible Customer**:
   - Single purchase ₹850 (< ₹1,000 threshold).
   - Eligibility tracker displays **85%** with a clear message: *"₹150 more needed"*.
   - Enrollment attempts are safely rejected.
3. **Vikram Mehta (`cust_eligible`) — Eligible Non-Member**:
   - Single purchase ₹15,195 ($\ge$ ₹1,000).
   - Eligibility tracker displays **100%**.
   - User can tap **"Enroll in HUBKLUB (Demo)"** to simulate instant membership activation.
4. **Dev Desai (`cust_below_bonus`) — Classic Member Below Milestone**:
   - Current year spend ₹45,000.
   - Milestone progress displays **45%** towards ₹1,00,000, with estimated bonus accurately calculated at 270 points.

Switch between personas at any time in the **Account** tab via **"Test Demo Customer Personas"**.

---

## 7. Known Limitations & Information Needed from The HUB Team

### Current Limitations of Demo Prototype
1. **Mock Commerce**: Products, collections, variants, and demo orders are managed in the mock adapter rather than live Shopify Storefront API.
2. **Mock Loyalty Ledger**: Points accrual, annual bonus calculations, and simulated redemptions operate in the mock adapter rather than authoritative Tally ERP.
3. **Demo Payments**: Checkout creates a simulated order without communicating with live payment gateways.

### Access & Information Needed from The HUB Team
1. **Shopify Storefront API Access**:
   - Storefront Access Token with `unauthenticated_read_product_listings`, `unauthenticated_read_product_inventory`, and `unauthenticated_write_checkouts`.
2. **Confirmation of HUBKLUB Business Rules**:
   - *Points Earning Basis*: Confirm whether 3%, 5%, and 6% rates apply per individual invoice or on cumulative member lifetime/annual spend.
   - *Annual Bonus Window*: Confirm whether the ₹1,00,000 year is defined as Financial Year (Apr–Mar), Calendar Year (Jan–Dec), or 365-day membership anniversary.
   - *Redemption Restrictions*: Confirm if there is a minimum points redemption threshold or maximum order percentage cap.
   - *Returns/Reversals*: Confirm policy for points debit when an item is returned or refunded.
3. **Tally ERP Connector Architecture**:
   - Specify whether the store utilizes an on-premise Tally connector, an official Tally cloud extension, or an intermediate ERP synchronization bridge.
#   T H E H U B  
 