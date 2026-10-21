# Testing & Verification Guide

## 1. Automated Test Suite

The backend contains a full suite of automated tests using `pytest` and `fastapi.testclient.TestClient`.

### Test Execution Command
Run the test suite from PowerShell:
```powershell
python -m pytest backend\tests -v
```

---

## 2. Test Coverage & Specification Mapping

The test suite explicitly tests all 10 scenarios required by Section 11 of the project brief:

| # | Test Scenario Required | Test File & Function | Verification Performed | Status |
|---|------------------------|----------------------|------------------------|--------|
| 1 | Customer below ₹1,000 threshold | `test_loyalty_rules.py::test_eligibility_not_met` | Verifies `is_eligible=False`, progress calculation (85%), and rejection of enrollment with 400. | PASSED |
| 2 | Customer meeting ₹1,000 threshold | `test_loyalty_rules.py::test_eligibility_met_and_enrollment` | Verifies `is_eligible=True`, progress (100%), and successful enrollment into HUBKLUB with membership ID. | PASSED |
| 3 | Points earning at 3%, 5%, 6% | `test_loyalty_rules.py::test_rate_bands_3_5_6_percent` | Verifies ₹10,000 -> 300 pts (3%), ₹24,500 -> 1,225 pts (5%), ₹68,000 -> 4,080 pts (6%). | PASSED |
| 4 | Annual spend below ₹1,00,000 | `test_loyalty_rules.py::test_annual_bonus_below_threshold` | Verifies ₹45,000 spend -> 45% progress towards milestone, bonus not yet achieved. | PASSED |
| 5 | Annual spend at/above ₹1,00,000 | `test_loyalty_rules.py::test_annual_bonus_achieved_20_percent` | Verifies ₹1,15,595 spend -> 100% progress, bonus achieved flag set, 20% bonus points calculated. | PASSED |
| 6 | Points redemption value (1 pt = ₹1) | `test_loyalty_rules.py::test_redemption_rupee_equivalence` | Verifies available points convert 1:1 to rupee redemption equivalent. | PASSED |
| 7 | Insufficient points redemption | `test_loyalty_rules.py::test_insufficient_points_rejection` | Requests balance + 5,000 points; verifies 400 rejection and balance preservation. | PASSED |
| 8 | Points expiry (2-year validity) | `test_loyalty_rules.py::test_points_expiry_breakdown` | Verifies batches have transaction-level expiry dates and expiring soon alerts (<60 days). | PASSED |
| 9 | Duplicate redemption protection | `test_loyalty_rules.py::test_duplicate_redemption_idempotency` | Sends identical idempotency key twice; verifies second call returns cached transaction without duplicate debit. | PASSED |
| 10 | Customer data isolation | `test_customer_isolation.py::test_customer_data_isolation` | Verifies Customer B cannot access Customer A's orders, profile, or hijack idempotency keys. | PASSED |

### Additional Functional Tests
- `test_cart_checkout.py::test_cart_workflow`: Adding items, out-of-stock variant validation, quantity update, shipping calculation, item removal.
- `test_cart_checkout.py::test_demo_checkout_flow`: Demo checkout creating a simulated order with address, items, subtotal, and cart clearing.
- `test_catalog.py`: Catalogue listing, filtering by category, filtering by price range, keyword search, product details, out-of-stock indicators, collection lists.

---

## 3. Actual Test Results Output

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
