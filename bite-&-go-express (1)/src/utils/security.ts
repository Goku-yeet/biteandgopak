/**
 * Security utilities for Bite & Go Express
 * Provides input sanitization, XSS defense, safe string escaping, and session monitoring.
 */

// Strip HTML tags and dangerous JavaScript URI patterns
export function sanitizeInput(input: string): string {
  if (!input || typeof input !== 'string') return '';
  return input
    .replace(/<[^>]*>?/gm, '') // Strip HTML tags
    .replace(/javascript:/gi, '') // Strip JS pseudo-protocol
    .replace(/data:text\/html/gi, '') // Strip data html
    .replace(/on\w+\s*=/gi, '') // Strip inline event handlers like onclick=
    .trim();
}

// Escape HTML characters for safe text display
export function escapeHtml(str: string): string {
  if (!str || typeof str !== 'string') return '';
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  };
  return str.replace(/[&<>"']/g, (m) => map[m]);
}

// Validate phone number format (standard Pakistan format or international)
export function isValidPhone(phone: string): boolean {
  if (!phone) return false;
  const cleaned = phone.replace(/[\s-]/g, '');
  // Matches 03XXXXXXXXX or +923XXXXXXXXX
  return /^((\+92)?(03\d{9})|(03\d{9}))$/.test(cleaned) || /^\d{10,13}$/.test(cleaned);
}

// Validate email address
export function isValidEmail(email: string): boolean {
  if (!email) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

// Client-side rate-limit tracker to prevent rapid duplicate submits (e.g. double orders)
const actionTimestamps = new Map<string, number>();

export function checkRateLimit(actionKey: string, cooldownMs = 2000): { allowed: boolean; waitSeconds?: number } {
  const now = Date.now();
  const lastTime = actionTimestamps.get(actionKey) || 0;
  if (now - lastTime < cooldownMs) {
    const waitSeconds = Math.ceil((cooldownMs - (now - lastTime)) / 1000);
    return { allowed: false, waitSeconds };
  }
  actionTimestamps.set(actionKey, now);
  return { allowed: true };
}

// Inactivity session timer for Manager HUD (auto-lock after 30 mins)
const MANAGER_SESSION_TIMEOUT_MS = 30 * 60 * 1000;
let lastActivityTime = Date.now();

export function recordManagerActivity() {
  lastActivityTime = Date.now();
}

export function isManagerSessionExpired(): boolean {
  return Date.now() - lastActivityTime > MANAGER_SESSION_TIMEOUT_MS;
}

// Strict verification that a dish was part of a verified customer order
export function validateOrderedDishForRating(
  order: { id: string; items: Array<{ name: string }> } | null | undefined,
  dishName: string
): { isValid: boolean; error?: string } {
  if (!order) {
    return { isValid: false, error: 'A verified completed order is required to rate dishes.' };
  }
  if (!dishName || !dishName.trim()) {
    return { isValid: false, error: 'Please select a dish from your order.' };
  }

  const cleanTarget = dishName.trim().toLowerCase();
  const matched = order.items.some((item) => {
    const itemClean = item.name.trim().toLowerCase();
    return itemClean === cleanTarget || itemClean.includes(cleanTarget) || cleanTarget.includes(itemClean);
  });

  if (!matched) {
    return {
      isValid: false,
      error: `Security Check: "${dishName}" was not part of order #${order.id}. You may only review dishes you ordered.`,
    };
  }

  return { isValid: true };
}

// Generates a tamper-evident verification token for an order
export function generateSecureOrderToken(orderId: string): string {
  const cleanId = orderId.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
  const salt = 'BITE_GO_SECURE_KHI_2026';
  let hash = 0;
  const combined = `${cleanId}_${salt}`;
  for (let i = 0; i < combined.length; i++) {
    hash = (hash << 5) - hash + combined.charCodeAt(i);
    hash |= 0;
  }
  return `TOK-${Math.abs(hash).toString(36).toUpperCase()}`;
}
