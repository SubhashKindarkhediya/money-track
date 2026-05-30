import React, { createContext, useContext, useState, useEffect } from 'react';

interface User {
  id: string;
  name: string;
  email: string;
  phone_number?: string;
  gender?: string;
  address?: string;
  first_name?: string;
  last_name?: string;
  dob?: string;
  id_card_no?: string;
  currency?: string;
  monthly_budget?: number;
  profile_picture?: string;
  upi_id?: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (token: string, user: User) => void;
  logout: () => void;
  updateUser: (newUser: User) => void;
  loading: boolean;
  isWakingUp: boolean;
  currencySymbol: string;
}

// Helper: check if a JWT token is expired (client-side, no secret needed)
const isTokenExpired = (token: string): boolean => {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    // exp is in seconds, Date.now() is in milliseconds
    return payload.exp * 1000 < Date.now();
  } catch {
    return true; // If we can't decode it, treat as expired
  }
};

// Helper: verify token is valid with the backend (user still exists in DB)
const verifySessionWithBackend = async (token: string): Promise<boolean> => {
  try {
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1';
    const response = await fetch(`${apiUrl}/auth/me`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });
    // Only force logout if explicitly unauthorized (401) or user not found (404)
    if (response.status === 401 || response.status === 404) {
      return false;
    }
    
    // For 200, or 5xx server errors, assume valid to avoid aggressive logouts
    return true;
  } catch {
    // Network error — don't force logout, assume offline
    // We only force logout when we get a clear 401 from server
    return true;
  }
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isWakingUp, setIsWakingUp] = useState(false);

  useEffect(() => {
    const initSession = async () => {
      const savedToken = localStorage.getItem('token');
      const savedUser = localStorage.getItem('user');

      if (savedToken && !isTokenExpired(savedToken)) {
        // Token looks valid locally — now verify with backend that user still exists
        
        // If it takes more than 1.5 seconds, backend might be sleeping (Cold Start)
        const wakeUpTimeout = setTimeout(() => setIsWakingUp(true), 1500);
        
        const isValid = await verifySessionWithBackend(savedToken);
        
        clearTimeout(wakeUpTimeout);
        setIsWakingUp(false);

        if (isValid) {
          // User exists in DB — restore session
          setToken(savedToken);
          if (savedUser) {
            setUser(JSON.parse(savedUser));
          }
        } else {
          // User was deleted from DB — clear stale session and force login
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          setToken(null);
          setUser(null);
        }
      } else if (savedToken) {
        // Token is expired — clear stale data
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      }

      setLoading(false);
    };

    initSession();
  }, []);

  const login = (newToken: string, newUser: User) => {
    localStorage.setItem('token', newToken);
    localStorage.setItem('user', JSON.stringify(newUser));
    setToken(newToken);
    setUser(newUser);
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setToken(null);
    setUser(null);
  };



  const updateUser = (newUser: User) => {
    localStorage.setItem('user', JSON.stringify(newUser));
    setUser(newUser);
  };

  const currencySymbol = user?.currency === 'USD' ? '$' : user?.currency === 'EUR' ? '€' : '₹';

  return (
    <AuthContext.Provider value={{ user, token, login, logout, updateUser, loading, isWakingUp, currencySymbol }}>
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
