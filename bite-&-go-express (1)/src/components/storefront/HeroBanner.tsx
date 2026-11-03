import React, { useState, useEffect, useRef } from 'react';
import { Sparkles, Clock, ShieldCheck, Flame, ArrowRight, Award, ChevronLeft, ChevronRight, Pause, Play } from 'lucide-react';
import { CustomerWidgetsConfig, ChefSignatureItem } from '../../types';
import { ThreeWebsiteBackground3D } from './ThreeWebsiteBackground3D';

interface HeroBannerProps {
  onExploreMenu: () => void;
  onOpenDeals: () => void;
  config?: CustomerWidgetsConfig;
}

const DEFAULT_SIGNATURE_SLIDES: ChefSignatureItem[] = [
  {
    id: 'sig-1',
    badge: "CHEF'S SIGNATURE #1",
    title: 'Signature Double Smash Melt',
    subtitle: 'Two lacy-crust beef patties · aged Wisconsin cheddar · sweet caramelized onions · secret relish',
    price: 'Rs. 990',
    imageUrl: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=1000&q=80',
    tagline: 'Customer Favorite',
    chefName: "Chef Hassan's Secret Relish",
    menuItemId: 'item-smash-1',
  },
  {
    id: 'sig-2',
    badge: 'KARACHI CRISPY ZINGER ⭐',
    title: 'Karachi Crispy Zinger Burger',
    subtitle: '24h spiced whole chicken fillet · jagged ultra-crunch batter · zinger spicy mayo · sesame bun',
    price: 'Rs. 750',
    imageUrl: 'https://images.unsplash.com/photo-1625813506062-0aeb1d7a094b?auto=format&fit=crop&w=1000&q=80',
    tagline: 'Crispy Sensation',
    chefName: 'Signature Fried Chicken',
    menuItemId: 'item-zinger-1',
    isSpicy: true,
  },
  {
    id: 'sig-3',
    badge: 'NASHVILLE EXTRA FIRE 🔥',
    title: 'Nashville Fire Crunch Burger',
    subtitle: 'Cayenne chili oil dipped crispy fillet · creamy purple cabbage slaw · house dill pickles',
    price: 'Rs. 850',
    imageUrl: 'https://images.unsplash.com/photo-1625813506062-0aeb1d7a094b?auto=format&fit=crop&w=1000&q=80',
    tagline: 'Fiery Masterpiece',
    chefName: 'Nashville Spiced Oil',
    menuItemId: 'item-smash-2',
    isSpicy: true,
  },
  {
    id: 'sig-4',
    badge: 'TORTILLA WRAP SPECIAL 🌯',
    title: 'Spicy Zinger Tortilla Wrap',
    subtitle: 'Warm toasted flour tortilla · crispy spiced tenders · iceberg lettuce · southwest chipotle',
    price: 'Rs. 590',
    imageUrl: 'https://images.unsplash.com/photo-1626700051175-6818013e1d4f?auto=format&fit=crop&w=1000&q=80',
    tagline: 'Quick Grab & Go',
    chefName: 'Freshly Rolled',
    menuItemId: 'item-wraps-1',
    isSpicy: true,
  },
  {
    id: 'sig-5',
    badge: 'HERITAGE SPICED BROAST 🍗',
    title: 'Bite & Go Golden Broast & Roll',
    subtitle: 'Crispy pressure-fried quarter chicken · golden crunch skin · creamy garlic dip · dinner roll',
    price: 'Rs. 950',
    imageUrl: 'https://images.unsplash.com/photo-1626082927389-6cd097cdc6ec?auto=format&fit=crop&w=1000&q=80',
    tagline: 'Karachi Traditional',
    chefName: 'Pressure Fried Crisp',
    menuItemId: 'item-crispy-1',
    isSpicy: true,
  },
  {
    id: 'sig-6',
    badge: 'GOURMET SWEET SIP 🍨',
    title: 'Lotus Biscoff Thick Shake',
    subtitle: 'Artisanal Belgian Biscoff spread · velvety soft serve base · crushed spiced biscuit crumble',
    price: 'Rs. 550',
    imageUrl: 'https://images.unsplash.com/photo-1572490122747-3968b75cc699?auto=format&fit=crop&w=1000&q=80',
    tagline: 'Sweet Craving',
    chefName: 'Ice Cold Artisanal',
    menuItemId: 'item-shakes-1',
  },
];

export const HeroBanner: React.FC<HeroBannerProps> = ({ onExploreMenu, onOpenDeals, config }) => {
  const showShowcase = config?.showChefSignatureShowcase !== false;

  // Build slides with custom override for item 1 if provided in config
  const slides: ChefSignatureItem[] = React.useMemo(() => {
    if (config?.chefSignatureSlides && config.chefSignatureSlides.length > 0) {
      return config.chefSignatureSlides;
    }
    const list = [...DEFAULT_SIGNATURE_SLIDES];
    if (config?.chefSignatureDishTitle) {
      list[0] = {
        ...list[0],
        title: config.chefSignatureDishTitle,
        subtitle: config.chefSignatureDishSubtitle || list[0].subtitle,
        price: config.chefSignaturePrice || list[0].price,
        imageUrl: config.chefSignatureImageUrl || list[0].imageUrl,
        badge: config.chefSignatureBadge || list[0].badge,
        tagline: config.chefSignatureTagline || list[0].tagline,
        chefName: config.chefSignatureChefName || list[0].chefName,
      };
    }
    return list;
  }, [config]);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const timerRef = useRef<any>(null);

  const totalSlides = slides.length;
  const currentSlide = slides[currentIndex] || slides[0];

  const handleNext = () => {
    setCurrentIndex((prev) => (prev + 1) % totalSlides);
  };

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev - 1 + totalSlides) % totalSlides);
  };

  // Auto-play rotation every 5 seconds, pauses on hover
  useEffect(() => {
    if (isPaused || totalSlides <= 1) return;
    timerRef.current = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % totalSlides);
    }, 4500);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isPaused, totalSlides]);

  const headline = config?.heroHeadline || 'Craving Real Smash Burgers & Loaded Crunch?';
  const subheadline = config?.heroSubheadline || 'Crisp lacy beef edges, melted cheddar, Karachi crispy zinger burgers, and ice-cold Lotus Biscoff thick shakes delivered hot right to your doorstep in 30 minutes.';
  const kicker = config?.heroKickerText || 'Freshly Smashed & Fried on Order';

  // Strictly remove Lahore and sanitize delivery text for Karachi exclusivity
  const sanitizeDeliveryCities = (text?: string): string => {
    if (!text) return 'Karachi Express Hot Delivery';
    const cleaned = text
      .replace(/&?\s*Lahore\s*(&?)/gi, '')
      .replace(/\s+/g, ' ')
      .trim();
    if (!cleaned || cleaned.toLowerCase() === 'karachi' || cleaned.toLowerCase() === 'hot delivery') {
      return 'Karachi Express Hot Delivery';
    }
    return cleaned;
  };
  const deliveryCities = sanitizeDeliveryCities(config?.heroDeliveryCitiesText);
  const primaryBtn = config?.heroPrimaryButtonText || 'Order Now';
  const secondaryBtn = config?.heroSecondaryButtonText || 'Midnight & Duo Deals';

  const badge1Title =
    config?.heroBadge1Title === '25–35 Mins' || config?.heroBadge1Title === '25-35 Mins' || !config?.heroBadge1Title
      ? '35–50 Mins'
      : config?.heroBadge1Title;
  const badge1Sub = config?.heroBadge1Subtitle || 'Express Delivery';
  const badge2Title = config?.heroBadge2Title || 'EasyPaisa';
  const badge2Sub = config?.heroBadge2Subtitle || 'Instant Trx Verify';
  const badge3Title = config?.heroBadge3Title || '100% Fresh';
  const badge3Sub = config?.heroBadge3Subtitle || 'Halal & Never Frozen';

  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-neutral-900 via-neutral-950 to-neutral-950 border-b border-neutral-800/80 pt-3 pb-5 sm:pt-8 sm:pb-12">
      {/* 3D Ambient WebGL Background (Particles & Perspective Mesh) */}
      <ThreeWebsiteBackground3D />

      {/* Decorative ambient glow */}
      <div className="absolute top-0 right-1/4 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-10 w-80 h-80 bg-red-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-7xl mx-auto px-3.5 sm:px-6 lg:px-8 relative z-10">
        <div className={`grid grid-cols-1 ${showShowcase ? 'lg:grid-cols-12' : 'max-w-3xl'} gap-4 sm:gap-8 items-center`}>
          {/* Left Column: Text & Value proposition */}
          <div className={`${showShowcase ? 'lg:col-span-7' : 'w-full'} space-y-3 sm:space-y-6`}>
            {/* Natural kicker with dot separator */}
            <div className="flex items-center gap-2 text-[11px] sm:text-xs font-semibold text-amber-500 tracking-wide">
              <span className="flex items-center gap-1.5">
                <Flame className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
                {kicker}
              </span>
              <span aria-hidden="true" className="text-neutral-600">·</span>
              <span>{deliveryCities}</span>
            </div>

            <h1 className="text-2xl sm:text-4xl lg:text-5xl font-heading font-black tracking-tight text-white text-balance leading-tight">
              {headline}
            </h1>

            <p className="text-xs sm:text-base text-neutral-400 max-w-xl leading-relaxed line-clamp-2 sm:line-clamp-none">
              {subheadline}
            </p>

            {/* CTAs */}
            <div className="flex flex-wrap items-center gap-2 sm:gap-3 pt-1">
              <button
                onClick={onExploreMenu}
                className="flex items-center gap-2 bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold px-4 py-2 sm:px-6 sm:py-3 rounded-lg text-xs sm:text-sm shadow-lg shadow-amber-500/20 active:scale-98 transition-all cursor-pointer"
              >
                <span>{primaryBtn}</span>
                <ArrowRight className="w-3.5 h-3.5 sm:w-4 sm:h-4 stroke-[2.5]" />
              </button>

              <button
                onClick={onOpenDeals}
                className="flex items-center gap-2 bg-neutral-900 hover:bg-neutral-850 text-neutral-200 border border-neutral-700 font-semibold px-3.5 py-2 sm:px-5 sm:py-3 rounded-lg text-xs sm:text-sm transition-all cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-400" />
                <span>{secondaryBtn}</span>
              </button>
            </div>

            {/* Trust Proof Badges */}
            <div className="grid grid-cols-3 gap-2 sm:gap-4 pt-2 sm:pt-4 border-t border-neutral-800/80">
              <div className="flex items-center gap-2 sm:gap-2.5">
                <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-lg bg-neutral-900 border border-neutral-800 flex items-center justify-center text-amber-400 shrink-0">
                  <Clock className="w-3 h-3 sm:w-4 sm:h-4" />
                </div>
                <div>
                  <p className="text-[11px] sm:text-xs font-bold text-white">{badge1Title}</p>
                  <p className="text-[9.5px] sm:text-[11px] text-neutral-500">{badge1Sub}</p>
                </div>
              </div>

              <div className="flex items-center gap-2 sm:gap-2.5">
                <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-lg bg-neutral-900 border border-neutral-800 flex items-center justify-center text-emerald-400 shrink-0">
                  <ShieldCheck className="w-3 h-3 sm:w-4 sm:h-4" />
                </div>
                <div>
                  <p className="text-[11px] sm:text-xs font-bold text-white">{badge2Title}</p>
                  <p className="text-[9.5px] sm:text-[11px] text-neutral-500">{badge2Sub}</p>
                </div>
              </div>

              <div className="flex items-center gap-2 sm:gap-2.5">
                <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-lg bg-neutral-900 border border-neutral-800 flex items-center justify-center text-amber-400 shrink-0">
                  <Flame className="w-3 h-3 sm:w-4 sm:h-4" />
                </div>
                <div>
                  <p className="text-[11px] sm:text-xs font-bold text-white">{badge3Title}</p>
                  <p className="text-[9.5px] sm:text-[11px] text-neutral-500">{badge3Sub}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Multi-Item Chef's Signature Slider & Showcase */}
          {showShowcase && (
            <div className="lg:col-span-5">
              <div
                onMouseEnter={() => setIsPaused(true)}
                onMouseLeave={() => setIsPaused(false)}
                className="relative rounded-2xl overflow-hidden border border-neutral-800 bg-neutral-900 shadow-2xl group transition-all"
              >
                {/* Top Header Controls: Badge & Slide Index */}
                <div className="absolute top-2.5 left-2.5 right-2.5 z-20 flex items-center justify-between pointer-events-none">
                  <span className="px-2.5 py-1 rounded-full bg-neutral-950/80 backdrop-blur-md border border-amber-500/40 text-[10px] font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1 shadow-md">
                    <Award className="w-3 h-3 text-amber-400 shrink-0" />
                    <span>{currentSlide.badge || "Chef's Signature"}</span>
                  </span>

                  <span className="px-2 py-0.5 rounded-md bg-neutral-950/80 backdrop-blur-md border border-neutral-750 text-[10px] font-mono text-neutral-300 pointer-events-auto">
                    {currentIndex + 1} / {totalSlides}
                  </span>
                </div>

                {/* Main Viewport: Photo Slide */}
                <div
                  onClick={onExploreMenu}
                  className="h-48 sm:h-72 lg:aspect-[4/3] lg:h-auto w-full relative overflow-hidden bg-neutral-950 cursor-pointer"
                  title="Click to view & customize Chef's Signature dish"
                >
                  <img
                    key={currentSlide.id}
                    src={currentSlide.imageUrl}
                    alt={currentSlide.title}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-105 animate-in fade-in zoom-in-95"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-neutral-950 via-neutral-950/40 to-transparent" />

                  {/* Floating item callout */}
                  <div className="absolute bottom-2.5 left-2.5 right-2.5 sm:bottom-4 sm:left-4 sm:right-4 p-2.5 sm:p-4 rounded-xl bg-neutral-950/90 backdrop-blur-md border border-neutral-800 flex items-center justify-between shadow-lg">
                    <div className="min-w-0 pr-2">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <Flame className={`w-3 h-3 shrink-0 ${currentSlide.isSpicy ? 'text-red-400' : 'text-amber-400'}`} />
                        <span className="text-[9.5px] uppercase font-bold tracking-wider text-amber-400">
                          {currentSlide.chefName || "Chef's Choice"}
                        </span>
                      </div>
                      <h3 className="text-xs sm:text-base font-bold text-white truncate">
                        {currentSlide.title}
                      </h3>
                      <p className="text-[10px] sm:text-xs text-neutral-400 truncate">
                        {currentSlide.subtitle}
                      </p>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="text-[9px] text-neutral-400 block">{currentSlide.tagline || 'Starting at'}</span>
                      <span className="font-mono text-xs sm:text-lg font-black text-amber-400 tabular-nums">
                        {currentSlide.price}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Slider Controls Bar */}
                <div className="px-3 py-2 bg-neutral-950 border-t border-neutral-850 flex items-center justify-between text-xs">
                  {/* Prev / Next Chevrons */}
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handlePrev();
                      }}
                      className="p-1.5 rounded-lg bg-neutral-900 hover:bg-neutral-800 text-neutral-300 hover:text-white border border-neutral-800 transition-colors cursor-pointer"
                      title="Previous signature dish"
                      aria-label="Previous slide"
                    >
                      <ChevronLeft className="w-3.5 h-3.5" />
                    </button>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleNext();
                      }}
                      className="p-1.5 rounded-lg bg-neutral-900 hover:bg-neutral-800 text-neutral-300 hover:text-white border border-neutral-800 transition-colors cursor-pointer"
                      title="Next signature dish"
                      aria-label="Next slide"
                    >
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>

                    <span className="text-[11px] text-neutral-400 hidden xs:inline ml-1 font-medium">
                      Chef's Showcase ({totalSlides} Dishes)
                    </span>
                  </div>

                  {/* Dot Indicators */}
                  <div className="flex items-center gap-1.5">
                    {slides.map((slide, idx) => (
                      <button
                        key={slide.id}
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setCurrentIndex(idx);
                        }}
                        className={`h-1.5 rounded-full transition-all cursor-pointer ${
                          idx === currentIndex
                            ? 'w-5 bg-amber-400 shadow-sm shadow-amber-400/50'
                            : 'w-1.5 bg-neutral-700 hover:bg-neutral-500'
                        }`}
                        title={slide.title}
                        aria-label={`Jump to ${slide.title}`}
                      />
                    ))}
                  </div>

                  {/* 1-Click Order Link */}
                  <button
                    type="button"
                    onClick={onExploreMenu}
                    className="text-[11px] font-bold text-amber-400 hover:text-amber-300 flex items-center gap-1 cursor-pointer transition-colors"
                  >
                    <span>Order Now</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
};
