import { Platform } from 'react-native';
import Constants from 'expo-constants';

const CLOUD_API_URL = 'https://thehub-unce.onrender.com/api/v1';

function resolveApiBaseUrl(): string {
  // 1. Explicit environment variable override (e.g. from mobile/.env or EAS build secrets)
  if (process.env.EXPO_PUBLIC_API_URL) {
    return process.env.EXPO_PUBLIC_API_URL;
  }

  // 2. Default to the shared cloud Render backend so mobile and website sync with the same database
  return CLOUD_API_URL;
}

export const API_BASE_URL = resolveApiBaseUrl();

export const DEMO_CUSTOMERS = [
  {
    id: 'cust_demo',
    name: 'Aarav Patel (Active Gold Member)',
    description: '₹1.15L annual spend, 20% bonus unlocked, 3,450 points available (₹3,450 value)',
    scenario: 'Gold Member with redeemable balance & expiring points',
  },
  {
    id: 'cust_ineligible',
    name: 'Rohan Shah (Ineligible Customer)',
    description: 'Single purchase ₹850 (₹150 short of ₹1,000 threshold)',
    scenario: 'Must spend ₹150 more in a single purchase to unlock enrollment',
  },
  {
    id: 'cust_eligible',
    name: 'Vikram Mehta (Eligible Non-Member)',
    description: 'Single purchase ₹15,195 (Qualifies for instant enrollment)',
    scenario: 'Eligible for HUBKLUB membership; can enroll now',
  },
  {
    id: 'cust_below_bonus',
    name: 'Dev Desai (Classic Member)',
    description: '₹45,000 annual spend (45% toward ₹1,00,000 milestone)',
    scenario: 'Classic tier; progress tracking towards ₹1 Lakh milestone',
  },
];
