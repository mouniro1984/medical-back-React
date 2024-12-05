import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import axios from 'axios';

interface User {
  id: string;
  email: string;
  nom: string;
  prenom: string;
}

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const TIMEOUT_DURATION = 15 * 60 * 1000; // 15 minutes in milliseconds

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    const savedUser = localStorage.getItem('user');
    return savedUser ? JSON.parse(savedUser) : null;
  });
  
  const timeoutRef = useRef<NodeJS.Timeout>();
  const [timeRemaining, setTimeRemaining] = useState(TIMEOUT_DURATION);

  const logout = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    sessionStorage.setItem('clearLoginFields', 'true');
  }, []);

  const resetTimeout = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    if (user) {
      timeoutRef.current = setTimeout(logout, TIMEOUT_DURATION);
      setTimeRemaining(TIMEOUT_DURATION);
    }
  }, [user, logout]);

  useEffect(() => {
    let intervalId: NodeJS.Timeout;

    const handleActivity = () => {
      resetTimeout();
    };

    if (user) {
      // Start initial timeout
      resetTimeout();

      // Update remaining time display
      intervalId = setInterval(() => {
        setTimeRemaining(prev => Math.max(0, prev - 1000));
      }, 1000);

      // Add event listeners for user activity
      window.addEventListener('mousemove', handleActivity);
      window.addEventListener('keypress', handleActivity);
      window.addEventListener('click', handleActivity);
      window.addEventListener('scroll', handleActivity);
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      if (intervalId) {
        clearInterval(intervalId);
      }
      window.removeEventListener('mousemove', handleActivity);
      window.removeEventListener('keypress', handleActivity);
      window.removeEventListener('click', handleActivity);
      window.removeEventListener('scroll', handleActivity);
    };
  }, [user, resetTimeout]);

  const login = useCallback(async (email: string, password: string) => {
    try {
      const response = await axios.post('http://localhost:5000/api/auth/login', {
        email,
        password
      });

      const { token, user } = response.data;
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));
      setUser(user);
      setTimeRemaining(TIMEOUT_DURATION);
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  }, []);

  const formatTimeRemaining = () => {
    const minutes = Math.floor(timeRemaining / 60000);
    const seconds = Math.floor((timeRemaining % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const value = {
    user,
    login,
    logout,
    isAuthenticated: !!user
  };

  return (
    <AuthContext.Provider value={value}>
      {user && (
        <div className="fixed top-0 right-0 m-4 p-2 bg-yellow-100 text-yellow-800 rounded shadow-sm text-sm flex items-center space-x-2">
          <span>Session active - Déconnexion dans</span>
          <span className="font-mono font-bold">{formatTimeRemaining()}</span>
        </div>
      )}
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};