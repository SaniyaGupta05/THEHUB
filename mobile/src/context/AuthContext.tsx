import React, { createContext, useContext, useState, useEffect } from 'react';
import { apiClient } from '../api/client';
import { CustomerProfile } from '../types';

interface AuthContextType {
  activeCustomerId: string;
  customerProfile: CustomerProfile | null;
  pointsBalance: number;
  isMember: boolean;
  isLoading: boolean;
  isLoggedIn: boolean;
  login: (id: string) => Promise<void>;
  loginByIdentifier: (identifier: string, password?: string) => Promise<void>;
  register: (data: {
    first_name: string;
    last_name: string;
    email: string;
    phone: string;
    password?: string;
  }) => Promise<void>;
  logout: () => void;
  switchCustomer: (id: string) => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activeCustomerId, setActiveCustomerId] = useState<string>('cust_demo');
  const [customerProfile, setCustomerProfile] = useState<CustomerProfile | null>(null);
  const [pointsBalance, setPointsBalance] = useState<number>(3450);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(true);

  const fetchProfile = async (id: string) => {
    setIsLoading(true);
    apiClient.setCustomerId(id);
    try {
      const [profile, balance] = await Promise.allSettled([
        apiClient.getProfile(),
        apiClient.getLoyaltyBalance(),
      ]);
      if (profile.status === 'fulfilled') {
        setCustomerProfile(profile.value);
      }
      if (balance.status === 'fulfilled' && balance.value) {
        setPointsBalance(balance.value.available_points);
      } else {
        setPointsBalance(id === 'cust_demo' ? 3450 : id === 'cust_below_bonus' ? 1350 : 0);
      }
    } catch (e) {
      console.log('Failed to fetch profile/balance', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isLoggedIn && activeCustomerId && activeCustomerId !== 'guest') {
      fetchProfile(activeCustomerId);
    }
  }, [activeCustomerId, isLoggedIn]);

  const switchCustomer = async (id: string) => {
    setIsLoggedIn(true);
    setActiveCustomerId(id);
    await fetchProfile(id);
  };

  const login = async (id: string) => {
    setIsLoggedIn(true);
    setActiveCustomerId(id);
    await fetchProfile(id);
  };

  const loginByIdentifier = async (identifier: string, password?: string) => {
    setIsLoading(true);
    try {
      const profile = await apiClient.loginWithIdentifier(identifier, password);
      setIsLoggedIn(true);
      setActiveCustomerId(profile.id);
      setCustomerProfile(profile);
      await fetchProfile(profile.id);
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (data: {
    first_name: string;
    last_name: string;
    email: string;
    phone: string;
    password?: string;
  }) => {
    setIsLoading(true);
    try {
      const profile = await apiClient.register(data);
      setIsLoggedIn(true);
      setActiveCustomerId(profile.id);
      setCustomerProfile(profile);
      setPointsBalance(0);
      await fetchProfile(profile.id);
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    setIsLoggedIn(false);
    setActiveCustomerId('guest');
    setCustomerProfile(null);
    setPointsBalance(0);
    apiClient.setCustomerId('guest');
  };

  const refreshProfile = async () => {
    if (isLoggedIn && activeCustomerId && activeCustomerId !== 'guest') {
      await fetchProfile(activeCustomerId);
    }
  };

  const isMember = Boolean(
    isLoggedIn && (customerProfile?.is_hubklub_member || activeCustomerId === 'cust_demo' || activeCustomerId === 'cust_below_bonus')
  );

  return (
    <AuthContext.Provider
      value={{
        activeCustomerId,
        customerProfile,
        pointsBalance,
        isMember,
        isLoading,
        isLoggedIn,
        login,
        loginByIdentifier,
        register,
        logout,
        switchCustomer,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};

