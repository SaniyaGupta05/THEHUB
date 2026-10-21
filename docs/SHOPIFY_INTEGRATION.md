# Shopify Integration Guide

## 1. Integration Scope

Shopify serves as the commerce backend for The HUB (`https://thehub.in/`, Store domain: `3tmnjg-dw.myshopify.com`).

The integration encompasses:
- Catalogue browsing (products, collections, tags, vendor).
- Variant specifications (sizes: 38/S, 40/M, 42/L, 44/XL; colors; inventory status).
- Media galleries (Shopify CDN webp/jpg images).
- Cart creation and line item mutations.
- Customer authentication via Shopify Customer Account API.
- Checkout redirection to Shopify's secure, PCI-compliant hosted checkout.

---

## 2. Transitioning from Mock to Live Mode

The application uses an adapter pattern that allows switching to live Shopify without modifying frontend screens or core services.

### Step 1: Obtain Shopify API Credentials
From the Shopify Partner / Store Admin dashboard:
1. Navigate to **Settings > Apps and sales channels > Develop apps**.
2. Create a custom private app named **The HUB Mobile Backend**.
3. Enable **Storefront API permissions**:
   - `unauthenticated_read_product_listings`
   - `unauthenticated_read_product_inventory`
   - `unauthenticated_write_checkouts`
   - `unauthenticated_write_customers`
4. Copy the generated **Storefront Access Token**.

### Step 2: Configure Environment Variables
Update `.env` in the backend root:
```env
SHOPIFY_INTEGRATION_MODE=live
SHOPIFY_STORE_DOMAIN=3tmnjg-dw.myshopify.com
SHOPIFY_STOREFRONT_ACCESS_TOKEN=shpat_xxxxxxxxxxxxxxxxxxxx
```

### Step 3: Adapter Activation
When `SHOPIFY_INTEGRATION_MODE=live` is configured, `app/adapters/__init__.py` automatically instantiates `LiveShopifyAdapter` (`app/adapters/live_shopify.py`).

---

## 3. Storefront API GraphQL Schemas

### Fetching Catalogue & Collections
```graphql
query GetProducts($first: Int!, $query: String, $sortKey: ProductSortKeys, $reverse: Boolean) {
  products(first: $first, query: $query, sortKey: $sortKey, reverse: $reverse) {
    edges {
      node {
        id
        title
        handle
        description
        priceRange {
          minVariantPrice {
            amount
            currencyCode
          }
        }
        images(first: 5) {
          edges {
            node {
              url
              altText
            }
          }
        }
        variants(first: 10) {
          edges {
            node {
              id
              title
              availableForSale
              price {
                amount
              }
              selectedOptions {
                name
                value
              }
            }
          }
        }
      }
    }
  }
}
```

### Checkout Flow Recommendation
In production, mobile shopping applications must not collect or process raw payment cards directly. Instead:
1. Use `cartCreate` to create the checkout session with line items and applied loyalty discount codes.
2. Direct the customer to the returned `checkoutUrl` via Expo `WebBrowser` or deep link.
3. Once completed, Shopify webhooks (`orders/create`) notify the backend to trigger points accrual in HUBKLUB/Tally.

---

## 4. Security Principles
- **Never embed Storefront or Admin secrets into the mobile application bundle**.
- All network communication with Shopify must originate from the backend API or use strictly scoped public Storefront tokens.
