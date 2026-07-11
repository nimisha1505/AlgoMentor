import React, {
  createContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
} from 'react';
import {
  registerUser,
  loginUser,
  logoutUser,
  getCurrentUser,
} from '../api/auth.api.js';

const AuthContext = createContext(null);

const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isAuthLoading, setIsAuthLoading] = useState(true);

  // Check auth session status on initial load
  useEffect(() => {
    let isMounted = true;
    const checkCurrentSession = async () => {
      try {
        const currentUser = await getCurrentUser();
        if (isMounted) {
          setUser(currentUser);
          setIsAuthenticated(true);
        }
      } catch (error) {
        if (isMounted) {
          setUser(null);
          setIsAuthenticated(false);
        }
      } finally {
        if (isMounted) {
          setIsAuthLoading(false);
        }
      }
    };

    checkCurrentSession();

    return () => {
      isMounted = false;
    };
  }, []);

  // Listen for session expiration events dispatched by axiosClient interceptor
  useEffect(() => {
    const handleSessionExpired = () => {
      setUser(null);
      setIsAuthenticated(false);
      setIsAuthLoading(false);
    };

    window.addEventListener('auth:session-expired', handleSessionExpired);
    return () => {
      window.removeEventListener('auth:session-expired', handleSessionExpired);
    };
  }, []);

  // Register function
  const register = useCallback(async (userData) => {
    return await registerUser(userData);
  }, []);

  // Login function
  const login = useCallback(async (credentials) => {
    const responseData = await loginUser(credentials);
    let loggedInUser = responseData?.user;

    // Fallback in case user details are not returned directly in login response
    if (!loggedInUser) {
      loggedInUser = await getCurrentUser();
    }

    setUser(loggedInUser);
    setIsAuthenticated(true);
    return loggedInUser;
  }, []);

  // Logout function
  const logout = useCallback(async () => {
    try {
      await logoutUser();
    } finally {
      setUser(null);
      setIsAuthenticated(false);
    }
  }, []);

  // Force refreshing user profile
  const refreshCurrentUser = useCallback(async () => {
    try {
      const currentUser = await getCurrentUser();
      setUser(currentUser);
      setIsAuthenticated(true);
      return currentUser;
    } catch (error) {
      setUser(null);
      setIsAuthenticated(false);
      throw error;
    }
  }, []);

  const contextValue = useMemo(
    () => ({
      user,
      isAuthenticated,
      isAuthLoading,
      register,
      login,
      logout,
      refreshCurrentUser,
    }),
    [
      user,
      isAuthenticated,
      isAuthLoading,
      register,
      login,
      logout,
      refreshCurrentUser,
    ]
  );

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};

export { AuthContext, AuthProvider };
