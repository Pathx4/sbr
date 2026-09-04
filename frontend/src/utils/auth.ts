import axios from 'axios';

export interface AuthUser {
  name: string;
  nickname?: string | null;
  position: string;
  email: string;
  section: string;
  sheet?: string;
  is_head?: boolean;
}

const STORAGE_KEY = 'sbr_auth_user';
const TOKEN_KEY = 'sbr_auth_token';

export function getStoredUser(): AuthUser | null {
  try {
    const local = localStorage.getItem(STORAGE_KEY);
    if (local) {
      return JSON.parse(local) as AuthUser;
    }
    const session = sessionStorage.getItem(STORAGE_KEY);
    if (session) {
      return JSON.parse(session) as AuthUser;
    }
  } catch (e) {
    console.error('Error reading stored user', e);
  }
  return null;
}

export function getAuthToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY) || sessionStorage.getItem(TOKEN_KEY) || null;
  } catch (e) {
    return null;
  }
}

export function setAuthSession(user: AuthUser, token: string, rememberMe: boolean): void {
  try {
    const userStr = JSON.stringify(user);
    if (rememberMe) {
      localStorage.setItem(STORAGE_KEY, userStr);
      localStorage.setItem(TOKEN_KEY, token);
      sessionStorage.removeItem(STORAGE_KEY);
      sessionStorage.removeItem(TOKEN_KEY);
    } else {
      sessionStorage.setItem(STORAGE_KEY, userStr);
      sessionStorage.setItem(TOKEN_KEY, token);
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(TOKEN_KEY);
    }
  } catch (e) {
    console.error('Error saving auth session', e);
  }
}

export function clearAuthSession(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(STORAGE_KEY);
    sessionStorage.removeItem(TOKEN_KEY);
  } catch (e) {
    console.error('Error clearing auth session', e);
  }
}

// Backward compatibility alias
export const setStoredUser = (user: AuthUser, rememberMe: boolean) => {
  setAuthSession(user, getAuthToken() || '', rememberMe);
};
export const clearStoredUser = clearAuthSession;

export function getAuthHeaders(): Record<string, string> {
  const token = getAuthToken();
  if (token) {
    return { Authorization: `Bearer ${token}` };
  }
  return {};
}

/**
 * Submit login to backend API with Email and Passcode
 */
export async function loginWithCredentials(
  email: string,
  passcode: string,
  rememberMe: boolean = true
): Promise<{ user: AuthUser; token: string }> {
  try {
    const response = await axios.post('/api/auth/login', {
      email: email.trim(),
      password: passcode.trim(),
    });

    if (response.data && response.data.success) {
      const user = response.data.user as AuthUser;
      const token = response.data.token as string;
      setAuthSession(user, token, rememberMe);
      return { user, token };
    }

    throw new Error(response.data?.message || 'การยืนยันตัวตนล้มเหลว');
  } catch (err: any) {
    const msg = err.response?.data?.message || err.message || 'ไม่สามารถเชื่อมต่อระบบยืนยันตัวตนได้';
    throw new Error(msg);
  }
}

/**
 * Verify current session token with backend
 */
export async function verifyAuthToken(): Promise<boolean> {
  const token = getAuthToken();
  if (!token) return false;

  try {
    const res = await axios.get('/api/auth/verify', {
      headers: { Authorization: `Bearer ${token}` },
      timeout: 10000,
    });
    return !!(res.data && res.data.success);
  } catch (err: any) {
    if (err.response && err.response.status === 401) {
      clearAuthSession();
      return false;
    }
    // If network error, still allow session if user is cached
    return true;
  }
}
