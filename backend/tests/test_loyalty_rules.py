from app.services.loyalty_service import loyalty_service
from app.config import settings

# Test Case 1: Customer who has not met the ₹1,000 eligibility requirement
def test_eligibility_not_met(client):
    headers = {"X-Customer-Id": "cust_ineligible"}
    res = client.get("/api/v1/loyalty/membership", headers=headers)
    assert res.status_code == 200
    data = res.json()
    assert data["is_member"] is False
    assert data["is_eligible"] is False
    assert data["max_single_purchase"] == 850.0
    assert data["eligibility_threshold"] == 1000.0
    assert data["progress_percent"] == 85.0
    assert "₹150 more needed" in data["eligibility_message"]

    # Attempting to enroll should be rejected
    enroll_res = client.post("/api/v1/loyalty/enrollment/demo", headers=headers)
    assert enroll_res.status_code == 400
    assert "not yet eligible" in enroll_res.json()["detail"].lower()

# Test Case 2: Customer who has met the eligibility requirement and can enroll
def test_eligibility_met_and_enrollment(client):
    headers = {"X-Customer-Id": "cust_eligible"}
    res = client.get("/api/v1/loyalty/membership", headers=headers)
    assert res.status_code == 200
    data = res.json()
    assert data["is_member"] is False
    assert data["is_eligible"] is True
    assert data["max_single_purchase"] >= 1000.0
    assert data["progress_percent"] == 100.0

    # Enroll in HUBKLUB
    enroll_res = client.post("/api/v1/loyalty/enrollment/demo", headers=headers)
    assert enroll_res.status_code == 200
    enrolled_data = enroll_res.json()
    assert enrolled_data["is_member"] is True
    assert enrolled_data["membership_number"] is not None

# Test Case 3: Points rate calculations at each published rate: 3%, 5%, 6%
def test_rate_bands_3_5_6_percent():
    # Band 1: Up to ₹20,000 -> 3%
    # e.g. ₹10,000 -> 300 points
    pts_tier1 = loyalty_service.calculate_points_for_spend(10000.0)
    assert pts_tier1 == 300

    # e.g. ₹15,195 (Prithvi Kurta) -> 456 points (round(15195 * 0.03))
    assert loyalty_service.calculate_points_for_spend(15195.0) == 456

    # Band 2: ₹20,001 to ₹50,000 -> 5%
    # e.g. ₹24,500 (Golden Horizon Bandi Set) -> 1225 points
    pts_tier2 = loyalty_service.calculate_points_for_spend(24500.0)
    assert pts_tier2 == 1225

    # Band 3: ₹50,001 and above -> 6%
    # e.g. ₹68,000 (Royal Ivory Sherwani) -> 4080 points
    pts_tier3 = loyalty_service.calculate_points_for_spend(68000.0)
    assert pts_tier3 == 4080

# Test Case 4: Customer below ₹1,00,000 annual spending threshold
def test_annual_bonus_below_threshold(client):
    headers = {"X-Customer-Id": "cust_below_bonus"}
    res = client.get("/api/v1/loyalty/summary", headers=headers)
    assert res.status_code == 200
    summary = res.json()
    bonus = summary["annual_bonus"]
    assert bonus["accumulated_spend_inr"] == 45000.0
    assert bonus["annual_threshold_inr"] == 100000.0
    assert bonus["progress_percent"] == 45.0
    assert bonus["bonus_achieved"] is False
    assert bonus["estimated_annual_bonus_points"] == int(round(1350 * 0.20))

# Test Case 5: Customer at or above ₹1,00,000 annual spending threshold (20% bonus)
def test_annual_bonus_achieved_20_percent(client):
    headers = {"X-Customer-Id": "cust_demo"}
    res = client.get("/api/v1/loyalty/summary", headers=headers)
    assert res.status_code == 200
    summary = res.json()
    bonus = summary["annual_bonus"]
    assert bonus["accumulated_spend_inr"] >= 100000.0
    assert bonus["bonus_achieved"] is True
    assert bonus["progress_percent"] == 100.0

# Test Case 6: 1 HUBKLUB Point = ₹1 redemption value
def test_redemption_rupee_equivalence(client):
    headers = {"X-Customer-Id": "cust_demo"}
    res = client.get("/api/v1/loyalty/balance", headers=headers)
    assert res.status_code == 200
    balance = res.json()
    assert balance["available_points"] > 0
    # Exactly 1 pt = ₹1
    assert balance["redemption_value_inr"] == float(balance["available_points"])

# Test Case 7: Customer attempting to redeem more points than available
def test_insufficient_points_rejection(client):
    headers = {"X-Customer-Id": "cust_demo"}
    balance_res = client.get("/api/v1/loyalty/balance", headers=headers)
    available = balance_res.json()["available_points"]

    excessive_req = {
        "customer_id": "cust_demo",
        "points_to_redeem": available + 5000,
        "idempotency_key": "red_excess_01",
    }
    res = client.post("/api/v1/loyalty/redemptions/demo", json=excessive_req, headers=headers)
    assert res.status_code == 400
    assert "insufficient" in res.json()["detail"].lower()

# Test Case 8: Points with different expiry dates (2-year validity)
def test_points_expiry_breakdown(client):
    headers = {"X-Customer-Id": "cust_demo"}
    res = client.get("/api/v1/loyalty/balance", headers=headers)
    assert res.status_code == 200
    balance = res.json()
    assert len(balance["points_batches"]) > 0
    # Has points expiring soon (within 60 days)
    assert balance["expiring_soon_points"] > 0
    assert balance["expiring_soon_date"] is not None

# Test Case 9: Duplicate redemption request protection via idempotency key
def test_duplicate_redemption_idempotency(client):
    headers = {"X-Customer-Id": "cust_demo"}
    idempotency_key = "red_idem_test_abc123"

    req = {
        "customer_id": "cust_demo",
        "points_to_redeem": 100,
        "idempotency_key": idempotency_key,
    }

    # First call - should succeed
    res1 = client.post("/api/v1/loyalty/redemptions/demo", json=req, headers=headers)
    assert res1.status_code == 200
    data1 = res1.json()
    assert data1["points_redeemed"] == 100
    assert data1["rupee_discount_applied"] == 100.0

    # Second call with the same idempotency key - must return duplicate cached result
    # rather than deducting points a second time!
    res2 = client.post("/api/v1/loyalty/redemptions/demo", json=req, headers=headers)
    assert res2.status_code == 200
    data2 = res2.json()
    assert data2["transaction_id"] == data1["transaction_id"]
    assert data2["remaining_points"] == data1["remaining_points"]
