import { API_BASE_URL, DEMO_CUSTOMERS } from '../constants/config';
import {
  Product,
  Collection,
  Cart,
  Order,
  CustomerProfile,
  HubklubMembershipStatus,
  HubklubBalance,
  HubklubSummary,
  PointsTransaction,
} from '../types';

class ApiClient {
  private customerId: string = 'cust_demo';
  private customProfiles: Map<string, CustomerProfile> = new Map();

  setCustomerId(id: string) {
    this.customerId = id;
  }

  getCustomerId(): string {
    return this.customerId;
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${API_BASE_URL}${endpoint}`;
    const headers = {
      'Content-Type': 'application/json',
      'X-Customer-Id': this.customerId,
      ...(options.headers || {}),
    };

    try {
      const response = await fetch(url, { ...options, headers });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || `HTTP Error ${response.status}`);
      }
      return await response.json();
    } catch (err: any) {
      // If server is not responding, fallback to local mock data handler
      console.log(`[Offline Fallback] API call ${endpoint}: ${err.message}`);
      return this.fallbackHandler<T>(endpoint, options);
    }
  }

  // Catalogue
  async getProducts(params?: { category?: string; query?: string }): Promise<Product[]> {
    const queryParts = [];
    if (params?.category) queryParts.push(`category=${encodeURIComponent(params.category)}`);
    if (params?.query) queryParts.push(`query=${encodeURIComponent(params.query)}`);
    const qs = queryParts.length ? `?${queryParts.join('&')}` : '';
    return this.request<Product[]>(`/products${qs}`);
  }

  async getProduct(id: string): Promise<Product> {
    return this.request<Product>(`/products/${id}`);
  }

  async getCollections(): Promise<Collection[]> {
    return this.request<Collection[]>('/collections');
  }

  // Cart
  async getCart(): Promise<Cart> {
    return this.request<Cart>('/cart');
  }

  async addToCart(productId: string, variantId: string, quantity: number = 1): Promise<Cart> {
    return this.request<Cart>('/cart/items', {
      method: 'POST',
      body: JSON.stringify({ product_id: productId, variant_id: variantId, quantity }),
    });
  }

  async updateCartItem(itemId: string, quantity: number): Promise<Cart> {
    return this.request<Cart>(`/cart/items/${itemId}`, {
      method: 'PATCH',
      body: JSON.stringify({ quantity }),
    });
  }

  async removeCartItem(itemId: string): Promise<Cart> {
    return this.request<Cart>(`/cart/items/${itemId}`, {
      method: 'DELETE',
    });
  }

  // Checkout
  async demoCheckout(payload: {
    shipping_address: any;
    points_to_redeem: number;
    idempotency_key?: string;
    items?: any[];
  }): Promise<Order> {
    return this.request<Order>('/checkout/demo', {
      method: 'POST',
      body: JSON.stringify({
        customer_id: this.customerId,
        ...payload,
      }),
    });
  }

  // Customer & Orders
  async getProfile(): Promise<CustomerProfile> {
    return this.request<CustomerProfile>('/me');
  }

  async register(data: {
    first_name: string;
    last_name: string;
    email: string;
    phone: string;
    password?: string;
  }): Promise<CustomerProfile> {
    const res = await this.request<CustomerProfile>('/register', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    this.setCustomerId(res.id);
    return res;
  }

  async loginWithIdentifier(identifier: string, password?: string): Promise<CustomerProfile> {
    const res = await this.request<CustomerProfile>('/login', {
      method: 'POST',
      body: JSON.stringify({ identifier, password }),
    });
    this.setCustomerId(res.id);
    return res;
  }

  async getOrders(): Promise<Order[]> {
    return this.request<Order[]>('/orders');
  }

  // HUBKLUB Loyalty
  async getLoyaltySummary(): Promise<HubklubSummary> {
    return this.request<HubklubSummary>('/loyalty/summary');
  }

  async getLoyaltyMembership(): Promise<HubklubMembershipStatus> {
    return this.request<HubklubMembershipStatus>('/loyalty/membership');
  }

  async enrollLoyaltyDemo(): Promise<HubklubMembershipStatus> {
    return this.request<HubklubMembershipStatus>('/loyalty/enrollment/demo', {
      method: 'POST',
      body: JSON.stringify({ customer_id: this.customerId }),
    });
  }

  async getLoyaltyBalance(): Promise<HubklubBalance> {
    return this.request<HubklubBalance>('/loyalty/balance');
  }

  async getLoyaltyTransactions(): Promise<PointsTransaction[]> {
    return this.request<PointsTransaction[]>('/loyalty/transactions');
  }

  async redeemPointsDemo(points: number, idempotencyKey: string): Promise<any> {
    return this.request<any>('/loyalty/redemptions/demo', {
      method: 'POST',
      body: JSON.stringify({
        customer_id: this.customerId,
        points_to_redeem: points,
        idempotency_key: idempotencyKey,
      }),
    });
  }

  async calculatePoints(amount: number): Promise<any> {
    return this.request<any>(`/loyalty/calculate-points?amount=${encodeURIComponent(amount)}`);
  }

  async simulateCreditPoints(amount: number): Promise<any> {
    return this.request<any>('/loyalty/simulate-credit', {
      method: 'POST',
      body: JSON.stringify({ amount }),
    });
  }

  // Graceful offline fallback simulator
  private fallbackHandler<T>(endpoint: string, options: RequestInit): Promise<T> {
    const cid = this.customerId;
    const isGold = cid === 'cust_demo';
    const isIneligible = cid === 'cust_ineligible';
    const isEligible = cid === 'cust_eligible';

    if (endpoint.includes('/products')) {
      return Promise.resolve(FALLBACK_PRODUCTS as unknown as T);
    }
    if (endpoint.includes('/collections')) {
      return Promise.resolve(FALLBACK_COLLECTIONS as unknown as T);
    }
    if (endpoint.includes('/loyalty/summary') || endpoint.includes('/loyalty/membership')) {
      const summary: HubklubSummary = {
        membership: {
          customer_id: cid,
          is_member: isGold || cid === 'cust_below_bonus',
          membership_number: isGold ? 'HK-2024-88412' : cid === 'cust_below_bonus' ? 'HK-2025-10294' : undefined,
          tier: isGold ? 'Gold' : cid === 'cust_below_bonus' ? 'Classic' : undefined,
          is_eligible: !isIneligible,
          max_single_purchase: isIneligible ? 850 : isGold ? 32900 : 15195,
          eligibility_threshold: 1000,
          progress_percent: isIneligible ? 85 : 100,
          eligibility_message: isIneligible
            ? 'Make a single purchase of at least ₹1,000 to unlock HUBKLUB membership (₹150 more needed).'
            : isGold
            ? 'Active HUBKLUB Gold Member. Enjoy 1 pt = ₹1 redemption value.'
            : 'Your purchase qualifies you for HUBKLUB membership enrollment.',
          is_demo: true,
        },
        balance: {
          customer_id: cid,
          available_points: isGold ? 3450 : cid === 'cust_below_bonus' ? 1350 : 0,
          redemption_value_inr: isGold ? 3450 : cid === 'cust_below_bonus' ? 1350 : 0,
          expiring_soon_points: isGold ? 450 : 0,
          points_batches: isGold
            ? [
                {
                  points: 450,
                  rupee_equivalent: 450,
                  expiry_date: '2026-10-25T11:00:00Z',
                  days_remaining: 8,
                },
                {
                  points: 3000,
                  rupee_equivalent: 3000,
                  expiry_date: '2027-02-14T16:45:00Z',
                  days_remaining: 120,
                },
              ]
            : [],
          is_demo: true,
        },
        annual_bonus: {
          customer_id: cid,
          current_year: 2026,
          accumulated_spend_inr: isGold ? 115595 : cid === 'cust_below_bonus' ? 45000 : 850,
          annual_threshold_inr: 100000,
          progress_percent: isGold ? 100 : cid === 'cust_below_bonus' ? 45 : 0.8,
          bonus_achieved: isGold,
          points_earned_this_year: isGold ? 5120 : cid === 'cust_below_bonus' ? 1350 : 0,
          estimated_annual_bonus_points: isGold ? 1024 : 270,
          estimated_bonus_value_inr: isGold ? 1024 : 270,
          is_demo: true,
        },
        recent_transactions: isGold
          ? [
              {
                id: 'tx_demo_01',
                customer_id: cid,
                type: 'earn',
                points: 4080,
                rupee_equivalent: 4080,
                description: 'Earned 6% on Royal Ivory Tapestry Sherwani Set (₹68,000)',
                timestamp: '2026-04-18T18:10:00Z',
                status: 'Active',
              },
              {
                id: 'tx_demo_02',
                customer_id: cid,
                type: 'bonus',
                points: 1024,
                rupee_equivalent: 1024,
                description: '20% Annual Bonus for surpassing ₹1,00,000 spend milestone',
                timestamp: '2026-08-01T00:00:00Z',
                status: 'Active',
              },
            ]
          : [],
        active_rate_bands: [
          { min: 0, max: 20000, rate: 0.03 },
          { min: 20000.01, max: 50000, rate: 0.05 },
          { min: 50000.01, max: 9999999, rate: 0.06 },
        ],
        is_demo: true,
      };
      return Promise.resolve(summary as unknown as T);
    }

    if (endpoint.includes('/loyalty/calculate-points')) {
      const match = endpoint.match(/amount=([\d.]+)/);
      const amt = match ? parseFloat(match[1]) : 0;
      let rate = 0.03;
      let slab = 'Up to ₹20,000 (3% Back)';
      if (amt > 50000) {
        rate = 0.06;
        slab = '₹50,001+ (6% Back)';
      } else if (amt > 20000) {
        rate = 0.05;
        slab = '₹20,001 to ₹50,000 (5% Back)';
      }
      const basePts = Math.round(amt * rate);
      const annualSpendBefore = isGold ? 115595 : cid === 'cust_below_bonus' ? 45000 : 850;
      const annualSpendAfter = annualSpendBefore + amt;
      const bonusAchieved = annualSpendAfter >= 100000;
      const bonusPts = bonusAchieved ? Math.round(basePts * 0.2) : 0;
      const totalPts = basePts + bonusPts;
      return Promise.resolve({
        amount: amt,
        rate_percent: rate * 100,
        slab_name: slab,
        base_points: basePts,
        rupee_equivalent: basePts,
        annual_spend_before: annualSpendBefore,
        annual_spend_after: annualSpendAfter,
        annual_threshold: 100000,
        bonus_achieved: bonusAchieved,
        bonus_points: bonusPts,
        total_points: totalPts,
        total_rupee_value: totalPts,
        is_demo: true,
      } as unknown as T);
    }

    if (endpoint.includes('/loyalty/simulate-credit')) {
      const body = options.body ? JSON.parse(options.body as string) : {};
      const amt = body.amount || 0;
      const pts = amt > 50000 ? Math.round(amt * 0.06) : amt > 20000 ? Math.round(amt * 0.05) : Math.round(amt * 0.03);
      return Promise.resolve({
        success: true,
        credited_points: pts,
        updated_balance: (isGold ? 3450 : 0) + pts,
        is_demo: true,
      } as unknown as T);
    }

    if (endpoint.includes('/cart')) {
      const emptyCart: Cart = {
        id: `cart_${cid}`,
        items: [],
        subtotal: 0,
        estimated_tax: 0,
        shipping_fee: 0,
        loyalty_discount: 0,
        total: 0,
        is_demo: true,
        currency: 'INR',
      };
      return Promise.resolve(emptyCart as unknown as T);
    }

    if (endpoint.includes('/me')) {
      if (this.customProfiles.has(cid)) {
        return Promise.resolve(this.customProfiles.get(cid) as unknown as T);
      }
      const profile: CustomerProfile = {
        id: cid,
        first_name: isGold ? 'Aarav' : isIneligible ? 'Rohan' : cid === 'cust_below_bonus' ? 'Dev' : 'Member',
        last_name: isGold ? 'Patel' : isIneligible ? 'Shah' : cid === 'cust_below_bonus' ? 'Desai' : '',
        email: `${cid}@thehub.in`,
        phone: '+91 98250 12345',
        member_since: '2024-03-15T10:00:00Z',
        is_hubklub_member: isGold || cid === 'cust_below_bonus',
        membership_number: isGold ? 'HK-2024-88412' : undefined,
        tier: isGold ? 'Gold' : undefined,
        max_single_purchase: isGold ? 32900 : isIneligible ? 850 : 15195,
        annual_spend_current_year: isGold ? 115595 : 45000,
        lifetime_spend: isGold ? 178000 : 45000,
        saved_addresses: [
          {
            full_name: 'Aarav Patel',
            phone: '+91 98250 12345',
            street: '14 Alkapuri Chambers, R.C. Dutt Road',
            city: 'Vadodara',
            state: 'Gujarat',
            pincode: '390007',
            country: 'India',
          },
        ],
      };
      return Promise.resolve(profile as unknown as T);
    }

    if (endpoint.includes('/loyalty/redemptions/demo')) {
      const body = options.body ? JSON.parse(options.body as string) : {};
      const pts = body.points_to_redeem || 0;
      return Promise.resolve({
        transaction_id: `tx_red_demo_${Date.now()}`,
        customer_id: cid,
        points_redeemed: pts,
        rupee_discount_applied: pts,
        remaining_points: Math.max(0, (isGold ? 3450 : 0) - pts),
        status: 'Confirmed',
        is_demo: true,
        message: `Successfully redeemed ${pts} HUBKLUB Points (₹${pts} discount applied).`,
      } as unknown as T);
    }

    if (endpoint.includes('/checkout/demo')) {
      const body = options.body ? JSON.parse(options.body as string) : {};
      const pts = body.points_to_redeem || 0;
      const orderItems = (body.items || []).map((i: any, idx: number) => ({
        product_id: i.product_id || `prod_${idx}`,
        variant_id: i.variant_id || `var_${idx}`,
        product_title: i.product_title || 'Garment Item',
        quantity: i.quantity || 1,
        unit_price: i.price || 5000,
        total_price: (i.price || 5000) * (i.quantity || 1),
        image: i.image,
      }));
      const subtotal = orderItems.reduce((acc: number, i: any) => acc + i.total_price, 0) || 15195;
      const shipping = subtotal >= 2000 ? 0 : 150;
      const discount = pts;
      const finalTotal = Math.max(0, subtotal + shipping - discount);
      const estPointsEarned = Math.round(finalTotal * 0.05);

      const fakeOrder: Order = {
        id: `ord_${Date.now()}`,
        order_number: `HUB-DEMO-${Math.floor(100000 + Math.random() * 900000)}`,
        customer_id: cid,
        items: orderItems,
        subtotal,
        tax: 0,
        shipping,
        discount_amount: discount,
        points_redeemed: pts,
        points_earned_estimated: estPointsEarned,
        total_amount: finalTotal,
        status: 'Confirmed (Demo Order)',
        shipping_address: body.shipping_address,
        created_at: new Date().toISOString(),
        is_demo: true,
      };
      return Promise.resolve(fakeOrder as unknown as T);
    }

    if (endpoint.includes('/orders')) {
      const demoOrders: Order[] = isGold
        ? [
            {
              id: 'ord_demo_01',
              order_number: 'HUB-2026-94812',
              customer_id: cid,
              items: [
                {
                  product_id: 'prod_01',
                  variant_id: 'var_01',
                  product_title: 'Embroidered Velvet Sherwani',
                  quantity: 1,
                  unit_price: 68000,
                  total_price: 68000,
                },
              ],
              subtotal: 68000,
              tax: 0,
              shipping: 0,
              discount_amount: 3450,
              points_redeemed: 3450,
              points_earned_estimated: 4080,
              total_amount: 64550,
              status: 'Delivered',
              shipping_address: {
                full_name: 'Aarav Patel',
                phone: '+91 98250 12345',
                street: '14 Alkapuri Chambers, R.C. Dutt Road',
                city: 'Vadodara',
                state: 'Gujarat',
                pincode: '390007',
                country: 'India',
              },
              created_at: '2026-04-18T18:10:00Z',
              is_demo: true,
            },
          ]
        : [];
      return Promise.resolve(demoOrders as unknown as T);
    }

    if (endpoint.includes('/register')) {
      let body: any = {};
      try {
        body = options.body ? JSON.parse(options.body as string) : {};
      } catch {}
      const newId = `cust_${Date.now()}`;
      const newCust: CustomerProfile = {
        id: newId,
        first_name: (body.first_name || 'Member').trim(),
        last_name: (body.last_name || '').trim(),
        email: body.email || `${newId}@thehub.in`,
        phone: body.phone || '+91 98765 43210',
        member_since: new Date().toISOString(),
        is_hubklub_member: true,
        membership_number: `HK-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
        tier: 'Classic',
        max_single_purchase: 0,
        annual_spend_current_year: 0,
        lifetime_spend: 0,
        saved_addresses: [],
      };
      this.customProfiles.set(newId, newCust);
      return Promise.resolve(newCust as unknown as T);
    }

    if (endpoint.includes('/login')) {
      let body: any = {};
      try {
        body = options.body ? JSON.parse(options.body as string) : {};
      } catch {}
      const idOrEmail = (body.identifier || '').toLowerCase();
      if (this.customProfiles.has(idOrEmail)) {
        return Promise.resolve(this.customProfiles.get(idOrEmail) as unknown as T);
      }
      for (const [_, p] of this.customProfiles) {
        if (p.email.toLowerCase() === idOrEmail || p.phone.includes(idOrEmail)) {
          return Promise.resolve(p as unknown as T);
        }
      }
      const demoFound = DEMO_CUSTOMERS.find(
        (c) => c.id === idOrEmail || c.name.toLowerCase().includes(idOrEmail)
      );
      const chosenId = demoFound ? demoFound.id : 'cust_demo';
      const isChosenGold = chosenId === 'cust_demo';
      const profile: CustomerProfile = {
        id: chosenId,
        first_name: demoFound ? demoFound.name.split(' ')[0] : 'Aarav',
        last_name: demoFound ? demoFound.name.split(' ').slice(1, 2).join(' ') : 'Patel',
        email: `${chosenId}@thehub.in`,
        phone: '+91 98250 12345',
        member_since: '2024-03-15T10:00:00Z',
        is_hubklub_member: true,
        membership_number: isChosenGold ? 'HK-2024-88412' : 'HK-2025-10294',
        tier: isChosenGold ? 'Gold' : 'Classic',
        max_single_purchase: isChosenGold ? 32900 : 15000,
        annual_spend_current_year: isChosenGold ? 115595 : 45000,
        lifetime_spend: isChosenGold ? 178000 : 45000,
        saved_addresses: [],
      };
      return Promise.resolve(profile as unknown as T);
    }

    return Promise.resolve({} as unknown as T);
  }
}

export const apiClient = new ApiClient();

const FALLBACK_COLLECTIONS: Collection[] = [
  {
    id: 'col_kurta_pajama',
    title: 'Kurta Pajama',
    handle: 'kurta-pajama',
    description: 'Signature Lucknowi threadwork, mirror-work, and Kalamkari designer festive kurtas from The HUB boutique.',
    image: 'https://cdn.shopify.com/s/files/1/0593/8918/2049/files/Prithvi.webp?v=1790074668',
    product_count: 41,
  },
  {
    id: 'col_bandi_set',
    title: 'Bandi Set',
    handle: 'bandi-set',
    description: 'The HUB signature Nehru jackets, Kashmiri heirlooms, and embroidered silk waistcoats.',
    image: 'https://cdn.shopify.com/s/files/1/0593/8918/2049/files/Prithvi_b.webp?v=1790074705',
    product_count: 18,
  },
  {
    id: 'col_sherwani',
    title: 'Sherwani',
    handle: 'sherwani',
    description: 'Regal bridal sherwanis, achkans, and groom ensembles hand-embroidered in zardosi and resham thread.',
    image: 'https://cdn.shopify.com/s/files/1/0593/8918/2049/files/The_HUB_Website.jpg?v=1758865025',
    product_count: 16,
  },
  {
    id: 'col_indo_western',
    title: 'Indo Western',
    handle: 'indo-western',
    description: 'Contemporary matka silk fusion silhouettes, asymmetric cuts, and modern festive sets.',
    image: 'https://cdn.shopify.com/s/files/1/0593/8918/2049/files/HUB_JAGNIVAS2025_WEBSITE_IMG_005_C.webp?v=1765358167',
    product_count: 23,
  },
  {
    id: 'col_jodhpuri',
    title: 'Jodhpuri Suit',
    handle: 'jodhpuri-suit',
    description: 'Structured bandhgala coats and tailored royal Jodhpuri trousers for grand Indian celebrations.',
    image: 'https://cdn.shopify.com/s/files/1/0593/8918/2049/files/HUB_JAGNIVAS2025_WEBSITE_IMG_018_A.webp?v=1765358030',
    product_count: 6,
  },
  {
    id: 'col_suits',
    title: 'Suits',
    handle: 'suits',
    description: 'Italian wool-blend tailored three-piece suits, double-breasted coats, and formal evening wear.',
    image: 'https://cdn.shopify.com/s/files/1/0593/8918/2049/files/HUB_JAGNIVAS2025_WEBSITE_IMG_006_B_c54ceec9-e92c-430d-9d09-0f40de3996e6.webp?v=1765358848',
    product_count: 12,
  },
  {
    id: 'col_tuxedos',
    title: 'Tuxedos',
    handle: 'tuxedos',
    description: 'Bespoke evening tuxedos with satin shawl lapels, velvet trims, and refined cocktail tailoring.',
    image: 'https://images.unsplash.com/photo-1594938298603-c8148c4dae35?auto=format&fit=crop&w=600&q=80',
    product_count: 7,
  },
  {
    id: 'col_haldi',
    title: 'Haldi Dress',
    handle: 'haldi',
    description: 'Vibrant sunshine yellow, mustard, and marigold festive kurta sets curated for haldi ceremonies.',
    image: 'https://cdn.shopify.com/s/files/1/0593/8918/2049/files/Kesariya.webp?v=1790074972',
    product_count: 14,
  },
  {
    id: 'col_sangeet',
    title: 'Sangeet Dress',
    handle: 'sangeet',
    description: 'Mirror-work and gleaming embroidered sets crafted to dazzle on sangeet and cocktail nights.',
    image: 'https://cdn.shopify.com/s/files/1/0593/8918/2049/files/Mehandi-Outfit-003A.webp?v=1754916540',
    product_count: 14,
  },
  {
    id: 'col_wedding',
    title: 'Wedding Outfits',
    handle: 'wedding',
    description: 'The quintessential groom and baraat wedding couture collection by THE HUB.',
    image: 'https://cdn.shopify.com/s/files/1/0593/8918/2049/files/HUB_JAGNIVAS2025_WEBSITE_IMG_020_C.webp?v=1780031969',
    product_count: 15,
  },
  {
    id: 'col_accessories',
    title: 'Accessories & Footwear',
    handle: 'accessories',
    description: 'Handcrafted silk mojaris, antique gold brooches, pocket squares, safas, and stoles.',
    image: 'https://images.unsplash.com/photo-1584917865442-de89df76afd3?auto=format&fit=crop&w=600&q=80',
    product_count: 34,
  },
];

const FALLBACK_PRODUCTS: Product[] = [
  {
    id: 'prod_1',
    title: 'Prithvi Patchwork Mirror Kurta',
    handle: 'prithvi',
    description: 'A warm rust-toned kurta featuring patchwork-inspired panels, scattered motifs, and refined mirror detailing along the placket. Masterfully tailored in breathable cotton-silk blend.',
    vendor: 'THE HUB',
    category: 'Kurtas & Sets',
    tags: ['kurta', 'mirror-work', 'festive', 'rust', 'best-seller'],
    price: 15195,
    compare_at_price: 17995,
    is_sale: true,
    images: [
      'https://cdn.shopify.com/s/files/1/0593/8918/2049/files/Prithvi.webp?v=1790074668',
      'https://cdn.shopify.com/s/files/1/0593/8918/2049/files/Prithvi_a.webp?v=1790074688',
      'https://cdn.shopify.com/s/files/1/0593/8918/2049/files/Prithvi_b.webp?v=1790074705',
    ],
    variants: [
      { id: 'var_1_s', title: 'Rust / 38 (S)', sku: 'HUB-PRT-RST-38', price: 15195, compare_at_price: 17995, available: true, size: '38 (S)', color: 'Rust' },
      { id: 'var_1_m', title: 'Rust / 40 (M)', sku: 'HUB-PRT-RST-40', price: 15195, compare_at_price: 17995, available: true, size: '40 (M)', color: 'Rust' },
      { id: 'var_1_l', title: 'Rust / 42 (L)', sku: 'HUB-PRT-RST-42', price: 15195, compare_at_price: 17995, available: true, size: '42 (L)', color: 'Rust' },
      { id: 'var_1_xl', title: 'Rust / 44 (XL)', sku: 'HUB-PRT-RST-44', price: 15195, compare_at_price: 17995, available: false, size: '44 (XL)', color: 'Rust' },
    ],
    available: true,
    featured: true,
    is_new: true,
    rating: 4.9,
    review_count: 38,
  },
  {
    id: 'prod_blush',
    title: 'Blush Radiance Mirrorwork Kurta',
    handle: 'blush-radiance-mirrorwork-kurta',
    description: 'An ethereal blush pink celebratory kurta decorated with handcrafted abhala mirror embroidery and subtle gold tilla needlework.',
    vendor: 'THE HUB',
    category: 'Kurtas & Sets',
    tags: ['kurta', 'mirror-work', 'blush', 'wedding', 'best-seller'],
    price: 14995,
    compare_at_price: 17500,
    is_sale: true,
    images: [
      'https://cdn.shopify.com/s/files/1/0593/8918/2049/files/Prithvi_a.webp?v=1790074688',
      'https://cdn.shopify.com/s/files/1/0593/8918/2049/files/Prithvi.webp?v=1790074668',
    ],
    variants: [
      { id: 'v_b_s', title: 'Blush / 38 (S)', price: 14995, compare_at_price: 17500, available: true, size: '38 (S)', color: 'Blush Pink' },
      { id: 'v_b_m', title: 'Blush / 40 (M)', price: 14995, compare_at_price: 17500, available: true, size: '40 (M)', color: 'Blush Pink' },
      { id: 'v_b_l', title: 'Blush / 42 (L)', price: 14995, compare_at_price: 17500, available: true, size: '42 (L)', color: 'Blush Pink' },
    ],
    available: true,
    featured: true,
    is_new: true,
    rating: 4.8,
    review_count: 52,
  },
  {
    id: 'prod_2',
    title: 'Naksh Regal Black Embroidered Kurta',
    handle: 'naksh',
    description: 'A classic midnight black kurta punctuated with intricate floral needlepoint motifs and refined thread detailing along the collar and concealed placket.',
    vendor: 'THE HUB',
    category: 'Kurtas & Sets',
    tags: ['kurta', 'black', 'festive', 'best-seller'],
    price: 12850,
    compare_at_price: undefined,
    is_sale: false,
    images: [
      'https://cdn.shopify.com/s/files/1/0593/8918/2049/files/Prithvi_a.webp?v=1790074688',
      'https://cdn.shopify.com/s/files/1/0593/8918/2049/files/Prithvi.webp?v=1790074668',
    ],
    variants: [
      { id: 'var_2_s', title: 'Black / 38 (S)', sku: 'HUB-NK-BLK-38', price: 12850, available: true, size: '38 (S)', color: 'Black' },
      { id: 'var_2_m', title: 'Black / 40 (M)', sku: 'HUB-NK-BLK-40', price: 12850, available: true, size: '40 (M)', color: 'Black' },
      { id: 'var_2_l', title: 'Black / 42 (L)', sku: 'HUB-NK-BLK-42', price: 12850, available: true, size: '42 (L)', color: 'Black' },
    ],
    available: true,
    featured: true,
    is_new: false,
    rating: 4.8,
    review_count: 19,
  },
  {
    id: 'prod_kashmiri_bandi',
    title: 'The Kashmiri Heirloom Bandi Set',
    handle: 'the-kashmiri-heirloom-bandi-set',
    description: 'Exquisite silk waistcoat featuring hand-embroidered Aari needlework inspired by Mughal valley floras. Includes coordinating raw silk kurta and churidar.',
    vendor: 'THE HUB',
    category: 'Bandi Sets',
    tags: ['bandi', 'kashmiri', 'heirloom', 'festive', 'nehru'],
    price: 22500,
    compare_at_price: 25000,
    is_sale: true,
    images: [
      'https://cdn.shopify.com/s/files/1/0593/8918/2049/files/Prithvi_b.webp?v=1790074705',
      'https://cdn.shopify.com/s/files/1/0593/8918/2049/files/Prithvi.webp?v=1790074668',
    ],
    variants: [
      { id: 'v_k_m', title: 'Beige / 40 (M)', price: 22500, compare_at_price: 25000, available: true, size: '40 (M)', color: 'Beige-Gold' },
      { id: 'v_k_l', title: 'Beige / 42 (L)', price: 22500, compare_at_price: 25000, available: true, size: '42 (L)', color: 'Beige-Gold' },
    ],
    available: true,
    featured: true,
    is_new: true,
    rating: 4.9,
    review_count: 46,
  },
  {
    id: 'prod_3',
    title: 'Golden Horizon Ombre Bandi Set',
    handle: 'golden-horizon-ombre-bandi-set',
    description: 'An opulent ombre Nehru jacket layered over a pristine silk kurta and matching churidar. Accented with brass antique metal buttons.',
    vendor: 'THE HUB',
    category: 'Bandi Sets',
    tags: ['bandi', 'ombre', 'gold', 'set'],
    price: 24500,
    compare_at_price: 27000,
    is_sale: true,
    images: [
      'https://cdn.shopify.com/s/files/1/0593/8918/2049/files/Prithvi_b.webp?v=1790074705',
      'https://cdn.shopify.com/s/files/1/0593/8918/2049/files/Prithvi.webp?v=1790074668',
    ],
    variants: [
      { id: 'var_3_m', title: 'Gold / 40 (M)', sku: 'HUB-BND-GLD-40', price: 24500, compare_at_price: 27000, available: true, size: '40 (M)', color: 'Gold' },
      { id: 'var_3_l', title: 'Gold / 42 (L)', sku: 'HUB-BND-GLD-42', price: 24500, compare_at_price: 27000, available: true, size: '42 (L)', color: 'Gold' },
    ],
    available: true,
    featured: true,
    is_new: true,
    rating: 5.0,
    review_count: 42,
  },
  {
    id: 'prod_4',
    title: 'Royal Ivory Tapestry Sherwani Set',
    handle: 'royal-ivory-tapestry-sherwani-set',
    description: 'Exquisite bridal sherwani ensemble hand-embroidered in zardosi wire and resham silk thread. Complete with safa, matching stole, and churidar trousers.',
    vendor: 'THE HUB',
    category: 'Sherwanis & Wedding Wear',
    tags: ['sherwani', 'ivory', 'wedding', 'groom'],
    price: 68000,
    compare_at_price: 75000,
    is_sale: true,
    images: [
      'https://cdn.shopify.com/s/files/1/0593/8918/2049/files/The_HUB_Website.jpg?v=1758865025',
      'https://cdn.shopify.com/s/files/1/0593/8918/2049/files/Prithvi.webp?v=1790074668',
    ],
    variants: [
      { id: 'var_4_m', title: 'Ivory / 40 (M)', sku: 'HUB-SHR-IVR-40', price: 68000, available: true, size: '40 (M)', color: 'Ivory' },
      { id: 'var_4_l', title: 'Ivory / 42 (L)', sku: 'HUB-SHR-IVR-42', price: 68000, available: true, size: '42 (L)', color: 'Ivory' },
      { id: 'var_4_xl', title: 'Ivory / 44 (XL)', sku: 'HUB-SHR-IVR-44', price: 68000, available: true, size: '44 (XL)', color: 'Ivory' },
    ],
    available: true,
    featured: true,
    is_new: false,
    rating: 5.0,
    review_count: 61,
  },
  {
    id: 'prod_zardosi_sherwani',
    title: 'Heritage Zardosi Raw Silk Groom Sherwani',
    handle: 'heritage-zardosi-raw-silk-groom-sherwani',
    description: 'Couture wedding sherwani woven in handloom raw silk, encrusted with dabka, french knots, and semi-precious stone embellishments.',
    vendor: 'THE HUB',
    category: 'Sherwanis & Wedding Wear',
    tags: ['sherwani', 'groom', 'wedding', 'couture', 'zardosi'],
    price: 84500,
    compare_at_price: 92000,
    is_sale: true,
    images: [
      'https://cdn.shopify.com/s/files/1/0593/8918/2049/files/The_HUB_Website.jpg?v=1758865025',
    ],
    variants: [
      { id: 'v_zs_m', title: 'Champagne / 40', price: 84500, available: true, size: '40 (M)', color: 'Champagne Gold' },
      { id: 'v_zs_l', title: 'Champagne / 42', price: 84500, available: true, size: '42 (L)', color: 'Champagne Gold' },
    ],
    available: true,
    featured: true,
    is_new: true,
    rating: 5.0,
    review_count: 31,
  },
  {
    id: 'prod_matka_indo',
    title: 'Matka Silk Contemporary Indo-Western Set',
    handle: 'matka-silk-contemporary-indo-western-set',
    description: 'Modern fusion silhouette blending western structured shoulder pads with Indian asymmetrical drapes in pure handloom matka silk.',
    vendor: 'THE HUB',
    category: 'Indo-Western & Jodhpuris',
    tags: ['indo-western', 'matka-silk', 'fusion', 'reception'],
    price: 38500,
    compare_at_price: 42000,
    is_sale: true,
    images: [
      'https://cdn.shopify.com/s/files/1/0593/8918/2049/files/Prithvi.webp?v=1790074668',
    ],
    variants: [
      { id: 'v_m_s', title: 'Burgundy / 38', price: 38500, available: true, size: '38 (S)', color: 'Burgundy' },
      { id: 'v_m_m', title: 'Burgundy / 40', price: 38500, available: true, size: '40 (M)', color: 'Burgundy' },
      { id: 'v_m_l', title: 'Burgundy / 42', price: 38500, available: true, size: '42 (L)', color: 'Burgundy' },
    ],
    available: true,
    featured: true,
    is_new: true,
    rating: 4.8,
    review_count: 29,
  },
  {
    id: 'prod_6',
    title: 'Deep Sapphire Bespoke Tuxedo Blazer',
    handle: 'deep-sapphire-tuxedo-blazer',
    description: 'Structured Italian wool-blend evening blazer featuring satin shawl lapels and bespoken hand-stitched barchetta pocket.',
    vendor: 'THE HUB',
    category: 'Suits & Tuxedos',
    tags: ['blazer', 'tuxedo', 'evening', 'sapphire'],
    price: 32900,
    compare_at_price: 36500,
    is_sale: true,
    images: [
      'https://cdn.shopify.com/s/files/1/0593/8918/2049/files/Prithvi_b.webp?v=1790074705',
      'https://cdn.shopify.com/s/files/1/0593/8918/2049/files/The_HUB_Website.jpg?v=1758865025',
    ],
    variants: [
      { id: 'var_6_s', title: 'Sapphire / 38', price: 32900, available: true, size: '38 (S)', color: 'Sapphire' },
      { id: 'var_6_m', title: 'Sapphire / 40', price: 32900, available: true, size: '40 (M)', color: 'Sapphire' },
      { id: 'var_6_l', title: 'Sapphire / 42', price: 32900, available: true, size: '42 (L)', color: 'Sapphire' },
    ],
    available: true,
    featured: true,
    is_new: false,
    rating: 4.9,
    review_count: 27,
  },
  {
    id: 'prod_linen_shirt',
    title: 'Pure Flax Linen Mandarin Collar Shirt',
    handle: 'pure-flax-linen-mandarin-collar-shirt',
    description: 'Bespoke washed European flax linen shirt designed with a sleek band collar and clean mother-of-pearl buttons.',
    vendor: 'THE HUB',
    category: 'Casuals & Shirts',
    tags: ['linen', 'shirt', 'casual', 'mandarin'],
    price: 4995,
    compare_at_price: 6500,
    is_sale: true,
    images: [
      'https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?auto=format&fit=crop&w=800&q=80',
    ],
    variants: [
      { id: 'v_ls_s', title: 'White / 38', price: 4995, available: true, size: '38 (S)', color: 'White' },
      { id: 'v_ls_m', title: 'White / 40', price: 4995, available: true, size: '40 (M)', color: 'White' },
      { id: 'v_ls_l', title: 'White / 42', price: 4995, available: true, size: '42 (L)', color: 'White' },
    ],
    available: true,
    featured: true,
    is_new: true,
    rating: 4.7,
    review_count: 48,
  },
  {
    id: 'prod_mojari',
    title: 'Handcrafted Embroidered Raw Silk Mojari',
    handle: 'handcrafted-embroidered-raw-silk-mojari',
    description: 'Traditional jutti crafted with padded insole, pure leather sole, and zardosi needlework on raw silk uppers.',
    vendor: 'THE HUB',
    category: 'Accessories & Footwear',
    tags: ['mojari', 'jutti', 'footwear', 'accessories', 'wedding'],
    price: 5999,
    compare_at_price: 7500,
    is_sale: true,
    images: [
      'https://images.unsplash.com/photo-1549298916-b41d501d3772?auto=format&fit=crop&w=800&q=80',
    ],
    variants: [
      { id: 'v_mj_8', title: 'Gold / UK 8', price: 5999, available: true, size: 'UK 8', color: 'Gold' },
      { id: 'v_mj_9', title: 'Gold / UK 9', price: 5999, available: true, size: 'UK 9', color: 'Gold' },
      { id: 'v_mj_10', title: 'Gold / UK 10', price: 5999, available: true, size: 'UK 10', color: 'Gold' },
    ],
    available: true,
    featured: false,
    is_new: false,
    rating: 4.8,
    review_count: 39,
  },
  {
    id: 'prod_brooch',
    title: 'Antique Gold Kundan & Pearl Brooch',
    handle: 'antique-gold-kundan-pearl-brooch',
    description: 'Heirloom handcrafted sherwani brooch crafted with uncut kundan stones, green meenakari enamelling, and hanging basra pearls.',
    vendor: 'THE HUB',
    category: 'Accessories & Footwear',
    tags: ['brooch', 'kundan', 'jewelry', 'accessories'],
    price: 3499,
    compare_at_price: 4200,
    is_sale: true,
    images: [
      'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?auto=format&fit=crop&w=800&q=80',
    ],
    variants: [
      { id: 'v_br_def', title: 'Antique Gold / Regular', price: 3499, available: true, size: 'One Size', color: 'Gold' },
    ],
    available: true,
    featured: false,
    is_new: true,
    rating: 5.0,
    review_count: 22,
  },
];


