import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  getAuthToken,
  setAuthToken,
  clearAuthToken,
  isAdminAuthenticated,
  verifyAdminToken,
  getAdminProfile
} from '../services/api';

const AdminAuthContext = createContext({
  isAuthenticated: false,
  token: null,
  admin: null,
  login: () => {},
  logout: () => {},
  checkAuth: async () => false,
  refreshProfile: async () => {},
  updateAdminEmail: () => {}
});

export function AdminAuthProvider({ children }) {
  const [token, setToken] = useState(() => getAuthToken());
  const [isAuthenticated, setIsAuthenticated] = useState(() => isAdminAuthenticated());
  const [admin, setAdmin] = useState(null);

  const refreshProfile = useCallback(async () => {
    if (!isAdminAuthenticated()) {
      setAdmin(null);
      return null;
    }
    try {
      const data = await getAdminProfile();
      if (data?.admin) {
        setAdmin(data.admin);
        return data.admin;
      }
    } catch {
      // If fetching fails, do nothing
    }
    return null;
  }, []);

  useEffect(() => {
    const isAuth = Boolean(token && token.trim().length > 10);
    setIsAuthenticated(isAuth);
    if (isAuth) {
      refreshProfile();
    } else {
      setAdmin(null);
    }
  }, [token, refreshProfile]);

  const login = (newToken, adminData = null) => {
    setAuthToken(newToken);
    setToken(newToken);
    setIsAuthenticated(true);
    if (adminData) {
      setAdmin(adminData);
    } else {
      refreshProfile();
    }
  };

  const logout = () => {
    clearAuthToken();
    setToken(null);
    setAdmin(null);
    setIsAuthenticated(false);
  };

  const updateAdminEmail = (newEmail) => {
    setAdmin((prev) => (prev ? { ...prev, email: newEmail } : { email: newEmail, role: 'admin' }));
  };

  const checkAuth = async () => {
    if (!isAdminAuthenticated()) {
      setIsAuthenticated(false);
      setAdmin(null);
      return false;
    }
    const valid = await verifyAdminToken();
    if (!valid) {
      logout();
      return false;
    }
    setIsAuthenticated(true);
    refreshProfile();
    return true;
  };

  return (
    <AdminAuthContext.Provider
      value={{
        isAuthenticated,
        token,
        admin,
        login,
        logout,
        checkAuth,
        refreshProfile,
        updateAdminEmail
      }}
    >
      {children}
    </AdminAuthContext.Provider>
  );
}

export const useAdminAuth = () => useContext(AdminAuthContext);
export default AdminAuthContext;
