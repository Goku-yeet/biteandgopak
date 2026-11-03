import React, { useState } from 'react';
import { StorageService } from '../../utils/storage';
import { CustomerUser } from '../../types';
import { KARACHI_DELIVERY_AREAS } from '../../data/karachiAreas';
import { sounds } from '../../utils/audio';
import {
  X,
  User,
  Mail,
  Lock,
  Phone,
  MapPin,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  Sparkles,
  ArrowRight,
  UserCheck,
} from 'lucide-react';

interface CustomerAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (user: CustomerUser) => void;
}

export const CustomerAuthModal: React.FC<CustomerAuthModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [showCustomGooglePrompt, setShowCustomGooglePrompt] = useState(false);
  const [googleEmailInput, setGoogleEmailInput] = useState('');

  // Form states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [area, setArea] = useState(KARACHI_DELIVERY_AREAS[0]?.name || 'North Nazimabad - Block I (Five Star Chowrangi)');

  const handleFillDemo = () => {
    setMode('signin');
    setEmail('hamza@example.com');
    setPassword('hamza123');
    setErrorMsg('');
  };

  const handleGoogleSignIn = (googleEmail: string, googleName?: string) => {
    setErrorMsg('');
    const res = StorageService.customerGoogleSignIn({
      email: googleEmail,
      name: googleName || googleEmail.split('@')[0],
      phone: '0301-2945576',
      defaultArea: 'North Nazimabad - Block I (Five Star Chowrangi)',
      defaultAddress: 'Near Five Star Chowrangi, Block I, North Nazimabad, Karachi',
    });

    if (res.success && res.user) {
      sounds.playSuccess();
      onSuccess(res.user);
      onClose();
    } else {
      setErrorMsg('Failed to sign in with Google');
    }
  };

  const handleSignIn = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      setErrorMsg('Please enter both email and password');
      return;
    }
    const res = StorageService.customerSignIn(email, password);
    if (res.success && res.user) {
      onSuccess(res.user);
      onClose();
    } else {
      setErrorMsg(res.error || 'Invalid credentials');
    }
  };

  const handleSignUp = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !phone.trim() || !password.trim()) {
      setErrorMsg('Please fill in all required fields');
      return;
    }
    if (password.length < 6) {
      setErrorMsg('Password must be at least 6 characters');
      return;
    }
    const res = StorageService.customerSignUp({
      name: name.trim(),
      email: email.trim(),
      phone: phone.trim(),
      password,
      defaultAddress: address.trim(),
      defaultArea: area,
    });
    if (res.success && res.user) {
      onSuccess(res.user);
      onClose();
    } else {
      setErrorMsg(res.error || 'Failed to create account');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-950/85 backdrop-blur-md animate-in fade-in">
      <div className="relative w-full max-w-md bg-neutral-900 border border-neutral-800 rounded-3xl shadow-2xl overflow-hidden p-6">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-neutral-400 hover:text-white rounded-lg transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Header Icon & Brand */}
        <div className="w-12 h-12 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 mx-auto mb-3">
          <User className="w-6 h-6" />
        </div>

        <div className="text-center space-y-1 mb-5">
          <h2 className="text-xl font-heading font-black text-white">
            {mode === 'signin' ? 'Welcome Back!' : 'Create Customer Account'}
          </h2>
          <p className="text-xs text-neutral-400">
            {mode === 'signin'
              ? 'Sign in to access saved addresses and track support tickets'
              : 'Save delivery details for 1-click checkout & order issue tickets'}
          </p>
        </div>

        {/* Google Fast 1-Tap Sign-In */}
        <div className="space-y-2 mb-4">
          <button
            type="button"
            onClick={() => handleGoogleSignIn('ahmedbilalzuberi@gmail.com', 'Ahmed Bilal Zuberi')}
            className="w-full py-2.5 px-4 bg-white hover:bg-neutral-100 text-neutral-900 font-bold text-xs rounded-xl shadow transition-all flex items-center justify-center gap-2.5 active:scale-98 cursor-pointer"
          >
            <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
            </svg>
            <span>Continue with Google</span>
          </button>

          <div className="flex items-center justify-between text-[11px] text-neutral-400 px-1">
            <button
              type="button"
              onClick={() => setShowCustomGooglePrompt(!showCustomGooglePrompt)}
              className="hover:text-amber-400 underline cursor-pointer text-[10.5px]"
            >
              {showCustomGooglePrompt ? 'Cancel custom Google' : 'Use another Google account'}
            </button>
            <span className="text-emerald-400 font-mono text-[10px] font-bold">✓ Verified Fast Login</span>
          </div>

          {showCustomGooglePrompt && (
            <div className="p-3 bg-neutral-950 border border-neutral-800 rounded-xl space-y-2 animate-in fade-in">
              <input
                type="email"
                placeholder="Enter custom Google account (@gmail.com)"
                value={googleEmailInput}
                onChange={(e) => setGoogleEmailInput(e.target.value)}
                className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-3 py-1.5 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-amber-500"
              />
              <button
                type="button"
                onClick={() => {
                  if (googleEmailInput.trim()) {
                    handleGoogleSignIn(googleEmailInput.trim());
                  }
                }}
                className="w-full py-1.5 bg-neutral-800 hover:bg-neutral-700 text-white font-bold text-xs rounded-lg transition cursor-pointer"
              >
                Sign In with {googleEmailInput || 'Google Account'}
              </button>
            </div>
          )}
        </div>

        <div className="relative flex py-1 items-center mb-4">
          <div className="flex-grow border-t border-neutral-800"></div>
          <span className="flex-shrink mx-3 text-[10px] font-bold text-neutral-500 uppercase tracking-wider">
            Or with email &amp; password
          </span>
          <div className="flex-grow border-t border-neutral-800"></div>
        </div>

        {/* Tab Switcher */}
        <div className="grid grid-cols-2 gap-1.5 p-1 bg-neutral-950 rounded-xl border border-neutral-800 mb-5">
          <button
            type="button"
            onClick={() => {
              setMode('signin');
              setErrorMsg('');
            }}
            className={`py-2 text-xs font-bold rounded-lg transition-all ${
              mode === 'signin'
                ? 'bg-amber-500 text-neutral-950 shadow-md'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('signup');
              setErrorMsg('');
            }}
            className={`py-2 text-xs font-bold rounded-lg transition-all ${
              mode === 'signup'
                ? 'bg-amber-500 text-neutral-950 shadow-md'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            Register
          </button>
        </div>

        {errorMsg && (
          <div className="mb-4 p-3 rounded-xl bg-red-950/70 border border-red-800/80 flex items-center gap-2.5 text-xs text-red-200">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {mode === 'signin' ? (
          <form onSubmit={handleSignIn} className="space-y-3.5">
            <div>
              <label className="text-xs font-bold text-neutral-300 block mb-1">Email Address</label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" />
                <input
                  type="email"
                  required
                  placeholder="hamza@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-amber-500 font-mono"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-neutral-300 block mb-1">Password</label>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl pl-9 pr-10 py-2 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-amber-500 font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-white"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-2.5 bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold text-xs rounded-xl shadow-lg shadow-amber-500/20 active:scale-98 transition-all flex items-center justify-center gap-1.5 mt-2"
            >
              <span>Sign In to Account</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            {/* Quick Demo Fill */}
            <div className="pt-2 text-center">
              <button
                type="button"
                onClick={handleFillDemo}
                className="text-[11px] text-amber-400/90 hover:text-amber-300 underline font-medium"
              >
                Quick Demo: Fill Hamza Tariq Account (hamza@example.com)
              </button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleSignUp} className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
            <div>
              <label className="text-xs font-bold text-neutral-300 block mb-1">Full Name *</label>
              <div className="relative">
                <User className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" />
                <input
                  type="text"
                  required
                  placeholder="e.g. Bilal Khan"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div>
                <label className="text-xs font-bold text-neutral-300 block mb-1">Email *</label>
                <div className="relative">
                  <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" />
                  <input
                    type="email"
                    required
                    placeholder="bilal@gmail.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-amber-500 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-neutral-300 block mb-1">Phone Number *</label>
                <div className="relative">
                  <Phone className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" />
                  <input
                    type="tel"
                    required
                    placeholder="0300-1234567"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-amber-500 font-mono"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-neutral-300 block mb-1">Create Password (Min 6) *</label>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl pl-9 pr-10 py-2 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-amber-500 font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-white"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-neutral-300 block mb-1">Default Delivery Address</label>
              <div className="relative">
                <MapPin className="w-4 h-4 absolute left-3 top-2.5 text-neutral-500" />
                <textarea
                  rows={2}
                  placeholder="House/Apartment #, Street, Landmark..."
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-neutral-300 block mb-1">Delivery City &amp; Area</label>
              <select
                value={area}
                onChange={(e) => setArea(e.target.value)}
                className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-xs text-white"
              >
                {KARACHI_DELIVERY_AREAS.filter((a) => {
                  const disabled = (StorageService.getSettings()?.disabledDeliveryAreas || []);
                  return !disabled.some(
                    (d) => d.toLowerCase().trim() === a.name.toLowerCase().trim() || a.name.toLowerCase().includes(d.toLowerCase().trim())
                  );
                }).map((a) => (
                  <option key={a.name} value={a.name}>
                    {a.name}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="submit"
              className="w-full py-2.5 bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold text-xs rounded-xl shadow-lg shadow-amber-500/20 active:scale-98 transition-all flex items-center justify-center gap-1.5 mt-2"
            >
              <span>Create Account</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
