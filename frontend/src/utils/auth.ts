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

export function getStoredUser(): AuthUser | null {
  try {
    // Check localStorage first
    const local = localStorage.getItem(STORAGE_KEY);
    if (local) {
      return JSON.parse(local) as AuthUser;
    }
    // Then check sessionStorage
    const session = sessionStorage.getItem(STORAGE_KEY);
    if (session) {
      return JSON.parse(session) as AuthUser;
    }
  } catch (e) {
    console.error('Error reading stored user', e);
  }
  return null;
}

export function setStoredUser(user: AuthUser, rememberMe: boolean): void {
  try {
    const userStr = JSON.stringify(user);
    if (rememberMe) {
      localStorage.setItem(STORAGE_KEY, userStr);
      sessionStorage.removeItem(STORAGE_KEY);
    } else {
      sessionStorage.setItem(STORAGE_KEY, userStr);
      localStorage.removeItem(STORAGE_KEY);
    }
  } catch (e) {
    console.error('Error saving stored user', e);
  }
}

export function clearStoredUser(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
    sessionStorage.removeItem(STORAGE_KEY);
  } catch (e) {
    console.error('Error clearing stored user', e);
  }
}
