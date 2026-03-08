import React, { createContext, useContext, useState, useEffect } from 'react';
import { jwtDecode } from 'jwt-decode';
import { authAPI } from '../api';

// Create the auth context
const AuthContext = createContext();

// Custom hook to use the auth context
export const useAuth = () => useContext(AuthContext);

// Provider component
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Check if user is already logged in (on app load)
  useEffect(() => {
    const checkLoggedIn = async () => {
      try {
        const token = localStorage.getItem('token');
        if (token) {
          try {
            // Verify token is valid and not expired
            const decodedToken = jwtDecode(token);
            const currentTime = Date.now() / 1000;
            
            if (decodedToken.exp < currentTime) {
              // Token expired, log out
              logout();
            } else {
              // For development purposes, set a mock user if API call fails
              try {
                // Token valid, get user profile
                const response = await authAPI.getProfile();
                setUser(response.data);
              } catch (profileError) {
                console.warn('Could not fetch profile, using token data', profileError);
                // Use the data from the token as a fallback
                setUser({
                  _id: decodedToken.id || decodedToken._id,
                  name: decodedToken.name || 'Student User',
                  email: decodedToken.email || 'student@example.com',
                  role: decodedToken.role || 'student'
                });
              }
            }
          } catch (tokenError) {
            console.error('Invalid token:', tokenError);
            // Fallback: support base64-encoded JSON tokens used in development
            try {
              const currentTime = Date.now() / 1000;
              const base64Payload = token.includes('.') ? token.split('.')[1] : token;
              const decodedRaw = atob(base64Payload);
              const parsed = JSON.parse(decodedRaw);
              if (parsed.exp && parsed.exp < currentTime) {
                logout();
              } else {
                setUser({
                  _id: parsed.id || parsed._id,
                  name: parsed.name || 'Student User',
                  email: parsed.email || 'student@example.com',
                  role: parsed.role || 'student'
                });
              }
            } catch (fallbackError) {
              console.error('Token fallback parse failed:', fallbackError);
              logout();
            }
          }
        }
      } catch (err) {
        console.error('Authentication error:', err);
        setError('Session expired. Please login again.');
        logout();
      } finally {
        setLoading(false);
      }
    };

    checkLoggedIn();
  }, []);

  // Register a new user
  const register = async (userData) => {
    try {
      setLoading(true);
      setError(null);
      const response = await authAPI.register(userData);
      const { token, ...userInfo } = response.data;
      
      // Save token and user info
      localStorage.setItem('token', token);
      setUser(userInfo);
      return userInfo;
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Login user
  const login = async (credentials) => {
    try {
      setLoading(true);
      setError(null);
      
      // Send the complete credentials including role
      const response = await authAPI.login(credentials);
      const { token, user: userInfo } = response.data;
      
      // Save token and user info
      localStorage.setItem('token', token);
      setUser(userInfo);
      return userInfo;
    } catch (err) {
      const msg = err.response?.data?.message
        || (typeof err.response?.data === 'string' ? err.response.data : null)
        || err.message
        || 'Login failed';
      setError(msg);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Logout user
  const logout = () => {
    localStorage.removeItem('token');
    setUser(null);
  };

  // Check if user is admin
  const isAdmin = () => {
    return user?.role === 'admin';
  };

  // Check if user is student
  const isStudent = () => {
    return user?.role === 'student';
  };

  // Check if user is principal
  const isPrincipal = () => {
    return user?.role === 'principal';
  };

  // Check if user is HOD
  const isHod = () => {
    return user?.role === 'hod';
  };

  // Context value
  const value = {
    user,
    loading,
    error,
    register,
    login,
    logout,
    isAdmin,
    isStudent,
    isPrincipal,
    isHod,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export default AuthContext;