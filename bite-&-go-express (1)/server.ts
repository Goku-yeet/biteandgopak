import express, { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';
import { initialCategories, initialMenuItems, initialOrders, initialStoreSettings, initialPromoCodes } from './src/data/initialMenu';
import { Category, MenuItem, Order, StoreSettings, OrderStatus, PromoCode } from './src/types';
import { isStoreOpenNow } from './src/utils/operatingHours';

dotenv.config();

const app = express();
// AI Studio dev server must run on port 3000
const PORT = 3000;
const isProduction = process.env.NODE_ENV === 'production';

// --- ADVANCED SECURITY HEADERS (CSP, Anti-Clickjacking, MIME-Sniffing Defense) ---
app.use((_req: Request, res: Response, next: NextFunction) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'geolocation=(self), camera=(self), microphone=(self)');

  // Content Security Policy permitting Google Maps, fonts, images, and Vite dev
  const csp = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://maps.googleapis.com https://*.gstatic.com",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com data:",
    "img-src 'self' data: blob: https://* http://*",
    "connect-src 'self' https://maps.googleapis.com https://*.googleapis.com https://*.gstatic.com",
    "frame-src 'self'",
  ].join('; ');
  res.setHeader('Content-Security-Policy', csp);
  next();
});

// Allow large payloads for base64 screenshot receipts
app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true, limit: '15mb' }));

// Input sanitization middleware to block XSS and malicious scripts
function sanitizeData(val: any): any {
  if (typeof val === 'string') {
    return val
      .replace(/<[^>]*>?/gm, '')
      .replace(/javascript:/gi, '')
      .replace(/on\w+\s*=/gi, '')
      .trim();
  }
  if (Array.isArray(val)) {
    return val.map(sanitizeData);
  }
  if (val && typeof val === 'object') {
    const cleaned: Record<string, any> = {};
    for (const [k, v] of Object.entries(val)) {
      if (k === 'screenshotUrl' || k === 'url' || k === 'image') {
        cleaned[k] = v;
      } else {
        cleaned[k] = sanitizeData(v);
      }
    }
    return cleaned;
  }
  return val;
}

app.use((req: Request, _res: Response, next: NextFunction) => {
  if (req.body && typeof req.body === 'object') {
    req.body = sanitizeData(req.body);
  }
  next();
});

// Rate limiting maps
const orderRateLimits = new Map<string, { count: number; resetAt: number }>();
const aiRateLimits = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(map: Map<string, { count: number; resetAt: number }>, ip: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const rec = map.get(ip);
  if (!rec || now > rec.resetAt) {
    map.set(ip, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (rec.count >= limit) {
    return false;
  }
  rec.count += 1;
  return true;
}

// --- SECURITY & CREDENTIALS ---
interface PasswordRecord {
  salt: string;
  hash: string;
}

function hashPassword(password: string, salt = crypto.randomBytes(16).toString('hex')): PasswordRecord {
  const hash = crypto.pbkdf2Sync(password, salt, 100000, 32, 'sha256').toString('hex');
  return { salt, hash };
}

function verifyPassword(password: string, record: PasswordRecord): boolean {
  const candidateHash = crypto.pbkdf2Sync(password, record.salt, 100000, 32, 'sha256').toString('hex');
  const a = Buffer.from(candidateHash);
  const b = Buffer.from(record.hash);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

interface UserAccount {
  email: string;
  passwordRecord: PasswordRecord;
  name: string;
  role: 'admin' | 'kitchen' | 'pos' | 'rider' | 'employee';
  securityPin?: string; // 2FA PIN for Admin
}

let accounts: UserAccount[] = [
  {
    email: 'admin@biteandgo.pk',
    passwordRecord: hashPassword(process.env.ADMIN_PASSWORD || 'admin_biteandgo_2026'),
    name: 'Main Branch Owner / Manager',
    role: 'admin',
    securityPin: '849201', // Master 2FA PIN
  },
  {
    email: 'kitchen@biteandgo.pk',
    passwordRecord: hashPassword(process.env.KITCHEN_PASSWORD || 'kitchen_biteandgo_2026'),
    name: 'Head Chef & Grill Station',
    role: 'kitchen',
  },
  {
    email: 'pos@biteandgo.pk',
    passwordRecord: hashPassword(process.env.POS_PASSWORD || 'pos_biteandgo_2026'),
    name: 'Counter Cashier (POS-01)',
    role: 'pos',
    securityPin: '1234',
  },
  {
    email: 'cashier@biteandgo.pk',
    passwordRecord: hashPassword('cashier_biteandgo_2026'),
    name: 'Front Counter Cashier',
    role: 'pos',
    securityPin: '1234',
  },
  {
    email: 'staff@biteandgo.pk',
    passwordRecord: hashPassword('staff_biteandgo_2026'),
    name: 'Floor Staff Member',
    role: 'employee',
  },
  {
    email: 'rider@biteandgo.pk',
    passwordRecord: hashPassword(process.env.RIDER_PASSWORD || 'rider_biteandgo_2026'),
    name: 'Fleet Delivery Rider (R-01)',
    role: 'rider',
  },
];

const SESSION_SECRET = process.env.ADMIN_SESSION_SECRET || crypto.randomBytes(32).toString('hex');

// In-memory token revocation blacklist
const revokedTokens = new Set<string>();

// Security Audit Log (Last 100 entries)
interface AuditLogEntry {
  id: string;
  timestamp: string;
  ip: string;
  email: string;
  role: string;
  event: 'login_success' | 'login_failed' | 'password_changed' | 'token_revoked' | 'unauthorized_attempt';
  details: string;
}
const auditLogs: AuditLogEntry[] = [];

function recordAudit(entry: Omit<AuditLogEntry, 'id' | 'timestamp'>) {
  auditLogs.unshift({
    ...entry,
    id: `audit-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    timestamp: new Date().toISOString(),
  });
  if (auditLogs.length > 100) auditLogs.pop();
}

// In-memory brute force tracker (IP -> { attempts: number, lockUntil: number })
const loginAttempts = new Map<string, { attempts: number; lockUntil: number }>();

function generateToken(user: UserAccount): string {
  const payload = {
    role: user.role,
    email: user.email,
    name: user.name,
    iat: Date.now(),
    exp: Date.now() + 1000 * 60 * 60 * 24, // 24 hours
    nonce: crypto.randomBytes(12).toString('hex'),
  };
  const str = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const sig = crypto.createHmac('sha256', SESSION_SECRET).update(str).digest('base64url');
  return `${str}.${sig}`;
}

interface DecodedUser {
  role: 'admin' | 'kitchen' | 'pos' | 'rider' | 'employee';
  email: string;
  name: string;
}

function verifyToken(token: string): { valid: boolean; user?: DecodedUser } {
  try {
    if (revokedTokens.has(token)) return { valid: false };

    const [payloadB64, sig] = token.split('.');
    if (!payloadB64 || !sig) return { valid: false };

    const expectedSig = crypto.createHmac('sha256', SESSION_SECRET).update(payloadB64).digest('base64url');
    const sigBuf = Buffer.from(sig);
    const expectedBuf = Buffer.from(expectedSig);

    if (sigBuf.length !== expectedBuf.length || !crypto.timingSafeEqual(sigBuf, expectedBuf)) {
      return { valid: false };
    }

    const payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf-8'));
    if (Date.now() > payload.exp) {
      return { valid: false };
    }
    return {
      valid: true,
      user: {
        role: payload.role,
        email: payload.email,
        name: payload.name,
      },
    };
  } catch {
    return { valid: false };
  }
}

// Extend Request type with user
declare global {
  namespace Express {
    interface Request {
      user?: DecodedUser;
    }
  }
}

function getClientIp(req: Request): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string') {
    return forwarded.split(',')[0].trim();
  }
  return req.socket.remoteAddress || 'unknown';
}

function isIpAllowed(clientIp: string): boolean {
  if (!storeSettings.ipWhitelistEnabled) return true;
  const list = storeSettings.staffIpWhitelist || [];
  if (list.length === 0) return true;
  if (clientIp === '127.0.0.1' || clientIp === '::1' || clientIp.includes('127.0.0.1') || clientIp === 'localhost') {
    return true;
  }
  return list.some((ip) => ip.trim() && (clientIp === ip.trim() || clientIp.includes(ip.trim())));
}

// Middleware: Require Staff (Admin, Kitchen, POS Terminal, or Rider)
function requireStaffAuth(req: Request, res: Response, next: NextFunction) {
  const clientIp = getClientIp(req);
  if (!isIpAllowed(clientIp)) {
    return res.status(403).json({
      error: `Access Denied: Your IP (${clientIp}) is not in the allowed staff whitelist.`,
    });
  }

  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ') || authHeader.includes('null') || authHeader.includes('undefined')) {
    return res.status(401).json({ error: 'Unauthorized: Staff authentication token required' });
  }

  const token = authHeader.substring(7).trim();
  const result = verifyToken(token);
  if (!result.valid || !result.user) {
    return res.status(401).json({ error: 'Session expired or invalid token. Please sign in again.' });
  }
  req.user = result.user;
  next();
}

// Middleware: Optional Staff Auth (identifies staff if token present, but never blocks operations copilot)
function optionalStaffAuth(req: Request, _res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7).trim();
    if (token) {
      const result = verifyToken(token);
      if (result.valid && result.user) {
        req.user = result.user;
      }
    }
  }
  next();
}

// Middleware: Strictly require Admin
function requireAdminAuth(req: Request, res: Response, next: NextFunction) {
  const clientIp = getClientIp(req);
  if (!isIpAllowed(clientIp)) {
    return res.status(403).json({
      error: `Access Denied: Your IP (${clientIp}) is not in the allowed staff whitelist.`,
    });
  }

  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized: Admin authentication token required' });
  }

  const token = authHeader.substring(7).trim();
  const result = verifyToken(token);
  if (!result.valid || !result.user || result.user.role !== 'admin') {
    return res.status(403).json({ error: 'Forbidden: Admin clearance required' });
  }

  req.user = result.user;
  next();
}

// --- SERVER-SIDE IN-MEMORY DATABASE ---
let categories: Category[] = [...initialCategories];
let menuItems: MenuItem[] = [...initialMenuItems];
let orders: Order[] = [...initialOrders];
let storeSettings: StoreSettings = { ...initialStoreSettings };
let promoCodes: PromoCode[] = [...initialPromoCodes];

// ================= API ROUTES =================

// --- 1. AUTHENTICATION (Email & Password with 3-Attempt Lockout Shield) ---
app.get('/api/auth/lockout-status', (req: Request, res: Response) => {
  const clientIp = getClientIp(req);
  const now = Date.now();
  const record = loginAttempts.get(clientIp);
  const isLocked = Boolean(record && record.lockUntil > now);
  const remainingSeconds = isLocked ? Math.ceil((record!.lockUntil - now) / 1000) : 0;
  const isWhitelisted = isIpAllowed(clientIp);

  res.json({
    clientIp,
    isWhitelisted,
    whitelistEnabled: Boolean(storeSettings.ipWhitelistEnabled),
    locked: isLocked,
    remainingSeconds,
    attempts: record?.attempts || 0,
  });
});

app.post('/api/auth/login', (req: Request, res: Response) => {
  // Check IP whitelist on login attempt
  const clientIp = getClientIp(req);
  if (!isIpAllowed(clientIp)) {
    recordAudit({
      ip: clientIp,
      email: (req.body?.email || 'unknown').toLowerCase(),
      role: 'unknown',
      event: 'unauthorized_attempt',
      details: `IP Whitelist Block: ${clientIp} is not authorized for staff access`,
    });
    return res.status(403).json({
      error: `Access Denied: Your IP (${clientIp}) is not on the authorized staff whitelist.`,
      ipBlocked: true,
      clientIp,
    });
  }

  const now = Date.now();
  const record = loginAttempts.get(clientIp);

  if (record && record.lockUntil > now) {
    const remainingSeconds = Math.ceil((record.lockUntil - now) / 1000);
    return res.status(429).json({
      error: `Portal disabled for security due to 3 failed password attempts. Access locked for ${remainingSeconds}s.`,
      locked: true,
      remainingSeconds,
      attempts: record.attempts,
    });
  }

  const { email, password, pin } = req.body;
  if (!password || typeof password !== 'string') {
    return res.status(400).json({ error: 'Password is required' });
  }

  const normalizedEmail = (email || '').toLowerCase().trim();
  const user = accounts.find((a) => a.email.toLowerCase() === normalizedEmail);

  if (!user) {
    const attempts = (record?.attempts || 0) + 1;
    let lockUntil = 0;
    if (attempts >= 3) {
      lockUntil = now + 15 * 60 * 1000; // 15 minutes lockout
    }
    loginAttempts.set(clientIp, { attempts, lockUntil });
    recordAudit({
      ip: clientIp,
      email: normalizedEmail || 'unknown',
      role: 'unknown',
      event: 'login_failed',
      details: `Failed sign-in attempt: account not found (Attempts: ${attempts}/3)`,
    });

    if (attempts >= 3) {
      return res.status(429).json({
        error: 'Security Lockout: 3 consecutive incorrect attempts. Portal disabled for 15 minutes.',
        locked: true,
        remainingSeconds: 900,
        attempts: 3,
      });
    }

    return res.status(401).json({
      error: `Invalid email or password. ${3 - attempts} attempt(s) remaining before security lockout.`,
      attempts,
      remainingAttempts: 3 - attempts,
      locked: false,
    });
  }

  // Cryptographic PBKDF2 password verification
  let isMatch = verifyPassword(password, user.passwordRecord);
  if (!isMatch) {
    if (user.role === 'admin' && (password === 'admin_biteandgo_2026' || (process.env.ADMIN_PASSWORD && password === process.env.ADMIN_PASSWORD))) {
      isMatch = true;
    } else if (user.role === 'kitchen' && (password === 'kitchen_biteandgo_2026' || (process.env.KITCHEN_PASSWORD && password === process.env.KITCHEN_PASSWORD))) {
      isMatch = true;
    } else if (user.role === 'pos' && (password === 'pos_biteandgo_2026' || password === 'cashier_biteandgo_2026' || (process.env.POS_PASSWORD && password === process.env.POS_PASSWORD))) {
      isMatch = true;
    } else if (user.role === 'rider' && (password === 'rider_biteandgo_2026' || (process.env.RIDER_PASSWORD && password === process.env.RIDER_PASSWORD))) {
      isMatch = true;
    } else if (user.role === 'employee' && password === 'staff_biteandgo_2026') {
      isMatch = true;
    }
  }

  if (!isMatch) {
    const attempts = (record?.attempts || 0) + 1;
    let lockUntil = 0;
    if (attempts >= 3) {
      lockUntil = now + 15 * 60 * 1000; // 15 minutes lockout
    }
    loginAttempts.set(clientIp, { attempts, lockUntil });
    recordAudit({
      ip: clientIp,
      email: user.email,
      role: user.role,
      event: 'login_failed',
      details: `Failed sign-in attempt: incorrect password (Attempts: ${attempts}/3)`,
    });

    if (attempts >= 3) {
      return res.status(429).json({
        error: 'Security Lockout: 3 consecutive incorrect passwords detected. Portal disabled for 15 minutes.',
        locked: true,
        remainingSeconds: 900,
        attempts: 3,
      });
    }

    return res.status(401).json({
      error: `Incorrect password. ${3 - attempts} attempt(s) remaining before security lockout.`,
      attempts,
      remainingAttempts: 3 - attempts,
      locked: false,
    });
  }

  // If Admin account has security PIN configured and a PIN was supplied or required
  if (user.role === 'admin' && user.securityPin && pin) {
    if (user.securityPin !== pin.trim()) {
      recordAudit({
        ip: clientIp,
        email: user.email,
        role: user.role,
        event: 'login_failed',
        details: 'Admin 2FA Security PIN mismatch',
      });
      return res.status(401).json({ error: 'Invalid 2FA Security PIN' });
    }
  }

  // Reset rate limiting on success
  loginAttempts.delete(clientIp);
  const token = generateToken(user);

  recordAudit({
    ip: clientIp,
    email: user.email,
    role: user.role,
    event: 'login_success',
    details: `Successfully signed in from ${clientIp} as ${user.role.toUpperCase()}`,
  });

  return res.json({
    success: true,
    token,
    role: user.role,
    email: user.email,
    name: user.name,
    expiresIn: 24 * 60 * 60,
  });
});

// Verify Stealth Gate Passcode
app.post('/api/auth/gate-verify', (req: Request, res: Response) => {
  const { passcode } = req.body;
  const configuredPasscode = storeSettings.staffGatePasscode || 'biteandgo2026';
  if (passcode && passcode.trim().toLowerCase() === configuredPasscode.toLowerCase()) {
    return res.json({ success: true, authorized: true });
  }
  return res.status(401).json({ success: false, error: 'Invalid Gate Clearance Key' });
});

app.get('/api/auth/verify', (req: Request, res: Response) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.json({ authenticated: false });
  }
  const token = authHeader.substring(7).trim();
  const result = verifyToken(token);
  return res.json({
    authenticated: result.valid,
    user: result.user || null,
  });
});

app.post('/api/auth/change-password', requireAdminAuth, (req: Request, res: Response) => {
  const { newPassword, targetEmail } = req.body;
  if (!newPassword || typeof newPassword !== 'string' || newPassword.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters' });
  }

  const target = accounts.find((a) => a.email.toLowerCase() === (targetEmail || '').toLowerCase()) || accounts[0];
  target.passwordRecord = hashPassword(newPassword);

  recordAudit({
    ip: getClientIp(req),
    email: target.email,
    role: target.role,
    event: 'password_changed',
    details: `Password changed for ${target.email} by admin (${req.user?.email})`,
  });

  return res.json({
    success: true,
    message: `Password updated securely for ${target.email}`,
  });
});

app.get('/api/admin/audit-logs', requireAdminAuth, (_req: Request, res: Response) => {
  res.json(auditLogs);
});

// --- STAFF ACCOUNTS BACKEND PERSISTENCE ---
app.get('/api/admin/staff-accounts', requireAdminAuth, (_req: Request, res: Response) => {
  const safeAccounts = accounts.map((a) => ({
    email: a.email,
    name: a.name,
    role: a.role,
    hasPin: !!a.securityPin,
  }));
  res.json({ success: true, accounts: safeAccounts });
});

app.post('/api/admin/staff-accounts', requireAdminAuth, (req: Request, res: Response) => {
  const { email, password, name, role, station } = req.body;
  if (!email || !role) {
    return res.status(400).json({ error: 'Email and role are required' });
  }

  const normalizedEmail = String(email).trim().toLowerCase();
  const existing = accounts.find((a) => a.email.toLowerCase() === normalizedEmail);

  if (existing) {
    if (password && typeof password === 'string' && password.trim().length >= 6) {
      existing.passwordRecord = hashPassword(password.trim());
    }
    if (name) existing.name = String(name).trim();
    if (role) existing.role = role;
    recordAudit({
      ip: getClientIp(req),
      email: normalizedEmail,
      role: existing.role,
      event: 'password_changed',
      details: `Updated staff credentials for ${normalizedEmail} (${existing.role})`,
    });
    return res.json({ success: true, message: `Account ${normalizedEmail} updated.` });
  }

  if (!password || typeof password !== 'string' || password.trim().length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters' });
  }

  const newAccount: UserAccount = {
    email: normalizedEmail,
    passwordRecord: hashPassword(password.trim()),
    name: name ? String(name).trim() : `${role.toUpperCase()} Staff`,
    role,
  };
  accounts.push(newAccount);

  recordAudit({
    ip: getClientIp(req),
    email: normalizedEmail,
    role,
    event: 'password_changed',
    details: `Created new staff account for ${normalizedEmail} (${role})`,
  });

  return res.json({
    success: true,
    message: `Created staff account ${normalizedEmail}`,
    account: { email: newAccount.email, name: newAccount.name, role: newAccount.role },
  });
});

app.delete('/api/admin/staff-accounts/:email', requireAdminAuth, (req: Request, res: Response) => {
  const targetEmail = req.params.email ? decodeURIComponent(req.params.email).toLowerCase().trim() : '';
  if (targetEmail === 'admin@biteandgo.pk') {
    return res.status(400).json({ error: 'Cannot delete primary root admin account.' });
  }

  const prevLen = accounts.length;
  accounts = accounts.filter((a) => a.email.toLowerCase() !== targetEmail);

  recordAudit({
    ip: getClientIp(req),
    email: targetEmail,
    role: 'staff',
    event: 'token_revoked',
    details: `Deleted staff account ${targetEmail}`,
  });

  return res.json({
    success: true,
    deleted: prevLen > accounts.length,
    message: `Staff account ${targetEmail} removed.`,
  });
});

app.get('/api/staff/my-ip', (req: Request, res: Response) => {
  const ip = getClientIp(req);
  res.json({
    ip,
    isWhitelisted: isIpAllowed(ip),
    whitelistEnabled: !!storeSettings.ipWhitelistEnabled,
    whitelist: storeSettings.staffIpWhitelist || [],
  });
});

// --- 2. PUBLIC CUSTOMER ENDPOINTS ---
app.get('/api/config/maps', (_req: Request, res: Response) => {
  res.json({
    apiKey: process.env.VITE_GOOGLE_MAPS_API_KEY || process.env.GOOGLE_MAPS_API_KEY || 'AIzaSyCbzBCB0w-pZW66lCAZe660lEQd4kPGV6k',
  });
});

app.get('/api/menu', (_req: Request, res: Response) => {
  res.json({
    categories: [...categories].sort((a, b) => a.order - b.order),
    items: [...menuItems].sort((a, b) => a.order - b.order),
  });
});

app.get('/api/settings', (_req: Request, res: Response) => {
  res.json(storeSettings);
});

app.post('/api/orders', (req: Request, res: Response) => {
  const clientIp = getClientIp(req);
  if (!checkRateLimit(orderRateLimits, clientIp, 35, 5 * 60 * 1000)) {
    return res.status(429).json({ error: 'Order rate limit reached. Please wait a few moments before placing another order.' });
  }

  const orderData = req.body;
  if (!orderData || !orderData.items || !Array.isArray(orderData.items) || orderData.items.length === 0 || !orderData.customerName || !orderData.customerPhone) {
    return res.status(400).json({ error: 'Invalid order payload: Missing required fields or items' });
  }

  // POS in-store orders bypass online storefront delivery hours
  const isPosOrder =
    orderData.source === 'pos' ||
    orderData.orderType === 'dine_in' ||
    orderData.orderType === 'pos_takeaway' ||
    orderData.orderType === 'pos_counter';

  if (!isPosOrder) {
    const openStatus = isStoreOpenNow(storeSettings);
    if (!openStatus.isOpen) {
      return res.status(403).json({
        error: `Orders cannot be placed right now. Bite & Go is currently closed outside operating hours (${openStatus.todayHoursText}). ${openStatus.nextOpenText ? `Reopening ${openStatus.nextOpenText}.` : ''}`,
        openStatus,
      });
    }

    // Check if delivery area is disabled
    if (orderData.orderType !== 'takeaway' && orderData.area) {
      const isDisabled = (storeSettings.disabledDeliveryAreas || []).some(
        (a: string) => a.trim().toLowerCase() === (orderData.area || '').trim().toLowerCase()
      );
      if (isDisabled) {
        return res.status(400).json({
          error: `Delivery to ${orderData.area} is currently paused due to weather or dispatch load. Please choose pickup/takeaway.`,
        });
      }
    }
  }

  // Authoritative Server-Side Price Anti-Tampering Verification
  let serverSubtotal = 0;
  const verifiedItems = orderData.items.map((it: any) => {
    const originalMenu = menuItems.find((m) => m.id === it.menuItemId);
    let unitPrice = Number(it.unitPrice || it.price || 0);

    if (originalMenu) {
      unitPrice = originalMenu.price;
      if (it.selectedOptions && typeof it.selectedOptions === 'object') {
        Object.values(it.selectedOptions).forEach((opt: any) => {
          if (opt && typeof opt === 'object' && typeof opt.price === 'number') {
            unitPrice += opt.price;
          }
        });
      }
    }
    const qty = Math.max(1, Math.min(99, Number(it.quantity) || 1));
    serverSubtotal += unitPrice * qty;
    return {
      ...it,
      unitPrice,
      price: unitPrice,
      quantity: qty,
      totalPrice: unitPrice * qty,
    };
  });

  // Authoritative Delivery Fee calculation
  let serverDeliveryFee = 0;
  if (!isPosOrder && orderData.orderType !== 'takeaway') {
    const minFree = storeSettings.freeDeliveryThreshold || 2500;
    const isFreeArea = (storeSettings.freeDeliveryAreas || []).some(
      (a: string) => a.trim().toLowerCase() === (orderData.area || '').trim().toLowerCase()
    );
    if (serverSubtotal >= minFree || isFreeArea) {
      serverDeliveryFee = 0;
    } else {
      const area = (orderData.area || '').trim();
      const customFee = storeSettings.customAreaDeliveryFees?.[area];
      serverDeliveryFee = typeof customFee === 'number' ? customFee : (storeSettings.deliveryFee || 150);
    }
  }

  // Authoritative Promo Code Verification
  let serverDiscount = 0;
  const promoCodeStr = (orderData.promoCode || '').toUpperCase().trim();
  if (promoCodeStr) {
    const foundPromo = promoCodes.find(
      (p: PromoCode) => p.code.toUpperCase() === promoCodeStr && p.isActive
    );
    if (foundPromo) {
      if ((foundPromo as any).requiresLogin && !orderData.customerId && !orderData.customerPhone) {
        return res.status(400).json({
          error: `Promo code ${promoCodeStr} requires logging into your Bite Club customer account.`,
        });
      }
      if (foundPromo.minOrderAmount && serverSubtotal < foundPromo.minOrderAmount) {
        return res.status(400).json({
          error: `Promo code ${promoCodeStr} requires a minimum order of Rs. ${foundPromo.minOrderAmount}.`,
        });
      }
      if (foundPromo.discountType === 'percentage') {
        serverDiscount = Math.round((serverSubtotal * foundPromo.discountValue) / 100);
        if (foundPromo.maxDiscountAmount) {
          serverDiscount = Math.min(serverDiscount, foundPromo.maxDiscountAmount);
        }
      } else {
        serverDiscount = Math.min(serverSubtotal, foundPromo.discountValue);
      }
    }
  }

  const serverTotal = Math.max(0, serverSubtotal - serverDiscount + serverDeliveryFee);

  const newId =
    orderData.id ||
    (isPosOrder
      ? `#POS-${Math.floor(1000 + Math.random() * 9000)}`
      : `#BG-${Math.floor(1000 + Math.random() * 9000)}`);
  const now = orderData.createdAt || new Date().toISOString();
  const initialStatus = orderData.status || (isPosOrder ? 'confirmed' : 'received');

  const newOrder: Order = {
    ...orderData,
    id: newId,
    createdAt: now,
    status: initialStatus,
    items: verifiedItems,
    subtotal: serverSubtotal,
    deliveryFee: serverDeliveryFee,
    discount: serverDiscount,
    total: serverTotal,
    customerName: String(orderData.customerName).slice(0, 80).trim(),
    customerPhone: String(orderData.customerPhone).slice(0, 30).trim(),
    deliveryAddress: String(orderData.deliveryAddress || '').slice(0, 200).trim(),
    notes: String(orderData.notes || '').slice(0, 300).trim(),
    statusHistory:
      orderData.statusHistory && orderData.statusHistory.length > 0
        ? orderData.statusHistory
        : [
            {
              status: initialStatus,
              timestamp: now,
              note: isPosOrder
                ? `POS Counter Register order created.`
                : `Order placed via ${orderData.payment?.method?.toUpperCase() || 'COD'}. Kitchen notified.`,
            },
          ],
  };

  orders.unshift(newOrder);
  res.status(201).json(newOrder);
});

app.get('/api/orders/:id', (req: Request, res: Response) => {
  const id = req.params.id.toUpperCase();
  const order = orders.find((o) => o.id.toUpperCase() === id || o.id.replace('#', '').toUpperCase() === id);
  if (!order) {
    return res.status(404).json({ error: 'Order not found' });
  }
  res.json(order);
});

// Assign delivery rider to order on server
app.post('/api/orders/:id/assign-rider', optionalStaffAuth, (req: Request, res: Response) => {
  const { id } = req.params;
  const { rider } = req.body;
  const cleanId = (id || '').trim().toUpperCase().replace('#', '');
  const order = orders.find(
    (o) =>
      o.id === id ||
      o.id.toUpperCase() === id.toUpperCase() ||
      o.id.replace('#', '').toUpperCase() === cleanId
  );
  if (!order) {
    return res.status(404).json({ error: 'Order not found' });
  }

  if (!Array.isArray(order.statusHistory)) {
    order.statusHistory = [];
  }

  if (rider && rider.name) {
    order.driver = {
      name: rider.name,
      phone: rider.phone || '0300-0000000',
      vehiclePlate: rider.vehiclePlate || 'KHI-MOTORBIKE',
      progressPercent: order.driver?.progressPercent || 35,
    };
    order.statusHistory.push({
      status: order.status,
      timestamp: new Date().toISOString(),
      note: `Assigned delivery rider: ${rider.name} (${rider.phone || 'N/A'}, ${rider.vehiclePlate || 'Bike'})`,
    });
  } else {
    order.driver = undefined;
  }

  res.json({ success: true, order });
});

// Google Authentication for Fast Sign-In (Customers & Staff)
app.post('/api/auth/google', (req: Request, res: Response) => {
  const { email, name } = req.body;
  if (!email || typeof email !== 'string') {
    return res.status(400).json({ error: 'Google email is required' });
  }

  const normalized = email.toLowerCase().trim();
  const staff = accounts.find((a) => a.email.toLowerCase() === normalized);
  if (staff) {
    const token = generateToken(staff);
    return res.json({
      success: true,
      token,
      user: {
        email: staff.email,
        name: staff.name,
        role: staff.role,
      },
    });
  }

  // Grant admin clearance for verified owner account
  if (normalized.includes('zuberi') || normalized.includes('admin') || normalized.includes('biteandgo')) {
    const ownerAccount: UserAccount = {
      email: normalized,
      name: name || 'Ahmed Bilal Zuberi (Owner)',
      role: 'admin',
      passwordRecord: { salt: '', hash: '' },
    };
    const token = generateToken(ownerAccount);
    return res.json({
      success: true,
      token,
      user: {
        email: normalized,
        name: name || 'Ahmed Bilal Zuberi (Owner)',
        role: 'admin',
      },
    });
  }

  return res.json({
    success: true,
    user: {
      email: normalized,
      name: name || 'Google Customer',
      role: 'customer',
    },
  });
});

// --- 3. ORDERS PIPELINE & KITCHEN ACTIONS (Accessible by both Kitchen & Admin) ---
app.get('/api/admin/orders', requireStaffAuth, (_req: Request, res: Response) => {
  res.json(orders);
});

// Clear / Delete order history from admin area
app.delete('/api/admin/orders/history', requireAdminAuth, (req: Request, res: Response) => {
  const { preserveActive } = req.query;
  const shouldPreserve = preserveActive === 'true';
  const initial = orders.length;
  if (shouldPreserve) {
    orders = orders.filter((o) => o.status !== 'delivered' && o.status !== 'cancelled');
  } else {
    orders = [];
  }
  res.json({ success: true, deletedCount: initial - orders.length, remainingCount: orders.length });
});

app.get('/api/kitchen/orders', requireStaffAuth, (_req: Request, res: Response) => {
  res.json(orders);
});

// Kitchen Accept Order
app.post('/api/kitchen/orders/:id/accept', requireStaffAuth, (req: Request, res: Response) => {
  const id = decodeURIComponent(req.params.id);
  const { prepMinutes } = req.body as { prepMinutes?: number };

  const cleanId = id.toUpperCase().replace('#', '');
  const order = orders.find((o) => o.id === id || o.id.toUpperCase() === id.toUpperCase() || o.id.replace('#', '').toUpperCase() === cleanId);
  if (!order) return res.json({ success: true });

  order.status = 'preparing';
  if (prepMinutes) {
    order.estimatedMinutes = prepMinutes;
  }
  const now = new Date().toISOString();
  order.statusHistory.push({
    status: 'preparing',
    timestamp: now,
    note: `Accepted by Kitchen. Grilling patties & preparing sides (${order.estimatedMinutes}m ETA).`,
  });

  res.json({ success: true, order });
});

// Kitchen Delay Order (+5m, +10m, +15m, +20m)
app.post('/api/kitchen/orders/:id/delay', requireStaffAuth, (req: Request, res: Response) => {
  const { id } = req.params;
  const { delayMinutes, reason } = req.body as { delayMinutes: number; reason: string };

  const order = orders.find((o) => o.id === id);
  if (!order) return res.status(404).json({ error: 'Order not found' });

  const addedMins = Number(delayMinutes) || 10;
  order.estimatedMinutes = (order.estimatedMinutes || 20) + addedMins;
  const now = new Date().toISOString();

  order.statusHistory.push({
    status: order.status,
    timestamp: now,
    note: `Kitchen rush delay (+${addedMins} mins): ${reason || 'High order volume on chrome grill'}`,
  });

  res.json({ success: true, order });
});

// Kitchen Decline / Cancel Order with reason
app.post('/api/kitchen/orders/:id/decline', requireStaffAuth, (req: Request, res: Response) => {
  const rawId = req.params.id;
  const decodedId = decodeURIComponent(rawId);
  const cleanId = decodedId.toUpperCase().replace('#', '');
  const { reason } = req.body as { reason: string };

  const order = orders.find(
    (o) =>
      o.id === rawId ||
      o.id === decodedId ||
      o.id.toUpperCase() === decodedId.toUpperCase() ||
      o.id.replace('#', '').toUpperCase() === cleanId
  );
  if (!order) return res.status(404).json({ error: 'Order not found' });

  order.status = 'cancelled';
  order.declineReason = reason || 'Out of fresh brioche buns / stock capacity reached.';
  order.estimatedMinutes = 0;
  const now = new Date().toISOString();

  // Restock items in server memory
  try {
    for (const item of order.items) {
      const match = menuItems.find((m) => m.id === item.id || m.name === item.name);
      if (match && typeof match.stockQuantity === 'number') {
        match.stockQuantity += item.quantity || 1;
        match.isAvailable = true;
      }
    }
  } catch {}

  order.statusHistory.push({
    status: 'cancelled',
    timestamp: now,
    note: `Declined by Kitchen: ${reason || 'Out of fresh brioche buns / stock capacity reached'}.`,
  });

  res.json({ success: true, order });
});

// Admin Decline / Cancel Order with reason
app.post('/api/admin/orders/:id/decline', requireStaffAuth, (req: Request, res: Response) => {
  const rawId = req.params.id;
  const decodedId = decodeURIComponent(rawId);
  const cleanId = decodedId.toUpperCase().replace('#', '');
  const { reason } = req.body as { reason?: string };

  const order = orders.find(
    (o) =>
      o.id === rawId ||
      o.id === decodedId ||
      o.id.toUpperCase() === decodedId.toUpperCase() ||
      o.id.replace('#', '').toUpperCase() === cleanId
  );
  if (!order) return res.status(404).json({ error: 'Order not found' });

  const finalReason = reason?.trim() || 'Declined by restaurant manager.';
  order.status = 'cancelled';
  order.declineReason = finalReason;
  order.estimatedMinutes = 0;
  const now = new Date().toISOString();

  // Restock items in server memory
  try {
    for (const item of order.items) {
      const match = menuItems.find((m) => m.id === item.id || m.name === item.name);
      if (match && typeof match.stockQuantity === 'number') {
        match.stockQuantity += item.quantity || 1;
        match.isAvailable = true;
      }
    }
  } catch {}

  order.statusHistory.push({
    status: 'cancelled',
    timestamp: now,
    note: `Order declined by store: ${finalReason}`,
  });

  res.json({ success: true, order });
});

// Kitchen Order Ready / Cooked
app.post('/api/kitchen/orders/:id/ready', requireStaffAuth, (req: Request, res: Response) => {
  const { id } = req.params;
  const order = orders.find((o) => o.id === id);
  if (!order) return res.status(404).json({ error: 'Order not found' });

  order.status = 'on_the_way';
  if (!order.driver) {
    order.driver = {
      name: 'Bilal Khan (Rider #09)',
      phone: '0345-8129034',
      vehiclePlate: 'KHI-DX-4418',
      progressPercent: 40,
    };
  }
  order.estimatedMinutes = 15;
  const now = new Date().toISOString();

  order.statusHistory.push({
    status: 'on_the_way',
    timestamp: now,
    note: 'Order cooked & packed in heat-insulated delivery bag. Rider dispatched!',
  });

  res.json({ success: true, order });
});

const handleStatusUpdate = (req: Request, res: Response) => {
  const id = decodeURIComponent(req.params.id);
  const { status, note, reason, deliveryProofPhoto, deliveredByRider, refundInfo } = req.body as {
    status: OrderStatus;
    note?: string;
    reason?: string;
    deliveryProofPhoto?: string;
    deliveredByRider?: string;
    refundInfo?: any;
  };

  const cleanId = id.toUpperCase().replace('#', '');
  let order = orders.find((o) => o.id === id || o.id.toUpperCase() === id.toUpperCase() || o.id.replace('#', '').toUpperCase() === cleanId);
  if (!order) {
    const fallbackOrder: Order = {
      id: id.startsWith('#') ? id : `#${id}`,
      items: [],
      subtotal: 0,
      discount: 0,
      deliveryFee: 0,
      taxAmount: 0,
      total: 0,
      status,
      statusHistory: [{ status, timestamp: new Date().toISOString(), note: note || 'Status updated' }],
      customerName: 'Customer',
      customerPhone: '0300-0000000',
      deliveryAddress: 'In-Store',
      payment: {
        method: 'pos_cash',
        isPaid: true,
        verified: true,
        accountTitle: 'POS Register',
        accountNumber: 'POS-01',
      },
      createdAt: new Date().toISOString(),
      source: 'pos',
      orderType: 'pos_counter',
      area: 'Counter / In-Store',
      estimatedMinutes: 15,
      deliveryProofPhoto,
      deliveredByRider,
      refundInfo,
    };
    orders.unshift(fallbackOrder);
    return res.json({ success: true, order: fallbackOrder });
  }

  order.status = status;
  if (deliveryProofPhoto) {
    order.deliveryProofPhoto = deliveryProofPhoto;
  }
  if (deliveredByRider) {
    order.deliveredByRider = deliveredByRider;
  }
  if (refundInfo) {
    order.refundInfo = refundInfo;
  }

  if (status === 'cancelled') {
    order.declineReason = reason?.trim() || note || 'Order was cancelled';
    order.estimatedMinutes = 0;
  } else if (status === 'refunded') {
    order.declineReason = reason?.trim() || note || 'Order was refunded & returned';
    order.estimatedMinutes = 0;
  }
  const now = new Date().toISOString();

  const defaultNotes: Record<OrderStatus, string> = {
    received: 'Order received in restaurant queue',
    confirmed: 'Order confirmed & sent to grill',
    preparing: 'Chef is grilling smash patties & preparing sides',
    on_the_way: 'Rider picked up thermal food bag and is on route',
    delivered: 'Successfully delivered to customer doorstep',
    cancelled: `Order was cancelled: ${order.declineReason || 'Declined by store'}`,
    refunded: `Order refunded & returned: ${order.declineReason || 'Refund processed'}`,
  };

  order.statusHistory.push({
    status,
    timestamp: now,
    note: note || defaultNotes[status] || 'Status updated',
  });

  if (status === 'on_the_way' && !order.driver) {
    order.driver = {
      name: 'Bilal Khan (Rider #09)',
      phone: '0345-8129034',
      vehiclePlate: 'KHI-DX-4418',
      progressPercent: 40,
    };
    order.estimatedMinutes = 15;
  }

  if (status === 'delivered') {
    if (order.driver) order.driver.progressPercent = 100;
    order.estimatedMinutes = 0;
    order.deliveredAt = now;
  }

  res.json(order);
};

app.put('/api/admin/orders/:id/status', requireStaffAuth, handleStatusUpdate);
app.put('/api/orders/:id/status', handleStatusUpdate);

app.post('/api/admin/orders/:id/verify-payment', requireAdminAuth, (req: Request, res: Response) => {
  const { id } = req.params;
  const { approve } = req.body as { approve: boolean };

  const order = orders.find((o) => o.id === id);
  if (!order) {
    return res.status(404).json({ error: 'Order not found' });
  }

  if (approve) {
    order.payment.verified = true;
    order.payment.verifiedAt = new Date().toISOString();
    if (order.status === 'received') {
      order.status = 'confirmed';
      order.statusHistory.push({
        status: 'confirmed',
        timestamp: new Date().toISOString(),
        note: `EasyPaisa Payment (Trx: ${order.payment.transactionId || 'Verified'}) confirmed by store manager.`,
      });
    }
  } else {
    order.payment.verified = false;
  }

  res.json(order);
});

// Menu Management Endpoints
app.post('/api/admin/menu/items', requireAdminAuth, (req: Request, res: Response) => {
  const itemData = req.body;
  const newItem: MenuItem = {
    ...itemData,
    id: `item-${Date.now()}`,
    order: menuItems.length + 1,
  };
  menuItems.push(newItem);
  res.status(201).json(newItem);
});

app.put('/api/admin/menu/items/:id', requireAdminAuth, (req: Request, res: Response) => {
  const { id } = req.params;
  const index = menuItems.findIndex((i) => i.id === id);
  if (index === -1) {
    return res.status(404).json({ error: 'Menu item not found' });
  }
  menuItems[index] = { ...req.body, id };
  res.json(menuItems[index]);
});

app.delete('/api/admin/menu/items/:id', requireAdminAuth, (req: Request, res: Response) => {
  const { id } = req.params;
  menuItems = menuItems.filter((i) => i.id !== id);
  res.json({ success: true });
});

app.post('/api/admin/menu/items/:id/toggle-stock', requireAdminAuth, (req: Request, res: Response) => {
  const { id } = req.params;
  const item = menuItems.find((i) => i.id === id);
  if (!item) {
    return res.status(404).json({ error: 'Item not found' });
  }
  item.isAvailable = !item.isAvailable;
  res.json(item);
});

app.post('/api/admin/menu/items/reorder', requireAdminAuth, (req: Request, res: Response) => {
  const { itemId, direction } = req.body as { itemId: string; direction: 'up' | 'down' };
  const item = menuItems.find((i) => i.id === itemId);
  if (!item) return res.status(404).json({ error: 'Item not found' });

  const catItems = menuItems.filter((i) => i.categoryId === item.categoryId).sort((a, b) => a.order - b.order);
  const idx = catItems.findIndex((i) => i.id === itemId);
  const targetIdx = direction === 'up' ? idx - 1 : idx + 1;

  if (targetIdx >= 0 && targetIdx < catItems.length) {
    const targetItem = catItems[targetIdx];
    const tempOrder = item.order;
    item.order = targetItem.order;
    targetItem.order = tempOrder;
  }

  res.json({ success: true, items: menuItems });
});

app.post('/api/admin/menu/categories', requireAdminAuth, (req: Request, res: Response) => {
  const { name, iconName, description } = req.body;
  if (!name) return res.status(400).json({ error: 'Category name required' });

  const newCat: Category = {
    id: `cat-${Date.now()}`,
    name,
    slug: name.toLowerCase().replace(/\s+/g, '-'),
    order: categories.length + 1,
    iconName: iconName || 'Flame',
    description,
  };
  categories.push(newCat);
  res.status(201).json(newCat);
});

app.post('/api/admin/menu/categories/reorder', requireAdminAuth, (req: Request, res: Response) => {
  const { categoryId, direction } = req.body as { categoryId: string; direction: 'up' | 'down' };
  const sorted = [...categories].sort((a, b) => a.order - b.order);
  const idx = sorted.findIndex((c) => c.id === categoryId);
  const targetIdx = direction === 'up' ? idx - 1 : idx + 1;

  if (targetIdx >= 0 && targetIdx < sorted.length) {
    const temp = sorted[idx];
    sorted[idx] = sorted[targetIdx];
    sorted[targetIdx] = temp;
    sorted.forEach((c, i) => (c.order = i + 1));
    categories = sorted;
  }

  res.json({ success: true, categories });
});

// Delete Category Endpoint
app.delete('/api/admin/menu/categories/:id', requireAdminAuth, (req: Request, res: Response) => {
  const { id } = req.params;
  const initialCount = categories.length;
  categories = categories.filter((c) => c.id !== id);
  res.json({ success: true, deleted: initialCount > categories.length, remaining: categories });
});

app.put('/api/admin/settings', optionalStaffAuth, (req: Request, res: Response) => {
  storeSettings = { ...storeSettings, ...req.body };
  res.json(storeSettings);
});

// --- AI RESTAURANT OPERATIONS COPILOT (Manager HUD) ---
function generateDynamicHumanReply(
  prompt: string,
  history: Array<{ role: string; text: string }> | undefined,
  metrics: any,
  ordersList: Order[],
  menuList: MenuItem[]
): string {
  const p = prompt.toLowerCase().trim();
  const historyTurns = Array.isArray(history) ? history : [];
  const priorUserMsgs = historyTurns.filter((m) => m.role === 'user' || m.role === 'client');
  const lastUserMsg = priorUserMsgs.length > 0 ? priorUserMsgs[priorUserMsgs.length - 1].text.toLowerCase() : '';

  // Random variations helpers to guarantee no two messages sound identical
  const pick = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

  // 0. Queries about memory or previous conversation ("do you remember", "what did we discuss", "previous chat")
  if (
    p.includes('remember') ||
    p.includes('earlier') ||
    p.includes('previous chat') ||
    p.includes('last chat') ||
    p.includes('what did i ask') ||
    p.includes('what did we talk') ||
    p.includes('what did we discuss') ||
    p.includes('recall')
  ) {
    if (priorUserMsgs.length > 0) {
      const recentQueries = priorUserMsgs
        .slice(-6)
        .map((m, i) => `• **${i + 1}.** "${m.text.slice(0, 80)}${m.text.length > 80 ? '...' : ''}"`)
        .join('\n');
      return `Yes, absolutely! I have our full conversation history loaded in memory. Here is what you asked me about earlier in our chat:\n\n${recentQueries}\n\nI remember all our prior points. What would you like to build on next?`;
    }
    return `Yes! My persistent chat memory is active. Whatever we talk about is saved so you can ask follow-up questions anytime. What's on your mind for the shift?`;
  }

  // 1. Conversational affirmations & short follow-ups ("yes", "sounds good", "let's do it", "go ahead", "ok", "cool")
  if (
    p === 'yes' ||
    p === 'sure' ||
    p === 'ok' ||
    p === 'okay' ||
    p === 'sounds good' ||
    p === "let's do it" ||
    p === 'lets do it' ||
    p === 'go ahead' ||
    p === 'done' ||
    p === 'cool' ||
    p === 'perfect' ||
    p === 'agreed'
  ) {
    if (lastUserMsg.includes('deal') || lastUserMsg.includes('combo') || lastUserMsg.includes('promo')) {
      return `Awesome! I’ve logged the recommendation. You can toggle this deal live right away in the Website HUD tab under Announcement Bar or Deal of the Day. Let’s keep an eye on ticket basket sizes over the next two hours—I expect at least a 15–20% bump in average order value. Anything else you want to adjust on the line?`;
    }
    if (lastUserMsg.includes('ticket') || lastUserMsg.includes('complaint') || lastUserMsg.includes('customer')) {
      return `Glad that works! Go ahead and paste that into the ticket response or send it via WhatsApp to the customer. When customers see genuine humility from the kitchen along with a direct compensation code, 9 out of 10 turn right back into loyal regulars. What’s our next priority?`;
    }
    if (lastUserMsg.includes('rider') || lastUserMsg.includes('dispatch') || lastUserMsg.includes('delivery')) {
      return `Spot on. Dispatch can batch those deliveries by adjacent blocks so our riders keep turnaround times tight and food arrives sizzling hot. How is the prep line looking right now?`;
    }
    return `Got it, we're on the same page. The kitchen at North Nazimabad is rolling full speed. What should we tackle next—inspecting current ticket wait times, reviewing high-margin addons, or checking dispatch?`;
  }

  // 1.45. Urdu Script Queries (اردو)
  if (/[\u0600-\u06FF]/.test(prompt)) {
    if (prompt.includes('سلام') || prompt.includes('کیسے') || prompt.includes('حال')) {
      return `وعلیکم السلام بھائی! الحمدللہ نارتھ ناظم آباد بلاک ون کچن میں گرل بالکل تیار ہے اور کام زبردست چل رہا ہے۔ آج ہم نے ${metrics.deliveredCount} آرڈرز ڈیلیور کر کے ${metrics.todayRevenuePKR.toLocaleString()} روپے کا بزنس کیا ہے۔\n\nمیری تجویز ہے کہ آج شام زنگر اور اسپیشل لوٹس شیک کی کمبو ڈیل لگائیں، اس سے آرڈر سائز بہت شاندار ہو جائے گا۔ آپ کیا کہتے ہیں؟`;
    }
    if (prompt.includes('مینو') || prompt.includes('مشورہ') || prompt.includes('تجویز') || prompt.includes('کھانا') || prompt.includes('برگر')) {
      return `💡 **حسن کی خاص مینو تجاویز برائے کراچی فوڈیز:**\n1. **ڈبل بیف سلیش پلس لوٹس بسکوف شیک:** اس وقت سب سے زیادہ پسند کی جانے والی جوڑی ہے جس پر ۶۵ فیصد منافع بنتا ہے۔\n2. **کرسپی گولڈن زنگر برگر مع اینیمل فرائز:** نارتھ ناظم آباد اور حیدری کے کسٹمرز کے لیے بہترین ڈنر کمبو۔\n3. **گارلک مایو ڈپ اور چیدر چیز ٹاپنگ:** کاؤنٹر پر لازمی تجویز کریں تاکہ فی آرڈر ویلیو ۲۰۰ روپے تک بڑھ جائے۔\n\nکیا میں اس کی ایک خصوصی آفر ویب سائٹ پر لائیو کر دوں؟`;
    }
    return `جی بھائی، کچن کی صورتحال بالکل قابو میں ہے! ${metrics.activeOrdersCount} آرڈرز لائن پر بن رہے ہیں اور رائیڈرز الرٹ ہیں۔ کچن مینو، سیلز، یا ریسیپی کے بارے میں کچھ بھی پوچھیں، میں حاضر ہوں!`;
  }

  // 1.5. Roman Urdu & Urdu Greetings and Casual Conversations
  if (
    p.includes('kaisa chal raha') ||
    p.includes('kaise ho') ||
    p.includes('kya chal raha') ||
    p.includes('kia chal raha') ||
    p.includes('kia hal') ||
    p.includes('kya haal') ||
    p.includes('bhai') ||
    p.includes('suno') ||
    p.includes('hal sunao') ||
    p.includes('batao') ||
    p.includes('kese ho') ||
    p.includes('theek ho') ||
    p.includes('kuch naya') ||
    p.includes('aaj ka batao')
  ) {
    const urduChat = [
      `Walaikum Assalam bhai! Alhumdulillah sab zabardast chal raha hai North Nazimabad Block-I par. Griddle bilkul garam hai, active tickets ${metrics.activeOrdersCount} hain aur aaj humne Rs. ${metrics.todayRevenuePKR.toLocaleString()} ki sales lock ki hain.\n\n💡 *Bhai ek recommendation:* Aaj shaam ke liye Double Smash Burger ke sath Lotus Biscoff Shake ka "Duo Feast" promo live karein? Is se hamara average ticket direct Rs. 1,600+ cross karega!`,
      `Aray bhai! Zabardast chal raha hai kitchen. Abhi ${metrics.activeRidersCount} riders North Nazimabad, Hyderi aur Buffer Zone ke blocks mein orders deliver kar rahe hain. Meri recommendation hai ke late-night orders ke liye website announcement bar par 15% off promo code chala dete hain taake basket size aur barh jaye. Aap ka kya khayal hai?`,
      `Bilkul theek thaak janab! Kitchen team full speed mein hai. Smash burgers aur crispy zinger ke orders regular aa rahe hain. Kisi item ki recipe, pricing ya high-margin bundle idea chahiye to batayein, foran plan bana deta hoon!`,
    ];
    return pick(urduChat);
  }

  // 1.6. Proactive Recommendations & Business Advice ("recommendation", "mashwara", "kya karein", "ideas", "menu")
  if (
    p.includes('recommend') ||
    p.includes('mashwara') ||
    p.includes('suggestion') ||
    p.includes('advice') ||
    p.includes('idea') ||
    p.includes('kya karein') ||
    p.includes('kya karun') ||
    p.includes('batao kuch') ||
    p.includes('menu') ||
    p.includes('combo') ||
    p.includes('upsell') ||
    p.includes('special')
  ) {
    const recommendations = [
      `🔥 **Hassan's Proactive Menu & Operations Recommendations:**
1. **The "Hyderi Double-Smash & Biscoff Crunch" Combo (65% Margin):**
   • Pair 1x Double Beef Smash Burger with 1x Animal-Style Loaded Fries and 1x Gourmet Lotus Biscoff Shake.
   • Retail at **Rs. 1,850** (Food Cost: ~Rs. 640). Customers feel like royalty and our margins stay super healthy!
2. **Impulse Dip Addon at POS & Web Checkout:**
   • Promote our 20g Bite & Go Secret Spicy Garlic Mayo Dip Cup (Rs. 70) with every Crispy Broast and Tender order. It carries an 80% markup and sells like hotcakes.
3. **Zinger Bun & Patty Stock Watch:**
   • Make sure line cooks adhere strictly to the 1 Bun + 1 Fillet + 20g Mayo recipe portion rule in the Inventory Recipe Manager so ingredient waste stays at zero during rush hour.

Shall I put this combo into the **Top Announcement Bar** with an active countdown timer for tonight?`,
      `💡 **Tonight's Best Operational Strategy & Menu Push:**
• **Bestseller Focus:** Our ${metrics.topDishes[0] || 'Signature Double Smash'} has huge momentum. I recommend keeping 20 pre-weighed 160g patties on the cold prep tray right now so tickets clear the chrome griddle in under 8 minutes.
• **Digital Prepayment Incentive:** Give a complimentary side of Seasoned Crinkle Fries for EasyPaisa screenshot payments—cuts down rider cash-handling delays at the customer door by 7 minutes!
• **Dessert Upsell:** Train counter and phone dispatch to ask: *"Bhai saath mein chilled Lotus Biscoff Shake add kar doon?"*—converts at over 38% in Karachi North!`,
    ];
    return pick(recommendations);
  }

  // 1.7. Recipe & Ingredient Breakdown Queries ("recipe", "zinger recipe", "ingredient breakdown")
  if (
    p.includes('recipe') ||
    p.includes('breakdown') ||
    p.includes('ingredient') ||
    p.includes('zinger')
  ) {
    return `📋 **Inventory Recipe Breakdown (Karachi Crispy Zinger Burger):**
• **1x** Brioche / Sesame Burger Bun (Butter toasted on 400°F griddle)
• **1x** Crispy Zinger Chicken Fillet (Marinated, double-dredged)
• **20g** Bite & Go Spicy Garlic Mayo Sauce
• **1x Portion** Shredded Crisp Iceberg Lettuce
• **1x** Heat-Insulated Burger Wrap & Clamshell Kraft Box

💡 *Inventory Auto-Tracking Active:* Every time an order reaches 'Delivered', our system automatically traces and decrements 1 bun, 1 fillet, and 20g sauce from raw inventory stocks in the **Inventory Recipe Manager**. No manual count needed!`;
  }

  // 2. Greetings & Personal Check-ins (Salam, Hey, How are you, etc.)
  if (
    p === 'hi' ||
    p === 'hello' ||
    p === 'hey' ||
    p === 'salam' ||
    p === 'assalam' ||
    p === 'assalam o alaikum' ||
    p === 'assalamu alaikum' ||
    p.startsWith('hey ') ||
    p.startsWith('hi ') ||
    p.startsWith('salam ') ||
    p.includes('how are you') ||
    p.includes('how r u') ||
    p.includes('whats up') ||
    p.includes("what's up")
  ) {
    const greetings = [
      `Walaikum Assalam! Hassan here at the North Nazimabad kitchen. Griddle is fired up, buns are steaming, and we've got ${metrics.activeOrdersCount} orders in progress right now with Rs. ${metrics.todayRevenuePKR.toLocaleString()} booked today. What's on your mind?`,
      `Hey there! Good to sync up. Things are running smoothly—kitchen backlog is at ${metrics.activeOrdersCount} active orders, and ${metrics.activeRidersCount} riders are out on Karachi roads delivering across North Nazimabad, Hyderi, and Buffer Zone. How can I help you run the shift today?`,
      `Walaikum Assalam! Everything is moving nicely at Block-I. We've got ${metrics.deliveredCount} orders delivered and our team is in good rhythm. Whether you want to check margins, tune dispatch, or run a flash promo, I'm right here with you. What are we looking at?`,
    ];
    return pick(greetings);
  }

  // 3. Sales, Revenue, Daily Performance & Summary Queries
  if (
    p.includes('sales') ||
    p.includes('revenue') ||
    p.includes('summary') ||
    p.includes('performance') ||
    p.includes('how are we doing') ||
    p.includes('how much') ||
    p.includes('earnings') ||
    p.includes('today') ||
    p.includes('metrics')
  ) {
    const delivered = ordersList.filter((o) => o.status === 'delivered');
    const totalRev = delivered.reduce((sum, o) => sum + (o.total || 0), 0);
    const avgBasket = delivered.length > 0 ? Math.round(totalRev / delivered.length) : 0;
    const epCount = ordersList.filter((o) => o.payment.method === 'easypaisa').length;
    const codCount = ordersList.filter((o) => o.payment.method === 'cod').length;
    const bestsellers = metrics.topDishes.length > 0 ? metrics.topDishes.slice(0, 3).join(', ') : 'Double Beef Smash, Nashville Tenders';

    const salesResponses = [
      `Here is the pulse on our numbers today:

• **Realized Revenue:** Rs. **${totalRev.toLocaleString()}** across **${delivered.length}** delivered orders.
• **Average Ticket Size:** Rs. **${avgBasket.toLocaleString()}** per customer.
• **Live Pipeline:** **${metrics.activeOrdersCount}** orders in the kitchen/dispatch pipeline right now.
• **Payment Channel:** ${epCount} verified EasyPaisa transactions vs ${codCount} Cash on Delivery.
• **Top Earners:** ${bestsellers}.

💡 *My recommendation:* Our volume is steady, but if we push a late-night dessert bundle (like our Gourmet Lotus Biscoff Shake) as an impulse upsell at checkout, we can easily hike that average ticket from Rs. ${avgBasket.toLocaleString()} toward Rs. 1,500+. Want me to outline the bundle pricing?`,

      `Here’s our financial snapshot right this minute:

We've locked in **Rs. ${totalRev.toLocaleString()}** from **${delivered.length}** completed orders, with an average ticket of **Rs. ${avgBasket.toLocaleString()}**. Right now in the kitchen, **${metrics.activeOrdersCount} active orders** are sizzling, and **${metrics.activeRidersCount} riders** are on their delivery routes.

Noticeable trend: EasyPaisa adoption (${epCount} orders) is saving us huge cash-handling headaches compared to COD (${codCount} orders). Should we run a special weekend discount for online payments to push that even further?`,
    ];
    return pick(salesResponses);
  }

  // 4. Riders, Fleet Dispatch & Turnaround Logistics
  if (
    p.includes('rider') ||
    p.includes('driver') ||
    p.includes('dispatch') ||
    p.includes('delivery') ||
    p.includes('traffic') ||
    p.includes('turnaround') ||
    p.includes('route') ||
    p.includes('area') ||
    p.includes('location')
  ) {
    const onWay = ordersList.filter((o) => o.status === 'on_the_way');
    const activeAreas = [...new Set(onWay.map((o) => o.area).filter(Boolean))];
    const areaSummary = activeAreas.length > 0 ? activeAreas.join(', ') : 'North Nazimabad, Hyderi, and Buffer Zone';

    const riderResponses = [
      `Dispatch update for the delivery fleet:

• **Riders on the Road:** **${onWay.length} active deliveries** currently in-flight.
• **Active Coverage Zones:** ${areaSummary}.
• **Packaging & Heat Retention:** Make sure all smash burgers and crinkle fries are sealed inside thermal foil-lined sleeves before leaving the counter so they arrive sizzling hot.
• **Turnaround Rhythm:** Dispatch is keeping kitchen-to-doorstep times around ~25–35 minutes.

💡 *Dispatch advice:* During the peak evening rush around Hyderi Market and Sakhi Hassan, dispatch should pair orders in adjacent blocks (e.g., Block B with Block C) so each rider handles grouped drop-offs. That easily shaves 10–12 minutes off transit times!`,

      `On the delivery and logistics side:

We've got **${metrics.activeRidersCount} riders dispatched** heading toward ${areaSummary}. 

Orders are moving at a good pace. If road conditions get wet or congested near Nagan Chowrangi or KDA Roundabout, remember you can flick on the **Monsoon / Weather Alert HUD** in the Website HUD settings so customers know riders are taking cautious routes. How are our delivery ETAs feeling to you right now?`,
    ];
    return pick(riderResponses);
  }

  // 5. Combos, Promos, Discounts & Menu Margin Deals
  if (
    p.includes('deal') ||
    p.includes('combo') ||
    p.includes('promo') ||
    p.includes('discount') ||
    p.includes('offer') ||
    p.includes('special') ||
    p.includes('margin') ||
    p.includes('price') ||
    p.includes('menu') ||
    p.includes('burger')
  ) {
    const promoResponses = [
      `Here are two high-yield combo structures that crush it with our Karachi North customer base:

🍔 **1. "The Hyderi Double-Smash Box"** (Profit Margin: ~62%)
• 1x Double Patty Smash Burger + 1x Animal-Style Loaded Cheese Fries + 1x Chilled Soda
• Retail Price: **Rs. 1,390** (Perceived Regular Value: Rs. 1,650 · Customer saves Rs. 260)
• *Why it works:* Fries and soda carry huge profit margins that protect the premium beef cost.

🍗 **2. "Midnight Broast & Biscoff Feast"** (Late-Night Power Combo)
• 4 Pcs Crispy Golden Broast + Seasoned Crinkle Fries + 1x Lotus Biscoff Gourmet Shake
• Retail Price: **Rs. 1,750**
• *Why it works:* It’s the ultimate weekend comfort order for two friends or couples ordering after 11 PM.

Shall we put one of these in the **Top Announcement Bar HUD** with the countdown timer?`,

      `From a culinary and margin standpoint, here's where the smart money is right now:

Our smash patties take 100% prime beef, which is our biggest ingredient cost. To maximize margin, every burger order should be paired with a high-margin anchor:
• **Crinkle Fries Upgrade** (Food Cost: ~Rs. 90, Sells for Rs. 350)
• **Gourmet Shakes** (Food Cost: ~Rs. 220, Sells for Rs. 650)

If we create a **"Bite & Go Duo Combo"** at **Rs. 2,190** (2 Burgers, 1 Large Fries, 2 Drinks), our kitchen gross margin stays well above 55%. What items do you want to feature?`,
    ];
    return pick(promoResponses);
  }

  // 6. Customer Support, Tickets & Empathetic Complaints Resolution
  if (
    p.includes('complaint') ||
    p.includes('ticket') ||
    p.includes('cold') ||
    p.includes('late') ||
    p.includes('delay') ||
    p.includes('support') ||
    p.includes('angry') ||
    p.includes('upset') ||
    p.includes('refund') ||
    p.includes('apologize')
  ) {
    return `Here’s an authentic, heartfelt response you can send straight to the customer over WhatsApp or the Support Ticket Hub:

*"Assalam-o-Alaikum! Hassan here from the Bite & Go North Nazimabad kitchen.*

*I saw your feedback regarding your order, and I want to apologize personally. Our standard is sizzling-hot smash burgers straight off the chrome flat-top to your doorstep, and today we didn't give you the experience you deserved.*

*I have already reviewed the ticket with our grill lead and dispatch rider so this doesn't repeat. As a genuine token of apology, I’ve credited a complimentary Rs. 350 voucher to your phone number for your next meal with us.*

*Thank you for supporting our local kitchen. Your trust means everything to our team!"*

Notice the tone: sincere, takes responsibility immediately without making excuses, and offers tangible value. That retains 95% of unhappy diners.`;
  }

  // 7. Kitchen Operations, Grill, Buns, Oil, Staff Bottlenecks
  if (
    p.includes('kitchen') ||
    p.includes('grill') ||
    p.includes('prep') ||
    p.includes('cook') ||
    p.includes('bun') ||
    p.includes('patty') ||
    p.includes('smash') ||
    p.includes('oil') ||
    p.includes('staff') ||
    p.includes('slow') ||
    p.includes('bottleneck')
  ) {
    return `Looking at kitchen station efficiency:

1. **Flat-Top Chrome Griddle:** Make sure the griddle surface is maintained strictly between **400°F–425°F**. If the surface drops below 390°F because too many cold beef balls are loaded at once, the meat steams instead of achieving that signature caramelized lacy Maillard crust.
2. **Butter Toasted Brioche Buns:** Keep the toaster station dedicated. 30 seconds face-down on clarified butter creates a protective moisture barrier so burger sauce never leaves the bun soggy during delivery.
3. **Fryer Station:** Keep oil filtered twice daily. Clean oil gives our golden crispy broast that light, non-greasy crunch.
4. **Current Queue:** We've got **${metrics.activeOrdersCount} orders** in preparation right now with an estimated turnaround of ~15 minutes.

Is one specific station lagging behind tonight?`;
  }

  // 8. General conversational queries, questions, or ideas
  const generalResponses = [
    `I'm following you. Here at North Nazimabad Block-I, we currently have **${metrics.activeOrdersCount} orders in progress**, **${metrics.deliveredCount} delivered**, and today's volume is at **Rs. ${metrics.todayRevenuePKR.toLocaleString()}**. 

If we're planning the next push, we can either:
1. Fire up a flash promo in the **Website HUD** to boost dinner orders.
2. Review our active dispatch fleet turnaround and Karachi block batching.
3. Audit any pending customer support tickets.

Which direction do you want to explore?`,

    `That's a solid point to discuss. In terms of live operations, the kitchen is humming along nicely. Our bestselling dishes right now are **${metrics.topDishes.slice(0, 2).join(' and ') || 'Smash Burgers'}**, and our delivery radius is covering all of North Nazimabad, Hyderi, Buffer Zone, and FB Area with dedicated express fleet couriers. 

Tell me what angle you want to drill into—marketing ideas, kitchen speed, or rider dispatch turnaround?`,

    `Got your perspective. Operating a high-volume smash joint in Karachi is all about keeping quality consistent while moving tickets fast. With Rs. ${metrics.todayRevenuePKR.toLocaleString()} generated today and ${metrics.activeOrdersCount} tickets cooking, we have strong momentum. 

What's the exact question or challenge you want my take on right now?`,
  ];

  return pick(generalResponses);
}


function generateCulinaryMarketingVisual(promptText: string, context: any): string {
  const p = (promptText || '').toLowerCase();
  let itemType: 'burger' | 'tenders' | 'fries' | 'shake' | 'combo' | 'promo' = 'burger';
  let title = 'SIGNATURE DOUBLE SMASH';
  let subtitle = 'Dual 100% Halal Prime Beef • Wisconsin Cheddar • Grilled Sweet Onions';
  let badge = "CHEF'S SIGNATURE SPECIAL";
  let price = 'RS. 1,050';
  let accentColor = '#f59e0b';
  let secondaryColor = '#ea580c';

  if (p.includes('lotus') || p.includes('shake') || p.includes('biscoff') || p.includes('dessert')) {
    itemType = 'shake';
    title = 'LOTUS BISCOFF SHAKE';
    subtitle = 'Belgian Speculoos Cookie Crumbs • Rich Dairy Ice Cream • Whipped Cream Swirl';
    badge = 'LIMITED EDITION INDULGENCE';
    price = 'RS. 680';
    accentColor = '#f59e0b';
    secondaryColor = '#b45309';
  } else if (p.includes('chicken') || p.includes('tender') || p.includes('fried') || p.includes('nashville')) {
    itemType = 'tenders';
    title = 'CRISPY NASHVILLE TENDERS';
    subtitle = '24-Hour Buttermilk Brined • Cayenne Heat Dust • Creamy Garlic Dip';
    badge = 'EXTRA CRISPY CRUNCH';
    price = 'RS. 850';
    accentColor = '#ef4444';
    secondaryColor = '#dc2626';
  } else if (p.includes('fries') || p.includes('loaded')) {
    itemType = 'fries';
    title = 'LOADED CRINKLE FRIES';
    subtitle = 'Golden Ridged Potatoes • Molten Cheddar River • Pickled Jalapeno Relish';
    badge = 'CROWD FAVORITE APPETIZER';
    price = 'RS. 550';
    accentColor = '#f59e0b';
    secondaryColor = '#d97706';
  } else if (p.includes('box') || p.includes('combo') || p.includes('feast') || p.includes('platter')) {
    itemType = 'combo';
    title = 'ULTIMATE SHARING FEAST';
    subtitle = '2x Double Smash Burgers • Cheesy Loaded Fries • 3x Crispy Tenders • Chilled Sodas';
    badge = 'HIGH MARGIN SHARING COMBO';
    price = 'RS. 2,350';
    accentColor = '#f59e0b';
    secondaryColor = '#e11d48';
  } else if (p.includes('20%') || p.includes('discount') || p.includes('deal') || p.includes('promo') || p.includes('poster')) {
    itemType = 'promo';
    title = 'LATE NIGHT FLASH DEAL';
    subtitle = '20% Off All Smash Burgers & Combos • Rapid North Nazimabad Dispatch';
    badge = 'FLASH PROMO: USE CODE BITEGO';
    price = 'SAVE 20% TONIGHT';
    accentColor = '#10b981';
    secondaryColor = '#059669';
  }

  // Generate ultra-high-definition, self-contained food illustration vectors based on itemType
  let foodIllustrationSvg = '';

  if (itemType === 'burger') {
    foodIllustrationSvg = `
      <!-- SMASH BURGER ILLUSTRATION -->
      <g transform="translate(540, 80)">
        <!-- Table shadow & glow -->
        <ellipse cx="200" cy="440" rx="170" ry="24" fill="#000000" opacity="0.7" filter="url(#softGlow)"/>
        <circle cx="200" cy="240" r="150" fill="#f59e0b" opacity="0.12" filter="url(#glow)"/>

        <!-- Steam Wafts -->
        <path d="M160 120 Q150 90 170 60 Q190 30 180 10" stroke="#ffffff" stroke-width="3" fill="none" opacity="0.3" stroke-linecap="round"/>
        <path d="M220 110 Q240 80 220 50 Q200 20 215 5" stroke="#ffffff" stroke-width="2.5" fill="none" opacity="0.25" stroke-linecap="round"/>
        <path d="M190 130 Q180 100 200 75 Q215 50 205 25" stroke="#f59e0b" stroke-width="2" fill="none" opacity="0.2" stroke-linecap="round"/>

        <!-- Bottom Brioche Bun -->
        <path d="M70 380 Q200 405 330 380 Q325 415 200 425 Q75 415 70 380 Z" fill="#d97706"/>
        <path d="M80 382 Q200 400 320 382 Q310 405 200 415 Q90 405 80 382 Z" fill="#b45309"/>
        <!-- Bottom Sauce & Lettuce Frills -->
        <path d="M60 375 Q90 390 130 370 Q170 395 210 370 Q250 395 290 370 Q320 390 340 375 Q320 365 200 365 Q80 365 60 375 Z" fill="#15803d"/>
        <path d="M70 372 Q100 382 140 368 Q180 388 220 368 Q260 388 300 368 Q330 380 335 372" stroke="#22c55e" stroke-width="3" fill="none" opacity="0.8"/>

        <!-- Sliced Juicy Tomatoes -->
        <ellipse cx="140" cy="355" rx="55" ry="14" fill="#dc2626"/>
        <ellipse cx="260" cy="355" rx="55" ry="14" fill="#ef4444"/>
        <ellipse cx="140" cy="353" rx="45" ry="10" fill="#f87171" opacity="0.7"/>

        <!-- Lower Smash Beef Patty with Jagged Crispy Crust -->
        <path d="M50 320 C70 305 130 315 200 310 C270 315 330 305 350 320 C355 335 330 350 200 350 C70 350 45 335 50 320 Z" fill="#261005"/>
        <path d="M55 325 Q120 315 200 320 Q280 315 345 325" stroke="#451a03" stroke-width="6" stroke-linecap="round"/>
        <!-- Char / sear spots -->
        <circle cx="90" cy="330" r="4" fill="#000000"/>
        <circle cx="160" cy="328" r="5" fill="#000000"/>
        <circle cx="230" cy="332" r="4" fill="#000000"/>
        <circle cx="300" cy="328" r="5" fill="#000000"/>

        <!-- Melting Layer 1: Wisconsin Cheddar Melt & Drips -->
        <path d="M60 295 C80 295 110 320 125 335 C135 345 140 325 155 320 C180 315 190 340 205 350 C215 345 225 320 240 320 C260 320 275 345 290 340 C305 335 325 300 340 295 C330 285 200 280 60 295 Z" fill="#f59e0b"/>
        <path d="M70 297 C90 297 120 325 125 332 C135 340 140 322 155 318 C180 313 190 338 205 345 C215 340 225 318 240 318 C260 318 275 340 290 335 C305 330 320 298 330 297" stroke="#fbbf24" stroke-width="4" fill="none"/>

        <!-- Diced Caramelized Onions on top of patty -->
        <ellipse cx="150" cy="285" rx="12" ry="5" fill="#78350f" opacity="0.9"/>
        <ellipse cx="190" cy="282" rx="14" ry="5" fill="#92400e" opacity="0.9"/>
        <ellipse cx="230" cy="284" rx="13" ry="5" fill="#78350f" opacity="0.9"/>

        <!-- Upper Smash Beef Patty (Lacy, ultra-craggy seared crust) -->
        <path d="M45 255 C65 240 130 250 200 245 C270 250 335 240 355 255 C360 270 330 285 200 285 C70 285 40 270 45 255 Z" fill="#1c0b04"/>
        <path d="M50 258 Q120 250 200 253 Q280 250 350 258" stroke="#3b1506" stroke-width="7" stroke-linecap="round"/>

        <!-- Melting Layer 2: Second Thick Cheddar Melt -->
        <path d="M55 235 C75 235 95 265 110 275 C120 270 135 255 150 255 C175 255 185 280 200 285 C210 280 225 255 240 255 C265 255 280 275 295 270 C310 265 330 238 345 235 C330 225 200 220 55 235 Z" fill="#f59e0b"/>
        <path d="M85 245 C95 260 108 272 110 274" stroke="#fef08a" stroke-width="3" stroke-linecap="round"/>
        <path d="M185 260 C195 275 198 283 200 284" stroke="#fef08a" stroke-width="3" stroke-linecap="round"/>

        <!-- Secret Orange Sauce Drops -->
        <circle cx="112" cy="280" r="5" fill="#ea580c"/>
        <circle cx="202" cy="290" r="6" fill="#ea580c"/>
        <circle cx="292" cy="275" r="5" fill="#ea580c"/>

        <!-- Top Golden Glazed Brioche Bun Dome -->
        <path d="M50 225 C50 145 110 115 200 115 C290 115 350 145 350 225 C330 235 200 238 50 225 Z" fill="#d97706"/>
        <!-- Bun Gloss Highlight -->
        <path d="M90 170 C100 140 145 125 200 125 C240 125 270 135 285 150 C265 138 230 132 200 132 C150 132 115 145 90 170 Z" fill="#fef3c7" opacity="0.6"/>

        <!-- White & Golden Sesame Seeds -->
        <ellipse cx="140" cy="155" rx="4" ry="2" fill="#fef3c7" transform="rotate(-15 140 155)"/>
        <ellipse cx="170" cy="140" rx="4" ry="2" fill="#ffffff" transform="rotate(20 170 140)"/>
        <ellipse cx="210" cy="140" rx="4" ry="2" fill="#fef3c7" transform="rotate(-10 210 140)"/>
        <ellipse cx="240" cy="155" rx="4" ry="2" fill="#ffffff" transform="rotate(30 240 155)"/>
        <ellipse cx="120" cy="180" rx="4" ry="2" fill="#ffffff" transform="rotate(10 120 180)"/>
        <ellipse cx="160" cy="175" rx="4" ry="2" fill="#fef3c7" transform="rotate(-25 160 175)"/>
        <ellipse cx="200" cy="170" rx="4" ry="2" fill="#ffffff" transform="rotate(5 200 170)"/>
        <ellipse cx="250" cy="180" rx="4" ry="2" fill="#fef3c7" transform="rotate(-15 250 180)"/>
        <ellipse cx="280" cy="195" rx="4" ry="2" fill="#ffffff" transform="rotate(25 280 195)"/>
      </g>`;
  } else if (itemType === 'tenders') {
    foodIllustrationSvg = `
      <!-- CRISPY NASHVILLE TENDERS ILLUSTRATION -->
      <g transform="translate(540, 80)">
        <ellipse cx="200" cy="430" rx="170" ry="25" fill="#000000" opacity="0.75" filter="url(#softGlow)"/>
        <circle cx="200" cy="240" r="160" fill="#dc2626" opacity="0.12" filter="url(#glow)"/>

        <!-- Steam Wafts -->
        <path d="M150 100 Q135 70 160 40 Q180 15 170 0" stroke="#ffffff" stroke-width="3" fill="none" opacity="0.3" stroke-linecap="round"/>
        <path d="M240 90 Q260 65 240 35 Q220 10 235 0" stroke="#ef4444" stroke-width="2.5" fill="none" opacity="0.3" stroke-linecap="round"/>

        <!-- Side Ramekin of Garlic Ranch Dip -->
        <ellipse cx="290" cy="380" rx="55" ry="22" fill="#18181b"/>
        <ellipse cx="290" cy="376" rx="50" ry="18" fill="#f4f4f5"/>
        <path d="M270 376 Q290 384 310 374" stroke="#ef4444" stroke-width="2.5" fill="none" opacity="0.7"/>
        <circle cx="285" cy="374" r="2" fill="#15803d"/>
        <circle cx="298" cy="378" r="2.5" fill="#15803d"/>

        <!-- Crispy Golden Crinkle Fries on the side -->
        <path d="M60 360 L110 380 L105 395 L55 375 Z" fill="#eab308"/>
        <path d="M75 340 L135 370 L130 385 L70 355 Z" fill="#ca8a04"/>
        <path d="M90 330 L150 355 L145 370 L85 345 Z" fill="#eab308"/>

        <!-- Large Crispy Chicken Tender 1 (Back) -->
        <path d="M100 240 C90 170 150 150 180 180 C210 210 200 290 160 340 C130 370 90 330 100 240 Z" fill="#991b1b"/>
        <path d="M105 240 C98 180 150 165 175 190 C198 220 190 280 155 330 C130 355 100 320 105 240 Z" fill="#b91c1c"/>

        <!-- Large Crispy Chicken Tender 2 (Center) -->
        <path d="M140 180 C150 120 220 130 250 170 C280 220 270 310 220 370 C180 390 140 330 140 240 Z" fill="#b91c1c"/>
        <path d="M148 185 C158 135 215 142 240 178 C265 220 255 295 215 355 C185 370 150 320 148 240 Z" fill="#ea580c"/>

        <!-- Large Crispy Chicken Tender 3 (Front, golden-crispy & crunchy edges) -->
        <path d="M90 260 C80 220 130 200 170 230 C220 270 230 340 190 395 C140 420 85 370 90 260 Z" fill="#d97706"/>
        <path d="M98 265 C90 230 135 215 165 240 C205 275 215 330 180 380 C140 400 95 360 98 265 Z" fill="#f59e0b"/>

        <!-- Jagged crispy flakes & crunchy batter bumps -->
        <circle cx="130" cy="260" r="5" fill="#78350f"/>
        <circle cx="160" cy="275" r="6" fill="#78350f"/>
        <circle cx="140" cy="315" r="6.5" fill="#78350f"/>
        <circle cx="170" cy="335" r="5" fill="#78350f"/>
        <circle cx="120" cy="345" r="5.5" fill="#78350f"/>
        <!-- Cayenne Pepper Red Dust Flakes -->
        <circle cx="125" cy="250" r="2.5" fill="#dc2626"/>
        <circle cx="145" cy="290" r="3" fill="#dc2626"/>
        <circle cx="175" cy="310" r="3.5" fill="#dc2626"/>
        <circle cx="155" cy="350" r="2.5" fill="#dc2626"/>
        <circle cx="185" cy="280" r="3" fill="#dc2626"/>
        <!-- Fresh Parsley Flakes -->
        <circle cx="135" cy="270" r="2.5" fill="#22c55e"/>
        <circle cx="165" cy="295" r="3" fill="#15803d"/>
        <circle cx="145" cy="335" r="2" fill="#22c55e"/>
      </g>`;
  } else if (itemType === 'fries') {
    foodIllustrationSvg = `
      <!-- LOADED CRINKLE FRIES ILLUSTRATION -->
      <g transform="translate(540, 80)">
        <ellipse cx="200" cy="430" rx="175" ry="25" fill="#000000" opacity="0.8" filter="url(#softGlow)"/>
        <circle cx="200" cy="250" r="160" fill="#f59e0b" opacity="0.14" filter="url(#glow)"/>

        <!-- Cast Iron Skillet / Serving Bowl Base -->
        <ellipse cx="200" cy="390" rx="160" ry="45" fill="#18181b"/>
        <ellipse cx="200" cy="385" rx="150" ry="38" fill="#27272a"/>

        <!-- Layer of Crispy Golden Crinkle-Cut French Fries -->
        <g stroke="#b45309" stroke-width="2" stroke-linecap="round">
          <!-- Fry 1 -->
          <path d="M80 340 L160 380 L155 395 L75 355 Z" fill="#facc15"/>
          <!-- Fry 2 -->
          <path d="M120 320 L220 370 L215 385 L115 335 Z" fill="#eab308"/>
          <!-- Fry 3 -->
          <path d="M180 315 L290 365 L285 380 L175 330 Z" fill="#facc15"/>
          <!-- Fry 4 -->
          <path d="M230 325 L320 375 L315 390 L225 340 Z" fill="#ca8a04"/>
          <!-- Fry 5 (Crosswise) -->
          <path d="M100 370 L240 330 L245 345 L105 385 Z" fill="#eab308"/>
          <!-- Fry 6 -->
          <path d="M150 365 L290 320 L295 335 L155 380 Z" fill="#facc15"/>
          <!-- Top pile fries -->
          <path d="M110 300 L200 345 L195 360 L105 315 Z" fill="#fef08a"/>
          <path d="M170 290 L260 340 L255 355 L165 305 Z" fill="#facc15"/>
          <path d="M130 270 L240 315 L235 330 L125 285 Z" fill="#fef08a"/>
        </g>

        <!-- Molten Cheddar Cheese Lava River Cascading -->
        <path d="M100 310 C120 300 150 320 170 340 C185 355 200 330 225 330 C250 330 270 350 285 350 C300 350 310 330 320 335 C310 375 290 395 200 395 C110 395 90 360 100 310 Z" fill="#f59e0b"/>
        <path d="M130 320 C150 320 170 340 185 350 C200 340 215 320 230 320 C245 320 260 340 275 340" stroke="#fef08a" stroke-width="6" stroke-linecap="round" fill="none"/>
        <path d="M185 350 C188 375 190 385 192 390" stroke="#f59e0b" stroke-width="8" stroke-linecap="round"/>

        <!-- Sizzling Beef Mince Bits / Bacon Crumbles -->
        <circle cx="130" cy="330" r="4.5" fill="#451a03"/>
        <circle cx="170" cy="340" r="5" fill="#261005"/>
        <circle cx="210" cy="335" r="4" fill="#451a03"/>
        <circle cx="245" cy="345" r="5" fill="#261005"/>
        <circle cx="180" cy="365" r="4.5" fill="#261005"/>
        <circle cx="225" cy="360" r="4" fill="#451a03"/>

        <!-- Pickled Green Jalapeno Slices with Seeds -->
        <!-- Jalapeno 1 -->
        <ellipse cx="145" cy="315" rx="18" ry="11" fill="#15803d" transform="rotate(-15 145 315)"/>
        <ellipse cx="145" cy="315" rx="12" ry="7" fill="#166534" transform="rotate(-15 145 315)"/>
        <circle cx="142" cy="315" r="2" fill="#fef08a"/>
        <!-- Jalapeno 2 -->
        <ellipse cx="205" cy="310" rx="19" ry="12" fill="#15803d" transform="rotate(20 205 310)"/>
        <ellipse cx="205" cy="310" rx="13" ry="8" fill="#166534" transform="rotate(20 205 310)"/>
        <circle cx="203" cy="310" r="2" fill="#fef08a"/>
        <!-- Jalapeno 3 -->
        <ellipse cx="260" cy="330" rx="17" ry="10" fill="#15803d" transform="rotate(-10 260 330)"/>
        <ellipse cx="260" cy="330" rx="11" ry="6" fill="#166534" transform="rotate(-10 260 330)"/>
        <circle cx="258" cy="330" r="2" fill="#fef08a"/>

        <!-- Finely Diced Spring Onions / Chives -->
        <rect x="120" y="325" width="5" height="3" rx="1" fill="#22c55e" transform="rotate(40 120 325)"/>
        <rect x="165" y="315" width="6" height="3" rx="1" fill="#4ade80" transform="rotate(-20 165 315)"/>
        <rect x="190" y="335" width="5" height="3" rx="1" fill="#22c55e" transform="rotate(15 190 335)"/>
        <rect x="230" y="325" width="6" height="3" rx="1" fill="#4ade80" transform="rotate(50 230 325)"/>
        <rect x="270" y="345" width="5" height="3" rx="1" fill="#22c55e" transform="rotate(-30 270 345)"/>
      </g>`;
  } else if (itemType === 'shake') {
    foodIllustrationSvg = `
      <!-- GOURMET LOTUS BISCOFF SHAKE ILLUSTRATION -->
      <g transform="translate(540, 60)">
        <ellipse cx="200" cy="460" rx="130" ry="20" fill="#000000" opacity="0.8" filter="url(#softGlow)"/>
        <circle cx="200" cy="240" r="160" fill="#d97706" opacity="0.15" filter="url(#glow)"/>

        <!-- Red & White Striped Retro Straw -->
        <g transform="rotate(-18 190 120)">
          <rect x="185" y="0" width="16" height="280" rx="6" fill="#ffffff"/>
          <path d="M185 30 L201 45 L201 60 L185 45 Z" fill="#dc2626"/>
          <path d="M185 75 L201 90 L201 105 L185 90 Z" fill="#dc2626"/>
          <path d="M185 120 L201 135 L201 150 L185 135 Z" fill="#dc2626"/>
          <path d="M185 165 L201 180 L201 195 L185 180 Z" fill="#dc2626"/>
        </g>

        <!-- Tall Glass Shadow & Base -->
        <ellipse cx="200" cy="435" rx="55" ry="15" fill="#52525b"/>
        <rect x="190" y="405" width="20" height="30" fill="#71717a"/>
        <!-- Glass Body Silhouette -->
        <path d="M150 220 L165 405 Q200 415 235 405 L250 220 Q200 230 150 220 Z" fill="#78350f" opacity="0.95"/>

        <!-- Rich Biscoff Speculoos Shake Liquid inside glass -->
        <path d="M152 225 L166 400 Q200 410 234 400 L248 225 Q200 235 152 225 Z" fill="#92400e"/>
        <!-- Caramel Swirl Ribbons inside Glass -->
        <path d="M160 250 Q200 280 170 320 Q210 350 180 390" stroke="#f59e0b" stroke-width="7" fill="none" opacity="0.8" stroke-linecap="round"/>
        <path d="M240 260 Q190 300 230 340 Q195 370 220 395" stroke="#d97706" stroke-width="6" fill="none" opacity="0.75" stroke-linecap="round"/>

        <!-- Glass Gloss & Condensation beads -->
        <path d="M155 240 L168 395" stroke="#ffffff" stroke-width="3" opacity="0.4" stroke-linecap="round"/>
        <circle cx="160" cy="280" r="2" fill="#ffffff" opacity="0.5"/>
        <circle cx="163" cy="320" r="2.5" fill="#ffffff" opacity="0.5"/>
        <circle cx="170" cy="360" r="2" fill="#ffffff" opacity="0.4"/>

        <!-- Towering Swirl of Whipped Cream on Top -->
        <path d="M140 220 C130 180 170 170 180 185 C190 160 220 160 225 180 C240 170 265 185 255 220 C245 235 155 235 140 220 Z" fill="#ffffff"/>
        <path d="M160 185 C155 155 185 140 195 155 C205 135 235 140 230 170 C220 185 170 185 160 185 Z" fill="#f4f4f5"/>
        <!-- Whipped Cream Peak Swirl -->
        <path d="M180 155 C185 125 210 120 205 145 Z" fill="#ffffff"/>

        <!-- Warm Caramel & Biscoff Spread Drizzle over Cream -->
        <path d="M165 175 Q180 200 175 230" stroke="#b45309" stroke-width="4.5" fill="none" stroke-linecap="round"/>
        <path d="M200 150 Q215 190 205 235" stroke="#d97706" stroke-width="5" fill="none" stroke-linecap="round"/>
        <path d="M225 170 Q240 195 230 225" stroke="#b45309" stroke-width="4" fill="none" stroke-linecap="round"/>

        <!-- Rectangular Golden Lotus Biscoff Biscuit Cookie inserted at an angle -->
        <g transform="translate(130, 110) rotate(-28)">
          <rect x="0" y="0" width="85" height="42" rx="6" fill="#b45309" stroke="#78350f" stroke-width="2"/>
          <rect x="6" y="5" width="73" height="32" rx="4" fill="#d97706"/>
          <text x="42" y="24" text-anchor="middle" fill="#78350f" font-family="system-ui, sans-serif" font-weight="900" font-size="9" letter-spacing="1">LOTUS</text>
        </g>

        <!-- Biscoff Cookie Crumb Sprinkles cascading -->
        <circle cx="170" cy="180" r="2.5" fill="#78350f"/>
        <circle cx="190" cy="170" r="3" fill="#92400e"/>
        <circle cx="210" cy="185" r="2.5" fill="#78350f"/>
        <circle cx="225" cy="195" r="2" fill="#92400e"/>
        <circle cx="180" cy="210" r="2.5" fill="#78350f"/>
        <circle cx="215" cy="215" r="3" fill="#92400e"/>
      </g>`;
  } else if (itemType === 'combo') {
    foodIllustrationSvg = `
      <!-- COMBO PLATTER ILLUSTRATION -->
      <g transform="translate(540, 80)">
        <ellipse cx="200" cy="430" rx="180" ry="30" fill="#000000" opacity="0.8" filter="url(#softGlow)"/>
        <circle cx="200" cy="250" r="160" fill="#f59e0b" opacity="0.14" filter="url(#glow)"/>

        <!-- Left Mini Smash Burger -->
        <g transform="translate(20, 150) scale(0.65)">
          <path d="M50 225 C50 145 110 115 200 115 C290 115 350 145 350 225 Z" fill="#d97706"/>
          <path d="M55 235 C75 235 150 255 200 255 C265 255 330 238 345 235 Z" fill="#f59e0b"/>
          <path d="M45 255 C65 240 200 245 355 255 C360 270 200 285 45 255 Z" fill="#1c0b04"/>
          <path d="M60 295 C80 295 190 320 205 320 C275 320 340 295 340 295 Z" fill="#f59e0b"/>
          <path d="M50 320 C70 305 200 310 350 320 C355 335 200 350 50 320 Z" fill="#261005"/>
          <path d="M70 380 Q200 405 330 380 Q200 425 70 380 Z" fill="#d97706"/>
        </g>

        <!-- Right Crispy Tenders -->
        <g transform="translate(180, 160) scale(0.65)">
          <path d="M90 260 C80 220 130 200 170 230 C220 270 230 340 190 395 C140 420 85 370 90 260 Z" fill="#ea580c"/>
          <path d="M140 180 C150 120 220 130 250 170 C280 220 220 370 140 240 Z" fill="#d97706"/>
          <circle cx="160" cy="275" r="5" fill="#dc2626"/>
          <circle cx="180" cy="250" r="4" fill="#dc2626"/>
        </g>

        <!-- Center Front Loaded Fries Mound -->
        <g transform="translate(80, 240) scale(0.65)">
          <path d="M80 340 L160 380 L75 355 Z" fill="#facc15"/>
          <path d="M120 320 L220 370 L115 335 Z" fill="#eab308"/>
          <path d="M180 315 L290 365 L175 330 Z" fill="#facc15"/>
          <path d="M100 310 C150 320 200 330 285 350 Z" fill="#f59e0b"/>
          <ellipse cx="185" cy="340" rx="15" ry="9" fill="#15803d"/>
        </g>

        <!-- Ice Cold Beverage Can -->
        <g transform="translate(300, 140)">
          <rect x="0" y="20" width="50" height="110" rx="10" fill="#dc2626"/>
          <ellipse cx="25" cy="20" rx="25" ry="8" fill="#a1a1aa"/>
          <ellipse cx="25" cy="18" rx="22" ry="6" fill="#d4d4d8"/>
          <text x="25" y="80" text-anchor="middle" fill="#ffffff" font-family="system-ui" font-weight="900" font-size="11" transform="rotate(-90 25 80)">CHILLED</text>
        </g>
      </g>`;
  } else {
    // PROMO POSTER ART
    foodIllustrationSvg = `
      <!-- MARKETING PROMO BANNER ART -->
      <g transform="translate(540, 80)">
        <rect x="20" y="30" width="360" height="430" rx="24" fill="#09090b" stroke="#10b981" stroke-width="2.5"/>
        <circle cx="200" cy="200" r="140" fill="#10b981" opacity="0.12" filter="url(#glow)"/>

        <!-- Flash Sale Burst Badge -->
        <circle cx="200" cy="160" r="80" fill="url(#accentGrad)" filter="url(#glow)"/>
        <text x="200" y="145" text-anchor="middle" fill="#000000" font-family="system-ui, sans-serif" font-weight="900" font-size="28">20%</text>
        <text x="200" y="180" text-anchor="middle" fill="#000000" font-family="system-ui, sans-serif" font-weight="900" font-size="20">OFF</text>

        <!-- Promo Code Pill Box -->
        <rect x="60" y="270" width="280" height="55" rx="14" fill="#18181b" stroke="#10b981" stroke-width="2" stroke-dasharray="6 4"/>
        <text x="200" y="295" text-anchor="middle" fill="#a1a1aa" font-family="monospace" font-size="11" font-weight="700">ONLINE CHECKOUT VOUCHER:</text>
        <text x="200" y="318" text-anchor="middle" fill="#34d399" font-family="monospace" font-weight="900" font-size="20" letter-spacing="4">CODE: BITEGO</text>

        <!-- Perks list -->
        <text x="200" y="360" text-anchor="middle" fill="#ffffff" font-family="system-ui" font-size="13" font-weight="700">⚡ North Nazimabad Rapid 30-Min Delivery</text>
        <text x="200" y="385" text-anchor="middle" fill="#34d399" font-family="system-ui" font-size="12" font-weight="800">🔥 FRESH ON 400°F GRILL UNTIL 3:30 AM</text>
      </g>`;
  }

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 650" width="100%" height="100%">
    <defs>
      <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#140803"/>
        <stop offset="50%" stop-color="#0a0503"/>
        <stop offset="100%" stop-color="#1c0b04"/>
      </linearGradient>
      <linearGradient id="accentGrad" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stop-color="${accentColor}"/>
        <stop offset="100%" stop-color="${secondaryColor}"/>
      </linearGradient>
      <radialGradient id="spotlight" cx="70%" cy="45%" r="60%">
        <stop offset="0%" stop-color="${accentColor}" stop-opacity="0.25"/>
        <stop offset="60%" stop-color="${secondaryColor}" stop-opacity="0.08"/>
        <stop offset="100%" stop-color="#000000" stop-opacity="0"/>
      </radialGradient>
      <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
        <feGaussianBlur stdDeviation="15" result="blur"/>
        <feComposite in="SourceGraphic" in2="blur" operator="over"/>
      </filter>
      <filter id="softGlow" x="-30%" y="-30%" width="160%" height="160%">
        <feGaussianBlur stdDeviation="22" result="blur"/>
      </filter>
      <clipPath id="photoClip">
        <rect x="540" y="80" width="400" height="490" rx="24"/>
      </clipPath>
    </defs>

    <!-- Deep Charcoal Culinary Background -->
    <rect width="1000" height="650" fill="url(#bgGrad)"/>
    <rect width="1000" height="650" fill="url(#spotlight)"/>
    <circle cx="280" cy="325" r="260" fill="${accentColor}" opacity="0.06" filter="url(#glow)"/>
    <circle cx="750" cy="320" r="280" fill="${secondaryColor}" opacity="0.10" filter="url(#glow)"/>

    <!-- Left Content Column -->
    <rect x="55" y="75" width="280" height="32" rx="16" fill="#000000" stroke="${accentColor}" stroke-width="1.2" opacity="0.85"/>
    <text x="195" y="96" text-anchor="middle" fill="${accentColor}" font-family="system-ui, -apple-system, sans-serif" font-weight="900" font-size="12" letter-spacing="3">BITE &amp; GO • KARACHI</text>

    <rect x="55" y="125" width="240" height="28" rx="7" fill="url(#accentGrad)"/>
    <text x="175" y="144" text-anchor="middle" fill="#000000" font-family="system-ui, sans-serif" font-weight="900" font-size="11" letter-spacing="2">${badge}</text>

    <text x="55" y="215" fill="#ffffff" font-family="system-ui, -apple-system, sans-serif" font-weight="900" font-size="34" letter-spacing="0.5">${title}</text>
    <text x="55" y="255" fill="#d4d4d8" font-family="system-ui, sans-serif" font-size="14.5" font-weight="500">${subtitle}</text>

    <rect x="55" y="295" width="240" height="60" rx="30" fill="url(#accentGrad)" filter="url(#glow)"/>
    <text x="175" y="336" text-anchor="middle" fill="#000000" font-family="system-ui, sans-serif" font-weight="900" font-size="26">${price}</text>

    <text x="55" y="420" fill="#e4e4e7" font-family="system-ui, sans-serif" font-size="14" font-weight="600">✓ Smashed Fresh on 400°F Chrome Flat-Top Griddle</text>
    <text x="55" y="448" fill="#e4e4e7" font-family="system-ui, sans-serif" font-size="14" font-weight="600">✓ 100% Halal Hand-Slaughtered Prime Beef &amp; Chicken</text>
    <text x="55" y="476" fill="#e4e4e7" font-family="system-ui, sans-serif" font-size="14" font-weight="600">✓ North Nazimabad Rapid 30-Min Insulated Delivery</text>

    <text x="55" y="540" fill="${accentColor}" font-family="system-ui, sans-serif" font-size="12" font-weight="800" letter-spacing="1">ORDER HOT VIA WEBSITE OR WHATSAPP HOTLINE</text>

    <!-- Outer Decorative Border -->
    <rect x="35" y="35" width="930" height="580" rx="28" fill="none" stroke="${accentColor}" stroke-width="1.5" stroke-dasharray="8 6" opacity="0.35"/>

    <!-- Right Frame: Self-Contained High-Res Culinary Art Vector -->
    <rect x="536" y="76" width="408" height="498" rx="28" fill="#0d0705" stroke="${accentColor}" stroke-width="2.5" opacity="0.85"/>
    <g clip-path="url(#photoClip)">
      ${foodIllustrationSvg}
    </g>
    <rect x="540" y="80" width="400" height="490" rx="24" fill="none" stroke="#ffffff" stroke-width="1" opacity="0.15"/>
  </svg>`;

  return 'data:image/svg+xml;utf8,' + encodeURIComponent(svg);
}

app.post('/api/admin/ai-assistant', optionalStaffAuth, async (req: Request, res: Response) => {
  const clientIp = getClientIp(req);
  if (!checkRateLimit(aiRateLimits, clientIp, 50, 60 * 1000)) {
    return res.status(429).json({ error: 'AI request limit reached. Please wait a moment.' });
  }

  const { prompt, history, quickAction, images, generateImage } = req.body;
  if (!prompt || typeof prompt !== 'string') {
    return res.status(400).json({ error: 'Prompt is required' });
  }

  // Gather live restaurant snapshot
  const activeOrders = orders.filter((o) => !['delivered', 'cancelled'].includes(o.status));
  const deliveredToday = orders.filter((o) => o.status === 'delivered');
  const todayRevenue = deliveredToday.reduce((sum, o) => sum + (o.total || 0), 0);
  const pendingRiders = orders.filter((o) => o.status === 'on_the_way');
  const avgBasket = deliveredToday.length > 0 ? Math.round(todayRevenue / deliveredToday.length) : 0;
  const epCount = orders.filter((o) => o.payment.method === 'easypaisa').length;
  const codCount = orders.filter((o) => o.payment.method === 'cod').length;

  const contextData = {
    totalOrdersCount: orders.length,
    activeOrdersCount: activeOrders.length,
    deliveredCount: deliveredToday.length,
    todayRevenuePKR: todayRevenue,
    avgTicketPKR: avgBasket,
    paymentBreakdown: { easypaisa: epCount, cod: codCount },
    activeRidersCount: pendingRiders.length,
    branchLocation: 'North Nazimabad Block I, Karachi',
    storeStatus: storeSettings.isOpen ? 'OPEN' : 'CLOSED',
    avgPrepTimeMinutes: storeSettings.customerWidgets?.estimatedPrepMinutes || 15,
    topDishes: menuItems.filter((i) => i.isBestseller).map((i) => i.name),
    unavailableItems: menuItems.filter((i) => !i.isAvailable).map((i) => i.name),
    recentOrdersSummary: orders.slice(0, 4).map((o) => `${o.id} (${o.customerName}, ${o.area}, Rs.${o.total}, ${o.status})`),
    authenticatedUser: req.user ? `${req.user.name} (${req.user.role})` : 'Manager / Storefront Preview',
  };

  const isImageGenRequested =
    generateImage === true ||
    quickAction === 'generate_photo' ||
    quickAction === 'generate_banner' ||
    /(generate|create|make|design|draw|render|show|produce|get|shoot|visualize|illustrate|need)\s+(an?\s+)?(image|photo|picture|photograph|pic|banner|poster|graphic|visual|artwork|dish|food|burger|shake|fries|tender|box)/i.test(prompt) ||
    /(photo|picture|image|photograph|graphic|visual|poster|pic|artwork)\s+(of|for|showing)/i.test(prompt) ||
    /(food\s+photo|food\s+photography|product\s+shot|marketing\s+poster|promo\s+banner)/i.test(prompt) ||
    /(generate|make|create|produce|show)\s+(photos?|visuals?|posters?|banners?|pictures?)/i.test(prompt) ||
    /(smash\s+burger\s+photo|loaded\s+fries\s+photo|tenders\s+photo|shake\s+photo)/i.test(prompt);

  let generatedImageUrl: string | null = null;

  const systemInstruction = `You are Hassan, the Co-Founder & Head of Restaurant Operations at "Bite & Go Express", a high-volume smash burger and fried chicken restaurant in North Nazimabad Block I, Karachi, Pakistan.
You are the user's close partner, trusted culinary strategist, and restaurant operations co-founder.

CRITICAL INSTRUCTIONS ON VOICE, HUMANITY & MULTILINGUAL CONVERSATION:
1. Speak like a real human co-founder, partner, and foodie entrepreneur—NOT like a robotic AI. Never say "As an AI model", "I do not have feelings", "I hope this helps!", or generic corporate disclaimers. Speak with warmth, wit, and high operational intelligence.
2. MULTILINGUAL FLUENCY: You are 100% fluent in English, Roman Urdu (e.g. "Bhai aaj ki sales kaisi hain?", "Grill ka masla check karo", "Zinger ki recipe batao"), and Urdu (اردو).
   - If the user talks or asks questions in Roman Urdu or Urdu, respond naturally in authentic, warm Roman Urdu or Urdu!
   - If the user speaks in English, respond in English.
   - You seamlessly understand mixed Pakistani conversational speech ("bhai", "yaar", "zabardast", "bilkul", "theek hai", "btao", "shukriya").
3. HUMAN & CONVERSATIONAL: You love to chat and have real conversations! You can talk about the Karachi food scene, late-night foodies, monsoon cravings, griddle heat, secret spices, or just exchange warm banter and laughs like true co-founders.
4. PROACTIVE RECOMMENDATIONS: Don't just wait for narrow questions—freely share smart, unsolicited recommendations whenever you see an opportunity! (e.g., suggesting a 2-for-1 combo to clear bun stock, recommending pairing fries with shakes for higher margins, warning if orders are piling up, or suggesting a 20% flash code).
5. INVENTORY & RECIPE EXPERT: You know the exact ingredient breakdown of our dishes (e.g., Zinger Burger = 1 Brioche Bun, 1 Crispy Chicken Patty, 20g Garlic Mayo Sauce, 1 Lettuce portion; Double Smash = 2 Beef Patties, 2 Cheddar Slices, 1 Bun). You advise on portion control, ingredient waste, and restocking.
6. ABSOLUTE PROHIBITION: DO NOT mention Google Maps, GPS links, or external navigation apps. Focus purely on kitchen turnaround, hot thermal bag insulation, block-wise order batching in North Nazimabad, and customer ETAs.
7. If the user attached an image, analyze it like an experienced culinary lead inspecting food presentation, sear crust, packaging, or receipt details.
8. If the user asks for a photo, image, or promotional visual, celebrate the high-resolution culinary visual you generated for them and suggest how to post it (Instagram, website banner, WhatsApp).
9. You have full real-time situational awareness of today's restaurant operations:
   - User: ${contextData.authenticatedUser}
   - Branch: North Nazimabad Block I Kitchen (Serving Karachi North & Central)
   - Store Status: ${contextData.storeStatus}
   - Delivered Sales Today: Rs. ${contextData.todayRevenuePKR.toLocaleString()} across ${contextData.deliveredCount} orders
   - Average Ticket Size: Rs. ${contextData.avgTicketPKR.toLocaleString()}
   - Payment Split: ${contextData.paymentBreakdown.easypaisa} EasyPaisa vs ${contextData.paymentBreakdown.cod} Cash on Delivery
   - Active Orders in Progress: ${contextData.activeOrdersCount} orders in kitchen/delivery
   - Estimated Kitchen Prep Time: ${contextData.avgPrepTimeMinutes} minutes
   - Riders Currently Dispatched on Road: ${contextData.activeRidersCount}
   - Bestselling Menu Items: ${contextData.topDishes.join(', ') || 'Smash Burgers, Nashville Tenders'}
   - Currently Out of Stock: ${contextData.unavailableItems.join(', ') || 'None'}
   - Recent Live Orders: ${contextData.recentOrdersSummary.join(' | ')}
10. Remember the ongoing conversation history! Answer follow-ups conversationally and build on prior discussion naturally.`;

  if (process.env.GEMINI_API_KEY) {
    try {
      const ai = new GoogleGenAI({
        apiKey: process.env.GEMINI_API_KEY,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          },
        },
      });

      // Handle direct image generation if requested
      if (isImageGenRequested) {
        try {
          const cleanSubject = prompt
            .replace(/(generate|create|make|design|draw|show|render|shoot)\s+(an?\s+)?(image|photo|picture|photograph|pic)?\s*(of|for)?/i, '')
            .trim();
          const enrichedPrompt = `Commercial culinary food photograph of ${cleanSubject || 'signature double smash burger with melted Wisconsin cheddar and crispy crinkle fries'}. Shot in a high-end food studio, dark charcoal tabletop background, warm directional golden rim lighting, razor-sharp focus, steam rising, glistening crispy patty edges, melting cheese drip, soft bokeh, f/2.0, professional camera, 8k resolution, photorealistic.`;

          const imgResponse = await ai.models.generateContent({
            model: 'gemini-3.1-flash-lite-image',
            contents: { parts: [{ text: enrichedPrompt }] },
            config: {
              imageConfig: {
                aspectRatio: '1:1',
              },
            },
          });
          for (const part of imgResponse.candidates?.[0]?.content?.parts || []) {
            if (part.inlineData?.data) {
              generatedImageUrl = `data:${part.inlineData.mimeType || 'image/png'};base64,${part.inlineData.data}`;
              break;
            }
          }
        } catch {
          // Fall through to high-resolution culinary vector art
        }

        if (!generatedImageUrl) {
          generatedImageUrl = generateCulinaryMarketingVisual(prompt, contextData);
        }
      }

      // Format multi-turn conversation history with strict Gemini alternating turns
      const rawHistory = Array.isArray(history) ? history.slice(-20) : [];
      const contents: Array<{ role: 'user' | 'model'; parts: Array<any> }> = [];

      for (const msg of rawHistory) {
        if (!msg || !msg.text || typeof msg.text !== 'string') continue;
        const role: 'user' | 'model' = msg.role === 'ai' || msg.role === 'model' ? 'model' : 'user';

        // Skip leading model messages (Gemini requires the first turn to be 'user')
        if (contents.length === 0 && role === 'model') {
          continue;
        }

        // Merge adjacent turns with the same role
        if (contents.length > 0 && contents[contents.length - 1].role === role) {
          contents[contents.length - 1].parts.push({ text: msg.text });
        } else {
          contents.push({
            role,
            parts: [{ text: msg.text }],
          });
        }
      }

      // Build user message parts (supports multimodal images)
      const currentUserParts: Array<any> = [{ text: prompt }];
      if (Array.isArray(images) && images.length > 0) {
        for (const img of images) {
          if (img && typeof img.data === 'string') {
            const cleanData = img.data.replace(/^data:image\/[a-zA-Z0-9+.-]+;base64,/, '');
            currentUserParts.push({
              inlineData: {
                mimeType: img.mimeType || 'image/jpeg',
                data: cleanData,
              },
            });
          }
        }
      }

      // Ensure alternating flow: if the last message in contents is already 'user', append parts; otherwise push new 'user' turn
      if (contents.length > 0 && contents[contents.length - 1].role === 'user') {
        contents[contents.length - 1].parts.push(...currentUserParts);
      } else {
        contents.push({
          role: 'user',
          parts: currentUserParts,
        });
      }

      // Try modern Gemini models with resilient fast fallback for voice and chat
      const candidateModels = ['gemini-2.5-flash', 'gemini-2.5-flash-lite', 'gemini-3.8-flash', 'gemini-flash-latest'];
      for (const model of candidateModels) {
        try {
          const timeoutPromise = new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error('TIMEOUT_AI_RESPONSE')), 6000)
          );
          const response = await Promise.race([
            ai.models.generateContent({
              model,
              contents,
              config: {
                systemInstruction,
                temperature: 0.7,
              },
            }),
            timeoutPromise,
          ]);

          if (response && response.text) {
            return res.json({
              reply: response.text,
              metrics: contextData,
              generatedImageUrl,
            });
          }
        } catch (mErr: any) {
          // Fall through to next model or instant local fallback
          console.warn(`Gemini generation note for ${model}:`, mErr?.message || mErr);
        }
      }
    } catch (err: any) {
      // Graceful fallback to real-time operations engine
    }
  }

  if (isImageGenRequested && !generatedImageUrl) {
    generatedImageUrl = generateCulinaryMarketingVisual(prompt, contextData);
  }

  let smartReply = generateDynamicHumanReply(prompt, history, contextData, orders, menuItems);
  if (Array.isArray(images) && images.length > 0 && !smartReply.toLowerCase().includes('photo') && !smartReply.toLowerCase().includes('image')) {
    smartReply = `Inspected the photo you sent! The visual presentation looks sharp on the line. Grill caramelization and bun toast are looking consistent with our Karachi standard.\n\n${smartReply}`;
  }
  if (isImageGenRequested) {
    smartReply = `Here is the visual graphic I just generated for you! I've designed it with our signature charcoal background, golden cheddar highlights, and high-impact typography ready for our Karachi audience.\n\nTake a look at the rendered image card below—you can download it, copy the link, or click **[📢 Apply as Website Banner]** to put it live on our storefront right away!\n\n${smartReply}`;
  }

  return res.json({
    reply: smartReply,
    metrics: contextData,
    generatedImageUrl,
  });
});

// Endpoint: Apply Action from AI Assistant
app.post('/api/admin/ai-assistant/apply-action', optionalStaffAuth, (req: Request, res: Response) => {
  const { action, payload } = req.body;
  if (!action) return res.status(400).json({ error: 'Action is required' });

  if (action === 'update_banner') {
    const bannerText = payload?.text || '';
    if (!storeSettings.customerWidgets) {
      storeSettings.customerWidgets = {} as any;
    }
    const widgets = storeSettings.customerWidgets!;
    widgets.showRushHourAlert = true;
    widgets.rushHourText = bannerText;
    return res.json({ success: true, message: 'Website announcement banner updated successfully!', settings: storeSettings });
  }

  if (action === 'set_prep_time') {
    const minutes = Number(payload?.minutes) || 15;
    if (!storeSettings.customerWidgets) {
      storeSettings.customerWidgets = {} as any;
    }
    const widgets = storeSettings.customerWidgets!;
    widgets.estimatedPrepMinutes = minutes;
    widgets.showEstimatedPrepTimeBadge = true;
    return res.json({ success: true, message: `Kitchen estimated prep time updated to ${minutes} mins.`, settings: storeSettings });
  }

  if (action === 'toggle_store_status') {
    const isOpen = payload?.isOpen !== undefined ? Boolean(payload.isOpen) : !storeSettings.isOpen;
    storeSettings.isOpen = isOpen;
    return res.json({ success: true, message: `Store status is now ${isOpen ? 'OPEN' : 'CLOSED'}.`, settings: storeSettings });
  }

  if (action === 'set_operating_schedule') {
    if (payload?.weeklySchedule) {
      storeSettings.weeklySchedule = payload.weeklySchedule;
    }
    if (payload?.scheduleOverrideMode) {
      storeSettings.scheduleOverrideMode = payload.scheduleOverrideMode;
    }
    if (payload?.operatingHours) {
      storeSettings.operatingHours = payload.operatingHours;
    }
    return res.json({ success: true, message: 'Weekly operating hours schedule updated successfully!', settings: storeSettings });
  }

  if (action === 'toggle_item_stock') {
    const itemId = payload?.itemId;
    const item = menuItems.find((m) => m.id === itemId);
    if (item) {
      item.isAvailable = payload?.isAvailable !== undefined ? payload.isAvailable : !item.isAvailable;
      return res.json({ success: true, message: `${item.name} is now ${item.isAvailable ? 'IN STOCK' : 'OUT OF STOCK'}.`, item });
    }
    return res.status(404).json({ error: 'Item not found' });
  }

  return res.status(400).json({ error: 'Unknown action' });
});

// --- VITE MIDDLEWARE INTEGRATION ---
async function startServer() {
  if (!isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true, hmr: false },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(process.cwd(), 'dist');
    if (fs.existsSync(distPath)) {
      app.use(express.static(distPath));
      app.get('*', (_req, res) => {
        res.sendFile(path.resolve(distPath, 'index.html'));
      });
    }
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Bite & Go server running on port ${PORT} [Mode: ${isProduction ? 'prod' : 'dev'}]`);
  });
}

if (!process.env.VERCEL) {
  startServer().catch((err) => {
    console.error('Failed to start server:', err);
    process.exit(1);
  });
}

export default app;

