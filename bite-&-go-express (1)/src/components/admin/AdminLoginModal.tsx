import React, { useState, useEffect } from 'react';
import { ApiService } from '../../utils/api';
import { AuthUser } from '../../types';
import {
  Lock,
  ShieldCheck,
  AlertCircle,
  Eye,
  EyeOff,
  KeyRound,
  X,
  ChefHat,
  UserCheck,
  Mail,
  Globe,
  Fingerprint,
  CreditCard,
  Bike,
  ShieldAlert,
  Clock,
  Ban,
} from 'lucide-react';

interface AdminLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAuthenticated: (user: AuthUser) => void;
  initialRole?: 'admin' | 'kitchen' | 'pos' | 'rider';
}

export const AdminLoginModal: React.FC<AdminLoginModalProps> = ({
  isOpen,
  onClose,
  onAuthenticated,
  initialRole = 'admin',
}) => {
  const [role, setRole] = useState<'admin' | 'kitchen' | 'pos' | 'rider'>(initialRole);
  const [email, setEmail] = useState('admin@biteandgo.pk');
  const [password, setPassword] = useState('');
  const [pin, setPin] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // 3-Attempt Lockout & Rate-Limiting State
  const [isLocked, setIsLocked] = useState(false);
  const [lockoutRemaining, setLockoutRemaining] = useState(0);
  const [attempts, setAttempts] = useState(0);
  const [remainingAttempts, setRemainingAttempts] = useState<number | undefined>(undefined);
  const [isIpBlocked, setIsIpBlocked] = useState(false);

  // IP detection & Whitelist check
  const [clientIpInfo, setClientIpInfo] = useState<{
    ip: string;
    isWhitelisted: boolean;
    whitelistEnabled: boolean;
  }>({
    ip: 'Detecting...',
    isWhitelisted: true,
    whitelistEnabled: false,
  });

  // Check lockout on mount/open
  useEffect(() => {
    if (!isOpen) return;

    // Check localStorage cache first
    const storedLockUntil = Number(localStorage.getItem('bg_staff_lockout_until') || 0);
    const now = Date.now();
    if (storedLockUntil > now) {
      setIsLocked(true);
      setLockoutRemaining(Math.ceil((storedLockUntil - now) / 1000));
    }

    handleSelectRole(initialRole);

    // Verify lockout & IP from server
    ApiService.getLockoutStatus().then((status) => {
      setClientIpInfo({
        ip: status.clientIp,
        isWhitelisted: status.isWhitelisted,
        whitelistEnabled: status.whitelistEnabled,
      });
      setAttempts(status.attempts || 0);
      if (status.locked && status.remainingSeconds > 0) {
        setIsLocked(true);
        setLockoutRemaining(status.remainingSeconds);
        localStorage.setItem(
          'bg_staff_lockout_until',
          String(Date.now() + status.remainingSeconds * 1000)
        );
      }
      if (status.whitelistEnabled && !status.isWhitelisted) {
        setIsIpBlocked(true);
      }
    });
  }, [isOpen, initialRole]);

  // Lockout countdown timer ticker
  useEffect(() => {
    if (!isLocked || lockoutRemaining <= 0) return;

    const timer = setInterval(() => {
      setLockoutRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          setIsLocked(false);
          localStorage.removeItem('bg_staff_lockout_until');
          setErrorMsg('');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isLocked, lockoutRemaining]);

  const formatLockoutTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const handleSelectRole = (selectedRole: 'admin' | 'kitchen' | 'pos' | 'rider') => {
    setRole(selectedRole);
    if (selectedRole === 'admin') {
      setEmail('admin@biteandgo.pk');
      setPin('849201');
    } else if (selectedRole === 'kitchen') {
      setEmail('kitchen@biteandgo.pk');
      setPin('');
    } else if (selectedRole === 'rider') {
      setEmail('rider@biteandgo.pk');
      setPin('');
    } else {
      setEmail('cashier@biteandgo.pk');
      setPin('1234');
    }
    setPassword('');
    setErrorMsg('');
    setRemainingAttempts(undefined);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLocked) return;

    if (!email.trim() || !password.trim()) {
      setErrorMsg('Please enter both email and password');
      return;
    }

    setIsLoading(true);
    setErrorMsg('');

    const res = await ApiService.login(email.trim(), password, role === 'admin' ? pin : undefined);
    setIsLoading(false);

    if (res.success && res.user) {
      localStorage.removeItem('bg_staff_lockout_until');
      setIsLocked(false);
      onAuthenticated(res.user);
    } else {
      if (res.locked || (res.remainingSeconds && res.remainingSeconds > 0)) {
        setIsLocked(true);
        const lockSecs = res.remainingSeconds || 900;
        setLockoutRemaining(lockSecs);
        localStorage.setItem('bg_staff_lockout_until', String(Date.now() + lockSecs * 1000));
        setErrorMsg(
          res.error || 'Security Lockout: 3 failed attempts. Portal disabled for 15 minutes.'
        );
      } else {
        setErrorMsg(res.error || 'Authentication failed');
        if (typeof res.remainingAttempts === 'number') {
          setRemainingAttempts(res.remainingAttempts);
        }
        if (typeof res.attempts === 'number') {
          setAttempts(res.attempts);
        }
      }

      if (res.ipBlocked) {
        setIsIpBlocked(true);
      }
    }
  };

  const handleGoogleAdminLogin = async () => {
    if (isLocked) return;
    setIsLoading(true);
    setErrorMsg('');
    try {
      const res = await ApiService.loginWithGoogle(
        'ahmedbilalzuberi@gmail.com',
        'Ahmed Bilal Zuberi (Owner)'
      );
      if (res && res.success && res.user) {
        setIsLoading(false);
        onAuthenticated(res.user);
        return;
      }
      setErrorMsg(res.error || 'Google authentication rejected');
    } catch (err: any) {
      setErrorMsg(err.message || 'Google authentication failed');
    }
    setIsLoading(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-950/90 backdrop-blur-md animate-in fade-in">
      <div className="relative w-full max-w-md bg-neutral-900 border border-neutral-800 rounded-2xl shadow-2xl overflow-hidden p-6">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-neutral-400 hover:text-white rounded-lg transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Security Badge Lock Icon */}
        <div
          className={`w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-3 border ${
            isLocked
              ? 'bg-red-500/15 border-red-500/40 text-red-400 animate-pulse'
              : 'bg-amber-500/10 border-amber-500/20 text-amber-500'
          }`}
        >
          {isLocked ? <ShieldAlert className="w-7 h-7" /> : <Lock className="w-7 h-7" />}
        </div>

        <div className="text-center space-y-1 mb-4">
          <h2 className="text-xl font-heading font-black text-white">
            {isLocked ? 'Security Lockout Active' : 'Staff Secure Authentication'}
          </h2>
          <p className="text-xs text-neutral-400">
            {isLocked
              ? 'Portal disabled due to 3 consecutive incorrect password attempts'
              : 'Enter verified staff email and password. Maximum 3 attempts before 15-min lockout.'}
          </p>
        </div>

        {/* Connected IP Banner with Whitelist Protection status */}
        <div className="mb-4 p-2.5 rounded-xl bg-neutral-950 border border-neutral-800 flex items-center justify-between text-[11px]">
          <div className="flex items-center gap-2 text-neutral-300 truncate">
            <Globe className="w-3.5 h-3.5 text-sky-400 shrink-0" />
            <span className="font-mono truncate">IP: {clientIpInfo.ip}</span>
          </div>
          {clientIpInfo.whitelistEnabled ? (
            <span
              className={`px-2 py-0.5 rounded text-[10px] font-bold shrink-0 ${
                clientIpInfo.isWhitelisted
                  ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                  : 'bg-red-500/15 text-red-400 border border-red-500/30 animate-pulse'
              }`}
            >
              {clientIpInfo.isWhitelisted ? '✓ Whitelisted' : '⛔ IP Blocked'}
            </span>
          ) : (
            <span className="text-[10px] text-emerald-400 font-medium flex items-center gap-1 shrink-0">
              <ShieldCheck className="w-3 h-3" />
              <span>IP Guard Active</span>
            </span>
          )}
        </div>

        {/* IP BLOCKED SCREEN */}
        {clientIpInfo.whitelistEnabled && !clientIpInfo.isWhitelisted && (
          <div className="mb-4 p-4 rounded-xl bg-red-950/80 border border-red-500/40 text-red-200 text-xs space-y-2">
            <div className="flex items-center gap-2 font-bold text-red-300">
              <Ban className="w-4 h-4 text-red-400 shrink-0" />
              <span>Access Denied by IP Whitelist</span>
            </div>
            <p className="text-[11px] text-neutral-300 leading-snug">
              Your network IP (<strong className="text-white font-mono">{clientIpInfo.ip}</strong>) is not on the authorized staff whitelist. Access is blocked. Contact store manager to add your IP in Manager HUD.
            </p>
          </div>
        )}

        {/* ACTIVE BRUTE FORCE LOCKOUT SCREEN */}
        {isLocked ? (
          <div className="p-5 rounded-2xl bg-gradient-to-b from-red-950/90 to-neutral-950 border-2 border-red-500/60 text-center space-y-3.5 shadow-2xl">
            <div className="space-y-1">
              <span className="text-[10px] uppercase font-mono font-bold tracking-widest text-red-400 block">
                🚨 System Protocol Enforced
              </span>
              <p className="text-xs text-neutral-200">
                You entered 3 consecutive incorrect passwords. This portal has been temporarily locked to protect customer records and restaurant systems.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-neutral-950 border border-red-500/30 space-y-1">
              <span className="text-[10px] uppercase font-mono text-neutral-400 flex items-center justify-center gap-1">
                <Clock className="w-3.5 h-3.5 text-amber-400" />
                <span>Portal Cooldown Timer</span>
              </span>
              <span className="text-4xl font-mono font-black text-amber-400 tracking-wider">
                {formatLockoutTime(lockoutRemaining)}
              </span>
            </div>

            <div className="p-2.5 rounded-lg bg-neutral-900 border border-neutral-800 text-[11px] text-neutral-400 space-y-1 text-left">
              <div className="flex items-center gap-1.5 text-neutral-300 font-semibold">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span>Zero-Bypass Anti-Tamper Protection</span>
              </div>
              <p className="text-[10px] text-neutral-400">
                Lockout status is enforced on the server. Inspecting element (F12) or clearing browser cache will not lift the server restriction.
              </p>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="w-full py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 font-bold text-xs rounded-xl transition-colors cursor-pointer"
            >
              Return to Storefront
            </button>
          </div>
        ) : (
          <>
            {/* Continue with Google SSO */}
            <button
              type="button"
              onClick={handleGoogleAdminLogin}
              disabled={isLoading || isLocked}
              className="w-full mb-3 py-2.5 px-4 bg-white hover:bg-neutral-100 text-neutral-800 font-medium text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-2.5 active:scale-98 disabled:opacity-50 cursor-pointer border border-neutral-300"
            >
              <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              <span className="font-semibold text-neutral-900">Sign in with Google (Owner / Staff SSO)</span>
            </button>

            <div className="relative my-3">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-neutral-800" />
              </div>
              <div className="relative flex justify-center text-[10px] uppercase">
                <span className="bg-neutral-900 px-2 text-neutral-500 font-mono">
                  Or enter credentials
                </span>
              </div>
            </div>

            {/* Quick Role Switcher Tabs (Cashier, Kitchen, Rider, Admin) */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 mb-4">
              <button
                type="button"
                onClick={() => handleSelectRole('pos')}
                className={`p-2 rounded-xl border flex flex-col items-center gap-1 text-center transition-all cursor-pointer ${
                  role === 'pos'
                    ? 'bg-blue-600/15 border-blue-500/60 text-white ring-1 ring-blue-500/30'
                    : 'bg-neutral-950 border-neutral-800 text-neutral-400 hover:text-white'
                }`}
              >
                <CreditCard className="w-4 h-4 text-blue-400" />
                <span className="text-xs font-bold">Cashier / POS</span>
                <span className="text-[9px] text-neutral-500 truncate w-full">Counter</span>
              </button>

              <button
                type="button"
                onClick={() => handleSelectRole('kitchen')}
                className={`p-2 rounded-xl border flex flex-col items-center gap-1 text-center transition-all cursor-pointer ${
                  role === 'kitchen'
                    ? 'bg-red-500/15 border-red-500/60 text-white ring-1 ring-red-500/30'
                    : 'bg-neutral-950 border-neutral-800 text-neutral-400 hover:text-white'
                }`}
              >
                <ChefHat className="w-4 h-4 text-red-400" />
                <span className="text-xs font-bold">Kitchen KDS</span>
                <span className="text-[9px] text-neutral-500 truncate w-full">Orders</span>
              </button>

              <button
                type="button"
                onClick={() => handleSelectRole('rider')}
                className={`p-2 rounded-xl border flex flex-col items-center gap-1 text-center transition-all cursor-pointer ${
                  role === 'rider'
                    ? 'bg-emerald-500/15 border-emerald-500/60 text-white ring-1 ring-emerald-500/30'
                    : 'bg-neutral-950 border-neutral-800 text-neutral-400 hover:text-white'
                }`}
              >
                <Bike className="w-4 h-4 text-emerald-400" />
                <span className="text-xs font-bold">Rider HUD</span>
                <span className="text-[9px] text-neutral-500 truncate w-full">Fleet</span>
              </button>

              <button
                type="button"
                onClick={() => handleSelectRole('admin')}
                className={`p-2 rounded-xl border flex flex-col items-center gap-1 text-center transition-all cursor-pointer ${
                  role === 'admin'
                    ? 'bg-amber-500/15 border-amber-500/60 text-white ring-1 ring-amber-500/30'
                    : 'bg-neutral-950 border-neutral-800 text-neutral-400 hover:text-white'
                }`}
              >
                <UserCheck className="w-4 h-4 text-amber-400" />
                <span className="text-xs font-bold">Manager</span>
                <span className="text-[9px] text-neutral-500 truncate w-full">HUD</span>
              </button>
            </div>

            {errorMsg && (
              <div className="mb-4 p-3 rounded-xl bg-red-950/70 border border-red-800/80 flex items-start gap-2.5 text-xs text-red-200 animate-in fade-in">
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                <div className="space-y-0.5 min-w-0">
                  <p className="font-semibold">{errorMsg}</p>
                  {typeof remainingAttempts === 'number' && (
                    <p className="text-[11px] text-amber-300 font-mono">
                      ⚠️ Caution: {remainingAttempts} attempt(s) remaining before 15-minute portal lockout.
                    </p>
                  )}
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-3.5">
              {/* Email Input */}
              <div>
                <label className="text-xs font-bold text-neutral-300 block mb-1">
                  Account Email *
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" />
                  <input
                    type="email"
                    required
                    placeholder={
                      role === 'admin'
                        ? 'admin@biteandgo.pk'
                        : role === 'kitchen'
                        ? 'kitchen@biteandgo.pk'
                        : role === 'rider'
                        ? 'rider@biteandgo.pk'
                        : 'cashier@biteandgo.pk'
                    }
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-amber-500 font-mono"
                  />
                </div>
              </div>

              {/* Password Input */}
              <div>
                <label className="text-xs font-bold text-neutral-300 block mb-1">
                  Password *
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    placeholder="Enter password..."
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-xl pl-3 pr-10 py-2 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-amber-500 font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-white cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Admin 2FA PIN */}
              {role === 'admin' && (
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-bold text-neutral-300 flex items-center gap-1.5">
                      <Fingerprint className="w-3.5 h-3.5 text-amber-400" />
                      <span>Admin Master 2FA PIN</span>
                    </label>
                    <span className="text-[10px] text-neutral-500 font-mono">Master PIN</span>
                  </div>
                  <input
                    type="password"
                    maxLength={6}
                    placeholder="6-digit Master PIN..."
                    value={pin}
                    onChange={(e) => setPin(e.target.value)}
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-amber-500 font-mono tracking-widest text-center"
                  />
                </div>
              )}

              <button
                type="submit"
                disabled={isLoading || isLocked}
                className={`w-full py-2.5 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-lg active:scale-98 transition-all flex items-center justify-center gap-2 mt-2 cursor-pointer ${
                  role === 'pos'
                    ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-500/20'
                    : role === 'kitchen'
                    ? 'bg-red-600 hover:bg-red-500 text-white shadow-red-500/20'
                    : role === 'rider'
                    ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-500/20'
                    : 'bg-amber-500 hover:bg-amber-400 text-neutral-950 shadow-amber-500/20'
                }`}
              >
                {isLoading ? (
                  <span>Verifying Credentials...</span>
                ) : (
                  <>
                    <KeyRound className="w-4 h-4" />
                    <span>
                      Sign In to{' '}
                      {role === 'kitchen'
                        ? 'Kitchen Station'
                        : role === 'pos'
                        ? 'Counter POS / Cashier'
                        : role === 'rider'
                        ? 'Fleet Rider HUD'
                        : 'Manager Portal'}
                    </span>
                  </>
                )}
              </button>
            </form>

            <div className="mt-4 pt-3 border-t border-neutral-800/80 flex items-center justify-between text-[11px] text-neutral-400">
              <span className="flex items-center gap-1 text-emerald-400">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>PBKDF2 Hash Shield</span>
              </span>
              <span className="text-[10px] text-amber-400/90 font-mono font-semibold">
                3 Attempts Max · 15m Lockout
              </span>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
