import { Platform } from 'react-native';
import Constants from 'expo-constants';

function resolveApiBaseUrl(): string {
  // 1. Explicit environment variable override
  if (process.env.EXPO_PUBLIC_API_URL) {
    return process.env.EXPO_PUBLIC_API_URL;
  }

  // 2. Dynamic host detection from Expo Metro bundler
  // In Expo Go on a physical phone, hostUri provides the computer's LAN IP (e.g. 192.168.1.47:8081)
  const hostUri =
    Constants.expoConfig?.hostUri ||
    (Constants as any).manifest2?.extra?.expoGo?.debuggerHost ||
    (Constants as any).manifest?.debuggerHost;

  if (hostUri) {
    const host = hostUri.split(':')[0];
    if (host && host !== 'localhost' && host !== '127.0.0.1') {
      return `http://${host}:8000/api/v1`;
    }
  }

  // 3. Fallback for physical devices on local Wi-Fi vs Android emulator
  return Platform.select({
    android: 'http://192.168.1.47:8000/api/v1',
    default: 'http://localhost:8000/api/v1',
  });
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
