import React, { useState } from 'react';
import { ThreeBurgerVisualizer, ThreeDishPreset } from './ThreeBurgerVisualizer';
import { X, Sparkles, Flame, Award, ShoppingBag, ArrowRight } from 'lucide-react';
import { MenuItem } from '../../types';

interface ThreeVisualizerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddToCart?: (preset: ThreeDishPreset) => void;
  menuItems?: MenuItem[];
  onOpenCustomizer?: (item: MenuItem) => void;
}

export const ThreeVisualizerModal: React.FC<ThreeVisualizerModalProps> = ({
  isOpen,
  onClose,
  onAddToCart,
  menuItems = [],
  onOpenCustomizer,
}) => {
  const [currentPreset, setCurrentPreset] = useState<ThreeDishPreset>('smash_burger');

  if (!isOpen) return null;

  const getPresetDetails = (p: ThreeDishPreset) => {
    switch (p) {
      case 'smash_burger':
        return {
          title: 'Signature Double Smash Melt',
          price: 'Rs. 990',
          desc: 'Two 100% prime beef patties smashed wafer-thin on a 400°F griddle with charred lacy edges, doubled aged Wisconsin cheddar, grilled sweet onions, and secret relish.',
          calories: '740 kcal',
          prepTime: '12-15 mins',
          targetItemId: 'item-smash-1',
        };
      case 'crispy_zinger':
        return {
          title: 'Karachi Crispy Zinger Fillet',
          price: 'Rs. 750',
          desc: '24-hour buttermilk-marinated whole chicken breast fillet coated in jagged crispy flakes, fried to golden perfection with zinger pepper mayo on a butter-toasted bun.',
          calories: '680 kcal',
          prepTime: '10-12 mins',
          targetItemId: 'item-zinger-1',
        };
      case 'loaded_fries':
        return {
          title: 'Animal Style Loaded Smash Fries',
          price: 'Rs. 690',
          desc: 'Golden ridged crinkle-cut fries smothered in molten cheddar cheese lava, caramelized sweet onions, pickled jalapenos, and secret smoky sauce.',
          calories: '580 kcal',
          prepTime: '8-10 mins',
          targetItemId: 'item-fries-1',
        };
    }
  };

  const details = getPresetDetails(currentPreset);
  const matchingItem = menuItems.find((m) => m.id === details.targetItemId || m.name.includes(details.title));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-neutral-950/85 backdrop-blur-md animate-in fade-in">
      <div className="relative w-full max-w-4xl bg-neutral-900 border border-neutral-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col md:flex-row max-h-[92vh]">
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 z-20 p-2 rounded-xl bg-neutral-950/80 text-neutral-400 hover:text-white border border-neutral-800 transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Left Side: 3D Canvas Viewport */}
        <div className="md:w-3/5 h-[340px] sm:h-[420px] md:h-auto min-h-[340px] relative bg-neutral-950">
          <ThreeBurgerVisualizer
            initialPreset={currentPreset}
            onSelectDish={(p) => setCurrentPreset(p)}
            className="w-full h-full rounded-none border-0"
          />
        </div>

        {/* Right Side: Dish Story, Nutrition & Order Actions */}
        <div className="md:w-2/5 p-6 flex flex-col justify-between bg-neutral-900 border-t md:border-t-0 md:border-l border-neutral-800 overflow-y-auto">
          <div className="space-y-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30 text-[10px] font-mono font-bold uppercase tracking-wider flex items-center gap-1">
                  <Sparkles className="w-3 h-3" />
                  <span>3D CULINARY STUDIO</span>
                </span>
                <span className="text-[10px] text-neutral-400 font-mono">360° Real-time</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-heading font-black text-white leading-tight">
                {details.title}
              </h2>
              <div className="text-lg font-mono font-black text-amber-400">
                {details.price}
              </div>
            </div>

            <p className="text-xs text-neutral-300 leading-relaxed">
              {details.desc}
            </p>

            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-neutral-800">
              <div className="p-2.5 rounded-xl bg-neutral-950 border border-neutral-850">
                <span className="text-[10px] text-neutral-500 block uppercase font-mono">Estimated Prep</span>
                <span className="text-xs font-bold text-amber-400 flex items-center gap-1">
                  <Flame className="w-3.5 h-3.5" />
                  <span>{details.prepTime}</span>
                </span>
              </div>
              <div className="p-2.5 rounded-xl bg-neutral-950 border border-neutral-850">
                <span className="text-[10px] text-neutral-500 block uppercase font-mono">Fresh Halal Beef</span>
                <span className="text-xs font-bold text-emerald-400 flex items-center gap-1">
                  <Award className="w-3.5 h-3.5" />
                  <span>North Nazimabad</span>
                </span>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/25 text-xs text-amber-300">
              💡 <strong>Interactive Hint:</strong> Drag across the 3D model to rotate 360°, or tap <strong>"Explode Layers"</strong> to inspect every fresh ingredient!
            </div>
          </div>

          <div className="pt-5 mt-4 border-t border-neutral-800 space-y-2">
            {matchingItem && onOpenCustomizer ? (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenCustomizer(matchingItem);
                }}
                className="w-full py-3 bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold text-sm rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 active:scale-98 transition-all cursor-pointer"
              >
                <ShoppingBag className="w-4 h-4" />
                <span>Customize &amp; Order Dish</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            ) : onAddToCart ? (
              <button
                type="button"
                onClick={() => {
                  onAddToCart(currentPreset);
                  onClose();
                }}
                className="w-full py-3 bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold text-sm rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 active:scale-98 transition-all cursor-pointer"
              >
                <ShoppingBag className="w-4 h-4" />
                <span>Add to Bag ({details.price})</span>
              </button>
            ) : null}

            <button
              type="button"
              onClick={onClose}
              className="w-full py-2 text-neutral-400 hover:text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer"
            >
              Back to Storefront
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
