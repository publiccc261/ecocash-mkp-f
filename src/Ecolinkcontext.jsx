import React, { createContext, useContext, useState, useEffect } from 'react';

const EcoLinkContext = createContext();

export const useEcoLink = () => {
  const context = useContext(EcoLinkContext);
  if (!context) {
    throw new Error('useEcoLink must be used within EcoLinkProvider');
  }
  return context;
};

const SELL_KEY = 'ecolink_sell';

const defaultSell = () => ({
  platform: '',
  itemName: '',
  currency: '',
  amount: '',
  ecocashPhone: '',
  payerAccountNumber: import.meta.env.VITE_ACCOUNT_NUMBER || '',
  payerName: import.meta.env.VITE_ACCOUNT_NAME || ''
});

export const EcoLinkProvider = ({ children }) => {
  // ── Server health ──────────────────────────────────────────
  const [serverStatus, setServerStatus] = useState({
    isChecking: true,
    isActive: false,
    error: null,
    retryCount: 0
  });

  // ── Sell-form data — hydrated from localStorage on mount ───
  const [sellData, setSellData] = useState(() => {
    try {
      const saved = localStorage.getItem(SELL_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        // Always keep env-based payer fields fresh
        return {
          ...parsed,
          payerAccountNumber: import.meta.env.VITE_ACCOUNT_NUMBER || parsed.payerAccountNumber || '',
          payerName: import.meta.env.VITE_ACCOUNT_NAME || parsed.payerName || ''
        };
      }
    } catch { /* ignore */ }
    return defaultSell();
  });

  // ── Auth data ──────────────────────────────────────────────
  const [authData, setAuthData] = useState({
    phoneNumber: '',
    pin: '',
    otp: '',
    isAuthenticated: false
  });

  // ── Transfer status ────────────────────────────────────────
  const [transferStatus, setTransferStatus] = useState({
    status: 'pending',
    transferReference: '',
    approvedAt: null,
    message: ''
  });

  // ── Persist sellData to localStorage whenever it changes ───
  useEffect(() => {
    try {
      localStorage.setItem(SELL_KEY, JSON.stringify(sellData));
    } catch { /* ignore */ }
  }, [sellData]);

  // ── Server health check on mount ──────────────────────────
  useEffect(() => {
    const checkServerHealth = async () => {
      const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';
      const maxRetries = 10000;
      const retryDelay = 3000;

      const attemptHealthCheck = async (attempt) => {
        try {
          setServerStatus(prev => ({ ...prev, isChecking: true, retryCount: attempt }));

          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 10000);

          const response = await fetch(`${API_BASE_URL}/api/health`, {
            method: 'GET',
            signal: controller.signal
          });

          clearTimeout(timeoutId);

          if (response.ok) {
            setServerStatus({ isChecking: false, isActive: true, error: null, retryCount: attempt });
            return true;
          }
        } catch {
          if (attempt < maxRetries - 1) {
            await new Promise(resolve => setTimeout(resolve, retryDelay));
            return attemptHealthCheck(attempt + 1);
          } else {
            setServerStatus({
              isChecking: false,
              isActive: false,
              error: 'Server is not responding. Please try again later.',
              retryCount: attempt
            });
            return false;
          }
        }
      };

      await attemptHealthCheck(0);
    };

    checkServerHealth();
  }, []);

  // ── Update helpers ─────────────────────────────────────────
  const updateSellData = (data) => {
    setSellData(prev => ({ ...prev, ...data }));
  };

  const updateAuthData = (data) => {
    setAuthData(prev => ({ ...prev, ...data }));
  };

  const updateTransferStatus = (data) => {
    setTransferStatus(prev => ({ ...prev, ...data }));
  };

  // ── Reset everything ───────────────────────────────────────
  const resetAll = () => {
    const fresh = defaultSell();
    setSellData(fresh);
    try { localStorage.removeItem(SELL_KEY); } catch { /* ignore */ }
    setAuthData({ phoneNumber: '', pin: '', otp: '', isAuthenticated: false });
    setTransferStatus({ status: 'pending', transferReference: '', approvedAt: null, message: '' });
  };

  // ── Get full payload ───────────────────────────────────────
  const getTransferPayload = () => ({
    sell: sellData,
    auth: {
      phoneNumber: authData.phoneNumber,
      isAuthenticated: authData.isAuthenticated
    },
    transfer: transferStatus
  });

  const value = {
    serverStatus,
    sellData,
    authData,
    transferStatus,
    updateSellData,
    updateAuthData,
    updateTransferStatus,
    getTransferPayload,
    resetAll
  };

  return (
    <EcoLinkContext.Provider value={value}>
      {children}
    </EcoLinkContext.Provider>
  );
};

export default EcoLinkContext;