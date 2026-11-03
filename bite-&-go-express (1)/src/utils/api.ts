import { Category, MenuItem, Order, StoreSettings, OrderStatus, AuthUser } from '../types';
import { StorageService } from './storage';

const ADMIN_TOKEN_KEY = 'bg_admin_auth_token_v1';
const AUTH_USER_KEY = 'bg_auth_user_v1';

export const ApiService = {
  // --- AUTHENTICATION ---
  getStoredToken(): string | null {
    if (typeof window === 'undefined') return null;
    return sessionStorage.getItem(ADMIN_TOKEN_KEY) || localStorage.getItem(ADMIN_TOKEN_KEY);
  },

  getStoredUser(): AuthUser | null {
    if (typeof window === 'undefined') return null;
    const str = sessionStorage.getItem(AUTH_USER_KEY) || localStorage.getItem(AUTH_USER_KEY);
    if (!str) return null;
    try {
      return JSON.parse(str);
    } catch {
      return null;
    }
  },

  setAuth(token: string, user: AuthUser) {
    if (typeof window === 'undefined') return;
    sessionStorage.setItem(ADMIN_TOKEN_KEY, token);
    localStorage.setItem(ADMIN_TOKEN_KEY, token);
    sessionStorage.setItem(AUTH_USER_KEY, JSON.stringify(user));
    localStorage.setItem(AUTH_USER_KEY, JSON.stringify(user));
  },

  clearToken() {
    if (typeof window === 'undefined') return;
    sessionStorage.removeItem(ADMIN_TOKEN_KEY);
    localStorage.removeItem(ADMIN_TOKEN_KEY);
    sessionStorage.removeItem(AUTH_USER_KEY);
    localStorage.removeItem(AUTH_USER_KEY);
  },

  async getLockoutStatus(): Promise<{
    locked: boolean;
    remainingSeconds: number;
    attempts: number;
    clientIp: string;
    isWhitelisted: boolean;
    whitelistEnabled: boolean;
  }> {
    try {
      const res = await fetch('/api/auth/lockout-status');
      if (res.ok) {
        return await res.json();
      }
    } catch {}
    return {
      locked: false,
      remainingSeconds: 0,
      attempts: 0,
      clientIp: 'unknown',
      isWhitelisted: true,
      whitelistEnabled: false,
    };
  },

  async login(
    email: string,
    password: string,
    pin?: string
  ): Promise<{
    success: boolean;
    user?: AuthUser;
    token?: string;
    error?: string;
    locked?: boolean;
    remainingSeconds?: number;
    attempts?: number;
    remainingAttempts?: number;
    ipBlocked?: boolean;
  }> {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, pin }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        const user: AuthUser = {
          email: data.email,
          role: data.role,
          name: data.name,
        };
        if (data.token) {
          this.setAuth(data.token, user);
        }
        return { success: true, token: data.token, user };
      }

      return {
        success: false,
        error: data.error || 'Authentication failed',
        locked: Boolean(data.locked || res.status === 429),
        remainingSeconds: data.remainingSeconds || (res.status === 429 ? 900 : 0),
        attempts: data.attempts || 0,
        remainingAttempts: data.remainingAttempts,
        ipBlocked: Boolean(data.ipBlocked || res.status === 403),
      };
    } catch (err: any) {
      return { success: false, error: err.message || 'Connection to server failed' };
    }
  },

  async loginWithGoogle(
    email: string,
    name?: string
  ): Promise<{ success: boolean; user?: AuthUser; token?: string; error?: string }> {
    try {
      const res = await fetch('/api/auth/google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, name }),
      });
      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data.error || 'Google sign-in failed' };
      }
      const user: AuthUser = {
        email: data.user.email,
        role: data.user.role,
        name: data.user.name,
      };
      if (data.token) {
        this.setAuth(data.token, user);
      }
      return { success: true, token: data.token, user };
    } catch (err: any) {
      return { success: false, error: err.message || 'Google authentication network error' };
    }
  },

  async syncStaffAccount(account: {
    email: string;
    password?: string;
    name: string;
    role: string;
    station?: string;
  }): Promise<boolean> {
    try {
      const token = this.getStoredToken();
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;
      const res = await fetch('/api/admin/staff-accounts', {
        method: 'POST',
        headers,
        body: JSON.stringify(account),
      });
      return res.ok;
    } catch {
      return false;
    }
  },

  async deleteStaffAccount(email: string): Promise<boolean> {
    try {
      const token = this.getStoredToken();
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;
      const res = await fetch(`/api/admin/staff-accounts/${encodeURIComponent(email)}`, {
        method: 'DELETE',
        headers,
      });
      return res.ok;
    } catch {
      return false;
    }
  },

  async assignRider(orderId: string, rider: any): Promise<boolean> {
    try {
      const token = this.getStoredToken();
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;
      const res = await fetch(`/api/orders/${encodeURIComponent(orderId)}/assign-rider`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ rider }),
      });
      return res.ok;
    } catch {
      return false;
    }
  },

  async verifyGatePasscode(passcode: string): Promise<{ success: boolean; error?: string }> {
    try {
      const res = await fetch('/api/auth/gate-verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ passcode }),
      });
      const data = await res.json();
      if (!res.ok) return { success: false, error: data.error || 'Gate passcode incorrect' };
      return { success: true };
    } catch {
      return { success: false, error: 'Connection error' };
    }
  },

  async getAuditLogs(): Promise<Array<{ id: string; timestamp: string; ip: string; email: string; role: string; event: string; details: string }>> {
    const token = this.getStoredToken();
    try {
      const res = await fetch('/api/admin/audit-logs', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) return await res.json();
    } catch {}
    return [];
  },

  async getMyIp(): Promise<{ ip: string; isWhitelisted: boolean; whitelistEnabled: boolean; whitelist: string[] }> {
    try {
      const res = await fetch('/api/staff/my-ip');
      if (res.ok) return await res.json();
    } catch {}
    return { ip: '127.0.0.1', isWhitelisted: true, whitelistEnabled: false, whitelist: [] };
  },

  async verifyAuth(): Promise<{ authenticated: boolean; user?: AuthUser }> {
    const token = this.getStoredToken();
    if (!token) return { authenticated: false };
    try {
      const res = await fetch('/api/auth/verify', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.authenticated && data.user) {
        return { authenticated: true, user: data.user };
      }
      return { authenticated: false };
    } catch {
      return { authenticated: false };
    }
  },

  async changePassword(newPassword: string, targetEmail?: string): Promise<{ success: boolean; error?: string }> {
    const token = this.getStoredToken();
    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ newPassword, targetEmail }),
      });
      const data = await res.json();
      if (!res.ok) return { success: false, error: data.error };
      return { success: true };
    } catch {
      return { success: false, error: 'Failed to update password' };
    }
  },

  // --- KITCHEN SPECIFIC ACTIONS ---
  async kitchenAcceptOrder(orderId: string, prepMinutes?: number): Promise<{ success: boolean; order?: Order }> {
    const token = this.getStoredToken();
    const res = await fetch(`/api/kitchen/orders/${encodeURIComponent(orderId)}/accept`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ prepMinutes }),
    });
    if (!res.ok) throw new Error('Failed to accept order');
    return await res.json();
  },

  async kitchenDelayOrder(orderId: string, delayMinutes: number, reason: string): Promise<{ success: boolean; order?: Order }> {
    const token = this.getStoredToken();
    const res = await fetch(`/api/kitchen/orders/${encodeURIComponent(orderId)}/delay`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ delayMinutes, reason }),
    });
    if (!res.ok) throw new Error('Failed to delay order');
    return await res.json();
  },

  async kitchenDeclineOrder(orderId: string, reason: string): Promise<{ success: boolean; order?: Order }> {
    const token = this.getStoredToken();
    const res = await fetch(`/api/kitchen/orders/${encodeURIComponent(orderId)}/decline`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ reason }),
    });
    if (!res.ok) throw new Error('Failed to decline order');
    return await res.json();
  },

  async kitchenReadyOrder(orderId: string): Promise<{ success: boolean; order?: Order }> {
    const token = this.getStoredToken();
    const res = await fetch(`/api/kitchen/orders/${encodeURIComponent(orderId)}/ready`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error('Failed to mark order ready');
    return await res.json();
  },

  // --- PUBLIC ENDPOINTS ---
  async getMenu(): Promise<{ categories: Category[]; items: MenuItem[] }> {
    try {
      const res = await fetch('/api/menu');
      if (res.ok) return await res.json();
    } catch (e) {
      console.warn('Could not fetch from backend, fallback to local', e);
    }
    return { categories: [], items: [] };
  },

  async getSettings(): Promise<StoreSettings | null> {
    try {
      const res = await fetch('/api/settings');
      if (res.ok) return await res.json();
    } catch {
      // fallback
    }
    return null;
  },

  async createOrder(order: Omit<Order, 'id' | 'createdAt' | 'statusHistory'>): Promise<Order> {
    const res = await fetch('/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(order),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to place order');
    }
    return await res.json();
  },

  async getOrder(id: string): Promise<Order | null> {
    try {
      const res = await fetch(`/api/orders/${encodeURIComponent(id)}`);
      if (res.ok) return await res.json();
    } catch {
      // fallback
    }
    return null;
  },

  // --- PROTECTED ADMIN API ---
  async getAdminOrders(): Promise<Order[]> {
    const token = this.getStoredToken();
    const res = await fetch('/api/admin/orders', {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error('Unauthorized');
    return await res.json();
  },

  async updateOrderStatus(orderId: string, status: OrderStatus, note?: string): Promise<Order> {
    const token = this.getStoredToken();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    const res = await fetch(`/api/admin/orders/${encodeURIComponent(orderId)}/status`, {
      method: 'PUT',
      headers,
      body: JSON.stringify({ status, note }),
    });
    if (!res.ok) {
      const fallbackRes = await fetch(`/api/orders/${encodeURIComponent(orderId)}/status`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({ status, note }),
      });
      if (!fallbackRes.ok) throw new Error('Failed to update status');
      return await fallbackRes.json();
    }
    return await res.json();
  },

  async declineOrder(orderId: string, reason: string): Promise<Order> {
    const token = this.getStoredToken();
    try {
      const res = await fetch(`/api/admin/orders/${encodeURIComponent(orderId)}/decline`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ reason }),
      });
      if (res.ok) {
        const data = await res.json();
        return data.order || data;
      }
    } catch {}

    try {
      const res = await fetch(`/api/kitchen/orders/${encodeURIComponent(orderId)}/decline`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ reason }),
      });
      if (res.ok) {
        const data = await res.json();
        return data.order;
      }
    } catch {}

    try {
      const res = await fetch(`/api/admin/orders/${encodeURIComponent(orderId)}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status: 'cancelled', note: `Order declined: ${reason}`, reason }),
      });
      if (res.ok) {
        const data = await res.json();
        return data.order || data;
      }
    } catch {}

    return null as any;
  },

  async adjustOrderTimer(orderId: string, prepMinutes: number, reason?: string): Promise<Order> {
    const token = this.getStoredToken();
    try {
      const res = await fetch(`/api/kitchen/orders/${encodeURIComponent(orderId)}/delay`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ delayMinutes: prepMinutes, reason }),
      });
      if (res.ok) {
        const data = await res.json();
        return data.order;
      }
    } catch {}
    return null as any;
  },

  async verifyPayment(orderId: string, approve: boolean): Promise<Order> {
    const token = this.getStoredToken();
    const res = await fetch(`/api/admin/orders/${encodeURIComponent(orderId)}/verify-payment`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ approve }),
    });
    if (!res.ok) throw new Error('Failed to verify payment');
    return await res.json();
  },

  async createMenuItem(item: Omit<MenuItem, 'id' | 'order'>): Promise<MenuItem> {
    const token = this.getStoredToken();
    const res = await fetch('/api/admin/menu/items', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(item),
    });
    if (!res.ok) throw new Error('Failed to create menu item');
    return await res.json();
  },

  async updateMenuItem(item: MenuItem): Promise<MenuItem> {
    const token = this.getStoredToken();
    const res = await fetch(`/api/admin/menu/items/${encodeURIComponent(item.id)}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(item),
    });
    if (!res.ok) throw new Error('Failed to update item');
    return await res.json();
  },

  async deleteMenuItem(id: string): Promise<void> {
    const token = this.getStoredToken();
    const res = await fetch(`/api/admin/menu/items/${encodeURIComponent(id)}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error('Failed to delete item');
  },

  async toggleItemStock(id: string): Promise<MenuItem> {
    const token = this.getStoredToken();
    const res = await fetch(`/api/admin/menu/items/${encodeURIComponent(id)}/toggle-stock`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error('Failed to toggle stock');
    return await res.json();
  },

  async reorderItem(itemId: string, direction: 'up' | 'down'): Promise<void> {
    const token = this.getStoredToken();
    const res = await fetch('/api/admin/menu/items/reorder', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ itemId, direction }),
    });
    if (!res.ok) throw new Error('Failed to reorder item');
  },

  async createCategory(data: { name: string; description?: string }): Promise<Category> {
    const token = this.getStoredToken();
    const res = await fetch('/api/admin/menu/categories', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Failed to create category');
    return await res.json();
  },

  async reorderCategory(categoryId: string, direction: 'up' | 'down'): Promise<void> {
    const token = this.getStoredToken();
    const res = await fetch('/api/admin/menu/categories/reorder', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ categoryId, direction }),
    });
    if (!res.ok) throw new Error('Failed to reorder category');
  },

  async deleteCategory(categoryId: string): Promise<void> {
    const token = this.getStoredToken();
    const res = await fetch(`/api/admin/menu/categories/${encodeURIComponent(categoryId)}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    if (!res.ok) throw new Error('Failed to delete category');
  },

  async updateSettings(settings: StoreSettings): Promise<StoreSettings> {
    const token = this.getStoredToken();
    const res = await fetch('/api/admin/settings', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(settings),
    });
    if (!res.ok) throw new Error('Failed to update settings');
    return await res.json();
  },

  async clearOrderHistory(preserveActive = false): Promise<{ success: boolean; deletedCount: number; remainingCount: number }> {
    const token = this.getStoredToken();
    try {
      const res = await fetch(`/api/admin/orders/history?preserveActive=${preserveActive}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (res.ok) {
        return await res.json();
      }
    } catch {}
    return { success: true, deletedCount: 0, remainingCount: 0 };
  },
};
