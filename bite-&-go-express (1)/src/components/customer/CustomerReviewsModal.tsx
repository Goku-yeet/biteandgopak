import React, { useState, useEffect } from 'react';
import { CustomerReview, MenuItem, Order, CustomerUser } from '../../types';
import { StorageService } from '../../utils/storage';
import {
  Star,
  X,
  MessageSquare,
  ThumbsUp,
  CheckCircle2,
  Sparkles,
  Send,
  Filter,
  Flame,
  Award,
  ShieldCheck,
} from 'lucide-react';

interface CustomerReviewsModalProps {
  isOpen: boolean;
  onClose: () => void;
  menuItems: MenuItem[];
  orders?: Order[];
  activeCustomer?: CustomerUser | null;
  activeOrderId?: string | null;
}

export const CustomerReviewsModal: React.FC<CustomerReviewsModalProps> = ({
  isOpen,
  onClose,
  menuItems,
  orders = [],
  activeCustomer,
  activeOrderId,
}) => {
  const [reviews, setReviews] = useState<CustomerReview[]>(() => StorageService.getReviews());
  const [selectedFilter, setSelectedFilter] = useState<'all' | '5' | 'smash' | 'chicken' | 'fries'>('all');
  const [isWritingReview, setIsWritingReview] = useState(false);

  // Auto-detect verified order from session or customer profile
  const initialVerifiedOrder = React.useMemo(() => {
    if (activeOrderId) {
      const match = orders.find((o) => o.id === activeOrderId);
      if (match) return match;
    }
    if (activeCustomer) {
      const phoneClean = activeCustomer.phone.replace(/[^0-9]/g, '');
      const custOrder = orders.find((o) => {
        const orderPhone = (o.customerPhone || '').replace(/[^0-9]/g, '');
        return (
          (phoneClean && orderPhone && (phoneClean === orderPhone || orderPhone.endsWith(phoneClean))) ||
          (activeCustomer.email && o.customerEmail?.toLowerCase() === activeCustomer.email.toLowerCase())
        );
      });
      if (custOrder) return custOrder;
    }
    return null;
  }, [orders, activeOrderId, activeCustomer]);

  const [verifiedOrder, setVerifiedOrder] = useState<Order | null>(initialVerifiedOrder);
  const [orderLookupInput, setOrderLookupInput] = useState('');
  const [lookupError, setLookupError] = useState('');

  // Form state
  const [name, setName] = useState(
    initialVerifiedOrder?.customerName || activeCustomer?.name || ''
  );
  const [city, setCity] = useState(
    initialVerifiedOrder?.area || 'Karachi'
  );
  const [rating, setRating] = useState(5);
  const [selectedDish, setSelectedDish] = useState(
    initialVerifiedOrder?.items[0]?.name || menuItems[0]?.name || 'Double Smash Beef Burger'
  );
  const [comment, setComment] = useState('');
  const [submittedSuccess, setSubmittedSuccess] = useState(false);

  // When initialVerifiedOrder changes, update verifiedOrder and open review form
  useEffect(() => {
    if (initialVerifiedOrder) {
      setVerifiedOrder(initialVerifiedOrder);
      if (!name) setName(initialVerifiedOrder.customerName || '');
      if (initialVerifiedOrder.items?.[0]?.name) {
        setSelectedDish(initialVerifiedOrder.items[0].name);
      }
      setIsWritingReview(true);
    }
  }, [initialVerifiedOrder, activeOrderId]);

  if (!isOpen) return null;

  const handleVerifyOrderLookup = (e: React.FormEvent) => {
    e.preventDefault();
    setLookupError('');
    const term = orderLookupInput.trim().toUpperCase().replace('#', '');
    if (!term) return;

    const cleanInputDigits = orderLookupInput.replace(/[^0-9]/g, '');
    const found = orders.find((o) => {
      const oIdClean = o.id.replace('#', '').toUpperCase();
      const oPhoneClean = (o.customerPhone || '').replace(/[^0-9]/g, '');
      return (
        oIdClean === term ||
        o.id.toUpperCase() === orderLookupInput.trim().toUpperCase() ||
        (cleanInputDigits.length >= 7 && oPhoneClean.includes(cleanInputDigits))
      );
    });

    if (found) {
      setVerifiedOrder(found);
      setName(found.customerName || name);
      if (found.area) setCity(found.area);
      if (found.items && found.items.length > 0) {
        setSelectedDish(found.items[0].name);
      }
      setOrderLookupInput('');
    } else {
      setLookupError('No order found matching that Order ID or phone number. Only verified diners can rate.');
    }
  };

  const handleLike = (id: string) => {
    StorageService.likeReview(id);
    setReviews(StorageService.getReviews());
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLookupError('');
    if (!verifiedOrder) {
      setLookupError('Order verification is required. Only customers who ordered can rate food.');
      return;
    }
    if (!name.trim() || !comment.trim()) return;

    try {
      StorageService.addReview({
        customerName: name.trim(),
        customerCity: city.trim() || 'Karachi',
        rating,
        dishName: selectedDish,
        comment: comment.trim(),
        verified: true,
        orderId: verifiedOrder.id,
      });

      setReviews(StorageService.getReviews());
      setSubmittedSuccess(true);
      setTimeout(() => {
        setSubmittedSuccess(false);
        setIsWritingReview(false);
        setName('');
        setComment('');
      }, 2000);
    } catch (err: any) {
      setLookupError(err.message || 'Security error: You may only rate items in your order.');
    }
  };

  const filteredReviews = reviews.filter((r) => {
    if (selectedFilter === '5') return r.rating === 5;
    if (selectedFilter === 'smash') return r.dishName?.toLowerCase().includes('smash');
    if (selectedFilter === 'chicken') return r.dishName?.toLowerCase().includes('chicken');
    if (selectedFilter === 'fries') return r.dishName?.toLowerCase().includes('fries');
    return true;
  });

  const averageRating = (
    reviews.reduce((sum, r) => sum + r.rating, 0) / (reviews.length || 1)
  ).toFixed(1);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-neutral-950/85 backdrop-blur-md animate-in fade-in">
      <div className="relative w-full max-w-2xl bg-neutral-900 border border-neutral-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 sm:p-6 border-b border-neutral-800 bg-neutral-950/80 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center shrink-0">
              <Star className="w-5 h-5 fill-amber-400 text-amber-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-heading font-black text-white">
                  Customer Reviews &amp; Ratings
                </h3>
                <span className="text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-full font-bold">
                  Verified Foodies
                </span>
              </div>
              <p className="text-xs text-neutral-400 mt-0.5">
                Authentic feedback from real Karachi smash burger &amp; shake lovers
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-neutral-400 hover:text-white rounded-xl transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Score Overview & Actions Banner */}
        <div className="p-4 bg-neutral-950/50 border-b border-neutral-800/80 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex items-baseline gap-1.5">
              <span className="text-3xl font-heading font-black text-amber-400">{averageRating}</span>
              <span className="text-xs text-neutral-400">/ 5.0</span>
            </div>
            <div className="space-y-0.5">
              <div className="flex text-amber-400">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                ))}
              </div>
              <p className="text-[11px] text-neutral-400">Based on {reviews.length}+ verified reviews</p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setIsWritingReview(!isWritingReview)}
            className="px-4 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-neutral-950 font-bold text-xs rounded-xl shadow-md flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>{isWritingReview ? 'View All Reviews' : 'Write a Review'}</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          {isWritingReview ? (
            /* ================= SUBMIT REVIEW FORM ================= */
            <form onSubmit={handleSubmit} className="space-y-4 max-w-lg mx-auto p-4 bg-neutral-950 rounded-2xl border border-neutral-800 animate-in fade-in">
              <div className="text-center space-y-1 pb-2 border-b border-neutral-850">
                <h4 className="text-sm font-bold text-white">Share Your Taste Experience</h4>
                <p className="text-xs text-neutral-400">How was the crust, cheese, and delivery speed?</p>
              </div>

              {submittedSuccess ? (
                <div className="py-8 text-center space-y-2">
                  <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto animate-bounce" />
                  <h4 className="text-base font-bold text-white">Review Submitted!</h4>
                  <p className="text-xs text-neutral-400">Thank you for rating your food. Store manager was notified of your feedback.</p>
                </div>
              ) : !verifiedOrder ? (
                /* Order Verification Required Card */
                <div className="py-6 px-4 text-center space-y-4 bg-neutral-900/60 rounded-2xl border border-amber-500/25">
                  <div className="w-12 h-12 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-400 flex items-center justify-center mx-auto">
                    <ShieldCheck className="w-6 h-6" />
                  </div>
                  <div className="space-y-1">
                    <h4 className="text-sm font-bold text-white">Verified Diners Only</h4>
                    <p className="text-xs text-neutral-300 max-w-sm mx-auto leading-relaxed">
                      To keep all reviews 100% genuine, only customers who have placed an order with Bite &amp; Go can submit ratings.
                    </p>
                  </div>

                  <div className="space-y-2 max-w-sm mx-auto">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Enter Order ID (e.g. #BG-1001) or Phone"
                        value={orderLookupInput}
                        onChange={(e) => setOrderLookupInput(e.target.value)}
                        className="flex-1 bg-neutral-950 border border-neutral-750 rounded-xl px-3 py-2 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-amber-500 font-mono"
                      />
                      <button
                        type="button"
                        onClick={handleVerifyOrderLookup}
                        className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold text-xs rounded-xl shadow-md transition-all active:scale-95 cursor-pointer"
                      >
                        Verify
                      </button>
                    </div>
                    {lookupError && (
                      <p className="text-[11px] text-red-400 font-medium text-left">
                        {lookupError}
                      </p>
                    )}
                  </div>

                  <div className="pt-2 border-t border-neutral-800 text-[11px] text-neutral-400 flex items-center justify-center gap-1.5">
                    <span>Don't have an order yet?</span>
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                      }}
                      className="text-amber-400 font-bold hover:underline cursor-pointer"
                    >
                      Browse Menu &amp; Order
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  {/* Verified Order Badge */}
                  <div className="p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-between text-xs text-emerald-300">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span>
                        Verified Order <strong>#{verifiedOrder.id}</strong> ({verifiedOrder.customerName || name})
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setVerifiedOrder(null)}
                      className="text-[10px] text-neutral-400 hover:text-white underline cursor-pointer"
                    >
                      Change
                    </button>
                  </div>

                  {/* Rating Selector */}
                  <div className="space-y-1.5 text-center">
                    <label className="text-xs font-bold text-neutral-300 block">Your Rating *</label>
                    <div className="flex items-center justify-center gap-2">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          type="button"
                          onClick={() => setRating(star)}
                          className="p-1 hover:scale-125 transition-transform cursor-pointer"
                        >
                          <Star
                            className={`w-7 h-7 ${
                              star <= rating
                                ? 'fill-amber-400 text-amber-400'
                                : 'text-neutral-600'
                            }`}
                          />
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-bold text-neutral-300 block mb-1">Your Name *</label>
                      <input
                        type="text"
                        placeholder="e.g. Daniyal Khan"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-3 py-2 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-amber-500"
                        required
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-neutral-300 block mb-1">Area / Karachi Zone</label>
                      <input
                        type="text"
                        placeholder="e.g. North Nazimabad"
                        value={city}
                        onChange={(e) => setCity(e.target.value)}
                        className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-3 py-2 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-amber-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-neutral-300 block mb-1">
                      Ordered Dish * <span className="text-[10px] text-amber-400 font-normal">(Only items you ordered)</span>
                    </label>
                    <select
                      value={selectedDish}
                      onChange={(e) => setSelectedDish(e.target.value)}
                      className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                      required
                    >
                      {verifiedOrder.items && verifiedOrder.items.length > 0 ? (
                        verifiedOrder.items.map((item: any, idx: number) => {
                          const alreadyRated = StorageService.hasRatedOrderItem(verifiedOrder.id, item.name);
                          return (
                            <option key={`${item.id || idx}`} value={item.name}>
                              {item.name} ({item.quantity}x) {alreadyRated ? '⭐ (Already Rated)' : ''}
                            </option>
                          );
                        })
                      ) : (
                        <option value="">No items found in this order</option>
                      )}
                    </select>
                    <p className="text-[10px] text-neutral-400 mt-1">
                      🔒 Verified Diner Policy: Only dishes included in order #{verifiedOrder.id} can be rated.
                    </p>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-neutral-300 block mb-1">Your Review *</label>
                    <textarea
                      rows={3}
                      placeholder="Tell fellow foodies about the crust, seasoning, bun softness, delivery time..."
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                      className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-3 py-2 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-amber-500 resize-none"
                      required
                    />
                  </div>

                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setIsWritingReview(false)}
                      className="px-4 py-2 text-xs text-neutral-400 hover:text-white"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={!name.trim() || !comment.trim()}
                      className="px-5 py-2 bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-neutral-950 font-bold text-xs rounded-xl shadow-md flex items-center gap-1.5 transition-all cursor-pointer"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>Post Review</span>
                    </button>
                  </div>
                </>
              )}
            </form>
          ) : (
            /* ================= REVIEWS LIST ================= */
            <>
              {/* Filter Pills */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar text-xs">
                <button
                  type="button"
                  onClick={() => setSelectedFilter('all')}
                  className={`px-3 py-1.5 rounded-xl font-bold transition-colors whitespace-nowrap cursor-pointer ${
                    selectedFilter === 'all'
                      ? 'bg-amber-500 text-neutral-950'
                      : 'bg-neutral-950 text-neutral-400 hover:text-white border border-neutral-800'
                  }`}
                >
                  All ({reviews.length})
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedFilter('5')}
                  className={`px-3 py-1.5 rounded-xl font-bold transition-colors whitespace-nowrap flex items-center gap-1 cursor-pointer ${
                    selectedFilter === '5'
                      ? 'bg-amber-500 text-neutral-950'
                      : 'bg-neutral-950 text-neutral-400 hover:text-white border border-neutral-800'
                  }`}
                >
                  <Star className="w-3 h-3 fill-amber-400" />
                  <span>5-Star Only</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedFilter('smash')}
                  className={`px-3 py-1.5 rounded-xl font-bold transition-colors whitespace-nowrap cursor-pointer ${
                    selectedFilter === 'smash'
                      ? 'bg-amber-500 text-neutral-950'
                      : 'bg-neutral-950 text-neutral-400 hover:text-white border border-neutral-800'
                  }`}
                >
                  Smash Burgers
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedFilter('fries')}
                  className={`px-3 py-1.5 rounded-xl font-bold transition-colors whitespace-nowrap cursor-pointer ${
                    selectedFilter === 'fries'
                      ? 'bg-amber-500 text-neutral-950'
                      : 'bg-neutral-950 text-neutral-400 hover:text-white border border-neutral-800'
                  }`}
                >
                  Loaded Fries
                </button>
              </div>

              {/* Reviews Cards List */}
              <div className="space-y-3">
                {filteredReviews.map((rev) => (
                  <div
                    key={rev.id}
                    className="p-4 rounded-2xl bg-neutral-950/80 border border-neutral-800/90 space-y-2.5 transition-all hover:border-neutral-700"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-amber-500/20 text-amber-400 font-bold flex items-center justify-center text-xs">
                          {rev.customerName.charAt(0)}
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <h4 className="text-xs font-bold text-white">{rev.customerName}</h4>
                            {rev.verified && (
                              <span className="text-[10px] text-emerald-400 flex items-center gap-0.5" title="Verified Customer">
                                <CheckCircle2 className="w-3 h-3" />
                                <span>Verified</span>
                              </span>
                            )}
                          </div>
                          <p className="text-[10px] text-neutral-400">
                            {rev.customerCity || 'Karachi'} · {new Date(rev.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-lg text-amber-400">
                        <Star className="w-3 h-3 fill-amber-400" />
                        <span className="text-xs font-bold font-mono">{rev.rating}.0</span>
                      </div>
                    </div>

                    {rev.dishName && (
                      <div className="inline-block px-2.5 py-0.5 rounded-md bg-neutral-900 border border-neutral-800 text-[10px] text-amber-300 font-medium">
                        Ordered: <strong>{rev.dishName}</strong>
                      </div>
                    )}

                    <p className="text-xs text-neutral-200 leading-relaxed">
                      "{rev.comment}"
                    </p>

                    {rev.managerReply && (
                      <div className="p-2.5 rounded-xl bg-neutral-900 border border-neutral-800 text-[11px] text-neutral-300 space-y-0.5">
                        <div className="flex items-center gap-1 text-amber-400 font-bold text-[10px]">
                          <span>👨‍🍳 Response from Bite &amp; Go Management:</span>
                        </div>
                        <p className="text-neutral-400 italic">"{rev.managerReply}"</p>
                      </div>
                    )}

                    <div className="flex items-center justify-between pt-1 border-t border-neutral-900 text-[11px] text-neutral-400">
                      <span>Was this helpful?</span>
                      <button
                        type="button"
                        onClick={() => handleLike(rev.id)}
                        className="flex items-center gap-1 hover:text-amber-400 transition-colors cursor-pointer"
                      >
                        <ThumbsUp className="w-3 h-3" />
                        <span>{rev.likesCount || 0}</span>
                      </button>
                    </div>
                  </div>
                ))}

                {filteredReviews.length === 0 && (
                  <div className="py-12 text-center text-neutral-500 space-y-2">
                    <MessageSquare className="w-10 h-10 mx-auto opacity-30 text-amber-400" />
                    <p className="text-sm font-bold text-white">No reviews found in this filter</p>
                    <p className="text-xs text-neutral-400">Be the first to leave a review!</p>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
