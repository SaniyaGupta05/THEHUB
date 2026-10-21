def test_cart_workflow(client):
    headers = {"X-Customer-Id": "cust_test_cart"}

    # 1. Cart should start empty
    res = client.get("/api/v1/cart", headers=headers)
    assert res.status_code == 200
    cart = res.json()
    assert cart["subtotal"] == 0.0
    assert len(cart["items"]) == 0

    # 2. Add an available item (Prithvi Kurta Medium - ₹15,195)
    add_payload = {
        "product_id": "prod_1",
        "variant_id": "var_1_m",
        "quantity": 1,
    }
    res = client.post("/api/v1/cart/items", json=add_payload, headers=headers)
    assert res.status_code == 200
    cart = res.json()
    assert len(cart["items"]) == 1
    assert cart["subtotal"] == 15195.0
    assert cart["shipping_fee"] == 0.0  # Orders > ₹2,000 get free shipping
    assert cart["total"] == 15195.0
    assert cart["items"][0]["size"] == "40 (M)"

    # 3. Add out-of-stock variant should fail with 400
    oos_payload = {
        "product_id": "prod_1",
        "variant_id": "var_1_xl",  # Marked available: false
        "quantity": 1,
    }
    res = client.post("/api/v1/cart/items", json=oos_payload, headers=headers)
    assert res.status_code == 400
    assert "out of stock" in res.json()["detail"].lower()

    # 4. Update quantity
    item_id = cart["items"][0]["id"]
    res = client.patch(f"/api/v1/cart/items/{item_id}", json={"quantity": 2}, headers=headers)
    assert res.status_code == 200
    cart = res.json()
    assert cart["items"][0]["quantity"] == 2
    assert cart["subtotal"] == 15195.0 * 2

    # 5. Remove item
    res = client.delete(f"/api/v1/cart/items/{item_id}", headers=headers)
    assert res.status_code == 200
    cart = res.json()
    assert len(cart["items"]) == 0
    assert cart["subtotal"] == 0.0

def test_demo_checkout_flow(client):
    headers = {"X-Customer-Id": "cust_test_checkout"}

    # Add item to cart first
    client.post(
        "/api/v1/cart/items",
        json={"product_id": "prod_2", "variant_id": "var_2_m", "quantity": 1},
        headers=headers,
    )

    # Checkout request
    checkout_payload = {
        "customer_id": "cust_test_checkout",
        "shipping_address": {
            "full_name": "Test Customer",
            "phone": "+91 99999 11111",
            "street": "100 Palace Road",
            "city": "Vadodara",
            "state": "Gujarat",
            "pincode": "390001",
            "country": "India",
        },
        "points_to_redeem": 0,
        "idempotency_key": "chk_demo_key_99",
    }

    res = client.post("/api/v1/checkout/demo", json=checkout_payload, headers=headers)
    assert res.status_code == 200
    order = res.json()
    assert order["is_demo"] is True
    assert "Confirmed" in order["status"]
    assert order["customer_id"] == "cust_test_checkout"
    assert order["total_amount"] == 12850.0
    assert len(order["items"]) == 1

    # Cart should now be empty after checkout
    cart_res = client.get("/api/v1/cart", headers=headers)
    assert len(cart_res.json()["items"]) == 0
