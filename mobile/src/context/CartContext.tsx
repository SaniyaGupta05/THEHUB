import React, { createContext, useContext, useState, useMemo } from 'react';
import { CartItem, Product, ProductVariant } from '../types';

interface CartContextType {
  items: CartItem[];
  subtotal: number;
  shippingFee: number;
  loyaltyDiscount: number;
  redeemedPoints: number;
  total: number;
  itemCount: number;
  addItem: (product: Product, variant: ProductVariant, quantity?: number) => void;
  updateQuantity: (itemId: string, quantity: number) => void;
  removeItem: (itemId: string) => void;
  applyLoyaltyDiscount: (points: number) => void;
  clearCart: () => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [items, setItems] = useState<CartItem[]>([
    // Start with a preloaded sample piece for instant demonstration
    {
      id: 'init_item_1',
      product_id: 'prod_1',
      variant_id: 'var_1_m',
      product_title: 'Prithvi Patchwork Mirror Kurta',
      variant_title: 'Rust / Medium (40)',
      price: 15195,
      quantity: 1,
      total_price: 15195,
      image: 'https://cdn.shopify.com/s/files/1/0593/8918/2049/files/Prithvi.webp?v=1790074668',
      size: '40 (M)',
      color: 'Rust',
    },
  ]);

  const [redeemedPoints, setRedeemedPoints] = useState<number>(0);

  const subtotal = useMemo(() => {
    return items.reduce((sum, item) => sum + item.total_price, 0);
  }, [items]);

  const shippingFee = useMemo(() => {
    if (subtotal === 0 || subtotal >= 2000) return 0;
    return 150;
  }, [subtotal]);

  // 1 Point = 1 Rupee discount
  const loyaltyDiscount = useMemo(() => {
    return Math.min(redeemedPoints, subtotal);
  }, [redeemedPoints, subtotal]);

  const total = useMemo(() => {
    return Math.max(0, subtotal + shippingFee - loyaltyDiscount);
  }, [subtotal, shippingFee, loyaltyDiscount]);

  const itemCount = useMemo(() => {
    return items.reduce((sum, item) => sum + item.quantity, 0);
  }, [items]);

  const addItem = (product: Product, variant: ProductVariant, quantity: number = 1) => {
    if (!variant.available) {
      alert(`Sorry, variant ${variant.title} is currently out of stock.`);
      return;
    }

    setItems((prev) => {
      const existing = prev.find(
        (i) => i.product_id === product.id && i.variant_id === variant.id
      );
      if (existing) {
        return prev.map((i) =>
          i.id === existing.id
            ? {
                ...i,
                quantity: i.quantity + quantity,
                total_price: (i.quantity + quantity) * i.price,
              }
            : i
        );
      } else {
        const newItem: CartItem = {
          id: `ci_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          product_id: product.id,
          variant_id: variant.id,
          product_title: product.title,
          variant_title: variant.title,
          price: variant.price,
          quantity,
          total_price: variant.price * quantity,
          image: product.images[0],
          size: variant.size,
          color: variant.color,
        };
        return [...prev, newItem];
      }
    });
  };

  const updateQuantity = (itemId: string, quantity: number) => {
    if (quantity <= 0) {
      removeItem(itemId);
      return;
    }
    setItems((prev) =>
      prev.map((i) =>
        i.id === itemId
          ? { ...i, quantity, total_price: quantity * i.price }
          : i
      )
    );
  };

  const removeItem = (itemId: string) => {
    setItems((prev) => prev.filter((i) => i.id !== itemId));
  };

  const applyLoyaltyDiscount = (points: number) => {
    setRedeemedPoints(points);
  };

  const clearCart = () => {
    setItems([]);
    setRedeemedPoints(0);
  };

  return (
    <CartContext.Provider
      value={{
        items,
        subtotal,
        shippingFee,
        loyaltyDiscount,
        redeemedPoints,
        total,
        itemCount,
        addItem,
        updateQuantity,
        removeItem,
        applyLoyaltyDiscount,
        clearCart,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) throw new Error('useCart must be used within CartProvider');
  return context;
};
