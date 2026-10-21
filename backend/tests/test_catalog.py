def test_root_status(client):
    response = client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "online"
    assert data["demo_mode"] is True
    assert response.headers["X-TheHub-Demo-Mode"] == "true"

def test_list_products(client):
    response = client.get("/api/v1/products")
    assert response.status_code == 200
    products = response.json()
    assert len(products) > 0
    # Verify product properties
    p = products[0]
    assert "id" in p
    assert "title" in p
    assert "price" in p
    assert "variants" in p
    assert len(p["variants"]) > 0

def test_filter_products_by_category(client):
    response = client.get("/api/v1/products?category=Bandi")
    assert response.status_code == 200
    products = response.json()
    assert len(products) > 0
    for p in products:
        assert "bandi" in p["category"].lower()

def test_filter_products_by_price_range(client):
    response = client.get("/api/v1/products?min_price=10000&max_price=20000")
    assert response.status_code == 200
    products = response.json()
    for p in products:
        assert 10000 <= p["price"] <= 20000

def test_search_products(client):
    response = client.get("/api/v1/search?q=kalamkari")
    assert response.status_code == 200
    products = response.json()
    assert len(products) > 0
    assert any("kalamkari" in p["title"].lower() or "kalamkari" in p["description"].lower() for p in products)

def test_get_product_detail_and_variants(client):
    response = client.get("/api/v1/products/prod_1")
    assert response.status_code == 200
    product = response.json()
    assert product["id"] == "prod_1"
    assert product["title"] == "Prithvi Patchwork Mirror Kurta"
    assert len(product["variants"]) >= 3
    # Check out-of-stock variant handling
    xl_variant = next((v for v in product["variants"] if "XL" in v["size"]), None)
    assert xl_variant is not None
    assert xl_variant["available"] is False

def test_get_product_not_found(client):
    response = client.get("/api/v1/products/non_existent_id")
    assert response.status_code == 404

def test_list_collections(client):
    response = client.get("/api/v1/collections")
    assert response.status_code == 200
    collections = response.json()
    assert len(collections) >= 4
    handles = [c["handle"] for c in collections]
    assert "bandi-set" in handles
