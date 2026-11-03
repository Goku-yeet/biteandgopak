import React, { useState, useRef } from 'react';
import { MenuItem, Category, ItemVariant, ItemAddon } from '../../types';
import { X, Plus, Trash2, Image, Flame, Sparkles, Check, Upload, Camera } from 'lucide-react';

interface ItemEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (item: MenuItem | Omit<MenuItem, 'id' | 'order'>) => void;
  categories: Category[];
  initialItem?: MenuItem | null;
}

const PRESET_IMAGES = [
  { label: 'Smash Burger Double', url: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=800&q=80' },
  { label: 'Nashville Hot Chicken', url: 'https://images.unsplash.com/photo-1625813506062-0aeb1d7a094b?auto=format&fit=crop&w=800&q=80' },
  { label: 'Truffle Cheeseburger', url: 'https://images.unsplash.com/photo-1586190848861-99aa4a171e90?auto=format&fit=crop&w=800&q=80' },
  { label: 'Golden Broast Chicken', url: 'https://images.unsplash.com/photo-1626082927389-6cd097cdc6ec?auto=format&fit=crop&w=800&q=80' },
  { label: 'Crispy Fire Tenders', url: 'https://images.unsplash.com/photo-1562967914-608f82629710?auto=format&fit=crop&w=800&q=80' },
  { label: 'Loaded Animal Fries', url: 'https://images.unsplash.com/photo-1585109649139-366815a0d713?auto=format&fit=crop&w=800&q=80' },
  { label: 'Nashville Hot Fries', url: 'https://images.unsplash.com/photo-1576107232684-1279f3908594?auto=format&fit=crop&w=800&q=80' },
  { label: 'Crispy Zinger Wrap', url: 'https://images.unsplash.com/photo-1626700051175-6818013e1d4f?auto=format&fit=crop&w=800&q=80' },
  { label: 'Duo Feast Combo Box', url: 'https://images.unsplash.com/photo-1550547660-d9450f859349?auto=format&fit=crop&w=800&q=80' },
  { label: 'Lotus Biscoff Shake', url: 'https://images.unsplash.com/photo-1572490122747-3968b75cc699?auto=format&fit=crop&w=800&q=80' },
  { label: 'Belgian Dark Shake', url: 'https://images.unsplash.com/photo-1579954115545-a95591f28bfc?auto=format&fit=crop&w=800&q=80' },
];

export const ItemEditorModal: React.FC<ItemEditorModalProps> = ({
  isOpen,
  onClose,
  onSave,
  categories,
  initialItem,
}) => {
  const [categoryId, setCategoryId] = useState(
    initialItem?.categoryId || categories[0]?.id || ''
  );
  const [name, setName] = useState(initialItem?.name || '');
  const [description, setDescription] = useState(initialItem?.description || '');
  const [price, setPrice] = useState(initialItem?.price || 850);
  const [image, setImage] = useState(
    initialItem?.image || PRESET_IMAGES[0].url
  );
  const [isAvailable, setIsAvailable] = useState(
    initialItem ? initialItem.isAvailable : true
  );
  const [isBestseller, setIsBestseller] = useState(
    initialItem?.isBestseller || false
  );
  const [isSpicy, setIsSpicy] = useState(initialItem?.isSpicy || false);
  const [calories, setCalories] = useState(initialItem?.calories || '650 kcal');
  const [prepTimeMinutes, setPrepTimeMinutes] = useState(
    initialItem?.prepTimeMinutes || 12
  );

  // Variants state
  const [variants, setVariants] = useState<ItemVariant[]>(
    initialItem?.variants || []
  );
  const [newVarName, setNewVarName] = useState('');
  const [newVarDelta, setNewVarDelta] = useState(0);

  // File upload state & ref
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadError, setUploadError] = useState('');

  const handlePhotoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setUploadError('Please choose a valid image file (PNG, JPG, WEBP)');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setUploadError('Photo size exceeds 5MB limit. Please choose a smaller image.');
      return;
    }

    setUploadError('');
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setImage(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  // Addons state
  const [addons, setAddons] = useState<ItemAddon[]>(
    initialItem?.addons || []
  );
  const [newAddonName, setNewAddonName] = useState('');
  const [newAddonPrice, setNewAddonPrice] = useState(90);

  const handleAddVariant = () => {
    if (!newVarName.trim()) return;
    setVariants([
      ...variants,
      {
        id: `v-${Date.now()}`,
        name: newVarName.trim(),
        priceDelta: Number(newVarDelta),
        isDefault: variants.length === 0,
      },
    ]);
    setNewVarName('');
    setNewVarDelta(0);
  };

  const handleRemoveVariant = (id: string) => {
    setVariants(variants.filter((v) => v.id !== id));
  };

  const handleAddAddon = () => {
    if (!newAddonName.trim()) return;
    setAddons([
      ...addons,
      {
        id: `a-${Date.now()}`,
        name: newAddonName.trim(),
        price: Number(newAddonPrice),
      },
    ]);
    setNewAddonName('');
    setNewAddonPrice(90);
  };

  const handleRemoveAddon = (id: string) => {
    setAddons(addons.filter((a) => a.id !== id));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    if (initialItem) {
      onSave({
        ...initialItem,
        categoryId,
        name: name.trim(),
        description: description.trim(),
        price: Number(price),
        image,
        isAvailable,
        isBestseller,
        isSpicy,
        calories: calories.trim() || undefined,
        prepTimeMinutes: Number(prepTimeMinutes),
        variants: variants.length > 0 ? variants : undefined,
        addons: addons.length > 0 ? addons : undefined,
      });
    } else {
      onSave({
        categoryId,
        name: name.trim(),
        description: description.trim(),
        price: Number(price),
        image,
        isAvailable,
        isBestseller,
        isSpicy,
        calories: calories.trim() || undefined,
        prepTimeMinutes: Number(prepTimeMinutes),
        variants: variants.length > 0 ? variants : undefined,
        addons: addons.length > 0 ? addons : undefined,
      });
    }
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-950/80 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-neutral-900 border border-neutral-800 rounded-2xl shadow-2xl overflow-hidden my-6 flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-5 border-b border-neutral-800 bg-neutral-950 flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-white">
              {initialItem ? 'Edit Menu Item' : 'Add New Menu Item'}
            </h2>
            <p className="text-xs text-neutral-400">
              Configure item pricing, portions, toppings, and stock availability
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg bg-neutral-900 hover:bg-neutral-800 text-neutral-400 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6 overflow-y-auto flex-1">
          {/* Basic Fields */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-neutral-300 block mb-1">Item Name *</label>
              <input
                type="text"
                required
                placeholder="e.g. Truffle Smash Burger"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3.5 py-2 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-neutral-300 block mb-1">Category *</label>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.id} className="bg-neutral-900 text-white">
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-neutral-300 block mb-1">Description *</label>
            <textarea
              rows={2}
              required
              placeholder="e.g. Two juicy smashed beef patties, cheddar cheese, pickles, brioche bun"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3.5 py-2 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-amber-500"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="text-xs font-bold text-neutral-300 block mb-1">Base Price (PKR) *</label>
              <input
                type="number"
                required
                min={0}
                value={price}
                onChange={(e) => setPrice(Number(e.target.value))}
                className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-amber-500 font-mono"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-neutral-300 block mb-1">Prep Time (Mins)</label>
              <input
                type="number"
                min={1}
                value={prepTimeMinutes}
                onChange={(e) => setPrepTimeMinutes(Number(e.target.value))}
                className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-amber-500 font-mono"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-neutral-300 block mb-1">Calories</label>
              <input
                type="text"
                placeholder="750 kcal"
                value={calories}
                onChange={(e) => setCalories(e.target.value)}
                className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>

          {/* Image & Photo Upload Section */}
          <div className="p-4 rounded-2xl bg-neutral-950 border border-neutral-800 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-neutral-200 flex items-center gap-1.5">
                <Image className="w-4 h-4 text-amber-400" />
                <span>Item Photo / Image</span>
              </label>
              <span className="text-[11px] text-amber-500 font-medium">Upload photo or use URL</span>
            </div>

            {uploadError && (
              <p className="text-[11px] text-red-400 bg-red-950/60 border border-red-800/80 p-2 rounded-lg">
                {uploadError}
              </p>
            )}

            {/* Photo Preview & Upload Controls */}
            <div className="flex flex-col sm:flex-row items-center gap-4">
              <div className="relative w-24 h-24 rounded-2xl overflow-hidden bg-neutral-900 border-2 border-neutral-750 shrink-0 shadow-inner group">
                <img
                  src={image}
                  alt="Item Preview"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute inset-0 bg-neutral-950/60 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center text-white text-[10px] font-bold transition-opacity"
                  title="Click to replace photo"
                >
                  <Camera className="w-5 h-5 mb-0.5 text-amber-400" />
                  <span>Change</span>
                </button>
              </div>

              <div className="flex-1 space-y-2 w-full">
                {/* Upload Action Button */}
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handlePhotoFileChange}
                  accept="image/*"
                  className="hidden"
                />

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="flex-1 py-2 px-3 bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold text-xs rounded-xl flex items-center justify-center gap-2 transition-all shadow-md shadow-amber-500/20"
                  >
                    <Upload className="w-4 h-4 stroke-[2.5]" />
                    <span>Upload Photo from Device</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      const randomPreset = PRESET_IMAGES[Math.floor(Math.random() * PRESET_IMAGES.length)];
                      setImage(randomPreset.url);
                    }}
                    className="py-2 px-3 bg-neutral-850 hover:bg-neutral-800 text-neutral-300 text-xs font-semibold rounded-xl border border-neutral-750 transition-colors"
                    title="Pick random food preset"
                  >
                    Random
                  </button>
                </div>

                {/* Direct Image URL input */}
                <div>
                  <input
                    type="text"
                    required
                    placeholder="https://... or choose photo above"
                    value={image}
                    onChange={(e) => setImage(e.target.value)}
                    className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-3 py-1.5 text-xs text-neutral-300 placeholder-neutral-500 focus:outline-none focus:border-amber-500 font-mono text-[11px]"
                  />
                </div>
              </div>
            </div>

            {/* Presets Gallery */}
            <div>
              <span className="text-[10px] uppercase tracking-wider text-neutral-500 block mb-1">
                Quick Preset Food Photos:
              </span>
              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1">
                {PRESET_IMAGES.map((p, idx) => (
                  <button
                    type="button"
                    key={idx}
                    onClick={() => setImage(p.url)}
                    className={`text-[11px] px-2.5 py-1 rounded-lg border whitespace-nowrap transition-colors ${
                      image === p.url
                        ? 'bg-amber-500/20 border-amber-500 text-amber-300 font-bold'
                        : 'bg-neutral-900 border-neutral-800 text-neutral-400 hover:text-white'
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Toggles */}
          <div className="grid grid-cols-3 gap-3 p-3 rounded-xl bg-neutral-950 border border-neutral-800">
            <label className="flex items-center gap-2 cursor-pointer text-xs text-neutral-300">
              <input
                type="checkbox"
                checked={isAvailable}
                onChange={(e) => setIsAvailable(e.target.checked)}
                className="rounded border-neutral-700 text-amber-500 focus:ring-amber-500"
              />
              <span>In Stock</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer text-xs text-neutral-300">
              <input
                type="checkbox"
                checked={isBestseller}
                onChange={(e) => setIsBestseller(e.target.checked)}
                className="rounded border-neutral-700 text-amber-500 focus:ring-amber-500"
              />
              <span className="flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-amber-400" />
                Bestseller
              </span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer text-xs text-neutral-300">
              <input
                type="checkbox"
                checked={isSpicy}
                onChange={(e) => setIsSpicy(e.target.checked)}
                className="rounded border-neutral-700 text-amber-500 focus:ring-amber-500"
              />
              <span className="flex items-center gap-1">
                <Flame className="w-3 h-3 text-red-400" />
                Spicy
              </span>
            </label>
          </div>

          {/* Variants Management */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-400">
                Portion Variants (e.g. Single, Double, Combo)
              </h4>
              <span className="text-[11px] text-neutral-500">{variants.length} defined</span>
            </div>

            <div className="space-y-2 mb-3">
              {variants.map((v) => (
                <div
                  key={v.id}
                  className="p-2.5 rounded-lg bg-neutral-950 border border-neutral-800 flex items-center justify-between text-xs"
                >
                  <span className="font-medium text-white">{v.name}</span>
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-amber-400">
                      {v.priceDelta >= 0 ? `+Rs. ${v.priceDelta}` : `-Rs. ${Math.abs(v.priceDelta)}`}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleRemoveVariant(v.id)}
                      className="text-neutral-500 hover:text-red-400"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Variant name (e.g. Triple Patty)"
                value={newVarName}
                onChange={(e) => setNewVarName(e.target.value)}
                className="flex-1 bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-1.5 text-xs text-white"
              />
              <input
                type="number"
                placeholder="Price diff (+Rs)"
                value={newVarDelta}
                onChange={(e) => setNewVarDelta(Number(e.target.value))}
                className="w-24 bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-1.5 text-xs text-white font-mono"
              />
              <button
                type="button"
                onClick={handleAddVariant}
                className="px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-xs font-bold text-white rounded-lg flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                Add
              </button>
            </div>
          </div>

          {/* Add-ons Management */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-400">
                Toppings &amp; Extra Dips (Add-ons)
              </h4>
              <span className="text-[11px] text-neutral-500">{addons.length} defined</span>
            </div>

            <div className="space-y-2 mb-3">
              {addons.map((a) => (
                <div
                  key={a.id}
                  className="p-2.5 rounded-lg bg-neutral-950 border border-neutral-800 flex items-center justify-between text-xs"
                >
                  <span className="font-medium text-white">{a.name}</span>
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-amber-400">+Rs. {a.price}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveAddon(a.id)}
                      className="text-neutral-500 hover:text-red-400"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Addon name (e.g. Extra Cheddar Melt)"
                value={newAddonName}
                onChange={(e) => setNewAddonName(e.target.value)}
                className="flex-1 bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-1.5 text-xs text-white"
              />
              <input
                type="number"
                placeholder="Price (+Rs)"
                value={newAddonPrice}
                onChange={(e) => setNewAddonPrice(Number(e.target.value))}
                className="w-24 bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-1.5 text-xs text-white font-mono"
              />
              <button
                type="button"
                onClick={handleAddAddon}
                className="px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-xs font-bold text-white rounded-lg flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                Add
              </button>
            </div>
          </div>

          {/* Action buttons */}
          <div className="pt-4 border-t border-neutral-800 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 text-xs font-semibold text-neutral-400 hover:text-white rounded-xl"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold text-xs rounded-xl shadow-lg shadow-amber-500/20 transition-all"
            >
              {initialItem ? 'Save Item Changes' : 'Create Menu Item'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
