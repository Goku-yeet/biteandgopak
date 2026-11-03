import React, { useState } from 'react';
import { ComboDeal, MenuItem, InventoryIngredient } from '../../types';
import { StorageService } from '../../utils/storage';
import {
  Sparkles,
  Plus,
  Trash2,
  Edit2,
  Check,
  X,
  Layers,
  Package,
  Boxes,
  Zap,
  Info,
  Flame,
  ArrowRight,
  TrendingDown,
  Eye,
  CheckCircle2,
} from 'lucide-react';

interface DealMakerTabProps {
  menuItems: MenuItem[];
  onRefreshData?: () => void;
}

export const DealMakerTab: React.FC<DealMakerTabProps> = ({ menuItems, onRefreshData }) => {
  const [deals, setDeals] = useState<ComboDeal[]>(() => StorageService.getComboDeals());
  const [ingredients] = useState<InventoryIngredient[]>(() => StorageService.getIngredients());
  const [isEditing, setIsEditing] = useState(false);
  const [editingDealId, setEditingDealId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Form states for creating / editing deals
  const [dealTitle, setDealTitle] = useState('');
  const [dealDescription, setDealDescription] = useState('');
  const [dealPrice, setDealPrice] = useState<number>(1490);
  const [originalPrice, setOriginalPrice] = useState<number>(1890);
  const [dealBadge, setDealBadge] = useState('VALUE DEAL 🔥');
  const [dealCategory, setDealCategory] = useState<'combos' | 'midnight' | 'family' | 'budget'>('combos');
  const [dealImage, setDealImage] = useState(
    'https://images.unsplash.com/photo-1550547660-d9450f859349?auto=format&fit=crop&w=800&q=80'
  );
  const [dealActive, setDealActive] = useState(true);

  // Selected bundled items: array of { menuItemId, quantity }
  const [bundledItems, setBundledItems] = useState<Array<{ menuItemId: string; quantity: number }>>([
    { menuItemId: menuItems[0]?.id || '', quantity: 1 },
  ]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleOpenNewDeal = () => {
    setEditingDealId(null);
    setDealTitle('');
    setDealDescription('');
    setDealPrice(1500);
    setOriginalPrice(1900);
    setDealBadge('VALUE DEAL 🔥');
    setDealCategory('combos');
    setDealImage('https://images.unsplash.com/photo-1550547660-d9450f859349?auto=format&fit=crop&w=800&q=80');
    setDealActive(true);
    setBundledItems([
      { menuItemId: menuItems[0]?.id || '', quantity: 1 },
      { menuItemId: menuItems[1]?.id || '', quantity: 1 },
    ]);
    setIsEditing(true);
  };

  const handleOpenEdit = (deal: ComboDeal) => {
    setEditingDealId(deal.id);
    setDealTitle(deal.title);
    setDealDescription(deal.description);
    setDealPrice(deal.price);
    setOriginalPrice(deal.originalPrice);
    setDealBadge(deal.badge || '');
    setDealCategory(deal.dealCategory || 'combos');
    setDealImage(deal.image);
    setDealActive(deal.isActive);
    setBundledItems(deal.includedItems.map((i) => ({ menuItemId: i.menuItemId, quantity: i.quantity })));
    setIsEditing(true);
  };

  const handleAddBundledItem = () => {
    setBundledItems((prev) => [...prev, { menuItemId: menuItems[0]?.id || '', quantity: 1 }]);
  };

  const handleUpdateBundledItem = (index: number, menuItemId: string, quantity: number) => {
    setBundledItems((prev) => {
      const next = [...prev];
      next[index] = { menuItemId, quantity: Math.max(1, quantity) };
      return next;
    });
  };

  const handleRemoveBundledItem = (index: number) => {
    setBundledItems((prev) => prev.filter((_, i) => i !== index));
  };

  // Auto-calculate suggested original retail price based on bundled items
  const autoCalculatedRetail = bundledItems.reduce((sum, bi) => {
    const item = menuItems.find((m) => m.id === bi.menuItemId);
    return sum + (item ? item.price * bi.quantity : 0);
  }, 0);

  // Compute what raw ingredients are consumed by this deal
  const computedIngredientsConsumed = () => {
    const consumption: Record<string, { name: string; quantity: number; unit: string }> = {};

    bundledItems.forEach((bi) => {
      const item = menuItems.find((m) => m.id === bi.menuItemId);
      if (item && item.recipe) {
        item.recipe.forEach((r) => {
          const ing = ingredients.find((i) => i.id === r.ingredientId);
          const name = ing?.name || r.ingredientId;
          const unit = ing?.unit || 'units';
          if (!consumption[r.ingredientId]) {
            consumption[r.ingredientId] = { name, quantity: 0, unit };
          }
          consumption[r.ingredientId].quantity += r.quantity * bi.quantity;
        });
      }
    });

    return Object.values(consumption);
  };

  const handleSaveDeal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!dealTitle.trim()) {
      showToast('Please enter a deal title');
      return;
    }
    if (bundledItems.length === 0) {
      showToast('Please include at least 1 menu item in the deal bundle');
      return;
    }

    const includedItemsFormatted = bundledItems.map((bi) => {
      const item = menuItems.find((m) => m.id === bi.menuItemId);
      return {
        menuItemId: bi.menuItemId,
        quantity: bi.quantity,
        label: item?.name || 'Item',
      };
    });

    if (editingDealId) {
      StorageService.updateComboDeal(editingDealId, {
        title: dealTitle.trim(),
        description: dealDescription.trim(),
        price: dealPrice,
        originalPrice: originalPrice || autoCalculatedRetail,
        badge: dealBadge.trim() || undefined,
        dealCategory,
        image: dealImage.trim(),
        isActive: dealActive,
        includedItems: includedItemsFormatted,
      });
      showToast(`Deal "${dealTitle}" updated with full inventory tracing!`);
    } else {
      StorageService.createComboDeal({
        title: dealTitle.trim(),
        description: dealDescription.trim(),
        price: dealPrice,
        originalPrice: originalPrice || autoCalculatedRetail,
        badge: dealBadge.trim() || undefined,
        dealCategory,
        image: dealImage.trim(),
        isActive: dealActive,
        includedItems: includedItemsFormatted,
      });
      showToast(`New deal "${dealTitle}" created! Inventory components mapped.`);
    }

    setDeals(StorageService.getComboDeals());
    setIsEditing(false);
    if (onRefreshData) onRefreshData();
  };

  const [dealToDelete, setDealToDelete] = useState<ComboDeal | null>(null);

  const handleConfirmDeleteDeal = () => {
    if (!dealToDelete) return;
    StorageService.deleteComboDeal(dealToDelete.id);
    setDeals(StorageService.getComboDeals());
    showToast(`Deal "${dealToDelete.title}" removed.`);
    if (editingDealId === dealToDelete.id) {
      setIsEditing(false);
      setEditingDealId(null);
    }
    setDealToDelete(null);
    if (onRefreshData) onRefreshData();
  };

  const handleToggleActive = (deal: ComboDeal) => {
    StorageService.updateComboDeal(deal.id, { isActive: !deal.isActive });
    setDeals(StorageService.getComboDeals());
    showToast(`Deal "${deal.title}" is now ${!deal.isActive ? 'Active' : 'Hidden'}.`);
    if (onRefreshData) onRefreshData();
  };

  const ingredientsPreview = computedIngredientsConsumed();

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-5 right-5 z-50 p-4 rounded-xl bg-amber-500 text-neutral-950 font-bold text-xs shadow-2xl flex items-center gap-2 animate-in slide-in-from-top">
          <Check className="w-4 h-4 stroke-[3]" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Banner & Header */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-amber-500/15 via-neutral-900 to-neutral-950 border border-amber-500/30 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-heading font-black text-white flex items-center gap-2">
                <span>Deal Maker &amp; Bundle Inventory Engine</span>
                <span className="text-[10px] font-mono bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full font-bold">
                  AUTO INVENTORY DEDUCTION
                </span>
              </h2>
              <p className="text-xs text-neutral-400">
                Package menu items into combos &amp; midnight deals. When a deal is sold on the website or POS, the system automatically traces and deducts the inventory of all bundled items and raw shared ingredients (Zinger patties, smash patties, buns, fries).
              </p>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={handleOpenNewDeal}
          className="px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold text-xs rounded-xl flex items-center gap-2 shadow-lg shadow-amber-500/20 active:scale-95 transition-all cursor-pointer whitespace-nowrap"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          <span>Create New Deal</span>
        </button>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-4 rounded-xl bg-neutral-950 border border-neutral-850">
          <span className="text-neutral-400 text-[11px] block">Active Deals</span>
          <span className="text-2xl font-black text-white tabular-nums">
            {deals.filter((d) => d.isActive).length}
          </span>
          <span className="text-[10px] text-emerald-400 block mt-0.5">Live on Storefront &amp; POS</span>
        </div>

        <div className="p-4 rounded-xl bg-neutral-950 border border-neutral-850">
          <span className="text-neutral-400 text-[11px] block">Total Bundled Deals</span>
          <span className="text-2xl font-black text-amber-400 tabular-nums">{deals.length}</span>
          <span className="text-[10px] text-neutral-400 block mt-0.5">Configured Combos</span>
        </div>

        <div className="p-4 rounded-xl bg-neutral-950 border border-neutral-850">
          <span className="text-neutral-400 text-[11px] block">Inventory Linked Items</span>
          <span className="text-2xl font-black text-white tabular-nums">
            {deals.reduce((acc, d) => acc + d.includedItems.length, 0)}
          </span>
          <span className="text-[10px] text-neutral-400 block mt-0.5">Traceable Components</span>
        </div>

        <div className="p-4 rounded-xl bg-neutral-950 border border-neutral-850">
          <span className="text-neutral-400 text-[11px] block">Average Savings</span>
          <span className="text-2xl font-black text-emerald-400 tabular-nums">
            Rs. {Math.round(
              deals.reduce((acc, d) => acc + Math.max(0, d.originalPrice - d.price), 0) /
                (deals.length || 1)
            ).toLocaleString()}
          </span>
          <span className="text-[10px] text-neutral-400 block mt-0.5">Per Deal Ordered</span>
        </div>
      </div>

      {/* Deals Grid List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {deals.map((deal) => {
          const savings = Math.max(0, deal.originalPrice - deal.price);
          return (
            <div
              key={deal.id}
              className={`p-4 rounded-2xl bg-neutral-950 border flex flex-col justify-between transition-all ${
                deal.isActive ? 'border-neutral-800 hover:border-amber-500/40 shadow-sm' : 'border-neutral-900 opacity-60'
              }`}
            >
              <div className="space-y-3">
                {/* Header Image & Badges */}
                <div className="relative h-36 rounded-xl overflow-hidden bg-neutral-900 border border-neutral-800">
                  <img
                    src={deal.image}
                    alt={deal.title}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src =
                        'https://images.unsplash.com/photo-1550547660-d9450f859349?auto=format&fit=crop&w=800&q=80';
                    }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-neutral-950 via-transparent to-transparent" />

                  {deal.badge && (
                    <span className="absolute top-2.5 left-2.5 bg-amber-500 text-neutral-950 font-black text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wider shadow">
                      {deal.badge}
                    </span>
                  )}

                  <span
                    className={`absolute top-2.5 right-2.5 px-2 py-0.5 rounded text-[10px] font-bold ${
                      deal.isActive
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                        : 'bg-neutral-800 text-neutral-400'
                    }`}
                  >
                    {deal.isActive ? 'Active' : 'Disabled'}
                  </span>

                  <div className="absolute bottom-2 left-3 right-3 flex items-baseline justify-between text-white">
                    <div>
                      <span className="font-mono text-base font-black text-amber-400">
                        Rs. {deal.price.toLocaleString()}
                      </span>
                      {deal.originalPrice > deal.price && (
                        <span className="font-mono text-xs text-neutral-400 line-through ml-2">
                          Rs. {deal.originalPrice.toLocaleString()}
                        </span>
                      )}
                    </div>
                    {savings > 0 && (
                      <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/20 px-1.5 py-0.5 rounded border border-emerald-500/30">
                        Save Rs. {savings}
                      </span>
                    )}
                  </div>
                </div>

                {/* Title & Description */}
                <div>
                  <h3 className="text-sm font-bold text-white">{deal.title}</h3>
                  <p className="text-xs text-neutral-400 mt-1 line-clamp-2 leading-relaxed">
                    {deal.description}
                  </p>
                </div>

                {/* Included Items with Quantities */}
                <div className="p-2.5 rounded-xl bg-neutral-900 border border-neutral-850 space-y-1.5 text-xs">
                  <div className="flex items-center justify-between text-[10px] uppercase font-bold text-neutral-400 border-b border-neutral-800 pb-1">
                    <span className="flex items-center gap-1">
                      <Package className="w-3 h-3 text-amber-400" />
                      <span>Bundled Menu Items</span>
                    </span>
                    <span className="font-mono text-amber-400">
                      {deal.includedItems.reduce((a, b) => a + b.quantity, 0)} Items Total
                    </span>
                  </div>

                  <div className="space-y-1 pt-0.5">
                    {deal.includedItems.map((inc, i) => {
                      const item = menuItems.find((m) => m.id === inc.menuItemId);
                      return (
                        <div key={i} className="flex items-center justify-between text-[11px]">
                          <span className="text-neutral-300 truncate">
                            <strong className="text-amber-400 font-mono mr-1">{inc.quantity}x</strong>
                            {item?.name || inc.label || 'Item'}
                          </span>
                          <span className="text-[10px] text-neutral-400 font-mono">
                            Stock: {item?.stockQuantity ?? '—'}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-3 mt-3 border-t border-neutral-900 flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => handleToggleActive(deal)}
                  className={`px-2.5 py-1 text-[11px] font-bold rounded-lg border transition-colors cursor-pointer ${
                    deal.isActive
                      ? 'border-neutral-800 text-neutral-400 hover:text-white hover:bg-neutral-900'
                      : 'border-emerald-500/30 text-emerald-400 bg-emerald-500/10'
                  }`}
                >
                  {deal.isActive ? 'Deactivate' : 'Activate Deal'}
                </button>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => handleOpenEdit(deal)}
                    className="p-1.5 text-neutral-400 hover:text-amber-400 hover:bg-neutral-900 rounded-lg transition-colors cursor-pointer"
                    title="Edit Deal"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setDealToDelete(deal)}
                    className="p-1.5 text-neutral-400 hover:text-red-400 hover:bg-neutral-900 rounded-lg transition-colors cursor-pointer"
                    title="Delete Deal"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* CREATE / EDIT DEAL MODAL */}
      {isEditing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-950/85 backdrop-blur-sm overflow-y-auto">
          <div className="relative w-full max-w-2xl bg-neutral-900 border border-neutral-800 rounded-2xl shadow-2xl p-6 text-xs max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-neutral-800">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-amber-500/15 border border-amber-500/25 flex items-center justify-center text-amber-500">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">
                    {editingDealId ? 'Edit Combo Deal' : 'Create New Combo Deal'}
                  </h3>
                  <p className="text-[11px] text-neutral-400">
                    Map menu items into a bundle with automatic inventory component tracking.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="p-1 text-neutral-400 hover:text-white rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveDeal} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-neutral-300 block mb-1">
                    Deal Title *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Midnight Duo Smash Feast"
                    value={dealTitle}
                    onChange={(e) => setDealTitle(e.target.value)}
                    className="w-full bg-neutral-950 border border-neutral-800 focus:border-amber-500 rounded-lg px-3 py-2 text-white"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-neutral-300 block mb-1">
                    Badge / Tagline (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. VALUE DEAL 🔥 or MIDNIGHT SPECIAL"
                    value={dealBadge}
                    onChange={(e) => setDealBadge(e.target.value)}
                    className="w-full bg-neutral-950 border border-neutral-800 focus:border-amber-500 rounded-lg px-3 py-2 text-white"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-neutral-300 block mb-1">
                  Description *
                </label>
                <textarea
                  required
                  rows={2}
                  placeholder="Describe what is included in this bundle deal..."
                  value={dealDescription}
                  onChange={(e) => setDealDescription(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-800 focus:border-amber-500 rounded-lg px-3 py-2 text-white"
                />
              </div>

              {/* Pricing & Category */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-neutral-300 block mb-1">
                    Deal Selling Price (PKR) *
                  </label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={dealPrice}
                    onChange={(e) => setDealPrice(parseInt(e.target.value, 10) || 0)}
                    className="w-full bg-neutral-950 border border-neutral-800 focus:border-amber-500 rounded-lg px-3 py-2 text-white font-mono"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-neutral-300 block mb-1">
                    Original Price (PKR)
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={originalPrice}
                    onChange={(e) => setOriginalPrice(parseInt(e.target.value, 10) || 0)}
                    className="w-full bg-neutral-950 border border-neutral-800 focus:border-amber-500 rounded-lg px-3 py-2 text-white font-mono"
                  />
                  <span className="text-[10px] text-neutral-400 mt-0.5 block">
                    Calculated retail sum: Rs. {autoCalculatedRetail}
                  </span>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-neutral-300 block mb-1">
                    Deal Category
                  </label>
                  <select
                    value={dealCategory}
                    onChange={(e) => setDealCategory(e.target.value as any)}
                    className="w-full bg-neutral-950 border border-neutral-800 focus:border-amber-500 rounded-lg px-3 py-2 text-white"
                  >
                    <option value="combos">Value Combos &amp; Boxes</option>
                    <option value="midnight">Midnight Special</option>
                    <option value="family">Family &amp; Sharing Deal</option>
                    <option value="budget">Budget Saver</option>
                  </select>
                </div>
              </div>

              {/* Deal Image URL */}
              <div>
                <label className="text-[11px] font-bold text-neutral-300 block mb-1">
                  Image URL
                </label>
                <input
                  type="url"
                  value={dealImage}
                  onChange={(e) => setDealImage(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-800 focus:border-amber-500 rounded-lg px-3 py-2 text-white font-mono text-[11px]"
                />
              </div>

              {/* ================= BUNDLE ITEMS BUILDER ================= */}
              <div className="p-4 rounded-xl bg-neutral-950 border border-neutral-800 space-y-3">
                <div className="flex items-center justify-between border-b border-neutral-850 pb-2">
                  <div className="flex items-center gap-1.5 text-amber-400 font-bold text-xs">
                    <Boxes className="w-4 h-4" />
                    <span>Included Menu Items in this Deal (Inventory Traced)</span>
                  </div>
                  <button
                    type="button"
                    onClick={handleAddBundledItem}
                    className="px-2.5 py-1 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Add Item to Bundle</span>
                  </button>
                </div>

                <div className="space-y-2">
                  {bundledItems.map((bi, idx) => (
                    <div
                      key={idx}
                      className="p-2.5 rounded-lg bg-neutral-900 border border-neutral-800 flex items-center gap-2.5"
                    >
                      <span className="text-neutral-400 font-mono text-xs w-5 text-center">
                        #{idx + 1}
                      </span>

                      {/* Select Item */}
                      <select
                        value={bi.menuItemId}
                        onChange={(e) => handleUpdateBundledItem(idx, e.target.value, bi.quantity)}
                        className="flex-1 bg-neutral-950 border border-neutral-750 focus:border-amber-500 rounded-lg px-2.5 py-1.5 text-xs text-white"
                      >
                        {menuItems.map((m) => (
                          <option key={m.id} value={m.id}>
                            {m.name} — Rs. {m.price} ({m.stockQuantity ?? 0} in stock)
                          </option>
                        ))}
                      </select>

                      {/* Quantity in bundle */}
                      <div className="flex items-center gap-1">
                        <span className="text-neutral-400 text-[11px]">Qty:</span>
                        <input
                          type="number"
                          min={1}
                          max={20}
                          value={bi.quantity}
                          onChange={(e) =>
                            handleUpdateBundledItem(
                              idx,
                              bi.menuItemId,
                              parseInt(e.target.value, 10) || 1
                            )
                          }
                          className="w-14 bg-neutral-950 border border-neutral-750 rounded-lg px-2 py-1 text-center font-mono font-bold text-white text-xs"
                        />
                      </div>

                      <button
                        type="button"
                        onClick={() => handleRemoveBundledItem(idx)}
                        className="p-1.5 text-neutral-400 hover:text-red-400 hover:bg-red-500/10 rounded transition-colors cursor-pointer"
                        title="Remove bundled item"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                  {bundledItems.length === 0 && (
                    <div className="p-3 rounded-xl bg-neutral-950 border border-neutral-800 text-center text-neutral-400 text-xs">
                      No bundled items selected. Click "+ Add Menu Item to Bundle" below.
                    </div>
                  )}
                </div>

                {/* Real-time Inventory Component Consumption Trace */}
                {ingredientsPreview.length > 0 && (
                  <div className="mt-3 p-3 rounded-xl bg-amber-500/10 border border-amber-500/25 space-y-1.5">
                    <span className="text-[10px] uppercase font-bold text-amber-400 block tracking-wider">
                      🧪 Automated Raw Ingredient Trace for this Deal:
                    </span>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 pt-0.5">
                      {ingredientsPreview.map((ing, i) => (
                        <div
                          key={i}
                          className="bg-neutral-900/80 px-2 py-1 rounded border border-neutral-800 text-[10.5px] text-neutral-200"
                        >
                          <strong className="text-amber-400 font-mono">
                            {ing.quantity} {ing.unit}
                          </strong>{' '}
                          {ing.name}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Active Toggle */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-neutral-950 border border-neutral-800">
                <div>
                  <span className="text-xs font-bold text-white block">Active on Storefront &amp; POS</span>
                  <span className="text-[11px] text-neutral-400">
                    Customers and counter cashiers can immediately select this deal.
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={dealActive}
                  onChange={(e) => setDealActive(e.target.checked)}
                  className="w-4 h-4 accent-amber-500 cursor-pointer"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-between gap-2 pt-2 border-t border-neutral-800">
                {editingDealId ? (
                  <button
                    type="button"
                    onClick={() => {
                      const current = deals.find((d) => d.id === editingDealId);
                      if (current) setDealToDelete(current);
                    }}
                    className="px-3.5 py-2 bg-red-600/15 hover:bg-red-600/25 text-red-400 border border-red-500/30 rounded-xl text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete Deal</span>
                  </button>
                ) : (
                  <div />
                )}
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsEditing(false)}
                    className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-white rounded-xl text-xs font-semibold cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold rounded-xl text-xs flex items-center gap-1.5 cursor-pointer shadow"
                  >
                    <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                    <span>{editingDealId ? 'Save Deal Changes' : 'Create Deal'}</span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {dealToDelete && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-neutral-950/85 backdrop-blur-sm animate-in fade-in">
          <div className="relative w-full max-w-md bg-neutral-900 border border-neutral-800 rounded-2xl shadow-2xl p-6 text-xs space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-500/15 border border-red-500/30 flex items-center justify-center text-red-400 shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white">Delete Deal &amp; Combo?</h4>
                <p className="text-neutral-400 text-[11px] mt-0.5">
                  Are you sure you want to delete <strong className="text-white">"{dealToDelete.title}"</strong>?
                </p>
              </div>
            </div>

            <p className="text-neutral-400 leading-relaxed bg-neutral-950 p-3 rounded-xl border border-neutral-850 text-[11px]">
              This will remove the deal from the storefront and POS menu. Raw inventory components will no longer be linked to this deal.
            </p>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-neutral-800">
              <button
                type="button"
                onClick={() => setDealToDelete(null)}
                className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white rounded-xl text-xs font-semibold cursor-pointer transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteDeal}
                className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 cursor-pointer shadow-lg shadow-red-600/25 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Yes, Delete Deal</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
