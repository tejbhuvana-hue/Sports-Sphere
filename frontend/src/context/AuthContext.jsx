import React, { createContext, useContext, useState, useEffect } from 'react';
import { authAPI, notificationsAPI } from '../services/api';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('user');
    return saved ? JSON.parse(saved) : null;
  });
  const [token, setToken] = useState(() => localStorage.getItem('token') || null);
  const [isLoading, setIsLoading] = useState(true);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [unreadMessages, setUnreadMessages] = useState(0);

  const fetchCurrentUser = async () => {
    const storedToken = localStorage.getItem('token');
    if (!storedToken) {
      setUser(null);
      setIsLoading(false);
      return;
    }
    try {
      const res = await authAPI.getCurrentUser();
      setUser(res.data.user);
      localStorage.setItem('user', JSON.stringify(res.data.user));
      setUnreadNotifications(res.data.unread_notifications_count || 0);
      setUnreadMessages(res.data.unread_messages_count || 0);
    } catch (err) {
      console.error('Failed to fetch current user', err);
      setUser(null);
      setToken(null);
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCurrentUser();
  }, []);

  const login = async (username, password) => {
    const res = await authAPI.login({ username, password });
    const { token: authToken, user: userData } = res.data;
    setToken(authToken);
    setUser(userData);
    localStorage.setItem('token', authToken);
    localStorage.setItem('user', JSON.stringify(userData));
    await fetchCurrentUser();
    return userData;
  };

  const register = async (formData) => {
    const res = await authAPI.register(formData);
    const { token: authToken, user: userData } = res.data;
    setToken(authToken);
    setUser(userData);
    localStorage.setItem('token', authToken);
    localStorage.setItem('user', JSON.stringify(userData));
    await fetchCurrentUser();
    return userData;
  };

  const logout = async () => {
    try {
      if (token) {
        await authAPI.logout();
      }
    } catch (err) {
      console.warn('Logout API error', err);
    } finally {
      setUser(null);
      setToken(null);
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    }
  };

  const refreshUser = async () => {
    await fetchCurrentUser();
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        isAuthenticated: !!user && !!token,
        isAdmin: !!user && (user.is_superuser || user.is_staff),
        unreadNotifications,
        unreadMessages,
        setUnreadNotifications,
        setUnreadMessages,
        login,
        register,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
