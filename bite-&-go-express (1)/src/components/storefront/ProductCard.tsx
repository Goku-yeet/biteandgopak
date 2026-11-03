import React, { useState } from 'react';
import { MenuItem } from '../../types';
import { Plus, Flame, Sparkles, Utensils } from 'lucide-react';

interface ProductCardProps {
  item: MenuItem;
  onOpenCustomizer: (item: MenuItem) => void;
}

export const ProductCard: React.FC<ProductCardProps> = ({ item, onOpenCustomizer }) => {
  const [imgError, setImgError] = useState(false);

  return (
    <div
      onClick={() => onOpenCustomizer(item)}
      className="group relative flex flex-col bg-neutral-900/90 rounded-2xl border border-neutral-800 hover:border-neutral-700 overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 cursor-pointer"
    >
      {/* Product Image Container */}
      <div className="relative aspect-[16/10] sm:aspect-[4/3] w-full bg-neutral-950 overflow-hidden">
        {!imgError && item.image ? (
          <img
            src={item.image}
            alt={item.name}
            referrerPolicy="no-referrer"
            onError={() => setImgError(true)}
            className={`w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ${
              !item.isAvailable ? 'grayscale opacity-50' : ''
            }`}
          />
        ) : (
          /* Zero-Broken-Image Policy Fallback Container */
          <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-neutral-900 to-neutral-950 p-4 sm:p-6 text-center">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500 mb-1.5 sm:mb-2">
              <Utensils className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <span className="text-xs font-semibold text-neutral-400">{item.name}</span>
          </div>
        )}

        {/* Gradient overlay for contrast */}
        <div className="absolute inset-0 bg-gradient-to-t from-neutral-950/80 via-transparent to-transparent pointer-events-none" />

        {/* Quiet top kicker / badge (Max 1 subtle tag) */}
        <div className="absolute top-2 left-2 sm:top-3 sm:left-3 flex items-center gap-2">
          {item.isBestseller && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 sm:px-2.5 sm:py-1 text-[10px] sm:text-[11px] font-bold text-amber-400 bg-neutral-950/90 backdrop-blur-md rounded-md border border-amber-500/30">
              <Sparkles className="w-3 h-3 text-amber-400" />
              Bestseller
            </span>
          )}
          {item.isSpicy && !item.isBestseller && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 sm:px-2.5 sm:py-1 text-[10px] sm:text-[11px] font-bold text-red-400 bg-neutral-950/90 backdrop-blur-md rounded-md border border-red-500/30">
              <Flame className="w-3 h-3 text-red-400" />
              Hot Spicy
            </span>
          )}
        </div>

        {/* Out of Stock Overlay */}
        {!item.isAvailable && (
          <div className="absolute inset-0 bg-neutral-950/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
            <span className="px-2.5 py-0.5 sm:px-3 sm:py-1 bg-red-950/80 border border-red-800 text-red-300 text-[11px] sm:text-xs font-semibold rounded-md uppercase tracking-wider">
              Sold Out for Tonight
            </span>
          </div>
        )}
      </div>

      {/* Content Details */}
      <div className="flex flex-col flex-1 p-2.5 sm:p-5 justify-between">
        <div>
          {/* Metadata: Calories */}
          {item.calories && (
            <div className="flex items-center gap-1.5 text-[10px] sm:text-xs text-neutral-500 mb-0.5 sm:mb-1 font-mono">
              <span className="truncate">🔥 {item.calories}</span>
            </div>
          )}

          <h3 className="text-xs sm:text-base font-bold text-white group-hover:text-amber-400 transition-colors line-clamp-1">
            {item.name}
          </h3>

          <p className="mt-0.5 sm:mt-1 text-[10px] sm:text-xs text-neutral-400 line-clamp-2 leading-relaxed">
            {item.description}
          </p>
        </div>

        {/* Pricing & Customization Action */}
        <div className="mt-2 sm:mt-5 pt-2 sm:pt-3 border-t border-neutral-800/80 flex items-center justify-between gap-1 sm:gap-3">
          <div className="min-w-0">
            <span className="text-[8.5px] sm:text-[10px] text-neutral-500 block uppercase tracking-wider">Price</span>
            <span className="text-xs sm:text-base font-mono font-bold text-white tabular-nums truncate block">
              Rs. {item.price.toLocaleString()}
            </span>
          </div>

          <button
            onClick={() => onOpenCustomizer(item)}
            disabled={!item.isAvailable}
            className={`flex items-center gap-1 px-2 py-1 sm:px-3.5 sm:py-2 rounded-lg text-[10px] sm:text-xs font-bold transition-all whitespace-nowrap active:scale-95 cursor-pointer shrink-0 ${
              item.isAvailable
                ? 'bg-amber-500 hover:bg-amber-400 text-neutral-950 shadow-md shadow-amber-500/10'
                : 'bg-neutral-800 text-neutral-500 cursor-not-allowed'
            }`}
          >
            <Plus className="w-3 h-3 stroke-[3]" />
            <span>{item.variants && item.variants.length > 0 ? 'Customize' : 'Add'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
