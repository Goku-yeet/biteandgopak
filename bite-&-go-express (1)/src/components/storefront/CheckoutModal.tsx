import React, { useState, useRef, useEffect } from 'react';
import QRCode from 'qrcode';
import { OrderItem, PaymentMethod, StoreSettings, Order, CustomerUser, PromoCode } from '../../types';
import { StorageService } from '../../utils/storage';
import { sounds } from '../../utils/audio';
import {
  X,
  CreditCard,
  Banknote,
  Upload,
  Copy,
  Check,
  ShieldCheck,
  AlertCircle,
  FileCheck,
  QrCode,
  Image as ImageIcon,
  ArrowLeft,
  ShoppingBag,
  Home,
  Download,
  Smartphone,
  MapPin,
  Zap,
  Tag,
  Sparkles,
  Percent,
  Moon,
  Clock,
} from 'lucide-react';

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  onBackToCart?: () => void;
  items: OrderItem[];
  orderType: 'delivery' | 'pickup';
  settings: StoreSettings;
  activeCustomer?: CustomerUser | null;
  onOpenCustomerAuth?: () => void;
  onOrderPlaced: (order: Order) => void;
}

import {
  KARACHI_DELIVERY_AREAS,
  DeliveryZone,
  getAreaCoordinates,
  findBestMatchingKarachiZone,
  checkKarachiFreeDeliveryEligibility,
} from '../../data/karachiAreas';
import { sanitizeInput, checkRateLimit, isValidPhone } from '../../utils/security';
import { isStoreOpenNow } from '../../utils/operatingHours';
export { KARACHI_DELIVERY_AREAS, type DeliveryZone };

export const CheckoutModal: React.FC<CheckoutModalProps> = ({
  isOpen,
  onClose,
  onBackToCart,
  items,
  orderType,
  settings,
  activeCustomer,
  onOpenCustomerAuth,
  onOrderPlaced,
}) => {
  // ESC key handler to close checkout without ordering
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Form states
  const [customerName, setCustomerName] = useState(activeCustomer?.name || '');
  const [customerPhone, setCustomerPhone] = useState(activeCustomer?.phone || '');
  const [selectedArea, setSelectedArea] = useState(() => {
    const disabled = settings.disabledDeliveryAreas || [];
    const isPaused = (name: string) =>
      disabled.some(
        (d) => d.toLowerCase().trim() === name.toLowerCase().trim() || name.toLowerCase().includes(d.toLowerCase().trim())
      );
    if (activeCustomer?.defaultArea && !isPaused(activeCustomer.defaultArea)) {
      return activeCustomer.defaultArea;
    }
    const firstActive = KARACHI_DELIVERY_AREAS.find((a) => !isPaused(a.name));
    return firstActive?.name || KARACHI_DELIVERY_AREAS[0].name;
  });

  // Ensure active selection if settings update
  useEffect(() => {
    const disabled = settings.disabledDeliveryAreas || [];
    const isPaused = (name: string) =>
      disabled.some(
        (d) => d.toLowerCase().trim() === name.toLowerCase().trim() || name.toLowerCase().includes(d.toLowerCase().trim())
      );
    if (isPaused(selectedArea)) {
      const firstActive = KARACHI_DELIVERY_AREAS.find((a) => !isPaused(a.name));
      if (firstActive) setSelectedArea(firstActive.name);
    }
  }, [settings.disabledDeliveryAreas, selectedArea]);

  const [deliveryAddress, setDeliveryAddress] = useState(activeCustomer?.defaultAddress || '');
  const [customerNotes, setCustomerNotes] = useState('');

  // Payment configuration from manager settings
  const pmConfig = settings.paymentMethodsConfig || {
    easypaisaEnabled: true,
    jazzcashEnabled: true,
    codEnabled: true,
    easypaisaAccountTitle: settings.easyPaisaAccountTitle,
    easypaisaAccountNumber: settings.easyPaisaAccountNumber,
    jazzcashAccountTitle: settings.jazzCashAccountTitle,
    jazzcashAccountNumber: settings.jazzCashAccountNumber,
    codNotes: 'Cash on delivery accepted up to Rs. 5,000 across active Karachi delivery zones.',
  };

  const isEasyPaisaActive = pmConfig.easypaisaEnabled !== false;
  const isJazzCashActive = pmConfig.jazzcashEnabled !== false;
  const isCodActive = pmConfig.codEnabled !== false;

  const defaultPaymentMethod: PaymentMethod = isEasyPaisaActive
    ? 'easypaisa'
    : isJazzCashActive
    ? 'jazzcash'
    : 'cod';

  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(defaultPaymentMethod);

  // Auto-switch payment method if selected one is disabled
  useEffect(() => {
    if (paymentMethod === 'easypaisa' && !isEasyPaisaActive) {
      setPaymentMethod(isJazzCashActive ? 'jazzcash' : 'cod');
    } else if (paymentMethod === 'jazzcash' && !isJazzCashActive) {
      setPaymentMethod(isEasyPaisaActive ? 'easypaisa' : 'cod');
    } else if (paymentMethod === 'cod' && !isCodActive) {
      setPaymentMethod(isEasyPaisaActive ? 'easypaisa' : isJazzCashActive ? 'jazzcash' : 'easypaisa');
    }
  }, [isEasyPaisaActive, isJazzCashActive, isCodActive, paymentMethod]);

  useEffect(() => {
    if (activeCustomer) {
      if (!customerName) setCustomerName(activeCustomer.name);
      if (!customerPhone) setCustomerPhone(activeCustomer.phone);
      if (!deliveryAddress && activeCustomer.defaultAddress) setDeliveryAddress(activeCustomer.defaultAddress);
      if (activeCustomer.defaultArea) setSelectedArea(activeCustomer.defaultArea);
    }
  }, [activeCustomer]);

  // EasyPaisa / JazzCash details
  const [transactionId, setTransactionId] = useState('');
  const [screenshotUrl, setScreenshotUrl] = useState<string | null>(null);
  const [screenshotFileName, setScreenshotFileName] = useState('');
  const [copied, setCopied] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [showQrCode, setShowQrCode] = useState(false);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('');
  const [qrFormat, setQrFormat] = useState<'number' | 'full'>('number');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const openStatus = isStoreOpenNow(settings);

  // Distance & Calculations with smart zone matching
  const selectedZone = findBestMatchingKarachiZone(selectedArea);
  const distanceKm = selectedZone.distanceKm;
  const maxRadiusKm = settings.deliveryRadiusKm || 14;
  const isOutsideRadius = distanceKm > maxRadiusKm;

  const subtotal = items.reduce((sum, i) => sum + i.itemTotal, 0);

  // Promo code engine state
  const [promoCodeInput, setPromoCodeInput] = useState('');
  const [appliedPromo, setAppliedPromo] = useState<PromoCode | null>(null);
  const [promoDiscount, setPromoDiscount] = useState<number>(0);
  const [promoError, setPromoError] = useState<string | null>(null);
  const [promoSuccessMsg, setPromoSuccessMsg] = useState<string | null>(null);
  const [activePromosList] = useState<PromoCode[]>(() =>
    StorageService.getPromoCodes().filter((p) => p.isActive)
  );

  const handleApplyPromo = (codeOverride?: string) => {
    const raw = (codeOverride || promoCodeInput).trim();
    if (!raw) {
      setPromoError('Please enter a voucher / promo code.');
      setPromoSuccessMsg(null);
      return;
    }
    const customerIdentifier = {
      email: activeCustomer?.email,
      phone: customerPhone || activeCustomer?.phone,
      id: activeCustomer?.id,
      isLoggedIn: Boolean(activeCustomer),
    };
    const result = StorageService.validatePromoCode(raw, subtotal, customerIdentifier);
    if (!result.valid) {
      setPromoError(result.error || `Promo code "${raw}" could not be applied.`);
      setPromoSuccessMsg(null);
      setAppliedPromo(null);
      setPromoDiscount(0);
      sounds.playError();
    } else {
      setAppliedPromo(result.promo || null);
      setPromoDiscount(result.discount);
      setPromoError(null);
      setPromoCodeInput(raw.toUpperCase());
      setPromoSuccessMsg(`Voucher applied! Saved Rs. ${result.discount.toLocaleString()} on your order.`);
      sounds.playSuccess();
    }
  };

  const handleRemovePromo = () => {
    setAppliedPromo(null);
    setPromoDiscount(0);
    setPromoError(null);
    setPromoSuccessMsg(null);
    setPromoCodeInput('');
  };

  // Robust Free Delivery Eligibility & Rate Evaluation
  const deliveryEval = checkKarachiFreeDeliveryEligibility({
    areaName: selectedArea,
    distanceKm,
    subtotal,
    settings,
    orderType,
  });

  const calculatedFee = deliveryEval.calculatedFee;
  const isFreeDeliveryEligible = deliveryEval.isFree;
  const freeDeliveryReason = deliveryEval.reason;
  const deliveryFee = orderType === 'pickup' ? 0 : deliveryEval.effectiveFee;
  const total = Math.max(0, subtotal - promoDiscount) + deliveryFee;

  const currentAccountNumber =
    paymentMethod === 'easypaisa'
      ? (pmConfig.easypaisaAccountNumber || settings.easyPaisaAccountNumber)
      : (pmConfig.jazzcashAccountNumber || settings.jazzCashAccountNumber);
  const currentAccountTitle =
    paymentMethod === 'easypaisa'
      ? (pmConfig.easypaisaAccountTitle || settings.easyPaisaAccountTitle)
      : (pmConfig.jazzcashAccountTitle || settings.jazzCashAccountTitle);

  // Generate scannable QR Code for EasyPaisa / JazzCash payment
  useEffect(() => {
    if (paymentMethod === 'easypaisa' || paymentMethod === 'jazzcash') {
      const payload =
        qrFormat === 'number'
          ? currentAccountNumber
          : `${paymentMethod === 'easypaisa' ? 'EasyPaisa' : 'JazzCash'} Transfer Details\nAccount Number: ${currentAccountNumber}\nAccount Title: ${currentAccountTitle}\nAmount: Rs. ${total}\nStore: ${settings.storeName || 'Bite & Go'}`;

      QRCode.toDataURL(payload, {
        width: 180,
        margin: 1,
        color: {
          dark: paymentMethod === 'easypaisa' ? '#044e3b' : '#78350f',
          light: '#ffffff',
        },
        errorCorrectionLevel: 'M',
      })
        .then((url) => setQrCodeDataUrl(url))
        .catch((err) => console.error('Failed to generate payment QR code', err));
    }
  }, [paymentMethod, currentAccountNumber, currentAccountTitle, total, qrFormat, settings.storeName]);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setErrorMsg('Please upload a valid image file (PNG, JPG, WEBP)');
      return;
    }

    setScreenshotFileName(file.name);
    setErrorMsg('');

    const reader = new FileReader();
    reader.onerror = () => {
      setErrorMsg('Failed to read the selected screenshot. Please try selecting another file.');
    };
    reader.onload = () => {
      if (typeof reader.result !== 'string') return;
      const rawDataUrl = reader.result;

      // Downscale and compress image to prevent browser localStorage quota exceeded errors
      const img = new Image();
      img.onerror = () => {
        // Fallback to raw data url if image parse fails
        setScreenshotUrl(rawDataUrl);
      };
      img.onload = () => {
        try {
          const maxDim = 900;
          let width = img.width;
          let height = img.height;
          if (width > maxDim || height > maxDim) {
            if (width > height) {
              height = Math.round((height * maxDim) / width);
              width = maxDim;
            } else {
              width = Math.round((width * maxDim) / height);
              height = maxDim;
            }
          }

          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0, width, height);
            const compressed = canvas.toDataURL('image/jpeg', 0.72);
            setScreenshotUrl(compressed);
          } else {
            setScreenshotUrl(rawDataUrl);
          }
        } catch {
          setScreenshotUrl(rawDataUrl);
        }
      };
      img.src = rawDataUrl;
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    // Anti-Spam Checkout Rate Limit (Prevents accidental double-clicks or bot flooding)
    const rateLimit = checkRateLimit('checkout_submit', 4000);
    if (!rateLimit.allowed) {
      setErrorMsg(`Please wait ${rateLimit.waitSeconds}s before submitting another order.`);
      return;
    }

    // Operating hours validation
    if (!openStatus.isOpen) {
      setErrorMsg(
        `Orders cannot be placed right now. Bite & Go is currently closed outside work hours (${openStatus.todayHoursText}). ${openStatus.nextOpenText ? `Reopening ${openStatus.nextOpenText}.` : ''}`
      );
      return;
    }

    // Check if delivery area is disabled
    const isAreaDisabled = Boolean(
      orderType === 'delivery' &&
      settings.disabledDeliveryAreas &&
      settings.disabledDeliveryAreas.some(
        (a) => a.toLowerCase().trim() === selectedArea.toLowerCase().trim() || selectedArea.toLowerCase().includes(a.toLowerCase().trim())
      )
    );
    if (isAreaDisabled) {
      setErrorMsg(`Delivery to "${selectedArea}" is currently paused by store management. Please select an alternate area or choose Self-Pickup.`);
      return;
    }

    if (!customerName.trim()) {
      setErrorMsg('Please enter your full name');
      return;
    }
    if (!customerPhone.trim() || !isValidPhone(customerPhone)) {
      setErrorMsg('Please enter a valid Pakistani phone number (e.g. 0321-1234567 or 03001234567)');
      return;
    }
    if (orderType === 'delivery' && !deliveryAddress.trim()) {
      setErrorMsg('Please enter your complete street and house delivery address');
      return;
    }

    if (paymentMethod === 'easypaisa' || paymentMethod === 'jazzcash') {
      if (!screenshotUrl && !transactionId.trim()) {
        setErrorMsg(
          `Please upload your ${
            paymentMethod === 'easypaisa' ? 'EasyPaisa' : 'JazzCash'
          } screenshot receipt or enter the Transaction ID to verify your payment.`
        );
        return;
      }
    }

    setIsSubmitting(true);

    const newOrder: Order = {
      id: `#BG-${Math.floor(1000 + Math.random() * 9000)}`,
      createdAt: new Date().toISOString(),
      customerName: sanitizeInput(customerName),
      customerEmail: activeCustomer?.email || undefined,
      customerPhone: sanitizeInput(customerPhone),
      deliveryAddress: orderType === 'delivery' ? sanitizeInput(deliveryAddress) : 'Self Pickup at Store',
      area: orderType === 'delivery' ? selectedArea : 'In-Store Pickup',
      distanceKm: orderType === 'delivery' ? distanceKm : undefined,
      coordinates: orderType === 'delivery' ? getAreaCoordinates(selectedArea) : undefined,
      orderType,
      items,
      subtotal,
      deliveryFee,
      discount: promoDiscount,
      promoCode: appliedPromo?.code || undefined,
      promoDiscount: promoDiscount > 0 ? promoDiscount : undefined,
      total,
      payment: {
        method: paymentMethod,
        transactionId: sanitizeInput(transactionId) || undefined,
        screenshotUrl: screenshotUrl || undefined,
        verified: paymentMethod === 'cod', // COD is verified upon delivery
        accountTitle: currentAccountTitle,
        accountNumber: currentAccountNumber,
      },
      status: 'received',
      estimatedMinutes: orderType === 'delivery' ? Math.max(25, 20 + Math.round(distanceKm * 1.5)) : 18,
      statusHistory: [
        {
          status: 'received',
          timestamp: new Date().toISOString(),
          note: `Order placed via ${paymentMethod.toUpperCase()}${
            screenshotUrl ? ' with payment receipt screenshot' : ''
          }.`,
        },
      ],
      notes: customerNotes ? sanitizeInput(customerNotes) : undefined,
      customerNotes: customerNotes ? sanitizeInput(customerNotes) : undefined,
      specialInstructions: customerNotes ? sanitizeInput(customerNotes) : undefined,
    };

    // Record promo code redemption and associate with customer identifier
    if (appliedPromo?.code) {
      const custKey = activeCustomer?.email || customerPhone || activeCustomer?.id;
      StorageService.recordPromoUsage(appliedPromo.code, custKey);
    }

    // Unlock audio context and trigger kitchen order beeper immediately on employee/device
    sounds.unlockAudioContext();
    sounds.playKitchenOrderBeep();

    setTimeout(() => {
      setIsSubmitting(false);
      onOrderPlaced(newOrder);
      onClose();
    }, 400);
  };

  if (!isOpen) return null;

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-neutral-950/85 backdrop-blur-sm overflow-hidden cursor-pointer"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-lg bg-neutral-900 border border-neutral-800 rounded-2xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden cursor-default animate-in fade-in zoom-in-95 duration-150"
      >
        {/* Sleek Compact Header HUD */}
        <div className="px-3.5 py-2 bg-neutral-950 border-b border-neutral-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-amber-500/15 border border-amber-500/25 flex items-center justify-center text-amber-500 shrink-0">
              <ShieldCheck className="w-3.5 h-3.5" />
            </div>
            <div className="flex items-center gap-2">
              <h2 className="text-xs sm:text-sm font-bold text-white">Checkout</h2>
              <span className="text-[9px] font-bold text-amber-400 bg-amber-500/15 border border-amber-500/30 px-1.5 py-0.2 rounded uppercase">
                {orderType === 'delivery' ? 'Delivery' : 'Pickup'}
              </span>
              <span className="text-neutral-500 text-xs hidden sm:inline">·</span>
              <span className="text-amber-400 font-mono font-bold text-xs">
                Rs. {total.toLocaleString()}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {onBackToCart && (
              <button
                type="button"
                onClick={onBackToCart}
                className="px-2 py-1 text-[11px] text-neutral-300 hover:text-white font-medium hover:bg-neutral-800 rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                title="Return to shopping cart"
              >
                <ShoppingBag className="w-3 h-3 text-amber-400" />
                <span className="hidden sm:inline">Cart</span>
              </button>
            )}

            {/* Quick 1-Tap Checkout Button in Header: Never scroll down! */}
            {openStatus.isOpen ? (
              <button
                type="submit"
                form="checkout-order-form"
                disabled={isSubmitting}
                className="py-1 px-3 bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 disabled:opacity-50 text-neutral-950 font-black rounded-lg text-xs shadow-md shadow-amber-500/20 active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
                title="Place order immediately without scrolling"
              >
                <Check className="w-3.5 h-3.5 stroke-[3]" />
                <span>{isSubmitting ? 'Placing...' : `Place Order (Rs. ${total.toLocaleString()})`}</span>
              </button>
            ) : null}

            <button
              onClick={onClose}
              className="p-1.5 text-neutral-400 hover:text-white hover:bg-neutral-800 rounded-lg transition-colors cursor-pointer"
              title="Close checkout"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Error Alert */}
        {errorMsg && (
          <div className="mx-3.5 mt-2 p-2 rounded-lg bg-red-950/80 border border-red-800 flex items-center gap-2 text-xs text-red-200 shrink-0">
            <AlertCircle className="w-3.5 h-3.5 text-red-400 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Operating Hours Alert: If closed, show clear notice */}
        {!openStatus.isOpen && (
          <div className="mx-3.5 mt-2 p-3 rounded-xl bg-red-950/80 border border-red-500/40 text-red-200 text-xs space-y-1.5 shrink-0 animate-in fade-in">
            <div className="flex items-center gap-1.5 font-bold text-red-300">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
              <span>Kitchen Currently Closed Outside Operating Hours</span>
            </div>
            <p className="text-[11px] text-neutral-300 leading-snug">
              {openStatus.reason}
            </p>
            {openStatus.nextOpenText && (
              <div className="text-[11px] font-semibold text-amber-300 pt-0.5">
                ⏰ Scheduled Reopening: {openStatus.nextOpenText}
              </div>
            )}
          </div>
        )}

        <form id="checkout-order-form" onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
          {/* TOP QUICK CONFIRM AREA & FAST CHECKOUT BAR (Eliminates need to scroll down) */}
          <div className="px-3.5 py-2 bg-gradient-to-r from-amber-500/20 via-neutral-900 to-neutral-950 border-b border-amber-500/30 flex items-center justify-between gap-2 shrink-0">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-6 h-6 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
                <MapPin className="w-3.5 h-3.5" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-mono text-neutral-400 uppercase font-semibold">Area:</span>
                  <span className="text-xs font-bold text-amber-300 truncate">
                    {orderType === 'delivery' ? selectedArea : 'In-Store Pickup'}
                  </span>
                </div>
                <p className="text-[10.5px] text-neutral-400 font-mono">
                  {orderType === 'delivery' ? `Delivery: ${deliveryFee === 0 ? 'FREE' : `Rs. ${deliveryFee}`}` : 'North Nazimabad Store'}
                </p>
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting || !openStatus.isOpen}
              className="py-1.5 px-3 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-neutral-950 font-black rounded-xl text-xs shadow-md shadow-amber-500/20 active:scale-95 transition-all flex items-center gap-1.5 shrink-0 cursor-pointer"
              title="Confirm delivery area and immediately place order without scrolling down"
            >
              <Zap className="w-3.5 h-3.5 fill-neutral-950" />
              <span>Confirm &amp; Checkout</span>
            </button>
          </div>

          {/* Scrollable Form Body with tight compact padding */}
          <div className="overflow-y-auto px-3.5 py-2.5 space-y-2.5 text-xs flex-1">
            {/* Customer Account Auto-Fill Status - Micro Banner */}
            {activeCustomer ? (
              <div className="px-2.5 py-1 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-between text-[11px]">
                <div className="flex items-center gap-1.5 truncate">
                  <ShieldCheck className="w-3 h-3 text-amber-400 shrink-0" />
                  <span className="text-neutral-200 truncate">
                    Signed in as <strong className="text-white">{activeCustomer.name}</strong>
                  </span>
                </div>
                <span className="text-[10px] font-semibold text-amber-400 shrink-0">
                  Address Synced
                </span>
              </div>
            ) : onOpenCustomerAuth ? (
              <div className="px-2.5 py-1 rounded-lg bg-neutral-950 border border-neutral-800 flex items-center justify-between text-[11px]">
                <span className="text-neutral-400">
                  Have an account? Auto-fill your details.
                </span>
                <button
                  type="button"
                  onClick={onOpenCustomerAuth}
                  className="text-amber-400 hover:text-amber-300 font-bold hover:underline cursor-pointer ml-2 shrink-0"
                >
                  Sign In
                </button>
              </div>
            ) : null}

            {/* SECTION: PROMINENT LOCATION & AREA (Karachi) */}
            {orderType === 'delivery' ? (
              <div className="p-2.5 rounded-xl bg-neutral-950 border border-amber-500/35 space-y-2 shadow-xs">
                <div className="flex items-center justify-between pb-1 border-b border-neutral-850">
                  <div className="flex items-center gap-1.5 text-amber-400 font-bold text-xs">
                    <MapPin className="w-3.5 h-3.5 text-amber-400" />
                    <span>Karachi Delivery Area</span>
                  </div>
                  <span className="text-[9px] font-mono text-neutral-400 bg-neutral-900 px-1.5 py-0.2 rounded border border-neutral-800">
                    Branch: North Nazimabad
                  </span>
                </div>

                {/* Delivery Area Dropdown */}
                <div>
                  <label className="text-[11px] font-semibold text-neutral-200 block mb-1">
                    Select Your Area / Sector *
                  </label>
                  <select
                    value={selectedArea}
                    onChange={(e) => setSelectedArea(e.target.value)}
                    className="w-full bg-neutral-900 border border-neutral-750 focus:border-amber-500 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none transition-colors"
                  >
                    {KARACHI_DELIVERY_AREAS.filter((area) => {
                      const isDisabled = Boolean(
                        settings.disabledDeliveryAreas &&
                        settings.disabledDeliveryAreas.some(
                          (a) => a.toLowerCase().trim() === area.name.toLowerCase().trim() || area.name.toLowerCase().includes(a.toLowerCase().trim())
                        )
                      );
                      return !isDisabled;
                    }).map((area) => {
                      const isFreeArea = Boolean(
                        settings.freeDeliveryAreas &&
                        settings.freeDeliveryAreas.some(
                          (a) => a.toLowerCase().trim() === area.name.toLowerCase().trim() || area.name.toLowerCase().includes(a.toLowerCase())
                        )
                      );
                      const isFreeRad = typeof settings.freeDeliveryRadiusKm === 'number' && area.distanceKm <= settings.freeDeliveryRadiusKm;
                      const hasFreeDelivery = isFreeArea || isFreeRad;
                      return (
                        <option
                          key={area.name}
                          value={area.name}
                          className="bg-neutral-900 text-white"
                        >
                          {area.name}{hasFreeDelivery ? ' — 🚀 FREE DELIVERY' : ''}
                        </option>
                      );
                    })}
                  </select>
                </div>

                {/* Express Karachi Dispatch & Delivery Fee Live Chip */}
                <div className="p-1.5 rounded-lg bg-neutral-900 border border-neutral-800 flex items-center justify-between text-[11px]">
                  <div className="flex items-center gap-1.5">
                    <span className="text-neutral-400">Coverage:</span>
                    <span className="text-emerald-400 font-semibold">Active Karachi Express Delivery</span>
                  </div>

                  <div className="font-mono font-bold">
                    Fee:{' '}
                    {deliveryFee === 0 ? (
                      <span className="text-emerald-400">FREE</span>
                    ) : (
                      <span className="text-white">Rs. {deliveryFee}</span>
                    )}
                  </div>
                </div>

                {deliveryFee === 0 && freeDeliveryReason && (
                  <div className="text-[10px] text-emerald-400 font-bold bg-emerald-500/10 border border-emerald-500/20 px-2 py-1 rounded-lg flex items-center gap-1.5">
                    <span>✨</span>
                    <span>{freeDeliveryReason}</span>
                  </div>
                )}

                {/* Street Address */}
                <div>
                  <label className="text-[11px] font-semibold text-neutral-300 block mb-0.5">
                    Street Address &amp; House / Apartment # *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. House 14-B, Street 3, near Five Star / Hyderi"
                    value={deliveryAddress}
                    onChange={(e) => setDeliveryAddress(e.target.value)}
                    className="w-full bg-neutral-900 border border-neutral-750 focus:border-amber-500 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-neutral-500 focus:outline-none"
                  />
                </div>

                {/* Instructions / Landmark */}
                <div>
                  <input
                    type="text"
                    placeholder="Landmark or delivery instructions (optional)"
                    value={customerNotes}
                    onChange={(e) => setCustomerNotes(e.target.value)}
                    className="w-full bg-neutral-900 border border-neutral-800 focus:border-amber-500 rounded-lg px-2.5 py-1 text-[11px] text-white placeholder-neutral-500 focus:outline-none"
                  />
                </div>
              </div>
            ) : (
              /* Pickup Location Banner */
              <div className="p-3 rounded-xl bg-neutral-950 border border-amber-500/30 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-amber-400 shrink-0" />
                  <div>
                    <span className="font-bold text-white block">Pick Up at North Nazimabad Branch</span>
                    <span className="text-[11px] text-neutral-400">Block-I, Karachi · Ready in ~15-20 mins</span>
                  </div>
                </div>
                <span className="text-[11px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                  FREE
                </span>
              </div>
            )}

            {/* SECTION: CUSTOMER CONTACT */}
            <div className="p-3 rounded-xl bg-neutral-950 border border-neutral-800 space-y-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-400 block">
                Customer Information
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] text-neutral-300 block mb-1">Full Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Ahmed Zuberi"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="w-full bg-neutral-900 border border-neutral-800 focus:border-amber-500 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-neutral-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-[11px] text-neutral-300 block mb-1">
                    Phone / WhatsApp *
                  </label>
                  <input
                    type="tel"
                    required
                    placeholder="0345-9821430"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    className="w-full bg-neutral-900 border border-neutral-800 focus:border-amber-500 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-neutral-500 focus:outline-none font-mono"
                  />
                </div>
              </div>
            </div>

            {/* SECTION: PAYMENT METHOD */}
            <div className="p-3 rounded-xl bg-neutral-950 border border-neutral-800 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-400">
                  Payment Method
                </span>
                <span className="text-[10px] text-neutral-400 font-mono">
                  {paymentMethod === 'easypaisa'
                    ? 'EasyPaisa'
                    : paymentMethod === 'jazzcash'
                    ? 'JazzCash'
                    : 'COD'}
                </span>
              </div>

              {/* Payment Method Tabs */}
              <div className="grid grid-cols-3 gap-1.5">
                {isEasyPaisaActive && (
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('easypaisa')}
                    className={`py-2 px-1.5 rounded-lg border text-center transition-all cursor-pointer ${
                      paymentMethod === 'easypaisa'
                        ? 'border-emerald-500 bg-emerald-500/15 text-emerald-300 font-bold shadow-xs'
                        : 'border-neutral-800 bg-neutral-900 text-neutral-400 hover:text-white'
                    }`}
                  >
                    <span className="text-xs block font-bold">EasyPaisa</span>
                    <span className="text-[9px] text-emerald-400/80 block">Direct Transfer</span>
                  </button>
                )}

                {isJazzCashActive && (
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('jazzcash')}
                    className={`py-2 px-1.5 rounded-lg border text-center transition-all cursor-pointer ${
                      paymentMethod === 'jazzcash'
                        ? 'border-amber-500 bg-amber-500/15 text-amber-300 font-bold shadow-xs'
                        : 'border-neutral-800 bg-neutral-900 text-neutral-400 hover:text-white'
                    }`}
                  >
                    <span className="text-xs block font-bold">JazzCash</span>
                    <span className="text-[9px] text-amber-400/80 block">Direct Transfer</span>
                  </button>
                )}

                {isCodActive && (
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('cod')}
                    className={`py-2 px-1.5 rounded-lg border text-center transition-all cursor-pointer ${
                      paymentMethod === 'cod'
                        ? 'border-blue-500 bg-blue-500/15 text-blue-300 font-bold shadow-xs'
                        : 'border-neutral-800 bg-neutral-900 text-neutral-400 hover:text-white'
                    }`}
                  >
                    <span className="text-xs block font-bold">Cash</span>
                    <span className="text-[9px] text-neutral-400 block">On Delivery</span>
                  </button>
                )}
              </div>

              {/* COD Note */}
              {paymentMethod === 'cod' && (
                <div className="p-2 rounded-lg bg-blue-500/10 border border-blue-500/20 text-[11px] text-blue-200">
                  <p className="font-semibold text-blue-300">💵 Cash on Delivery:</p>
                  <p className="text-[10px] text-blue-200/90 mt-0.5">
                    {pmConfig.codNotes || 'Please keep exact cash ready for the rider upon arrival.'}
                  </p>
                </div>
              )}

              {/* EasyPaisa / JazzCash Account Details Card */}
              {(paymentMethod === 'easypaisa' || paymentMethod === 'jazzcash') && (
                <div className="space-y-2 pt-1 border-t border-neutral-850">
                  <div className="p-2.5 rounded-lg bg-neutral-900 border border-neutral-800 flex items-center justify-between">
                    <div>
                      <p className="text-[10px] text-neutral-400">
                        {paymentMethod === 'easypaisa' ? 'EasyPaisa' : 'JazzCash'} Title:{' '}
                        <span className="text-white font-medium">{currentAccountTitle}</span>
                      </p>
                      <p className="text-xs font-mono font-bold text-amber-400 tracking-wider">
                        {currentAccountNumber}
                      </p>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleCopy(currentAccountNumber)}
                        className="px-2 py-1 bg-neutral-800 hover:bg-neutral-750 text-[11px] font-medium text-white rounded-md transition-all flex items-center gap-1 cursor-pointer"
                        title="Copy account number"
                      >
                        {copied ? (
                          <>
                            <Check className="w-3 h-3 text-emerald-400" />
                            <span className="text-emerald-400">Copied</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3" />
                            <span>Copy</span>
                          </>
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={() => setShowQrCode(!showQrCode)}
                        className="px-2 py-1 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-[11px] font-semibold text-amber-400 rounded-md transition-all flex items-center gap-1 cursor-pointer"
                        title="Toggle QR code display"
                      >
                        <QrCode className="w-3 h-3 text-amber-400" />
                        <span>{showQrCode ? 'Hide QR' : 'QR Code'}</span>
                      </button>
                    </div>
                  </div>

                  {/* Collapsible Scannable QR Code */}
                  {showQrCode && (
                    <div className="p-3 rounded-xl bg-neutral-900 border border-neutral-800 flex flex-col items-center text-center space-y-2 animate-in fade-in">
                      <div className="flex items-center justify-between w-full pb-1.5 border-b border-neutral-800 text-[11px]">
                        <span className="font-bold text-white flex items-center gap-1">
                          <QrCode className="w-3 h-3 text-amber-400" />
                          <span>Scan with {paymentMethod === 'easypaisa' ? 'EasyPaisa' : 'JazzCash'}</span>
                        </span>
                        <div className="flex items-center gap-1 bg-neutral-950 p-0.5 rounded border border-neutral-800">
                          <button
                            type="button"
                            onClick={() => setQrFormat('number')}
                            className={`px-1.5 py-0.5 rounded text-[10px] font-semibold transition-colors cursor-pointer ${
                              qrFormat === 'number'
                                ? 'bg-amber-500 text-neutral-950 font-bold'
                                : 'text-neutral-400 hover:text-white'
                            }`}
                          >
                            Number
                          </button>
                          <button
                            type="button"
                            onClick={() => setQrFormat('full')}
                            className={`px-1.5 py-0.5 rounded text-[10px] font-semibold transition-colors cursor-pointer ${
                              qrFormat === 'full'
                                ? 'bg-amber-500 text-neutral-950 font-bold'
                                : 'text-neutral-400 hover:text-white'
                            }`}
                          >
                            Full Bill
                          </button>
                        </div>
                      </div>

                      <div className="p-2 bg-white rounded-xl shadow-md">
                        {qrCodeDataUrl ? (
                          <img
                            src={qrCodeDataUrl}
                            alt="Scannable QR Code"
                            className="w-32 h-32 object-contain"
                          />
                        ) : (
                          <div className="w-32 h-32 flex items-center justify-center text-neutral-400 text-xs">
                            Generating...
                          </div>
                        )}
                      </div>

                      <p className="text-[10px] text-neutral-400">
                        Scan to copy details · Payable: <strong className="text-amber-400">Rs. {total.toLocaleString()}</strong>
                      </p>
                    </div>
                  )}

                  {/* TID Input */}
                  <div>
                    <label className="text-[11px] text-neutral-300 block mb-1">
                      Transaction ID (TID) from SMS / App Receipt
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. EP-9821430924 or 34810294"
                      value={transactionId}
                      onChange={(e) => setTransactionId(e.target.value)}
                      className="w-full bg-neutral-900 border border-neutral-800 focus:border-amber-500 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-neutral-500 focus:outline-none font-mono"
                    />
                  </div>

                  {/* Screenshot Upload Receipt */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-[11px] text-neutral-300 flex items-center gap-1 font-medium">
                        <Upload className="w-3 h-3 text-amber-400" />
                        <span>Payment Screenshot Receipt</span>
                      </label>
                      {screenshotUrl && (
                        <button
                          type="button"
                          onClick={() => {
                            setScreenshotUrl(null);
                            setScreenshotFileName('');
                          }}
                          className="text-[10px] text-red-400 hover:text-red-300 cursor-pointer"
                        >
                          Remove
                        </button>
                      )}
                    </div>

                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileUpload}
                      accept="image/*"
                      className="hidden"
                    />

                    {screenshotUrl ? (
                      <div className="p-2 rounded-lg border border-neutral-800 bg-neutral-900 flex items-center gap-2">
                        <div className="w-10 h-10 rounded bg-neutral-950 overflow-hidden border border-neutral-700 shrink-0">
                          <img
                            src={screenshotUrl}
                            alt="Receipt"
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <span className="text-[11px] text-emerald-400 font-bold block truncate">
                            Receipt Attached
                          </span>
                          <span className="text-[10px] text-neutral-400 truncate block">
                            {screenshotFileName || 'screenshot.png'}
                          </span>
                        </div>
                      </div>
                    ) : (
                      <div
                        onClick={() => fileInputRef.current?.click()}
                        className="border border-dashed border-neutral-800 hover:border-amber-500/50 rounded-lg p-2.5 flex items-center justify-center gap-2 cursor-pointer bg-neutral-900/40 hover:bg-neutral-900 transition-colors text-center"
                      >
                        <ImageIcon className="w-4 h-4 text-neutral-500" />
                        <span className="text-[11px] text-neutral-300">
                          Upload EasyPaisa receipt screenshot (optional)
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Promo Code & Voucher Engine (Controllable via Admin Settings) */}
            {settings.showPromoCodeAtCheckout !== false && (
              <div className="p-3 rounded-xl bg-neutral-950 border border-neutral-800 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-300 flex items-center gap-1.5">
                    <Tag className="w-3.5 h-3.5 text-amber-400" />
                    <span>Promo Code / Voucher</span>
                  </span>
                  {appliedPromo && (
                    <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                      APPLIED: {appliedPromo.code}
                    </span>
                  )}
                </div>

                {/* Promo Input Box */}
                {!appliedPromo ? (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <div className="relative flex-1">
                        <input
                          type="text"
                          placeholder="Enter code (e.g. BITEGO, NIGHTOWL, FLASH15)"
                          value={promoCodeInput}
                          onChange={(e) => {
                            setPromoCodeInput(e.target.value.toUpperCase());
                            setPromoError(null);
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              handleApplyPromo();
                            }
                          }}
                          className="w-full bg-neutral-900 border border-neutral-800 focus:border-amber-500 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-neutral-500 font-mono tracking-wider uppercase focus:outline-none"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => handleApplyPromo()}
                        className="px-3.5 py-1.5 bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold text-xs rounded-lg transition-colors cursor-pointer active:scale-95 shadow-sm"
                      >
                        Apply
                      </button>
                    </div>

                    {/* Error Alert */}
                    {promoError && (
                      <div className="p-2 rounded-lg bg-red-950/60 border border-red-500/30 text-red-200 text-[11px] flex items-start gap-1.5 animate-in fade-in">
                        <AlertCircle className="w-3.5 h-3.5 text-red-400 shrink-0 mt-0.5" />
                        <span className="leading-snug">{promoError}</span>
                      </div>
                    )}

                    {/* Active Store Promos Quick Tap */}
                    {activePromosList.length > 0 && (
                      <div className="space-y-1 pt-1">
                        <span className="text-[10px] text-neutral-400 block font-medium">
                          Available Vouchers (Tap to apply):
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {activePromosList.slice(0, 4).map((p) => (
                            <button
                              key={p.id}
                              type="button"
                              onClick={() => handleApplyPromo(p.code)}
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-neutral-900 hover:bg-neutral-850 border border-neutral-800 hover:border-amber-500/40 text-[10px] font-mono text-neutral-300 transition-colors cursor-pointer"
                              title={p.description}
                            >
                              <span className="font-bold text-amber-400">{p.code}</span>
                              <span className="text-neutral-500">·</span>
                              <span className="text-neutral-400">
                                {p.discountType === 'fixed' ? `Rs. ${p.discountValue} OFF` : `${p.discountValue}% OFF`}
                              </span>
                              {p.timeWindowEnabled && (
                                <Moon className="w-2.5 h-2.5 text-indigo-400" />
                              )}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  /* Applied Banner */
                  <div className="p-2.5 rounded-lg bg-emerald-950/40 border border-emerald-500/40 flex items-center justify-between gap-2 animate-in fade-in">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                        <Check className="w-4 h-4 stroke-[3]" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-bold text-emerald-300 font-mono">
                            {appliedPromo.code}
                          </span>
                          <span className="text-[10px] font-semibold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.2 rounded border border-emerald-500/20">
                            -Rs. {promoDiscount.toLocaleString()}
                          </span>
                        </div>
                        <p className="text-[10px] text-neutral-400 truncate">
                          {appliedPromo.title || appliedPromo.description}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={handleRemovePromo}
                      className="text-[11px] text-red-400 hover:text-red-300 font-medium px-2 py-1 rounded bg-neutral-900 border border-neutral-800 hover:border-red-500/40 cursor-pointer shrink-0"
                    >
                      Remove
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Compact Pricing Breakdown */}
            <div className="p-2.5 rounded-xl bg-neutral-950 border border-neutral-800 space-y-1 text-[11px]">
              <div className="flex justify-between text-neutral-400">
                <span>Items Subtotal ({items.length} items)</span>
                <span className="font-mono text-white">Rs. {subtotal.toLocaleString()}</span>
              </div>
              {promoDiscount > 0 && (
                <div className="flex justify-between text-emerald-400 font-semibold animate-in fade-in">
                  <span className="flex items-center gap-1">
                    <Tag className="w-3 h-3 text-emerald-400" />
                    <span>Promo Discount ({appliedPromo?.code})</span>
                  </span>
                  <span className="font-mono font-bold">- Rs. {promoDiscount.toLocaleString()}</span>
                </div>
              )}
              <div className="flex justify-between text-neutral-400">
                <span>Delivery Charges</span>
                <span className="font-mono">
                  {deliveryFee === 0 ? (
                    <span className="text-emerald-400 font-bold">FREE</span>
                  ) : (
                    <span className="text-white">Rs. {deliveryFee.toLocaleString()}</span>
                  )}
                </span>
              </div>
              <div className="flex justify-between text-xs font-bold text-white pt-1 border-t border-neutral-850">
                <span>Total Payable</span>
                <div className="flex items-baseline gap-1.5">
                  {promoDiscount > 0 && (
                    <span className="line-through text-neutral-500 text-[11px] font-mono">
                      Rs. {(subtotal + deliveryFee).toLocaleString()}
                    </span>
                  )}
                  <span className="font-mono text-amber-400 font-black text-sm">
                    Rs. {total.toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Sticky / Compact Modal Footer CTA */}
          <div className="px-4 py-2.5 bg-neutral-950 border-t border-neutral-800 shrink-0">
            {openStatus.isOpen ? (
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-2.5 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-neutral-950 font-bold rounded-xl text-xs sm:text-sm shadow-md shadow-amber-500/20 active:scale-98 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                {isSubmitting ? (
                  <span>Placing Order...</span>
                ) : (
                  <span>Confirm &amp; Place Order (Rs. {total.toLocaleString()})</span>
                )}
              </button>
            ) : (
              <button
                type="button"
                disabled
                className="w-full py-2.5 bg-neutral-900 border border-neutral-800 text-neutral-400 font-bold rounded-xl text-xs sm:text-sm cursor-not-allowed opacity-80 flex items-center justify-center gap-1.5"
                title={openStatus.reason}
              >
                <span>Store Closed ({openStatus.nextOpenText ? `Reopens ${openStatus.nextOpenText}` : 'Outside Work Hours'})</span>
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};
