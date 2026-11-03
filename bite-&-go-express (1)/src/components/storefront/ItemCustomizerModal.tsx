import React, { useState } from 'react';
import { MenuItem, OrderItem } from '../../types';
import { X, Plus, Minus, Check, Flame, AlertCircle } from 'lucide-react';

interface ItemCustomizerModalProps {
  item: MenuItem | null;
  onClose: () => void;
  onAddToCart: (orderItem: OrderItem) => void;
}

export const ItemCustomizerModal: React.FC<ItemCustomizerModalProps> = ({
  item,
  onClose,
  onAddToCart,
}) => {
  // Selected variant
  const defaultVariant = item?.variants?.find((v) => v.isDefault)?.name || item?.variants?.[0]?.name;
  const [selectedVariant, setSelectedVariant] = useState<string | undefined>(defaultVariant);

  // Selected spiciness
  const [selectedSpiciness, setSelectedSpiciness] = useState<string | undefined>(
    item?.spicinessOptions?.[0]
  );

  // Selected addons
  const [selectedAddons, setSelectedAddons] = useState<Array<{ name: string; price: number }>>([]);

  // Quantity
  const [quantity, setQuantity] = useState<number>(1);

  // Special instructions
  const [specialInstructions, setSpecialInstructions] = useState<string>('');

  // Untrimmed photo toggle
  const [isFullPhotoZoom, setIsFullPhotoZoom] = useState(false);

  React.useEffect(() => {
    if (item) {
      const defVar = item.variants?.find((v) => v.isDefault)?.name || item.variants?.[0]?.name;
      setSelectedVariant(defVar);
      setSelectedSpiciness(item.spicinessOptions?.[0]);
      setSelectedAddons([]);
      setQuantity(1);
      setSpecialInstructions('');
    }
  }, [item?.id]);

  if (!item) return null;

  // Calculate total item price
  const variantDelta =
    item.variants?.find((v) => v.name === selectedVariant)?.priceDelta || 0;
  const addonsTotal = selectedAddons.reduce((sum, a) => sum + a.price, 0);
  const singleUnitPrice = item.price + variantDelta + addonsTotal;
  const grandItemTotal = singleUnitPrice * quantity;

  const toggleAddon = (addon: { name: string; price: number }) => {
    if (selectedAddons.some((a) => a.name === addon.name)) {
      setSelectedAddons(selectedAddons.filter((a) => a.name !== addon.name));
    } else {
      setSelectedAddons([...selectedAddons, addon]);
    }
  };

  const handleAdd = () => {
    const orderItem: OrderItem = {
      id: `oi-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
      menuItemId: item.id,
      name: item.name,
      price: singleUnitPrice,
      quantity,
      selectedVariant,
      selectedSpiciness,
      selectedAddons,
      specialInstructions: specialInstructions.trim() || undefined,
      itemTotal: grandItemTotal,
    };
    onAddToCart(orderItem);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-neutral-950/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-neutral-900 border border-neutral-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Full-Size Untrimmed Product Picture Header */}
        <div className="relative w-full bg-neutral-950 overflow-hidden shrink-0 group">
          <div className="h-64 sm:h-72 w-full relative overflow-hidden bg-neutral-950 flex items-center justify-center">
            <img
              src={item.image}
              alt={item.name}
              referrerPolicy="no-referrer"
              className={`w-full h-full transition-all duration-300 ${
                isFullPhotoZoom ? 'object-contain p-2' : 'object-cover object-center group-hover:scale-105'
              }`}
            />
          </div>

          {/* Action buttons on top of image */}
          <div className="absolute top-3 right-3 flex items-center gap-2 z-10">
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-full bg-neutral-950/80 hover:bg-neutral-900 text-neutral-300 hover:text-white backdrop-blur-md border border-neutral-800 transition-colors cursor-pointer shadow-lg"
              title="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Badges on image */}
          <div className="absolute top-3 left-3 flex items-center gap-1.5 z-10">
            {item.isBestseller && (
              <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-500 text-neutral-950 shadow-md">
                ⭐ BESTSELLER
              </span>
            )}
            {item.isSpicy && (
              <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-red-600 text-white shadow-md flex items-center gap-1">
                <Flame className="w-3 h-3" />
                <span>SPICY</span>
              </span>
            )}
          </div>
        </div>

        {/* Product Title, Description & Prep info clearly displayed without covering image */}
        <div className="p-4 sm:p-5 pb-3 border-b border-neutral-800 bg-neutral-900/95 space-y-1">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-xl sm:text-2xl font-heading font-black text-white">{item.name}</h2>
            <span className="font-mono font-bold text-amber-400 text-base sm:text-lg shrink-0">
              Rs. {item.price.toLocaleString()}
            </span>
          </div>

          <p className="text-xs sm:text-sm text-neutral-300 leading-relaxed">{item.description}</p>

          {item.calories && (
            <div className="flex items-center gap-2 pt-1 text-[11px] text-neutral-400 font-mono">
              <span>🔥 {item.calories}</span>
            </div>
          )}
        </div>

        {/* Scrollable Customization Options */}
        <div className="p-5 space-y-6 overflow-y-auto flex-1">
          {/* Variant Selector (if any) */}
          {item.variants && item.variants.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-2.5">
                <label className="text-xs font-bold text-neutral-300 uppercase tracking-wider">
                  Choose Size / Portion
                </label>
                <span className="text-[11px] text-amber-500 font-medium">Required</span>
              </div>
              <div className="space-y-2">
                {item.variants.map((v) => {
                  const isChecked = selectedVariant === v.name;
                  return (
                    <label
                      key={v.id}
                      onClick={() => setSelectedVariant(v.name)}
                      className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all ${
                        isChecked
                          ? 'border-amber-500 bg-amber-500/10 text-white'
                          : 'border-neutral-800 bg-neutral-950/50 hover:bg-neutral-800/40 text-neutral-300'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                            isChecked ? 'border-amber-500 bg-amber-500' : 'border-neutral-600'
                          }`}
                        >
                          {isChecked && <div className="w-1.5 h-1.5 rounded-full bg-neutral-950" />}
                        </div>
                        <span className="text-xs font-semibold">{v.name}</span>
                      </div>
                      <span className="text-xs font-mono font-bold text-neutral-400">
                        {v.priceDelta === 0 ? 'Included' : `+Rs. ${v.priceDelta}`}
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>
          )}

          {/* Spiciness Level (if any) */}
          {item.spicinessOptions && item.spicinessOptions.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-2.5">
                <label className="text-xs font-bold text-neutral-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Flame className="w-3.5 h-3.5 text-red-400" />
                  Select Spice Level
                </label>
                <span className="text-[11px] text-neutral-400">Choose one</span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {item.spicinessOptions.map((opt) => {
                  const isChecked = selectedSpiciness === opt;
                  return (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => setSelectedSpiciness(opt)}
                      className={`py-2 px-3 text-xs font-semibold rounded-lg border text-center transition-all ${
                        isChecked
                          ? 'border-red-500 bg-red-500/15 text-red-200'
                          : 'border-neutral-800 bg-neutral-950/50 text-neutral-400 hover:text-white'
                      }`}
                    >
                      {opt}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Add-ons & Extra Dips */}
          {item.addons && item.addons.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-2.5">
                <label className="text-xs font-bold text-neutral-300 uppercase tracking-wider">
                  Add Extra Goodies &amp; Upgrades
                </label>
                <span className="text-[11px] text-neutral-500">Optional</span>
              </div>
              <div className="space-y-2">
                {item.addons.map((addon) => {
                  const isChecked = selectedAddons.some((a) => a.name === addon.name);
                  return (
                    <div
                      key={addon.id}
                      onClick={() => toggleAddon(addon)}
                      className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all ${
                        isChecked
                          ? 'border-amber-500/80 bg-amber-500/5 text-white'
                          : 'border-neutral-800 bg-neutral-950/40 hover:bg-neutral-800/40 text-neutral-300'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-4 h-4 rounded border flex items-center justify-center ${
                            isChecked ? 'border-amber-500 bg-amber-500 text-neutral-950' : 'border-neutral-600'
                          }`}
                        >
                          {isChecked && <Check className="w-3 h-3 stroke-[3]" />}
                        </div>
                        <span className="text-xs font-medium">{addon.name}</span>
                      </div>
                      <span className="text-xs font-mono font-bold text-amber-400">
                        +Rs. {addon.price}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Kitchen Instructions */}
          <div>
            <label className="text-xs font-bold text-neutral-300 uppercase tracking-wider block mb-2">
              Special Instructions
            </label>
            <input
              type="text"
              placeholder="e.g. Extra crispy edges, no pickles, sauce on side"
              value={specialInstructions}
              onChange={(e) => setSpecialInstructions(e.target.value)}
              className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3.5 py-2.5 text-xs text-neutral-200 placeholder-neutral-500 focus:outline-none focus:border-amber-500"
            />
          </div>
        </div>

        {/* Footer: Quantity + Add CTA */}
        <div className="p-4 bg-neutral-950 border-t border-neutral-800 flex items-center justify-between gap-4">
          {/* Quantity Stepper */}
          <div className="flex items-center gap-2 bg-neutral-900 border border-neutral-800 rounded-lg p-1">
            <button
              onClick={() => setQuantity(Math.max(1, quantity - 1))}
              disabled={quantity <= 1}
              className="p-1.5 rounded hover:bg-neutral-800 text-neutral-400 disabled:opacity-40 transition-colors"
            >
              <Minus className="w-3.5 h-3.5" />
            </button>
            <span className="font-mono text-sm font-bold text-white px-2 tabular-nums">
              {quantity}
            </span>
            <button
              onClick={() => setQuantity(quantity + 1)}
              className="p-1.5 rounded hover:bg-neutral-800 text-neutral-200 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Submit Button */}
          <button
            onClick={handleAdd}
            className="flex-1 flex items-center justify-between bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold px-5 py-3 rounded-xl text-xs shadow-lg shadow-amber-500/20 active:scale-98 transition-all"
          >
            <span>Add to Bag</span>
            <span className="font-mono text-sm tabular-nums">
              Rs. {grandItemTotal.toLocaleString()}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};
