# Test Case 10: Customer attempting to access another customer's data
def test_customer_data_isolation(client):
    # Customer A: cust_demo
    # Customer B: cust_ineligible

    headers_a = {"X-Customer-Id": "cust_demo"}
    headers_b = {"X-Customer-Id": "cust_ineligible"}

    # Fetch profile as Customer A
    profile_a = client.get("/api/v1/me", headers=headers_a).json()
    assert profile_a["id"] == "cust_demo"
    assert profile_a["email"] == "aarav.patel@example.com"

    # Fetch profile as Customer B
    profile_b = client.get("/api/v1/me", headers=headers_b).json()
    assert profile_b["id"] == "cust_ineligible"
    assert profile_b["email"] == "rohan.shah@example.com"

    # Orders isolation
    orders_a = client.get("/api/v1/orders", headers=headers_a).json()
    for ord_item in orders_a:
        assert ord_item["customer_id"] == "cust_demo"

    # Customer B trying to fetch Customer A's order by ID must be rejected (404/Not Found)
    if orders_a:
        order_id_a = orders_a[0]["id"]
        res_cross = client.get(f"/api/v1/orders/{order_id_a}", headers=headers_b)
        assert res_cross.status_code == 404
        assert "not found or access denied" in res_cross.json()["detail"].lower()

    # Cross-customer idempotency key hijacking test:
    # A redemption with customer A's key attempted by customer B must be forbidden (403)
    idem_key = "cross_cust_key_99"
    req_a = {
        "customer_id": "cust_demo",
        "points_to_redeem": 50,
        "idempotency_key": idem_key,
    }
    client.post("/api/v1/loyalty/redemptions/demo", json=req_a, headers=headers_a)

    req_b = {
        "customer_id": "cust_ineligible",
        "points_to_redeem": 50,
        "idempotency_key": idem_key,
    }
    res_b = client.post("/api/v1/loyalty/redemptions/demo", json=req_b, headers=headers_b)
    assert res_b.status_code == 403
    assert "access violation" in res_b.json()["detail"].lower()
