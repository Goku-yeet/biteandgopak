import React, { useState } from 'react';
import { MenuItem, Category, InventoryIngredient, ComboDeal } from '../../types';
import { StorageService } from '../../utils/storage';
import {
  Package,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Search,
  RotateCcw,
  Plus,
  Minus,
  Save,
  Sliders,
  Filter,
  Boxes,
  Layers,
  Sparkles,
  ArrowUpRight,
  TrendingDown,
  RefreshCw,
  Flame,
  ChefHat,
  Cpu,
  Edit2,
  Trash2,
  Check,
  X,
  PieChart,
} from 'lucide-react';

interface InventoryManagementTabProps {
  menuItems: MenuItem[];
  categories: Category[];
  onSaveInventory: (updatedItems: MenuItem[]) => Promise<void> | void;
  onRefreshData?: () => void;
}

export const InventoryManagementTab: React.FC<InventoryManagementTabProps> = ({
  menuItems,
  categories,
  onSaveInventory,
  onRefreshData,
}) => {
  // Sub-tabs: 1. Item Recipe & Packaging BOM Tracker | 2. Shared Ingredients & Packaging Hub | 3. Finished Menu Items
  const [activeSubTab, setActiveSubTab] = useState<'bom_tracker' | 'ingredients' | 'finished_items'>('bom_tracker');

  // Raw Ingredients & Packaging State
  const [ingredients, setIngredients] = useState<InventoryIngredient[]>(() =>
    StorageService.getIngredients()
  );
  const [comboDeals] = useState<ComboDeal[]>(() => StorageService.getComboDeals());
  const [ingredientFilter, setIngredientFilter] = useState<'all' | 'packaging' | 'bakery' | 'proteins' | 'dairy' | 'produce' | 'sauces' | 'beverages'>('all');
  const [ingredientSearch, setIngredientSearch] = useState('');
  const [bomSearch, setBomSearch] = useState('');

  // Finished Items State
  const [items, setItems] = useState<MenuItem[]>(
    menuItems.map((it) => ({
      ...it,
      trackInventory: it.trackInventory ?? true,
      stockQuantity: typeof it.stockQuantity === 'number' ? it.stockQuantity : 45,
      lowStockThreshold: typeof it.lowStockThreshold === 'number' ? it.lowStockThreshold : 10,
      stockUnit: it.stockUnit || 'portions',
    }))
  );

  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [stockStatusFilter, setStockStatusFilter] = useState<'all' | 'in_stock' | 'low_stock' | 'out_of_stock'>('all');
  const [isSaving, setIsSaving] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // New Ingredient Modal State
  const [isAddIngModalOpen, setIsAddIngModalOpen] = useState(false);
  const [newIngName, setNewIngName] = useState('');
  const [newIngCategory, setNewIngCategory] = useState<InventoryIngredient['category']>('proteins');
  const [newIngStock, setNewIngStock] = useState(100);
  const [newIngUnit, setNewIngUnit] = useState('patties');
  const [newIngThreshold, setNewIngThreshold] = useState(20);

  // Edit Recipe Modal State & Custom Recipe Components
  const [recipeModalItem, setRecipeModalItem] = useState<MenuItem | null>(null);
  const [editingRecipe, setEditingRecipe] = useState<Array<{ ingredientId: string; quantity: number }>>([]);
  const [recipeNotes, setRecipeNotes] = useState('');
  const [showQuickCustomIng, setShowQuickCustomIng] = useState(false);
  const [quickCustomName, setQuickCustomName] = useState('');
  const [quickCustomCategory, setQuickCustomCategory] = useState<InventoryIngredient['category']>('sauces');
  const [quickCustomUnit, setQuickCustomUnit] = useState('portions');
  const [quickCustomStock, setQuickCustomStock] = useState(100);
  const [customStockInputs, setCustomStockInputs] = useState<Record<string, string>>({});

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Adjust raw ingredient stock
  const handleAdjustIngredientStock = (ingredientId: string, delta: number) => {
    const updated = StorageService.updateIngredientStock(ingredientId, delta, true);
    if (updated) {
      setIngredients(StorageService.getIngredients());
      showToast(`${updated.name}: ${delta > 0 ? `+${delta}` : delta} ${updated.unit} (Now: ${updated.currentStock})`);
      if (onRefreshData) onRefreshData();
    }
  };

  const handleSetIngredientStock = (ingredientId: string, newQty: number) => {
    const updated = StorageService.updateIngredientStock(ingredientId, Math.max(0, newQty), false);
    if (updated) {
      setIngredients(StorageService.getIngredients());
      if (onRefreshData) onRefreshData();
    }
  };

  const handleRestockAllIngredients = (amount = 100) => {
    const list = StorageService.getIngredients();
    list.forEach((ing) => {
      ing.currentStock = Math.max(ing.currentStock, amount);
    });
    StorageService.saveIngredients(list);
    setIngredients(list);
    showToast(`All raw shared ingredients restocked to at least ${amount} units!`);
    if (onRefreshData) onRefreshData();
  };

  // Restock specific item kit (all raw components & packaging required for that dish)
  const handleRestockItemKit = (item: MenuItem, kitCount = 25) => {
    if (!item.recipe || item.recipe.length === 0) {
      handleAdjustStock(item.id, kitCount);
      return;
    }
    const currentList = StorageService.getIngredients();
    let updatedAny = false;

    item.recipe.forEach((r) => {
      const found = currentList.find((i) => i.id === r.ingredientId);
      if (found) {
        found.currentStock += r.quantity * kitCount;
        updatedAny = true;
      }
    });

    if (updatedAny) {
      StorageService.saveIngredients(currentList);
      setIngredients(currentList);
      showToast(`+${kitCount} complete kits replenished for "${item.name}" (patties, buns, wraps & packaging boxes restocked!)`);
      if (onRefreshData) onRefreshData();
    }
  };

  // Restock all low packaging and bakery items
  const handleRestockPackagingAndBuns = (amount = 50) => {
    const list = StorageService.getIngredients();
    let count = 0;
    list.forEach((ing) => {
      if (ing.category === 'packaging' || ing.category === 'bakery') {
        if (ing.currentStock <= ing.lowStockThreshold) {
          ing.currentStock += amount;
          count++;
        }
      }
    });
    if (count > 0) {
      StorageService.saveIngredients(list);
      setIngredients(list);
      showToast(`Restocked ${count} low packaging & bakery items with +${amount} fresh units!`);
      if (onRefreshData) onRefreshData();
    } else {
      showToast('All packaging & bakery items already have healthy stock!');
    }
  };

  // Calculate maximum portions an item can produce and pack based on bottleneck components
  const calculateItemBOMStatus = (item: MenuItem) => {
    if (!item.recipe || item.recipe.length === 0) {
      return {
        maxPortions: typeof item.stockQuantity === 'number' ? item.stockQuantity : 45,
        bottleneck: null as InventoryIngredient | null,
        components: [],
        limitingQty: typeof item.stockQuantity === 'number' ? item.stockQuantity : 45,
      };
    }

    const components = item.recipe.map((r) => {
      const ing = ingredients.find((i) => i.id === r.ingredientId);
      const stock = ing ? ing.currentStock : 0;
      const portionsCanMake = r.quantity > 0 ? Math.floor(stock / r.quantity) : 0;
      const threshold = ing ? ing.lowStockThreshold : 10;
      const isLow = ing ? ing.currentStock <= threshold : true;
      const isOut = stock === 0;
      return {
        ingredient: ing,
        requiredQty: r.quantity,
        currentStock: stock,
        unit: ing?.unit || 'units',
        category: ing?.category || 'packaging',
        name: ing?.name || r.ingredientId,
        portionsCanMake,
        threshold,
        isLow,
        isOut,
      };
    });

    const minPortions = components.length > 0 ? Math.min(...components.map((c) => c.portionsCanMake)) : 0;
    const bottleneckComponent = components.find((c) => c.portionsCanMake === minPortions);

    return {
      maxPortions: Math.max(0, minPortions),
      bottleneck: bottleneckComponent?.ingredient || null,
      bottleneckName: bottleneckComponent?.name || null,
      components,
      limitingQty: Math.max(0, minPortions),
    };
  };

  const handleAddNewIngredient = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newIngName.trim()) return;

    StorageService.addIngredient({
      name: newIngName.trim(),
      category: newIngCategory,
      currentStock: newIngStock,
      unit: newIngUnit.trim() || 'units',
      lowStockThreshold: newIngThreshold,
    });

    setIngredients(StorageService.getIngredients());
    setIsAddIngModalOpen(false);
    setNewIngName('');
    showToast(`Added raw ingredient: "${newIngName}"`);
    if (onRefreshData) onRefreshData();
  };

  const handleDeleteIngredient = (id: string) => {
    if (window.confirm('Delete this raw ingredient?')) {
      StorageService.deleteIngredient(id);
      setIngredients(StorageService.getIngredients());
      showToast('Raw ingredient deleted.');
      if (onRefreshData) onRefreshData();
    }
  };

  // Recipe Editor Handlers
  const handleOpenRecipeModal = (item: MenuItem) => {
    setRecipeModalItem(item);
    setEditingRecipe(item.recipe ? [...item.recipe] : []);
    setRecipeNotes((item as any).recipeNotes || '');
    setShowQuickCustomIng(false);
    setQuickCustomName('');
  };

  const handleCreateAndAddQuickCustomIngredient = () => {
    if (!quickCustomName.trim()) {
      showToast('Please enter a name for the custom recipe ingredient.');
      return;
    }
    const created = StorageService.addIngredient({
      name: quickCustomName.trim(),
      category: quickCustomCategory,
      currentStock: quickCustomStock,
      unit: quickCustomUnit.trim() || 'portions',
      lowStockThreshold: 15,
    });
    const refreshed = StorageService.getIngredients();
    setIngredients(refreshed);
    setEditingRecipe((prev) => [...prev, { ingredientId: created.id, quantity: 1 }]);
    setQuickCustomName('');
    setShowQuickCustomIng(false);
    showToast(`Created custom component "${created.name}" and added to recipe!`);
    if (onRefreshData) onRefreshData();
  };

  const handleAddRecipeIngredient = () => {
    if (ingredients.length === 0) return;
    setEditingRecipe((prev) => [...prev, { ingredientId: ingredients[0].id, quantity: 1 }]);
  };

  const handleUpdateRecipeIngredient = (index: number, ingredientId: string, quantity: number) => {
    setEditingRecipe((prev) => {
      const next = [...prev];
      next[index] = { ingredientId, quantity: Math.max(1, quantity) };
      return next;
    });
  };

  const handleRemoveRecipeIngredient = (index: number) => {
    setEditingRecipe((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSaveRecipe = () => {
    if (!recipeModalItem) return;
    const updatedItems = items.map((it) => {
      if (it.id === recipeModalItem.id) {
        return { ...it, recipe: editingRecipe, recipeNotes } as MenuItem;
      }
      return it;
    });
    setItems(updatedItems);
    StorageService.saveMenuItems(updatedItems);
    showToast(`Custom recipe updated for "${recipeModalItem.name}"!`);
    setRecipeModalItem(null);
    if (onRefreshData) onRefreshData();
  };

  // Finished Item Updates
  const handleUpdateItem = (
    id: string,
    updates: Partial<Pick<MenuItem, 'stockQuantity' | 'trackInventory' | 'lowStockThreshold' | 'isAvailable'>>
  ) => {
    setItems((prev) =>
      prev.map((it) => {
        if (it.id !== id) return it;
        const updated = { ...it, ...updates };
        if (typeof updated.stockQuantity === 'number') {
          updated.stockQuantity = Math.max(0, updated.stockQuantity);
          if (updated.trackInventory) {
            updated.isAvailable = updated.stockQuantity > 0;
          }
        }
        return updated;
      })
    );
  };

  const handleAdjustStock = (id: string, delta: number) => {
    setItems((prev) =>
      prev.map((it) => {
        if (it.id !== id) return it;
        const currentQty = typeof it.stockQuantity === 'number' ? it.stockQuantity : 45;
        const newQty = Math.max(0, currentQty + delta);
        return {
          ...it,
          stockQuantity: newQty,
          isAvailable: it.trackInventory ? newQty > 0 : it.isAvailable,
        };
      })
    );
  };

  const handleSaveAll = async () => {
    setIsSaving(true);
    try {
      await onSaveInventory(items);
      showToast('Inventory numbers successfully saved and synced across POS & Storefront!');
      if (onRefreshData) onRefreshData();
    } catch {
      showToast('Error saving inventory.');
    } finally {
      setIsSaving(false);
    }
  };

  // Metrics
  const lowStockIngredients = ingredients.filter((ing) => ing.currentStock <= ing.lowStockThreshold);
  const depletedIngredients = ingredients.filter((ing) => ing.currentStock === 0);

  // Helper: Find which menu items consume an ingredient
  const getItemsUsingIngredient = (ingredientId: string) => {
    return items.filter((it) => it.recipe?.some((r) => r.ingredientId === ingredientId));
  };

  // Helper: Find which combo deals consume an ingredient via their bundled items
  const getDealsUsingIngredient = (ingredientId: string) => {
    return comboDeals.filter((deal) => {
      return deal.includedItems.some((inc) => {
        const item = items.find((it) => it.id === inc.menuItemId);
        return item?.recipe?.some((r) => r.ingredientId === ingredientId);
      });
    });
  };

  // Filtered raw ingredients
  const filteredIngredients = ingredients.filter((ing) => {
    if (ingredientFilter !== 'all' && ing.category !== ingredientFilter) return false;
    if (ingredientSearch.trim()) {
      const q = ingredientSearch.toLowerCase();
      return ing.name.toLowerCase().includes(q) || ing.category.toLowerCase().includes(q);
    }
    return true;
  });

  // Filtered finished items
  const filteredItems = items.filter((it) => {
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      if (!it.name.toLowerCase().includes(q) && !it.description?.toLowerCase().includes(q)) {
        return false;
      }
    }
    if (categoryFilter !== 'all' && it.categoryId !== categoryFilter) return false;
    const qty = it.stockQuantity || 0;
    const threshold = it.lowStockThreshold || 10;
    if (stockStatusFilter === 'in_stock') return qty > threshold && it.isAvailable;
    if (stockStatusFilter === 'low_stock') return qty > 0 && qty <= threshold && it.isAvailable;
    if (stockStatusFilter === 'out_of_stock') return qty === 0 || !it.isAvailable;
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-5 right-5 z-50 p-4 rounded-xl bg-amber-500 text-neutral-950 font-bold text-xs shadow-2xl flex items-center gap-2 animate-in slide-in-from-top">
          <Check className="w-4 h-4 stroke-[3]" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-emerald-500/15 via-neutral-900 to-neutral-950 border border-emerald-500/30 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold">
              <Boxes className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-heading font-black text-white flex items-center gap-2">
                <span>Inventory Recipe Manager &amp; Smart Stock Hub</span>
                <span className="text-[10px] font-mono bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full font-bold">
                  AUTO-DECREMENTS ON ORDER DELIVERY
                </span>
              </h2>
              <p className="text-xs text-neutral-400">
                Define specific ingredient breakdown for each menu item (e.g., <strong>Zinger = 1 Bun, 1 Chicken, 20g Mayo</strong>). As soon as an order is completed, raw ingredients and packaging are automatically decremented from warehouse stocks.
              </p>
            </div>
          </div>
        </div>

        {/* Sub-Tab Navigation Switcher */}
        <div className="flex items-center gap-1.5 bg-neutral-950 p-1.5 rounded-xl border border-neutral-800 flex-wrap">
          <button
            type="button"
            onClick={() => setActiveSubTab('bom_tracker')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              activeSubTab === 'bom_tracker'
                ? 'bg-amber-500 text-neutral-950 shadow-md font-black'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Inventory Recipe Manager</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveSubTab('ingredients')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              activeSubTab === 'ingredients'
                ? 'bg-emerald-500 text-neutral-950 shadow-md'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            <Cpu className="w-3.5 h-3.5" />
            <span>Shared Ingredients &amp; Packaging ({ingredients.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveSubTab('finished_items')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              activeSubTab === 'finished_items'
                ? 'bg-amber-500 text-neutral-950 shadow-md'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            <Package className="w-3.5 h-3.5" />
            <span>Finished Menu Items ({items.length})</span>
          </button>
        </div>
      </div>

      {/* Overview Stat Cards */}
      {(() => {
        const packagingItems = ingredients.filter((i) => i.category === 'packaging');
        const bakeryItems = ingredients.filter((i) => i.category === 'bakery');
        const lowPackagingAndBuns = ingredients.filter(
          (ing) => (ing.category === 'packaging' || ing.category === 'bakery') && ing.currentStock <= ing.lowStockThreshold
        );
        const zingerItem = items.find((i) => i.id === 'item-zinger-1') || items.find((i) => i.name.toLowerCase().includes('zinger')) || items[0];
        const zingerBOM = zingerItem ? calculateItemBOMStatus(zingerItem) : null;

        return (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-4 rounded-xl bg-neutral-950 border border-neutral-850">
                <span className="text-neutral-400 text-[11px] block">Dishes with Recipe BOM</span>
                <span className="text-2xl font-black text-white tabular-nums">
                  {items.filter((i) => i.recipe && i.recipe.length > 0).length} / {items.length}
                </span>
                <span className="text-[10px] text-amber-400 block mt-0.5">Zinger, Smash, Wraps, Broast</span>
              </div>

              <div className="p-4 rounded-xl bg-neutral-950 border border-neutral-850">
                <span className="text-neutral-400 text-[11px] block">Packaging &amp; Disposables</span>
                <span className="text-2xl font-black text-emerald-400 tabular-nums">
                  {packagingItems.length} Types
                </span>
                <span className="text-[10px] text-emerald-300 block mt-0.5">Boxes, Wraps, Foil, Bags</span>
              </div>

              <div className="p-4 rounded-xl bg-neutral-950 border border-neutral-850">
                <span className="text-neutral-400 text-[11px] block">Low Packaging &amp; Buns</span>
                <span className={`text-2xl font-black tabular-nums ${lowPackagingAndBuns.length > 0 ? 'text-red-400 animate-pulse' : 'text-neutral-400'}`}>
                  {lowPackagingAndBuns.length}
                </span>
                <span className="text-[10px] text-amber-300 block mt-0.5">
                  {lowPackagingAndBuns.length > 0 ? '⚠️ Finishing Soon!' : 'All Stock Healthy'}
                </span>
              </div>

              <div className="p-4 rounded-xl bg-neutral-950 border border-neutral-850">
                <span className="text-neutral-400 text-[11px] block">Zinger Packable Right Now</span>
                <span className="text-2xl font-black text-amber-400 tabular-nums">
                  {zingerBOM ? zingerBOM.maxPortions : '—'} Portions
                </span>
                <span className="text-[10px] text-neutral-400 block mt-0.5">
                  {zingerBOM?.bottleneck ? `Bottleneck: ${zingerBOM.bottleneck.name}` : 'Ready to pack'}
                </span>
              </div>
            </div>

            {/* Low Packaging & Buns Critical Warning Banner */}
            {lowPackagingAndBuns.length > 0 && (
              <div className="p-4 rounded-2xl bg-gradient-to-r from-red-950/60 via-neutral-900 to-amber-950/30 border border-red-500/40 space-y-2.5 animate-in slide-in-from-top">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-red-500/20 text-red-400 flex items-center justify-center shrink-0">
                      <AlertTriangle className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs sm:text-sm font-bold text-white flex items-center gap-1.5">
                        <span>Low Packaging &amp; Bun Alert: {lowPackagingAndBuns.length} Item{lowPackagingAndBuns.length > 1 ? 's' : ''} About to Finish!</span>
                      </h4>
                      <p className="text-[11px] text-neutral-300">
                        Kitchen orders will be blocked if clamshell boxes, tortilla wraps, or burger buns run out completely.
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleRestockPackagingAndBuns(50)}
                    className="px-3 py-1.5 rounded-lg bg-red-500 hover:bg-red-400 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-md shrink-0 active:scale-95 transition-all"
                  >
                    <Plus className="w-3.5 h-3.5 stroke-[3]" />
                    <span>Restock All Low (+50 Units)</span>
                  </button>
                </div>

                <div className="flex flex-wrap gap-2 pt-1 border-t border-neutral-800/80">
                  {lowPackagingAndBuns.map((lp) => (
                    <div
                      key={lp.id}
                      className="inline-flex items-center gap-2 px-2.5 py-1 rounded-lg bg-neutral-950/90 border border-red-500/40 text-xs"
                    >
                      <span className="font-semibold text-white">{lp.name}</span>
                      <span className="font-mono text-red-400 font-bold bg-red-500/10 px-1.5 py-0.5 rounded text-[11px]">
                        {lp.currentStock} {lp.unit} left (Min {lp.lowStockThreshold})
                      </span>
                      <button
                        type="button"
                        onClick={() => handleAdjustIngredientStock(lp.id, 50)}
                        className="px-1.5 py-0.5 rounded bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 text-[10px] font-bold cursor-pointer"
                        title="Add 50 units"
                      >
                        +50
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        );
      })()}

      {/* ========================================================================= */}
      {/* VIEW 1: ITEM RECIPE & PACKAGING BOM TRACKER (ZINGER & ALL DISHES) */}
      {/* ========================================================================= */}
      {activeSubTab === 'bom_tracker' && (
        <div className="space-y-4 animate-in fade-in">
          {/* Controls Bar for BOM Tracker */}
          <div className="p-4 rounded-xl bg-neutral-950 border border-neutral-800 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-2 w-full sm:w-auto flex-1">
              <div className="relative flex-1 sm:max-w-md">
                <Search className="w-3.5 h-3.5 text-neutral-500 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Filter dishes or materials (e.g. Zinger, Bun, Tortilla, Box)..."
                  value={bomSearch}
                  onChange={(e) => setBomSearch(e.target.value)}
                  className="w-full bg-neutral-900 border border-neutral-800 focus:border-amber-500 rounded-lg pl-8 pr-3 py-1.5 text-xs text-white"
                />
              </div>

              {bomSearch && (
                <button
                  type="button"
                  onClick={() => setBomSearch('')}
                  className="px-2 py-1 text-xs text-neutral-400 hover:text-white"
                >
                  Clear
                </button>
              )}
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto justify-end flex-wrap">
              <button
                type="button"
                onClick={() => handleRestockPackagingAndBuns(50)}
                className="px-3 py-1.5 bg-neutral-900 hover:bg-neutral-800 text-amber-400 hover:text-amber-300 border border-neutral-800 rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-sm active:scale-95"
                title="Replenish all low packaging boxes, wrap sheets and buns"
              >
                <Plus className="w-3.5 h-3.5 stroke-[3]" />
                <span>Restock Packaging &amp; Buns (+50)</span>
              </button>

              <button
                type="button"
                onClick={() => handleRestockAllIngredients(100)}
                className="px-3 py-1.5 bg-neutral-900 hover:bg-neutral-800 text-neutral-300 hover:text-white border border-neutral-800 rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer active:scale-95"
                title="Restock all shared ingredients to at least 100"
              >
                <RefreshCw className="w-3.5 h-3.5 text-emerald-400" />
                <span>Restock All (100)</span>
              </button>
            </div>
          </div>

          {/* Quick Notice */}
          <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/25 flex items-start gap-2 text-xs">
            <Sparkles className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <p className="font-bold text-amber-300">
                Live Assembly &amp; Packaging BOM Tracker Active
              </p>
              <p className="text-[11px] text-neutral-300 leading-snug">
                Each card below tracks all physical components required to prepare and pack that dish — including patties, buns, tortillas, wraps, clamshell boxes, and napkins. Ordering any dish automatically depletes all linked components in real-time.
              </p>
            </div>
          </div>

          {/* Dish BOM Cards Grid */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            {items
              .filter((it) => {
                if (!bomSearch.trim()) return true;
                const q = bomSearch.toLowerCase();
                const nameMatch = it.name.toLowerCase().includes(q);
                const ingMatch = it.recipe?.some((r) => {
                  const ing = ingredients.find((i) => i.id === r.ingredientId);
                  return ing?.name.toLowerCase().includes(q) || ing?.category.toLowerCase().includes(q);
                });
                return nameMatch || ingMatch;
              })
              .map((item) => {
                const bomStatus = calculateItemBOMStatus(item);
                const hasRecipe = item.recipe && item.recipe.length > 0;
                const isOutOfStock = bomStatus.maxPortions === 0;
                const isLow = bomStatus.maxPortions > 0 && bomStatus.maxPortions <= 15;

                return (
                  <div
                    key={item.id}
                    className={`p-4 rounded-2xl bg-neutral-950 border flex flex-col justify-between transition-all ${
                      isOutOfStock
                        ? 'border-red-500/50 bg-red-950/10'
                        : isLow
                        ? 'border-amber-500/40 bg-amber-950/10'
                        : 'border-neutral-850 hover:border-amber-500/30'
                    }`}
                  >
                    <div className="space-y-3.5">
                      {/* Dish Header */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <img
                            src={item.image}
                            alt={item.name}
                            referrerPolicy="no-referrer"
                            className="w-12 h-12 rounded-xl object-cover bg-neutral-900 border border-neutral-800 shrink-0"
                          />
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="text-[10px] font-mono text-neutral-500 uppercase font-bold">
                                {categories.find((c) => c.id === item.categoryId)?.name || 'Dish'}
                              </span>
                              {item.id === 'item-zinger-1' && (
                                <span className="text-[9px] font-bold bg-amber-500/20 text-amber-400 px-1.5 py-0.2 rounded border border-amber-500/30">
                                  ZINGER MASTER
                                </span>
                              )}
                            </div>
                            <h3 className="text-sm font-bold text-white truncate">{item.name}</h3>
                            <span className="font-mono text-xs font-bold text-amber-400">
                              Rs. {item.price.toLocaleString()}
                            </span>
                          </div>
                        </div>

                        {/* Maximum Portions Badge */}
                        <div className="text-right shrink-0">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-black shadow-sm ${
                              isOutOfStock
                                ? 'bg-red-500 text-white animate-pulse'
                                : isLow
                                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                                : 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                            }`}
                          >
                            <span>{bomStatus.maxPortions} Portions</span>
                          </span>
                          <span className="block text-[9.5px] text-neutral-400 mt-0.5">
                            {isOutOfStock ? '0 Available (Blocked)' : 'Can Make & Pack Now'}
                          </span>
                        </div>
                      </div>

                      {/* Bottleneck Warning Bar if limited */}
                      {hasRecipe && bomStatus.bottleneckName && (
                        <div
                          className={`p-2 rounded-xl border flex items-center justify-between text-xs gap-2 ${
                            isOutOfStock
                              ? 'bg-red-950/60 border-red-500/40 text-red-200'
                              : isLow
                              ? 'bg-amber-950/50 border-amber-500/35 text-amber-200'
                              : 'bg-neutral-900/80 border-neutral-800 text-neutral-300'
                          }`}
                        >
                          <div className="flex items-center gap-1.5 truncate">
                            <AlertTriangle className={`w-3.5 h-3.5 shrink-0 ${isOutOfStock ? 'text-red-400' : isLow ? 'text-amber-400' : 'text-neutral-400'}`} />
                            <span className="truncate text-[11px]">
                              <strong>Bottleneck Component:</strong> {bomStatus.bottleneckName}
                            </span>
                          </div>

                          <button
                            type="button"
                            onClick={() => {
                              if (bomStatus.bottleneck) {
                                handleAdjustIngredientStock(bomStatus.bottleneck.id, 50);
                              }
                            }}
                            className="shrink-0 px-2 py-0.5 rounded bg-neutral-800 hover:bg-neutral-700 text-[10.5px] font-bold text-amber-400 border border-neutral-750 transition-colors"
                          >
                            +50 {bomStatus.bottleneck?.unit || 'Units'}
                          </button>
                        </div>
                      )}

                      {/* Component & Packaging Requirements Breakdown */}
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between text-[11px] font-bold text-neutral-400 border-b border-neutral-850 pb-1">
                          <span>Required Materials &amp; Packaging ({bomStatus.components.length})</span>
                          <span>Warehouse Stock</span>
                        </div>

                        {bomStatus.components.length === 0 ? (
                          <div className="p-3 text-center rounded-xl bg-neutral-900/40 border border-dashed border-neutral-800 text-neutral-400 text-xs">
                            <p>No ingredients linked yet.</p>
                            <button
                              type="button"
                              onClick={() => handleOpenRecipeModal(item)}
                              className="text-amber-400 hover:underline font-bold mt-1 inline-block"
                            >
                              + Add Recipe &amp; Packaging BOM
                            </button>
                          </div>
                        ) : (
                          <div className="space-y-1.5">
                            {bomStatus.components.map((comp, idx) => (
                              <div
                                key={idx}
                                className={`p-2 rounded-xl border flex items-center justify-between text-xs transition-colors ${
                                  comp.isOut
                                    ? 'bg-red-950/25 border-red-500/40'
                                    : comp.isLow
                                    ? 'bg-amber-950/20 border-amber-500/30'
                                    : 'bg-neutral-900/50 border-neutral-850'
                                }`}
                              >
                                <div className="flex items-center gap-2 min-w-0 pr-2">
                                  <span
                                    className={`px-1.5 py-0.5 rounded text-[9px] uppercase font-bold tracking-wider shrink-0 ${
                                      comp.category === 'packaging'
                                        ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                                        : comp.category === 'bakery'
                                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                        : comp.category === 'proteins'
                                        ? 'bg-red-500/20 text-red-300 border border-red-500/30'
                                        : 'bg-neutral-800 text-neutral-300'
                                    }`}
                                  >
                                    {comp.category}
                                  </span>

                                  <div className="min-w-0">
                                    <p className="font-semibold text-white truncate text-[11.5px] leading-tight">
                                      {comp.name}
                                    </p>
                                    <p className="text-[10px] text-neutral-400">
                                      Requires {comp.requiredQty}x {comp.unit} per dish
                                    </p>
                                  </div>
                                </div>

                                <div className="flex items-center gap-2 shrink-0">
                                  <div className="text-right">
                                    <span
                                      className={`font-mono font-bold text-xs tabular-nums block ${
                                        comp.isOut ? 'text-red-400 font-black' : comp.isLow ? 'text-amber-400' : 'text-emerald-400'
                                      }`}
                                    >
                                      {comp.currentStock} {comp.unit}
                                    </span>
                                    <span className="text-[9.5px] text-neutral-500 block">
                                      max {comp.portionsCanMake} orders
                                    </span>
                                  </div>

                                  <button
                                    type="button"
                                    onClick={() => comp.ingredient && handleAdjustIngredientStock(comp.ingredient.id, 25)}
                                    className="px-1.5 py-0.5 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white border border-neutral-750 text-[10px] font-bold cursor-pointer"
                                    title={`Add 25 ${comp.unit}`}
                                  >
                                    +25
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Card Footer Actions */}
                    <div className="pt-3 mt-3 border-t border-neutral-850 flex items-center justify-between gap-2 flex-wrap">
                      <button
                        type="button"
                        onClick={() => handleOpenRecipeModal(item)}
                        className="px-3 py-1.5 rounded-lg bg-neutral-900 hover:bg-neutral-800 text-neutral-300 hover:text-white border border-neutral-800 text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors"
                        title="Configure ingredients and packaging boxes/wraps for this item"
                      >
                        <ChefHat className="w-3.5 h-3.5 text-amber-400" />
                        <span>Edit Recipe &amp; Packaging BOM</span>
                      </button>

                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] text-neutral-400 hidden sm:inline">Restock Kits:</span>
                        <button
                          type="button"
                          onClick={() => handleRestockItemKit(item, 25)}
                          className="px-2.5 py-1.5 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 text-xs font-bold cursor-pointer transition-all active:scale-95"
                          title="Restock +25 portions of all linked components"
                        >
                          +25 Kits
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRestockItemKit(item, 50)}
                          className="px-2.5 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-black text-xs cursor-pointer shadow-sm transition-all active:scale-95"
                          title="Restock +50 portions of all linked components"
                        >
                          +50 Kits
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* VIEW 2: SHARED RAW & PACKAGING INGREDIENTS HUB */}
      {/* ========================================================================= */}
      {activeSubTab === 'ingredients' && (
        <div className="space-y-4 animate-in fade-in">
          {/* Controls Bar */}
          <div className="p-4 rounded-xl bg-neutral-950 border border-neutral-800 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-2 w-full sm:w-auto flex-wrap flex-1">
              <div className="relative flex-1 sm:w-64">
                <Search className="w-3.5 h-3.5 text-neutral-500 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Search ingredient (e.g. Zinger, Bun, Box, Wrap)..."
                  value={ingredientSearch}
                  onChange={(e) => setIngredientSearch(e.target.value)}
                  className="w-full bg-neutral-900 border border-neutral-800 focus:border-emerald-500 rounded-lg pl-8 pr-3 py-1.5 text-xs text-white"
                />
              </div>

              <select
                value={ingredientFilter}
                onChange={(e) => setIngredientFilter(e.target.value as any)}
                className="bg-neutral-900 border border-neutral-800 focus:border-emerald-500 rounded-lg px-2.5 py-1.5 text-xs text-white"
              >
                <option value="all">All Categories ({ingredients.length})</option>
                <option value="packaging">📦 Packaging &amp; Boxes ({ingredients.filter((i) => i.category === 'packaging').length})</option>
                <option value="bakery">🍞 Bakery (Buns &amp; Tortillas) ({ingredients.filter((i) => i.category === 'bakery').length})</option>
                <option value="proteins">🍗 Proteins (Fillets &amp; Patties) ({ingredients.filter((i) => i.category === 'proteins').length})</option>
                <option value="produce">🥗 Produce &amp; Fries ({ingredients.filter((i) => i.category === 'produce').length})</option>
                <option value="sauces">🥫 Sauces &amp; Oils ({ingredients.filter((i) => i.category === 'sauces').length})</option>
                <option value="dairy">🧀 Dairy (Cheese Slices) ({ingredients.filter((i) => i.category === 'dairy').length})</option>
                <option value="beverages">🥤 Beverages &amp; Shakes ({ingredients.filter((i) => i.category === 'beverages').length})</option>
              </select>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
              <button
                type="button"
                onClick={() => handleRestockAllIngredients(100)}
                className="px-3 py-1.5 bg-neutral-900 hover:bg-neutral-800 text-neutral-300 hover:text-white border border-neutral-800 rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                title="Restock all raw ingredients to at least 100 units"
              >
                <RefreshCw className="w-3.5 h-3.5 text-emerald-400" />
                <span>Restock All (100)</span>
              </button>

              <button
                type="button"
                onClick={() => setIsAddIngModalOpen(true)}
                className="px-3.5 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-bold text-xs rounded-lg flex items-center gap-1.5 cursor-pointer shadow-md"
              >
                <Plus className="w-3.5 h-3.5 stroke-[3]" />
                <span>Add Ingredient</span>
              </button>
            </div>
          </div>

          {/* Raw Ingredients Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {filteredIngredients.map((ing) => {
              const usedInItems = getItemsUsingIngredient(ing.id);
              const isLow = ing.currentStock <= ing.lowStockThreshold;
              const isOut = ing.currentStock === 0;

              return (
                <div
                  key={ing.id}
                  className={`p-4 rounded-xl bg-neutral-950 border flex flex-col justify-between transition-all ${
                    isOut
                      ? 'border-red-500/50 bg-red-950/10'
                      : isLow
                      ? 'border-amber-500/40 bg-amber-950/10'
                      : 'border-neutral-850 hover:border-emerald-500/30'
                  }`}
                >
                  <div className="space-y-3">
                    {/* Header: Name, Category, Status */}
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="text-[10px] font-mono uppercase text-neutral-500 font-bold">
                          {ing.category}
                        </span>
                        <h3 className="text-xs sm:text-sm font-bold text-white leading-snug">
                          {ing.name}
                        </h3>
                      </div>

                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          isOut
                            ? 'bg-red-500 text-white font-black animate-pulse'
                            : isLow
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                            : 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/25'
                        }`}
                      >
                        {isOut ? 'DEPLETED' : isLow ? 'LOW STOCK' : 'OPTIMAL'}
                      </span>
                    </div>

                    {/* Stock Count Display & Quick Adjustment */}
                    <div className="p-2.5 rounded-xl bg-neutral-900 border border-neutral-800 space-y-2">
                      <div className="flex items-baseline justify-between">
                        <span className="text-[11px] text-neutral-400">Available Stock:</span>
                        <div className="flex items-baseline gap-1">
                          <span className={`text-xl font-mono font-black tabular-nums ${isOut ? 'text-red-400' : isLow ? 'text-amber-400' : 'text-emerald-400'}`}>
                            {ing.currentStock}
                          </span>
                          <span className="text-xs text-neutral-400 font-mono">{ing.unit}</span>
                        </div>
                      </div>

                      {/* Stock Health Progress Bar */}
                      <div className="w-full bg-neutral-950 rounded-full h-1.5 overflow-hidden border border-neutral-800">
                        <div
                          className={`h-full transition-all duration-300 ${
                            isOut ? 'bg-red-500' : isLow ? 'bg-amber-400' : 'bg-emerald-500'
                          }`}
                          style={{
                            width: `${Math.min(100, (ing.currentStock / (ing.lowStockThreshold * 3)) * 100)}%`,
                          }}
                        />
                      </div>

                      {/* Custom Stock Number Input & Quick Adjust Controls */}
                      <div className="pt-2 space-y-1.5">
                        <div className="flex items-center gap-1.5">
                          <input
                            type="number"
                            min={0}
                            placeholder="Exact / add #"
                            value={customStockInputs[ing.id] ?? ''}
                            onChange={(e) =>
                              setCustomStockInputs((prev) => ({
                                ...prev,
                                [ing.id]: e.target.value,
                              }))
                            }
                            className="flex-1 min-w-0 bg-neutral-950 border border-neutral-800 focus:border-amber-500 rounded-lg px-2 py-1 text-xs text-white font-mono placeholder-neutral-500"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              const val = parseInt(customStockInputs[ing.id] || '0', 10);
                              if (val > 0) {
                                handleAdjustIngredientStock(ing.id, val);
                                setCustomStockInputs((prev) => ({ ...prev, [ing.id]: '' }));
                              }
                            }}
                            className="px-2.5 py-1 bg-amber-500 hover:bg-amber-400 text-neutral-950 text-xs font-bold rounded-lg cursor-pointer transition-colors shadow-xs shrink-0"
                            title="Add this custom number to stock"
                          >
                            + Add
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              const val = parseInt(customStockInputs[ing.id] || '0', 10);
                              if (!isNaN(val) && val >= 0) {
                                handleSetIngredientStock(ing.id, val);
                                showToast(`${ing.name} stock set to ${val} ${ing.unit}`);
                                setCustomStockInputs((prev) => ({ ...prev, [ing.id]: '' }));
                              }
                            }}
                            className="px-2.5 py-1 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-lg cursor-pointer transition-colors shadow-xs shrink-0"
                            title="Set exact stock to this number"
                          >
                            = Set
                          </button>
                        </div>

                        {/* Quick Delta Buttons */}
                        <div className="flex items-center justify-between gap-1 text-[10px] font-mono">
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => handleAdjustIngredientStock(ing.id, -10)}
                              className="px-1.5 py-0.5 bg-neutral-950 hover:bg-neutral-800 text-neutral-300 rounded border border-neutral-800 cursor-pointer"
                              title="Deduct 10"
                            >
                              -10
                            </button>
                            <button
                              type="button"
                              onClick={() => handleAdjustIngredientStock(ing.id, -1)}
                              className="px-1.5 py-0.5 bg-neutral-950 hover:bg-neutral-800 text-neutral-300 rounded border border-neutral-800 cursor-pointer"
                              title="Deduct 1"
                            >
                              -1
                            </button>
                          </div>
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => handleAdjustIngredientStock(ing.id, 1)}
                              className="px-1.5 py-0.5 bg-neutral-950 hover:bg-neutral-800 text-emerald-400 rounded border border-neutral-800 font-bold cursor-pointer"
                              title="Add 1"
                            >
                              +1
                            </button>
                            <button
                              type="button"
                              onClick={() => handleAdjustIngredientStock(ing.id, 10)}
                              className="px-2 py-0.5 bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 rounded border border-emerald-500/30 font-bold cursor-pointer"
                              title="Add 10"
                            >
                              +10
                            </button>
                            <button
                              type="button"
                              onClick={() => handleAdjustIngredientStock(ing.id, 50)}
                              className="px-2 py-0.5 bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-black rounded cursor-pointer shadow-xs"
                              title="Add 50"
                            >
                              +50
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Shared Items Mapping: Where is this patty / ingredient used? */}
                    <div className="space-y-1.5 text-xs">
                      <span className="text-[10px] uppercase font-bold text-neutral-400 block tracking-wider">
                        🔗 Shared Recipe Usage ({usedInItems.length} Dishes):
                      </span>

                      {usedInItems.length === 0 ? (
                        <p className="text-[11px] text-neutral-500 italic">
                          Not assigned to any menu recipe yet. Click "Finished Menu Items" tab to map.
                        </p>
                      ) : (
                        <div className="flex flex-wrap gap-1">
                          {usedInItems.map((ui) => {
                            const req = ui.recipe?.find((r) => r.ingredientId === ing.id)?.quantity || 1;
                            const maxPossible = Math.floor(ing.currentStock / req);
                            return (
                              <span
                                key={ui.id}
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-neutral-900 border border-neutral-800 text-[10.5px] text-neutral-300"
                                title={`Each ${ui.name} consumes ${req}x ${ing.unit}. Max cookable right now: ${maxPossible} portions`}
                              >
                                <span className="text-amber-400 font-mono font-bold">{req}x</span>
                                <span className="truncate max-w-[140px]">{ui.name}</span>
                                <span className="text-[9px] font-mono text-emerald-400 bg-neutral-950 px-1 rounded">
                                  max {maxPossible}
                                </span>
                              </span>
                            );
                          })}
                        </div>
                      )}

                      {/* Deals using this ingredient */}
                      {(() => {
                        const usedDeals = getDealsUsingIngredient(ing.id);
                        if (usedDeals.length === 0) return null;
                        return (
                          <div className="pt-2 space-y-1 border-t border-neutral-900">
                            <span className="text-[9.5px] uppercase font-bold text-amber-400 block tracking-wider flex items-center gap-1">
                              <Sparkles className="w-2.5 h-2.5 text-amber-400 shrink-0" />
                              <span>In Deals ({usedDeals.length}):</span>
                            </span>
                            <div className="flex flex-wrap gap-1">
                              {usedDeals.map((deal) => (
                                <span
                                  key={deal.id}
                                  className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-500/10 border border-amber-500/25 text-[10px] text-amber-300 font-medium"
                                  title={`Included in combo deal: ${deal.title}`}
                                >
                                  <span>{deal.title}</span>
                                </span>
                              ))}
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  </div>

                  {/* Footer & Delete */}
                  <div className="pt-3 mt-3 border-t border-neutral-900 flex items-center justify-between text-[11px] text-neutral-500">
                    <span>Threshold: {ing.lowStockThreshold} {ing.unit}</span>
                    <button
                      type="button"
                      onClick={() => handleDeleteIngredient(ing.id)}
                      className="text-neutral-500 hover:text-red-400 p-1 rounded cursor-pointer"
                      title="Delete ingredient"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* VIEW 2: FINISHED MENU ITEMS STOCK & RECIPE MAPPING */}
      {/* ========================================================================= */}
      {activeSubTab === 'finished_items' && (
        <div className="space-y-4 animate-in fade-in">
          {/* Controls Bar */}
          <div className="p-4 rounded-xl bg-neutral-950 border border-neutral-800 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-2 w-full sm:w-auto flex-wrap">
              <div className="relative flex-1 sm:w-60">
                <Search className="w-3.5 h-3.5 text-neutral-500 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Search menu dish..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-neutral-900 border border-neutral-800 focus:border-amber-500 rounded-lg pl-8 pr-3 py-1.5 text-xs text-white"
                />
              </div>

              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="bg-neutral-900 border border-neutral-800 focus:border-amber-500 rounded-lg px-2.5 py-1.5 text-xs text-white"
              >
                <option value="all">All Categories</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>

              <select
                value={stockStatusFilter}
                onChange={(e) => setStockStatusFilter(e.target.value as any)}
                className="bg-neutral-900 border border-neutral-800 focus:border-amber-500 rounded-lg px-2.5 py-1.5 text-xs text-white"
              >
                <option value="all">All Stock Statuses</option>
                <option value="in_stock">In Stock</option>
                <option value="low_stock">Low Stock Warning</option>
                <option value="out_of_stock">Out of Stock (86'd)</option>
              </select>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
              <button
                type="button"
                onClick={handleSaveAll}
                disabled={isSaving}
                className="px-4 py-2 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-neutral-950 font-bold text-xs rounded-xl flex items-center gap-1.5 cursor-pointer shadow-md"
              >
                <Save className="w-3.5 h-3.5 stroke-[2.5]" />
                <span>{isSaving ? 'Saving...' : 'Save All Numbers'}</span>
              </button>
            </div>
          </div>

          {/* Items Table */}
          <div className="rounded-xl bg-neutral-950 border border-neutral-800 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-neutral-900 text-neutral-400 text-[10px] uppercase tracking-wider border-b border-neutral-800">
                  <tr>
                    <th className="p-3">Dish / Item</th>
                    <th className="p-3">Category</th>
                    <th className="p-3">Recipe Link (Shared Ingredients)</th>
                    <th className="p-3 text-center">Stock Available</th>
                    <th className="p-3 text-center">Quick Adjust</th>
                    <th className="p-3 text-center">Recipe Link</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-900">
                  {filteredItems.map((it) => {
                    const cat = categories.find((c) => c.id === it.categoryId);
                    const qty = it.stockQuantity || 0;
                    const threshold = it.lowStockThreshold || 10;
                    const isLow = qty <= threshold && qty > 0;
                    const isOut = qty === 0 || !it.isAvailable;

                    return (
                      <tr key={it.id} className="hover:bg-neutral-900/50 transition-colors">
                        <td className="p-3">
                          <div className="flex items-center gap-2.5">
                            <div className="w-9 h-9 rounded-lg overflow-hidden bg-neutral-900 shrink-0 border border-neutral-800">
                              <img src={it.image} alt={it.name} className="w-full h-full object-cover" />
                            </div>
                            <div>
                              <span className="font-bold text-white block">{it.name}</span>
                              <span className="text-[10px] text-neutral-400 font-mono">
                                Rs. {it.price.toLocaleString()}
                              </span>
                            </div>
                          </div>
                        </td>

                        <td className="p-3 text-neutral-400">
                          <span className="px-2 py-0.5 rounded-full bg-neutral-900 border border-neutral-800 text-[10px]">
                            {cat?.name || it.categoryId}
                          </span>
                        </td>

                        {/* Linked Recipe Ingredients */}
                        <td className="p-3">
                          {it.recipe && it.recipe.length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {it.recipe.map((r, i) => {
                                const ing = ingredients.find((ig) => ig.id === r.ingredientId);
                                return (
                                  <span
                                    key={i}
                                    className="px-1.5 py-0.5 rounded bg-neutral-900 border border-neutral-800 text-[10px] text-neutral-300 font-mono"
                                  >
                                    <strong className="text-amber-400">{r.quantity}x</strong>{' '}
                                    {ing?.name || r.ingredientId}
                                  </span>
                                );
                              })}
                            </div>
                          ) : (
                            <span className="text-neutral-500 italic text-[11px]">Direct stock only</span>
                          )}
                        </td>

                        {/* Stock Number */}
                        <td className="p-3 text-center">
                          <div className="inline-flex items-center gap-1.5">
                            <input
                              type="number"
                              min={0}
                              value={qty}
                              onChange={(e) =>
                                handleUpdateItem(it.id, {
                                  stockQuantity: parseInt(e.target.value, 10) || 0,
                                })
                              }
                              className={`w-16 px-2 py-1 rounded-lg text-center font-mono font-bold text-xs border ${
                                isOut
                                  ? 'bg-red-950/40 border-red-500/50 text-red-400'
                                  : isLow
                                  ? 'bg-amber-950/40 border-amber-500/50 text-amber-400'
                                  : 'bg-neutral-900 border-neutral-800 text-white'
                              }`}
                            />
                            <span className="text-[10px] text-neutral-500">{it.stockUnit || 'portions'}</span>
                          </div>
                        </td>

                        {/* Quick Adjust Buttons */}
                        <td className="p-3 text-center">
                          <div className="inline-flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => handleAdjustStock(it.id, -5)}
                              className="px-1.5 py-0.5 bg-neutral-900 hover:bg-neutral-850 text-neutral-400 rounded border border-neutral-800 text-[10px] cursor-pointer"
                            >
                              -5
                            </button>
                            <button
                              type="button"
                              onClick={() => handleAdjustStock(it.id, 5)}
                              className="px-1.5 py-0.5 bg-neutral-900 hover:bg-neutral-850 text-amber-400 rounded border border-neutral-800 text-[10px] font-bold cursor-pointer"
                            >
                              +5
                            </button>
                            <button
                              type="button"
                              onClick={() => handleAdjustStock(it.id, 20)}
                              className="px-2 py-0.5 bg-neutral-900 hover:bg-neutral-850 text-emerald-400 rounded border border-neutral-800 text-[10px] font-bold cursor-pointer"
                            >
                              +20
                            </button>
                          </div>
                        </td>

                        {/* Edit Recipe Link */}
                        <td className="p-3 text-center">
                          <button
                            type="button"
                            onClick={() => handleOpenRecipeModal(it)}
                            className="px-2.5 py-1 bg-neutral-900 hover:bg-neutral-850 text-neutral-300 hover:text-white border border-neutral-800 rounded-lg text-[11px] font-semibold flex items-center gap-1 mx-auto cursor-pointer"
                          >
                            <Edit2 className="w-3 h-3 text-amber-400" />
                            <span>Edit Recipe</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ================= ADD INGREDIENT MODAL ================= */}
      {isAddIngModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-950/85 backdrop-blur-sm">
          <div className="w-full max-w-md bg-neutral-900 border border-neutral-800 rounded-2xl shadow-2xl p-5 space-y-4 animate-in zoom-in-95 text-xs">
            <div className="flex items-center justify-between pb-2 border-b border-neutral-800">
              <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                <Plus className="w-4 h-4 text-emerald-400" />
                <span>Add Shared Raw Ingredient</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsAddIngModalOpen(false)}
                className="text-neutral-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddNewIngredient} className="space-y-3">
              <div>
                <label className="text-[11px] text-neutral-300 block mb-1">
                  Ingredient Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Zinger Crispy Chicken Fillet / Patty"
                  value={newIngName}
                  onChange={(e) => setNewIngName(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-800 focus:border-emerald-500 rounded-lg px-2.5 py-1.5 text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] text-neutral-300 block mb-1">Category</label>
                  <select
                    value={newIngCategory}
                    onChange={(e) => setNewIngCategory(e.target.value as any)}
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-2 py-1.5 text-white"
                  >
                    <option value="packaging">Packaging &amp; Disposables (Boxes, Wraps, Foil, Bags)</option>
                    <option value="bakery">Bakery (Buns/Tortillas/Rolls)</option>
                    <option value="proteins">Proteins (Patties/Fillets)</option>
                    <option value="dairy">Dairy (Cheese Slices)</option>
                    <option value="produce">Produce &amp; Fries</option>
                    <option value="sauces">Sauces &amp; Oils</option>
                    <option value="beverages">Beverages &amp; Shakes</option>
                  </select>
                </div>

                <div>
                  <label className="text-[11px] text-neutral-300 block mb-1">Stock Unit</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. patties, buns, slices"
                    value={newIngUnit}
                    onChange={(e) => setNewIngUnit(e.target.value)}
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-2 py-1.5 text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] text-neutral-300 block mb-1">
                    Initial Stock Count
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={newIngStock}
                    onChange={(e) => setNewIngStock(parseInt(e.target.value, 10) || 0)}
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-2 py-1.5 text-white font-mono"
                  />
                </div>

                <div>
                  <label className="text-[11px] text-neutral-300 block mb-1">
                    Low Stock Threshold
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={newIngThreshold}
                    onChange={(e) => setNewIngThreshold(parseInt(e.target.value, 10) || 10)}
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-2 py-1.5 text-white font-mono"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-neutral-800">
                <button
                  type="button"
                  onClick={() => setIsAddIngModalOpen(false)}
                  className="px-3 py-1.5 bg-neutral-800 text-white rounded-lg text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-bold rounded-lg text-xs"
                >
                  Save Ingredient
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= EDIT RECIPE MODAL ================= */}
      {recipeModalItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-950/85 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-neutral-900 border border-neutral-800 rounded-2xl shadow-2xl p-5 space-y-4 animate-in zoom-in-95 text-xs">
            <div className="flex items-center justify-between pb-2 border-b border-neutral-800">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                  <ChefHat className="w-4 h-4 text-amber-400" />
                  <span>Recipe Components: {recipeModalItem.name}</span>
                </h3>
                <p className="text-[11px] text-neutral-400">
                  Select which raw ingredients this dish consumes when ordered.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setRecipeModalItem(null)}
                className="text-neutral-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2.5">
              {editingRecipe.map((rec, i) => (
                <div key={i} className="flex items-center gap-2 bg-neutral-950 p-2 rounded-xl border border-neutral-800">
                  <select
                    value={rec.ingredientId}
                    onChange={(e) => handleUpdateRecipeIngredient(i, e.target.value, rec.quantity)}
                    className="flex-1 bg-neutral-900 border border-neutral-750 rounded-lg px-2 py-1 text-white text-xs"
                  >
                    {ingredients.map((ing) => (
                      <option key={ing.id} value={ing.id}>
                        {ing.name} ({ing.unit})
                      </option>
                    ))}
                  </select>

                  <div className="flex items-center gap-1">
                    <span className="text-neutral-400 text-[10px]">Qty:</span>
                    <input
                      type="number"
                      min={1}
                      max={10}
                      value={rec.quantity}
                      onChange={(e) =>
                        handleUpdateRecipeIngredient(
                          i,
                          rec.ingredientId,
                          parseInt(e.target.value, 10) || 1
                        )
                      }
                      className="w-12 bg-neutral-900 border border-neutral-750 rounded-lg px-1 py-1 text-center font-mono font-bold text-white"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={() => handleRemoveRecipeIngredient(i)}
                    className="p-1 text-neutral-500 hover:text-red-400 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}

              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleAddRecipeIngredient}
                  className="flex-1 py-1.5 border border-dashed border-neutral-750 hover:border-amber-500/50 rounded-xl text-neutral-300 hover:text-white flex items-center justify-center gap-1 cursor-pointer transition-colors bg-neutral-950"
                >
                  <Plus className="w-3.5 h-3.5 text-amber-400" />
                  <span>Add Existing Ingredient</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowQuickCustomIng((prev) => !prev)}
                  className="py-1.5 px-3 bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-300 rounded-xl flex items-center gap-1 cursor-pointer transition-colors font-bold"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  <span>+ Custom Component</span>
                </button>
              </div>

              {/* Quick Inline Custom Ingredient Creator */}
              {showQuickCustomIng && (
                <div className="p-3 rounded-xl bg-neutral-950 border border-amber-500/30 space-y-2.5 animate-in fade-in">
                  <div className="flex items-center justify-between pb-1.5 border-b border-neutral-800">
                    <span className="text-[11px] font-bold text-amber-400 flex items-center gap-1">
                      <Sparkles className="w-3 h-3 text-amber-400" />
                      Define New Custom Recipe Component
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowQuickCustomIng(false)}
                      className="text-neutral-500 hover:text-white"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-[11px]">
                    <div className="col-span-2">
                      <label className="text-neutral-400 block mb-0.5">Component / Item Name:</label>
                      <input
                        type="text"
                        placeholder="e.g. Pure Dairy Butter, MSG Umami Glaze, Truffle Mayo..."
                        value={quickCustomName}
                        onChange={(e) => setQuickCustomName(e.target.value)}
                        className="w-full bg-neutral-900 border border-neutral-750 rounded-lg px-2.5 py-1 text-white text-xs"
                      />
                    </div>
                    <div>
                      <label className="text-neutral-400 block mb-0.5">Category:</label>
                      <select
                        value={quickCustomCategory}
                        onChange={(e) => setQuickCustomCategory(e.target.value as any)}
                        className="w-full bg-neutral-900 border border-neutral-750 rounded-lg px-2 py-1 text-white text-xs"
                      >
                        <option value="sauces">Sauces &amp; Glazes</option>
                        <option value="dairy">Dairy &amp; Butter</option>
                        <option value="bakery">Bakery &amp; Buns</option>
                        <option value="proteins">Proteins &amp; Cuts</option>
                        <option value="produce">Produce &amp; Veggies</option>
                        <option value="packaging">Packaging &amp; Wraps</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-neutral-400 block mb-0.5">Unit:</label>
                      <input
                        type="text"
                        placeholder="portions, pats, grams..."
                        value={quickCustomUnit}
                        onChange={(e) => setQuickCustomUnit(e.target.value)}
                        className="w-full bg-neutral-900 border border-neutral-750 rounded-lg px-2 py-1 text-white text-xs"
                      />
                    </div>
                    <div>
                      <label className="text-neutral-400 block mb-0.5">Initial Stock:</label>
                      <input
                        type="number"
                        min={0}
                        value={quickCustomStock}
                        onChange={(e) => setQuickCustomStock(Math.max(0, parseInt(e.target.value, 10) || 0))}
                        className="w-full bg-neutral-900 border border-neutral-750 rounded-lg px-2 py-1 text-white text-xs font-mono"
                      />
                    </div>
                    <div className="flex items-end">
                      <button
                        type="button"
                        onClick={handleCreateAndAddQuickCustomIngredient}
                        className="w-full py-1.5 bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold rounded-lg text-xs flex items-center justify-center gap-1 cursor-pointer shadow"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>Add to Recipe</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Custom Prep Instructions / Recipe Notes */}
              <div className="pt-2 border-t border-neutral-800 space-y-1">
                <label className="text-neutral-300 font-bold flex items-center justify-between text-[11px]">
                  <span>Chef Prep Notes &amp; Cooking Instructions:</span>
                  <span className="text-[10px] text-neutral-500 font-normal">Shown to line cooks</span>
                </label>
                <textarea
                  rows={2}
                  value={recipeNotes}
                  onChange={(e) => setRecipeNotes(e.target.value)}
                  placeholder="e.g. Sear patty on 400°F chrome flat-top. Toast potato brioche with real butter. Season with signature 5-spice umami blend."
                  className="w-full bg-neutral-950 border border-neutral-750 rounded-xl p-2 text-white text-xs placeholder-neutral-500 focus:outline-none focus:border-amber-500 resize-none"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-neutral-800">
              <button
                type="button"
                onClick={() => setRecipeModalItem(null)}
                className="px-3 py-1.5 bg-neutral-800 text-white rounded-lg text-xs cursor-pointer hover:bg-neutral-750"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveRecipe}
                className="px-4 py-1.5 bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold rounded-lg text-xs cursor-pointer shadow"
              >
                Save Recipe &amp; BOM
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
