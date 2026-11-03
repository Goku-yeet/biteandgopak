import React, { useState, useMemo, useEffect } from 'react';
import {
  Calculator,
  Plus,
  Trash2,
  Edit2,
  TrendingUp,
  Scale,
  Download,
  Search,
  CheckCircle2,
  ChefHat,
  Layers,
  Sparkles,
  Info,
  DollarSign,
  Percent,
  X,
  AlertTriangle,
  ArrowRight,
  Filter,
  Check,
} from 'lucide-react';
import { RawIngredient, RecipeCostItem, RecipeIngredientUsage, IngredientUnit } from '../../types';
import { StorageService } from '../../utils/storage';
import { sounds } from '../../utils/audio';

// Category color mappings
const CATEGORY_COLORS: Record<string, string> = {
  meat: 'bg-red-500/15 text-red-300 border-red-500/30',
  dairy: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
  bakery: 'bg-yellow-500/15 text-yellow-300 border-yellow-500/30',
  sauce: 'bg-purple-500/15 text-purple-300 border-purple-500/30',
  spices: 'bg-orange-500/15 text-orange-300 border-orange-500/30',
  produce: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
  packaging: 'bg-blue-500/15 text-blue-300 border-blue-500/30',
  other: 'bg-neutral-500/15 text-neutral-300 border-neutral-500/30',
  burger: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
  chicken: 'bg-red-500/15 text-red-300 border-red-500/30',
  sides: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
  component: 'bg-blue-500/15 text-blue-300 border-blue-500/30',
  beverage: 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30',
  combo: 'bg-pink-500/15 text-pink-300 border-pink-500/30',
};

// ================= RECIPE CARD SUBCOMPONENT (ISOLATED ZERO-GLITCH STATE) =================
interface RecipeCardProps {
  recipe: RecipeCostItem;
  ingredientMap: Map<string, RawIngredient>;
  ingredientsList: RawIngredient[];
  onUpdateUsage: (recipeId: string, usageIdx: number, newQty: number) => void;
  onRemoveUsage: (recipeId: string, usageIdx: number) => void;
  onAddIngredient: (recipeId: string, ingredientId: string, quantity: number) => void;
  onUpdateSellingPrice: (recipeId: string, newPrice: number) => void;
  onOpenEditRecipe: (recipe: RecipeCostItem) => void;
  onOpenQuickAddIngredient: (targetRecipeId: string) => void;
  onDeleteRecipe: (recipeId: string) => void;
}

const RecipeCard: React.FC<RecipeCardProps> = ({
  recipe,
  ingredientMap,
  ingredientsList,
  onUpdateUsage,
  onRemoveUsage,
  onAddIngredient,
  onUpdateSellingPrice,
  onOpenEditRecipe,
  onOpenQuickAddIngredient,
  onDeleteRecipe,
}) => {
  // Local state for adding an ingredient to this specific recipe
  const [selectedIngId, setSelectedIngId] = useState<string>('');
  const [addQuantity, setAddQuantity] = useState<number>(25);

  // Local state for editing selling price without cursor jumping
  const [sellingPriceInput, setSellingPriceInput] = useState<string>(recipe.sellingPrice.toString());

  useEffect(() => {
    setSellingPriceInput(recipe.sellingPrice.toString());
  }, [recipe.sellingPrice]);

  // Calculate live recipe metrics
  let totalCost = 0;
  const enrichedIngredients = recipe.ingredients.map((usage) => {
    const ing = ingredientMap.get(usage.ingredientId);
    const unitCost = ing?.costPerBaseUnit || usage.unitCost || 0;
    const lineCost = unitCost * usage.quantity;
    totalCost += lineCost;

    const baseUnit: 'g' | 'ml' | 'piece' =
      usage.unit || (ing?.purchaseUnit === 'liter' ? 'ml' : ing?.purchaseUnit === 'piece' ? 'piece' : 'g');

    return {
      ...usage,
      ingredientName: ing?.name || usage.ingredientName,
      unit: baseUnit,
      unitCost,
      lineCost,
    };
  });

  const portionCost = recipe.portionYield > 0 ? totalCost / recipe.portionYield : totalCost;
  const sellingPrice = recipe.sellingPrice || 0;
  const grossProfit = sellingPrice - portionCost;
  const foodCostPercent = sellingPrice > 0 ? (portionCost / sellingPrice) * 100 : 0;
  const grossMarginPercent = sellingPrice > 0 ? (grossProfit / sellingPrice) * 100 : 0;
  const targetFoodCost = recipe.targetFoodCostPercent || 30;
  const recommendedPrice =
    targetFoodCost > 0 ? Math.round(portionCost / (targetFoodCost / 100)) : 0;

  const isHealthyMargin = foodCostPercent > 0 && foodCostPercent <= 32;
  const isHighCost = foodCostPercent > 36;

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedIngId || addQuantity <= 0) return;
    onAddIngredient(recipe.id, selectedIngId, addQuantity);
    setSelectedIngId('');
    setAddQuantity(25);
  };

  const handleCommitSellingPrice = () => {
    const val = parseFloat(sellingPriceInput);
    if (!isNaN(val) && val >= 0 && val !== recipe.sellingPrice) {
      onUpdateSellingPrice(recipe.id, val);
    }
  };

  return (
    <div className="p-5 rounded-3xl bg-neutral-900 border border-neutral-800 shadow-xl space-y-4 hover:border-neutral-700 transition-all">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-neutral-800 gap-3">
        <div className="flex items-center gap-2.5 flex-wrap">
          <span className="text-base font-black text-white font-heading">{recipe.name}</span>
          <span
            className={`text-[10px] uppercase font-bold font-mono px-2.5 py-0.5 rounded-full border ${
              CATEGORY_COLORS[recipe.category] || 'bg-neutral-800 text-neutral-300'
            }`}
          >
            {recipe.category}
          </span>
          {recipe.portionYield > 1 && (
            <span className="text-[10px] bg-blue-500/20 text-blue-300 border border-blue-500/30 px-2 py-0.5 rounded-full font-mono font-bold">
              Batch: {recipe.portionYield} Portions
            </span>
          )}
          <span
            className={`text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full ${
              isHealthyMargin
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                : isHighCost
                ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
            }`}
          >
            {isHealthyMargin ? '✅ Prime Margin (<32%)' : isHighCost ? '⚠️ High Food Cost (>36%)' : '⚖️ Standard Margin'}
          </span>
        </div>

        {/* Action Controls & Financial Quick Pills */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="px-3 py-1 bg-neutral-950 border border-neutral-800 rounded-xl text-xs font-mono">
            <span className="text-neutral-500">Dish Cost: </span>
            <strong className="text-amber-400">Rs. {portionCost.toFixed(1)}</strong>
          </div>

          {sellingPrice > 0 && (
            <>
              <div className="px-3 py-1 bg-neutral-950 border border-neutral-800 rounded-xl text-xs font-mono">
                <span className="text-neutral-500">Price: </span>
                <strong className="text-white">Rs. {sellingPrice}</strong>
              </div>

              <div className="px-3 py-1 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-xs font-mono text-emerald-300">
                <span className="text-emerald-500">Gross Margin: </span>
                <strong>
                  Rs. {grossProfit.toFixed(1)} ({grossMarginPercent.toFixed(1)}%)
                </strong>
              </div>

              <div
                className={`px-3 py-1 rounded-xl text-xs font-mono font-bold ${
                  isHealthyMargin
                    ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                    : isHighCost
                    ? 'bg-red-500/15 text-red-400 border border-red-500/30'
                    : 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                }`}
              >
                Food Cost: {foodCostPercent.toFixed(1)}%
              </div>
            </>
          )}

          {/* Edit Recipe Button */}
          <button
            type="button"
            onClick={() => onOpenEditRecipe(recipe)}
            className="p-1.5 rounded-xl bg-neutral-800 hover:bg-neutral-750 text-neutral-300 hover:text-white border border-neutral-700 transition-colors cursor-pointer"
            title="Edit recipe details, yield, or selling price"
          >
            <Edit2 className="w-3.5 h-3.5" />
          </button>

          {/* Delete Recipe Button */}
          <button
            type="button"
            onClick={() => {
              if (window.confirm(`Delete recipe BOM "${recipe.name}"?`)) {
                onDeleteRecipe(recipe.id);
              }
            }}
            className="p-1.5 rounded-xl bg-neutral-800 hover:bg-red-950 text-neutral-500 hover:text-red-400 border border-neutral-700 transition-colors cursor-pointer"
            title="Delete recipe"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Recipe Notes if present */}
      {recipe.notes && (
        <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300">
          <strong>Prep Notes:</strong> {recipe.notes}
        </div>
      )}

      {/* Ingredients Breakdown Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="border-b border-neutral-800 text-neutral-400 text-[10px] uppercase font-bold tracking-wider">
              <th className="py-2 px-3">Ingredient</th>
              <th className="py-2 px-3">Bulk Purchase Cost</th>
              <th className="py-2 px-3">Unit Rate</th>
              <th className="py-2 px-3">Recipe Usage (Grams / Units)</th>
              <th className="py-2 px-3 text-right">Cost (PKR)</th>
              <th className="py-2 px-2 text-center w-12">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-850">
            {enrichedIngredients.map((usage, idx) => {
              const ing = ingredientMap.get(usage.ingredientId);

              return (
                <tr key={idx} className="hover:bg-neutral-850/40 transition-colors">
                  <td className="py-2.5 px-3">
                    <div className="font-bold text-white flex items-center gap-1.5">
                      <span>{usage.ingredientName}</span>
                      {ing?.category && (
                        <span
                          className={`text-[9px] uppercase px-1.5 py-0.2 rounded font-mono ${
                            CATEGORY_COLORS[ing.category] || 'bg-neutral-800 text-neutral-400'
                          }`}
                        >
                          {ing.category}
                        </span>
                      )}
                    </div>
                  </td>

                  <td className="py-2.5 px-3 text-neutral-400 font-mono text-[11px]">
                    {ing ? `Rs. ${ing.purchaseCost.toLocaleString()} / ${ing.purchaseUnit}` : 'Custom'}
                  </td>

                  <td className="py-2.5 px-3 text-neutral-400 font-mono text-[11px]">
                    Rs. {usage.unitCost.toFixed(4)} / {usage.unit}
                  </td>

                  {/* Quantity Stepper & Direct Editable Input */}
                  <td className="py-2.5 px-3">
                    <div className="flex items-center gap-1.5">
                      {/* Decrement buttons */}
                      <button
                        type="button"
                        onClick={() =>
                          onUpdateUsage(
                            recipe.id,
                            idx,
                            Math.max(1, usage.quantity - (usage.unit === 'piece' ? 1 : 10))
                          )
                        }
                        className="w-5 h-5 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-300 font-mono text-[10px] flex items-center justify-center cursor-pointer"
                        title={usage.unit === 'piece' ? '-1' : '-10g'}
                      >
                        -
                      </button>

                      <input
                        type="number"
                        min={1}
                        step={usage.unit === 'piece' ? 1 : 5}
                        defaultValue={usage.quantity}
                        key={`${recipe.id}-${idx}-${usage.quantity}`}
                        onBlur={(e) => {
                          const val = parseFloat(e.target.value);
                          if (!isNaN(val) && val >= 0 && val !== usage.quantity) {
                            onUpdateUsage(recipe.id, idx, val);
                          }
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            (e.target as HTMLInputElement).blur();
                          }
                        }}
                        className="w-16 bg-neutral-950 border border-neutral-700 rounded-lg px-2 py-1 text-xs text-amber-300 font-mono font-bold focus:border-amber-500 focus:outline-none text-center"
                      />

                      {/* Increment buttons */}
                      <button
                        type="button"
                        onClick={() =>
                          onUpdateUsage(
                            recipe.id,
                            idx,
                            usage.quantity + (usage.unit === 'piece' ? 1 : 10)
                          )
                        }
                        className="w-5 h-5 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-300 font-mono text-[10px] flex items-center justify-center cursor-pointer"
                        title={usage.unit === 'piece' ? '+1' : '+10g'}
                      >
                        +
                      </button>

                      <span className="text-neutral-400 text-xs font-mono ml-1">{usage.unit}</span>
                    </div>
                  </td>

                  <td className="py-2.5 px-3 text-right font-mono font-bold text-amber-400 text-xs">
                    Rs. {usage.lineCost.toFixed(2)}
                  </td>

                  <td className="py-2.5 px-2 text-center">
                    <button
                      type="button"
                      onClick={() => onRemoveUsage(recipe.id, idx)}
                      className="p-1 rounded text-neutral-500 hover:text-red-400 hover:bg-neutral-800 transition-colors cursor-pointer"
                      title="Remove ingredient from recipe"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Add Ingredient Bar & Selling Price Adjuster */}
      <div className="pt-3 border-t border-neutral-800 flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 text-xs">
        {/* Quick Add Ingredient Form */}
        <form onSubmit={handleAddSubmit} className="flex items-center gap-2 flex-wrap">
          <span className="text-neutral-400 text-[11px] font-bold">Add to Recipe:</span>
          <select
            value={selectedIngId}
            onChange={(e) => setSelectedIngId(e.target.value)}
            className="bg-neutral-950 border border-neutral-800 text-xs text-white rounded-xl px-2.5 py-1.5 focus:border-amber-500 focus:outline-none min-w-[200px]"
          >
            <option value="">Select ingredient...</option>
            {ingredientsList.map((ing) => (
              <option key={ing.id} value={ing.id}>
                {ing.name} (Rs. {ing.costPerBaseUnit.toFixed(3)}/
                {ing.purchaseUnit === 'liter' ? 'ml' : ing.purchaseUnit === 'piece' ? 'pc' : 'g'})
              </option>
            ))}
          </select>

          <input
            type="number"
            min={1}
            value={addQuantity}
            onChange={(e) => setAddQuantity(parseFloat(e.target.value) || 1)}
            placeholder="Qty"
            className="w-20 bg-neutral-950 border border-neutral-800 text-xs text-white rounded-xl px-2.5 py-1.5 font-mono focus:border-amber-500 focus:outline-none"
          />

          <button
            type="submit"
            disabled={!selectedIngId}
            className="px-3 py-1.5 bg-neutral-800 hover:bg-neutral-750 disabled:opacity-50 text-amber-400 font-bold rounded-xl text-xs transition-colors cursor-pointer border border-neutral-700"
          >
            + Add
          </button>

          {/* Quick Create Custom Ingredient Directly Button */}
          <button
            type="button"
            onClick={() => onOpenQuickAddIngredient(recipe.id)}
            className="px-2.5 py-1.5 bg-neutral-950 hover:bg-neutral-850 text-neutral-300 hover:text-white rounded-xl text-xs font-semibold border border-neutral-800 transition-colors cursor-pointer flex items-center gap-1"
            title="Create a new custom ingredient and immediately add to this dish"
          >
            <Plus className="w-3 h-3 text-emerald-400" />
            <span>New Custom Ingredient</span>
          </button>
        </form>

        {/* Selling Price & Target Recommendation */}
        <div className="flex items-center gap-3 self-end lg:self-auto flex-wrap">
          {recommendedPrice > 0 && (
            <div className="text-[11px] text-neutral-400 flex items-center gap-1.5">
              <span>Target {targetFoodCost}% Price:</span>
              <strong className="font-mono text-amber-300">Rs. {recommendedPrice}</strong>
              {sellingPrice !== recommendedPrice && (
                <button
                  type="button"
                  onClick={() => onUpdateSellingPrice(recipe.id, recommendedPrice)}
                  className="px-2 py-0.5 rounded bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-300 text-[10px] font-bold cursor-pointer transition-all"
                  title="Apply recommended 30% selling price"
                >
                  Apply
                </button>
              )}
            </div>
          )}

          <div className="flex items-center gap-1.5">
            <span className="text-[11px] text-neutral-400 font-bold">Menu Price:</span>
            <span className="text-neutral-500 text-xs font-mono">Rs.</span>
            <input
              type="number"
              value={sellingPriceInput}
              onChange={(e) => setSellingPriceInput(e.target.value)}
              onBlur={handleCommitSellingPrice}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleCommitSellingPrice();
              }}
              className="w-24 bg-neutral-950 border border-neutral-700 rounded-lg px-2 py-1 text-xs text-white font-mono font-bold focus:border-amber-500 focus:outline-none text-right"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

// ================= MAIN FOOD COSTING TAB COMPONENT =================
export const FoodCostingTab: React.FC = () => {
  // State
  const [ingredients, setIngredients] = useState<RawIngredient[]>([]);
  const [recipes, setRecipes] = useState<RecipeCostItem[]>([]);
  const [activeSubTab, setActiveSubTab] = useState<'recipes' | 'ingredients' | 'sauces'>('recipes');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('all');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Modals
  const [isAddIngredientModalOpen, setIsAddIngredientModalOpen] = useState(false);
  const [isCreateRecipeModalOpen, setIsCreateRecipeModalOpen] = useState(false);
  const [editingIngredient, setEditingIngredient] = useState<RawIngredient | null>(null);
  const [editingRecipe, setEditingRecipe] = useState<RecipeCostItem | null>(null);

  // Quick Add Context: which recipe requested a new custom ingredient
  const [targetRecipeIdForCustomIng, setTargetRecipeIdForCustomIng] = useState<string | null>(null);

  // New Ingredient Form State
  const [newIngName, setNewIngName] = useState('');
  const [newIngCategory, setNewIngCategory] = useState<RawIngredient['category']>('meat');
  const [newIngPrice, setNewIngPrice] = useState<number>(1000);
  const [newIngUnit, setNewIngUnit] = useState<IngredientUnit>('kg');
  const [newIngSupplier, setNewIngSupplier] = useState('');
  const [newIngNotes, setNewIngNotes] = useState('');

  // New Recipe Form State
  const [newRecipeName, setNewRecipeName] = useState('');
  const [newRecipeCategory, setNewRecipeCategory] = useState<RecipeCostItem['category']>('burger');
  const [newRecipeSellingPrice, setNewRecipeSellingPrice] = useState<number>(850);
  const [newRecipePortionYield, setNewRecipePortionYield] = useState<number>(1);
  const [newRecipeTargetFoodCost, setNewRecipeTargetFoodCost] = useState<number>(30);
  const [newRecipeNotes, setNewRecipeNotes] = useState('');
  const [selectedIngredientsForNewRecipe, setSelectedIngredientsForNewRecipe] = useState<
    Array<{ ingredientId: string; quantity: number }>
  >([]);

  // Load from Storage
  const loadData = () => {
    const rawIngs = StorageService.getRawIngredients();
    const recipeItems = StorageService.getRecipeCostItems();
    setIngredients(rawIngs);
    setRecipes(recipeItems);
  };

  useEffect(() => {
    loadData();
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Quick lookup dictionary for ingredients by ID
  const ingredientMap = useMemo(() => {
    const map = new Map<string, RawIngredient>();
    ingredients.forEach((ing) => map.set(ing.id, ing));
    return map;
  }, [ingredients]);

  // Global KPIs across all recipes
  const costingKpis = useMemo(() => {
    if (recipes.length === 0) {
      return {
        avgFoodCostPct: 0,
        totalIngredientsCount: ingredients.length,
        totalRecipesCount: 0,
        highestMarginRecipe: null as RecipeCostItem | null,
      };
    }

    const calculatedList = recipes.map((r) => {
      let totalCost = 0;
      r.ingredients.forEach((usage) => {
        const ing = ingredientMap.get(usage.ingredientId);
        const unitCost = ing?.costPerBaseUnit || usage.unitCost || 0;
        totalCost += unitCost * usage.quantity;
      });
      const portionCost = r.portionYield > 0 ? totalCost / r.portionYield : totalCost;
      const grossProfit = r.sellingPrice - portionCost;
      const foodCostPercent = r.sellingPrice > 0 ? (portionCost / r.sellingPrice) * 100 : 0;
      const grossMarginPercent = r.sellingPrice > 0 ? (grossProfit / r.sellingPrice) * 100 : 0;
      return { recipe: r, foodCostPercent, grossMarginPercent, sellingPrice: r.sellingPrice };
    });

    const finishedDishes = calculatedList.filter((c) => c.sellingPrice > 0);
    const avgFoodCostPct =
      finishedDishes.length > 0
        ? finishedDishes.reduce((sum, c) => sum + c.foodCostPercent, 0) / finishedDishes.length
        : 0;

    const sortedByMargin = [...finishedDishes].sort(
      (a, b) => b.grossMarginPercent - a.grossMarginPercent
    );

    return {
      avgFoodCostPct,
      totalIngredientsCount: ingredients.length,
      totalRecipesCount: recipes.length,
      highestMarginRecipe: sortedByMargin[0]?.recipe || null,
    };
  }, [recipes, ingredients, ingredientMap]);

  // Update a recipe's usage quantity for an ingredient (stable, direct update)
  const handleUpdateIngredientUsage = (
    recipeId: string,
    usageIndex: number,
    newQuantity: number
  ) => {
    const targetRecipe = recipes.find((r) => r.id === recipeId);
    if (!targetRecipe) return;

    const updatedIngredients = [...targetRecipe.ingredients];
    if (updatedIngredients[usageIndex]) {
      const ing = ingredientMap.get(updatedIngredients[usageIndex].ingredientId);
      const unitCost = ing?.costPerBaseUnit || updatedIngredients[usageIndex].unitCost || 0;
      updatedIngredients[usageIndex] = {
        ...updatedIngredients[usageIndex],
        quantity: newQuantity,
        unitCost,
        lineCost: unitCost * newQuantity,
      };
    }

    const newTotalCost = updatedIngredients.reduce((s, it) => s + it.lineCost, 0);
    const portionCost =
      targetRecipe.portionYield > 0 ? newTotalCost / targetRecipe.portionYield : newTotalCost;

    const updatedRecipe: RecipeCostItem = {
      ...targetRecipe,
      ingredients: updatedIngredients,
      totalBatchCost: newTotalCost,
      costPerPortion: portionCost,
      foodCostPercent:
        targetRecipe.sellingPrice > 0 ? (portionCost / targetRecipe.sellingPrice) * 100 : 0,
      grossProfit: targetRecipe.sellingPrice - portionCost,
      grossMarginPercent:
        targetRecipe.sellingPrice > 0
          ? ((targetRecipe.sellingPrice - portionCost) / targetRecipe.sellingPrice) * 100
          : 0,
      updatedAt: new Date().toISOString(),
    };

    StorageService.saveOrUpdateRecipeCostItem(updatedRecipe);
    loadData();
  };

  // Add an ingredient to an existing recipe
  const handleAddIngredientToRecipe = (
    recipeId: string,
    ingredientId: string,
    quantity: number
  ) => {
    const targetRecipe = recipes.find((r) => r.id === recipeId);
    const ing = ingredientMap.get(ingredientId);
    if (!targetRecipe || !ing) return;

    const unitCost = ing.costPerBaseUnit || 0;
    const baseUnit: 'g' | 'ml' | 'piece' =
      ing.purchaseUnit === 'liter' ? 'ml' : ing.purchaseUnit === 'piece' ? 'piece' : 'g';

    const newUsage: RecipeIngredientUsage = {
      ingredientId: ing.id,
      ingredientName: ing.name,
      quantity,
      unit: baseUnit,
      unitCost,
      lineCost: unitCost * quantity,
    };

    const updatedIngredients = [...targetRecipe.ingredients, newUsage];
    const newTotalCost = updatedIngredients.reduce((s, it) => s + it.lineCost, 0);
    const portionCost =
      targetRecipe.portionYield > 0 ? newTotalCost / targetRecipe.portionYield : newTotalCost;

    const updatedRecipe: RecipeCostItem = {
      ...targetRecipe,
      ingredients: updatedIngredients,
      totalBatchCost: newTotalCost,
      costPerPortion: portionCost,
      foodCostPercent:
        targetRecipe.sellingPrice > 0 ? (portionCost / targetRecipe.sellingPrice) * 100 : 0,
      grossProfit: targetRecipe.sellingPrice - portionCost,
      grossMarginPercent:
        targetRecipe.sellingPrice > 0
          ? ((targetRecipe.sellingPrice - portionCost) / targetRecipe.sellingPrice) * 100
          : 0,
      updatedAt: new Date().toISOString(),
    };

    StorageService.saveOrUpdateRecipeCostItem(updatedRecipe);
    loadData();
    sounds.playSuccess();
    showToast(`Added ${quantity}${baseUnit} ${ing.name} to ${targetRecipe.name}`);
  };

  // Remove an ingredient from a recipe
  const handleRemoveIngredientFromRecipe = (recipeId: string, usageIndex: number) => {
    const targetRecipe = recipes.find((r) => r.id === recipeId);
    if (!targetRecipe) return;

    const updatedIngredients = targetRecipe.ingredients.filter((_, idx) => idx !== usageIndex);
    const newTotalCost = updatedIngredients.reduce((s, it) => s + it.lineCost, 0);
    const portionCost =
      targetRecipe.portionYield > 0 ? newTotalCost / targetRecipe.portionYield : newTotalCost;

    const updatedRecipe: RecipeCostItem = {
      ...targetRecipe,
      ingredients: updatedIngredients,
      totalBatchCost: newTotalCost,
      costPerPortion: portionCost,
      foodCostPercent:
        targetRecipe.sellingPrice > 0 ? (portionCost / targetRecipe.sellingPrice) * 100 : 0,
      grossProfit: targetRecipe.sellingPrice - portionCost,
      grossMarginPercent:
        targetRecipe.sellingPrice > 0
          ? ((targetRecipe.sellingPrice - portionCost) / targetRecipe.sellingPrice) * 100
          : 0,
      updatedAt: new Date().toISOString(),
    };

    StorageService.saveOrUpdateRecipeCostItem(updatedRecipe);
    loadData();
  };

  // Update a recipe's selling price
  const handleUpdateRecipeSellingPrice = (recipeId: string, newSellingPrice: number) => {
    const targetRecipe = recipes.find((r) => r.id === recipeId);
    if (!targetRecipe) return;

    const portionCost = targetRecipe.costPerPortion;
    const updatedRecipe: RecipeCostItem = {
      ...targetRecipe,
      sellingPrice: newSellingPrice,
      foodCostPercent: newSellingPrice > 0 ? (portionCost / newSellingPrice) * 100 : 0,
      grossProfit: newSellingPrice - portionCost,
      grossMarginPercent:
        newSellingPrice > 0 ? ((newSellingPrice - portionCost) / newSellingPrice) * 100 : 0,
      updatedAt: new Date().toISOString(),
    };

    StorageService.saveOrUpdateRecipeCostItem(updatedRecipe);
    loadData();
    showToast(`Updated menu price for ${targetRecipe.name} to Rs. ${newSellingPrice}`);
  };

  // Delete a recipe
  const handleDeleteRecipe = (recipeId: string) => {
    StorageService.deleteRecipeCostItem(recipeId);
    loadData();
    showToast('Recipe BOM removed successfully.');
  };

  // Save New Raw Ingredient (from top button or quick add inside recipe)
  const handleSaveNewIngredient = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newIngName.trim()) return;

    const baseCost =
      newIngUnit === 'kg' || newIngUnit === 'liter'
        ? Number((newIngPrice / 1000).toFixed(4))
        : newIngPrice;

    const addedList = StorageService.addRawIngredient({
      name: newIngName.trim(),
      category: newIngCategory,
      purchaseCost: newIngPrice,
      purchaseUnit: newIngUnit,
      costPerBaseUnit: baseCost,
      supplier: newIngSupplier.trim() || undefined,
      notes: newIngNotes.trim() || undefined,
    });

    const createdIng = addedList[0];

    // If triggered from inside a recipe's quick add, also immediately attach to that recipe!
    if (targetRecipeIdForCustomIng && createdIng) {
      const targetRecipe = recipes.find((r) => r.id === targetRecipeIdForCustomIng);
      if (targetRecipe) {
        const baseUnit: 'g' | 'ml' | 'piece' =
          createdIng.purchaseUnit === 'liter' ? 'ml' : createdIng.purchaseUnit === 'piece' ? 'piece' : 'g';
        const defaultQty = baseUnit === 'piece' ? 1 : 25;
        const newUsage: RecipeIngredientUsage = {
          ingredientId: createdIng.id,
          ingredientName: createdIng.name,
          quantity: defaultQty,
          unit: baseUnit,
          unitCost: createdIng.costPerBaseUnit,
          lineCost: createdIng.costPerBaseUnit * defaultQty,
        };
        const updatedIngredients = [...targetRecipe.ingredients, newUsage];
        const newTotalCost = updatedIngredients.reduce((s, it) => s + it.lineCost, 0);
        const portionCost =
          targetRecipe.portionYield > 0 ? newTotalCost / targetRecipe.portionYield : newTotalCost;
        StorageService.saveOrUpdateRecipeCostItem({
          ...targetRecipe,
          ingredients: updatedIngredients,
          totalBatchCost: newTotalCost,
          costPerPortion: portionCost,
          foodCostPercent:
            targetRecipe.sellingPrice > 0 ? (portionCost / targetRecipe.sellingPrice) * 100 : 0,
          grossProfit: targetRecipe.sellingPrice - portionCost,
          grossMarginPercent:
            targetRecipe.sellingPrice > 0
              ? ((targetRecipe.sellingPrice - portionCost) / targetRecipe.sellingPrice) * 100
              : 0,
        });
      }
    }

    loadData();
    setIsAddIngredientModalOpen(false);
    setTargetRecipeIdForCustomIng(null);
    setNewIngName('');
    setNewIngPrice(1000);
    setNewIngSupplier('');
    setNewIngNotes('');
    sounds.playSuccess();
    showToast(`Saved custom raw ingredient: ${newIngName.trim()}`);
  };

  // Save Edited Ingredient Modal
  const handleSaveEditedIngredient = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingIngredient) return;

    StorageService.updateRawIngredient(editingIngredient.id, {
      name: editingIngredient.name,
      category: editingIngredient.category,
      purchaseCost: editingIngredient.purchaseCost,
      purchaseUnit: editingIngredient.purchaseUnit,
      supplier: editingIngredient.supplier,
      notes: editingIngredient.notes,
      yieldPercent: editingIngredient.yieldPercent,
    });

    loadData();
    setEditingIngredient(null);
    sounds.playSuccess();
    showToast(`Updated ingredient: ${editingIngredient.name}`);
  };

  // Save Edited Recipe Modal
  const handleSaveEditedRecipe = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRecipe) return;

    // Recalculate metrics
    const totalCost = editingRecipe.ingredients.reduce((s, it) => {
      const ing = ingredientMap.get(it.ingredientId);
      const unitCost = ing?.costPerBaseUnit || it.unitCost || 0;
      return s + unitCost * it.quantity;
    }, 0);

    const portionYield = editingRecipe.portionYield > 0 ? editingRecipe.portionYield : 1;
    const costPerPortion = totalCost / portionYield;
    const grossProfit = editingRecipe.sellingPrice - costPerPortion;
    const foodCostPercent =
      editingRecipe.sellingPrice > 0 ? (costPerPortion / editingRecipe.sellingPrice) * 100 : 0;
    const grossMarginPercent =
      editingRecipe.sellingPrice > 0 ? (grossProfit / editingRecipe.sellingPrice) * 100 : 0;
    const targetFoodCost = editingRecipe.targetFoodCostPercent || 30;
    const recommendedSellingPrice =
      targetFoodCost > 0 ? Math.round(costPerPortion / (targetFoodCost / 100)) : 0;

    StorageService.saveOrUpdateRecipeCostItem({
      ...editingRecipe,
      totalBatchCost: totalCost,
      costPerPortion,
      grossProfit,
      foodCostPercent,
      grossMarginPercent,
      recommendedSellingPrice,
    });

    loadData();
    setEditingRecipe(null);
    sounds.playSuccess();
    showToast(`Updated recipe details for ${editingRecipe.name}`);
  };

  // Save New Recipe BOM
  const handleSaveNewRecipe = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRecipeName.trim()) return;

    let totalCost = 0;
    const finalUsages: RecipeIngredientUsage[] = selectedIngredientsForNewRecipe.map((sel) => {
      const ing = ingredientMap.get(sel.ingredientId);
      const unitCost = ing?.costPerBaseUnit || 0;
      const lineCost = unitCost * sel.quantity;
      totalCost += lineCost;

      const baseUnit: 'g' | 'ml' | 'piece' =
        ing?.purchaseUnit === 'liter' ? 'ml' : ing?.purchaseUnit === 'piece' ? 'piece' : 'g';

      return {
        ingredientId: sel.ingredientId,
        ingredientName: ing?.name || 'Ingredient',
        quantity: sel.quantity,
        unit: baseUnit,
        unitCost,
        lineCost,
      };
    });

    const portionYield = newRecipePortionYield > 0 ? newRecipePortionYield : 1;
    const costPerPortion = totalCost / portionYield;
    const grossProfit = newRecipeSellingPrice - costPerPortion;
    const foodCostPercent =
      newRecipeSellingPrice > 0 ? (costPerPortion / newRecipeSellingPrice) * 100 : 0;
    const grossMarginPercent =
      newRecipeSellingPrice > 0 ? (grossProfit / newRecipeSellingPrice) * 100 : 0;
    const recommendedSellingPrice =
      newRecipeTargetFoodCost > 0
        ? Math.round(costPerPortion / (newRecipeTargetFoodCost / 100))
        : 0;

    const newRecipe: RecipeCostItem = {
      id: `recipe-${Date.now()}`,
      name: newRecipeName.trim(),
      category: newRecipeCategory,
      portionYield,
      sellingPrice: newRecipeSellingPrice,
      targetFoodCostPercent: newRecipeTargetFoodCost,
      ingredients: finalUsages,
      totalBatchCost: totalCost,
      costPerPortion,
      foodCostPercent,
      grossProfit,
      grossMarginPercent,
      recommendedSellingPrice,
      notes: newRecipeNotes.trim() || undefined,
      updatedAt: new Date().toISOString(),
    };

    StorageService.saveOrUpdateRecipeCostItem(newRecipe);
    loadData();
    setIsCreateRecipeModalOpen(false);
    setNewRecipeName('');
    setNewRecipeSellingPrice(850);
    setSelectedIngredientsForNewRecipe([]);
    sounds.playSuccess();
    showToast(`Created recipe BOM: ${newRecipe.name}`);
  };

  // Export Costing Report to CSV
  const handleExportCostingCSV = () => {
    const headers = [
      'Recipe Name',
      'Category',
      'Portion Yield',
      'Batch Cost (PKR)',
      'Portion Cost (PKR)',
      'Selling Price (PKR)',
      'Gross Profit (PKR)',
      'Food Cost %',
      'Gross Margin %',
      'Recommended Price (PKR)',
      'Ingredients Breakdown',
    ];

    const rows = recipes.map((r) => {
      let totalCost = 0;
      const ings = r.ingredients.map((usage) => {
        const ing = ingredientMap.get(usage.ingredientId);
        const unitCost = ing?.costPerBaseUnit || usage.unitCost || 0;
        const lineCost = unitCost * usage.quantity;
        totalCost += lineCost;
        return `${usage.quantity}${usage.unit} ${usage.ingredientName} (Rs. ${lineCost.toFixed(1)})`;
      });
      const portionCost = r.portionYield > 0 ? totalCost / r.portionYield : totalCost;
      const grossProfit = r.sellingPrice - portionCost;
      const foodCostPercent = r.sellingPrice > 0 ? (portionCost / r.sellingPrice) * 100 : 0;
      const grossMarginPercent = r.sellingPrice > 0 ? (grossProfit / r.sellingPrice) * 100 : 0;
      const target = r.targetFoodCostPercent || 30;
      const rec = target > 0 ? Math.round(portionCost / (target / 100)) : 0;

      return [
        `"${r.name.replace(/"/g, '""')}"`,
        r.category.toUpperCase(),
        r.portionYield,
        totalCost.toFixed(2),
        portionCost.toFixed(2),
        r.sellingPrice,
        grossProfit.toFixed(2),
        `${foodCostPercent.toFixed(1)}%`,
        `${grossMarginPercent.toFixed(1)}%`,
        rec,
        `"${ings.join('; ').replace(/"/g, '""')}"`,
      ].join(',');
    });

    const csvData = '\uFEFF' + [headers.join(','), ...rows].join('\r\n');
    const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `bite_and_go_food_costing_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showToast('Exported Food Costing BOM report to CSV!');
  };

  // Filtered views
  const filteredRecipes = useMemo(() => {
    let list = recipes;
    if (activeSubTab === 'sauces') {
      list = recipes.filter((r) => r.category === 'sauce' || r.category === 'component');
    }
    if (selectedCategoryFilter !== 'all') {
      list = list.filter((r) => r.category === selectedCategoryFilter);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (r) =>
          r.name.toLowerCase().includes(q) ||
          r.category.toLowerCase().includes(q) ||
          r.ingredients.some((i) => i.ingredientName.toLowerCase().includes(q))
      );
    }
    return list;
  }, [recipes, activeSubTab, selectedCategoryFilter, searchQuery]);

  const filteredIngredients = useMemo(() => {
    let list = ingredients;
    if (selectedCategoryFilter !== 'all') {
      list = list.filter((i) => i.category === selectedCategoryFilter);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (i) =>
          i.name.toLowerCase().includes(q) ||
          i.category.toLowerCase().includes(q) ||
          (i.supplier || '').toLowerCase().includes(q)
      );
    }
    return list;
  }, [ingredients, selectedCategoryFilter, searchQuery]);

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="p-3.5 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-bold flex items-center justify-between shadow-xl animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>{toastMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setToastMessage(null)}
            className="text-emerald-400 hover:text-white"
          >
            ×
          </button>
        </div>
      )}

      {/* Top Banner & Primary Actions */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5 rounded-2xl bg-neutral-900 border border-neutral-800 shadow-lg">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
            <Calculator className="w-6 h-6 stroke-[2.5]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-white">Food Costing &amp; Recipe BOM Calculator</h2>
              <span className="text-[10px] bg-amber-500/20 text-amber-400 border border-amber-500/30 px-2 py-0.5 rounded-full font-mono font-bold">
                PROFIT MARGINS
              </span>
            </div>
            <p className="text-xs text-neutral-400 mt-0.5">
              Input bulk purchase prices per kg / liter, configure per-gram recipe usage (Zinger patty, beef smash, brioche buns, secret sauce), and track live food cost % &amp; profit margins.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => {
              setTargetRecipeIdForCustomIng(null);
              setIsAddIngredientModalOpen(true);
            }}
            className="px-3.5 py-2 bg-neutral-800 hover:bg-neutral-750 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer border border-neutral-700"
          >
            <Plus className="w-3.5 h-3.5 text-amber-400" />
            <span>+ Add Raw Ingredient</span>
          </button>

          <button
            type="button"
            onClick={() => setIsCreateRecipeModalOpen(true)}
            className="px-3.5 py-2 bg-amber-500 hover:bg-amber-400 text-neutral-950 rounded-xl text-xs font-black flex items-center gap-1.5 transition-all shadow-md shadow-amber-500/20 cursor-pointer active:scale-95"
          >
            <ChefHat className="w-3.5 h-3.5 text-neutral-950" />
            <span>+ Create Recipe BOM</span>
          </button>

          <button
            type="button"
            onClick={handleExportCostingCSV}
            className="p-2 bg-neutral-800 hover:bg-neutral-750 text-neutral-300 hover:text-white rounded-xl border border-neutral-700 transition-colors cursor-pointer"
            title="Export CSV Costing Report"
          >
            <Download className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* KPI Cards Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* KPI 1: Active Ingredients */}
        <div className="p-4 rounded-2xl bg-neutral-900 border border-neutral-800 space-y-1">
          <span className="text-[10px] uppercase font-bold text-neutral-400 block tracking-wider">
            Raw Ingredients
          </span>
          <p className="text-xl font-bold font-mono text-white">
            {costingKpis.totalIngredientsCount}
          </p>
          <p className="text-[10px] text-neutral-500">Chicken, beef, buns, sauces &amp; oils</p>
        </div>

        {/* KPI 2: Active Recipes */}
        <div className="p-4 rounded-2xl bg-neutral-900 border border-neutral-800 space-y-1">
          <span className="text-[10px] uppercase font-bold text-neutral-400 block tracking-wider">
            Calculated Recipes
          </span>
          <p className="text-xl font-bold font-mono text-amber-400">
            {costingKpis.totalRecipesCount}
          </p>
          <p className="text-[10px] text-amber-400/80">Dishes &amp; component batches</p>
        </div>

        {/* KPI 3: Average Food Cost % */}
        <div className="p-4 rounded-2xl bg-neutral-900 border border-neutral-800 space-y-1">
          <span className="text-[10px] uppercase font-bold text-neutral-400 block tracking-wider">
            Avg Food Cost %
          </span>
          <p
            className={`text-xl font-bold font-mono ${
              costingKpis.avgFoodCostPct <= 32
                ? 'text-emerald-400'
                : costingKpis.avgFoodCostPct <= 38
                ? 'text-amber-400'
                : 'text-red-400'
            }`}
          >
            {costingKpis.avgFoodCostPct.toFixed(1)}%
          </p>
          <p className="text-[10px] text-neutral-500">
            {costingKpis.avgFoodCostPct <= 32
              ? 'Target healthy margin (<32%)'
              : 'Review high-cost recipes'}
          </p>
        </div>

        {/* KPI 4: Top Margin Item */}
        <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-500/10 to-neutral-900 border border-emerald-500/30 space-y-1">
          <span className="text-[10px] uppercase font-bold text-emerald-400 block tracking-wider flex items-center gap-1">
            <TrendingUp className="w-3 h-3 text-emerald-400" />
            <span>Highest Margin Dish</span>
          </span>
          <p className="text-sm font-bold text-white truncate">
            {costingKpis.highestMarginRecipe?.name || 'All dishes balanced'}
          </p>
          <p className="text-[10px] text-emerald-400 font-mono">
            {costingKpis.highestMarginRecipe
              ? `${(100 - costingKpis.highestMarginRecipe.foodCostPercent).toFixed(1)}% Gross Margin`
              : 'Add dishes to track'}
          </p>
        </div>
      </div>

      {/* Navigation Sub-Tabs & Search Toolbar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-2 bg-neutral-900 rounded-2xl border border-neutral-800">
        <div className="flex items-center gap-1.5 p-1 bg-neutral-950 rounded-xl border border-neutral-800">
          <button
            type="button"
            onClick={() => {
              setActiveSubTab('recipes');
              setSelectedCategoryFilter('all');
            }}
            className={`px-4 py-2 rounded-lg text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 ${
              activeSubTab === 'recipes'
                ? 'bg-amber-500 text-neutral-950 shadow-md'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            <ChefHat className="w-3.5 h-3.5" />
            <span>Dish &amp; Recipe BOMs ({recipes.length})</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveSubTab('ingredients');
              setSelectedCategoryFilter('all');
            }}
            className={`px-4 py-2 rounded-lg text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 ${
              activeSubTab === 'ingredients'
                ? 'bg-emerald-500 text-neutral-950 shadow-md'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            <Scale className="w-3.5 h-3.5" />
            <span>Raw Ingredients Price Book ({ingredients.length})</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveSubTab('sauces');
              setSelectedCategoryFilter('all');
            }}
            className={`px-4 py-2 rounded-lg text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 ${
              activeSubTab === 'sauces'
                ? 'bg-purple-500 text-white shadow-md'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Sauce &amp; Component Batches</span>
          </button>
        </div>

        {/* Search */}
        <div className="relative sm:w-72">
          <Search className="w-3.5 h-3.5 text-neutral-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder={
              activeSubTab === 'ingredients'
                ? 'Search chicken, beef, oil, cheese...'
                : 'Search recipes, zinger, patties...'
            }
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-neutral-950 border border-neutral-800 rounded-xl pl-8 pr-3 py-2 text-xs text-white placeholder-neutral-500 focus:border-amber-500 focus:outline-none"
          />
        </div>
      </div>

      {/* Category Filter Pills */}
      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1 text-xs">
        <span className="text-[10px] uppercase font-bold text-neutral-500 mr-1 flex items-center gap-1">
          <Filter className="w-3 h-3" /> Filter:
        </span>
        {activeSubTab === 'ingredients' ? (
          ['all', 'meat', 'dairy', 'bakery', 'sauce', 'spices', 'produce', 'packaging', 'other'].map(
            (cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategoryFilter(cat)}
                className={`px-3 py-1 rounded-lg text-xs font-semibold capitalize transition-all cursor-pointer whitespace-nowrap ${
                  selectedCategoryFilter === cat
                    ? 'bg-emerald-500 text-neutral-950 font-bold shadow-xs'
                    : 'bg-neutral-900 text-neutral-400 hover:text-white border border-neutral-800'
                }`}
              >
                {cat === 'all' ? 'All Ingredients' : cat}
              </button>
            )
          )
        ) : (
          ['all', 'burger', 'sides', 'sauce', 'component', 'chicken', 'beverage'].map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setSelectedCategoryFilter(cat)}
              className={`px-3 py-1 rounded-lg text-xs font-semibold capitalize transition-all cursor-pointer whitespace-nowrap ${
                selectedCategoryFilter === cat
                  ? 'bg-amber-500 text-neutral-950 font-bold shadow-xs'
                  : 'bg-neutral-900 text-neutral-400 hover:text-white border border-neutral-800'
              }`}
            >
              {cat === 'all'
                ? 'All Dishes'
                : cat === 'sides'
                ? 'Sides & Fries'
                : cat === 'component'
                ? 'Patties & Batches'
                : cat}
            </button>
          ))
        )}
      </div>

      {/* ================= VIEW 1 & 3: RECIPES & DISHES BOM BREAKDOWN ================= */}
      {(activeSubTab === 'recipes' || activeSubTab === 'sauces') && (
        <div className="space-y-4">
          {filteredRecipes.length === 0 ? (
            <div className="text-center py-16 bg-neutral-900 rounded-3xl border border-neutral-800 space-y-3">
              <ChefHat className="w-12 h-12 mx-auto text-neutral-600" />
              <h3 className="text-base font-bold text-white">No Recipes Found</h3>
              <p className="text-xs text-neutral-400 max-w-sm mx-auto">
                No recipes match your current search or category filter. Click "+ Create Recipe BOM" to build one!
              </p>
              <button
                type="button"
                onClick={() => setIsCreateRecipeModalOpen(true)}
                className="px-4 py-2 bg-amber-500 text-neutral-950 rounded-xl text-xs font-bold"
              >
                Create Recipe Now
              </button>
            </div>
          ) : (
            filteredRecipes.map((recipe) => (
              <RecipeCard
                key={recipe.id}
                recipe={recipe}
                ingredientMap={ingredientMap}
                ingredientsList={ingredients}
                onUpdateUsage={handleUpdateIngredientUsage}
                onRemoveUsage={handleRemoveIngredientFromRecipe}
                onAddIngredient={handleAddIngredientToRecipe}
                onUpdateSellingPrice={handleUpdateRecipeSellingPrice}
                onOpenEditRecipe={(rec) => setEditingRecipe({ ...rec })}
                onOpenQuickAddIngredient={(targetRecId) => {
                  setTargetRecipeIdForCustomIng(targetRecId);
                  setIsAddIngredientModalOpen(true);
                }}
                onDeleteRecipe={handleDeleteRecipe}
              />
            ))
          )}
        </div>
      )}

      {/* ================= VIEW 2: RAW INGREDIENTS PRICE BOOK ================= */}
      {activeSubTab === 'ingredients' && (
        <div className="p-5 rounded-3xl bg-neutral-900 border border-neutral-800 space-y-4 shadow-xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-neutral-800">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Scale className="w-4 h-4 text-emerald-400" />
                <span>Raw Ingredients Price Book &amp; Bulk Purchasing</span>
              </h3>
              <p className="text-xs text-neutral-400 mt-0.5">
                Manage bulk purchase prices per kg, liter, or unit. Click the pencil icon on any item to edit name, category, or prices.
              </p>
            </div>

            <button
              type="button"
              onClick={() => {
                setTargetRecipeIdForCustomIng(null);
                setIsAddIngredientModalOpen(true);
              }}
              className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer self-start sm:self-auto shadow-md"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Custom Ingredient</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-neutral-800 text-neutral-400 text-[10px] uppercase font-bold tracking-wider">
                  <th className="py-2.5 px-3">Ingredient Name</th>
                  <th className="py-2.5 px-3">Category</th>
                  <th className="py-2.5 px-3">Bulk Purchase Price</th>
                  <th className="py-2.5 px-3">Base Unit Rate</th>
                  <th className="py-2.5 px-3">Supplier / Vendor</th>
                  <th className="py-2.5 px-3 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-850">
                {filteredIngredients.map((ing) => (
                  <tr key={ing.id} className="hover:bg-neutral-850/40 transition-colors">
                    <td className="py-3 px-3">
                      <div className="font-bold text-white flex items-center gap-2">
                        <span>{ing.name}</span>
                        {ing.yieldPercent && ing.yieldPercent < 100 && (
                          <span className="text-[10px] bg-neutral-800 text-neutral-400 px-1.5 py-0.2 rounded font-mono">
                            {ing.yieldPercent}% Yield
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-neutral-500 font-mono">ID: {ing.id}</span>
                    </td>

                    <td className="py-3 px-3">
                      <span
                        className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full border ${
                          CATEGORY_COLORS[ing.category] || 'bg-neutral-800 text-neutral-300'
                        }`}
                      >
                        {ing.category}
                      </span>
                    </td>

                    <td className="py-3 px-3">
                      <span className="font-mono font-bold text-white text-xs">
                        Rs. {ing.purchaseCost.toLocaleString()}
                      </span>
                      <span className="text-neutral-500 font-mono text-[11px] ml-1">
                        / {ing.purchaseUnit}
                      </span>
                    </td>

                    <td className="py-3 px-3 font-mono font-bold text-amber-400">
                      Rs. {ing.costPerBaseUnit.toFixed(4)} /{' '}
                      {ing.purchaseUnit === 'liter'
                        ? 'ml'
                        : ing.purchaseUnit === 'piece'
                        ? 'piece'
                        : 'g'}
                    </td>

                    <td className="py-3 px-3 text-neutral-400 text-xs">
                      {ing.supplier || 'Local Market (Karachi)'}
                    </td>

                    <td className="py-3 px-3 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        {/* Edit Ingredient */}
                        <button
                          type="button"
                          onClick={() => setEditingIngredient({ ...ing })}
                          className="p-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-750 text-neutral-300 hover:text-white transition-colors cursor-pointer"
                          title="Edit ingredient name, category, or purchase price"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>

                        {/* Delete Ingredient */}
                        <button
                          type="button"
                          onClick={() => {
                            if (
                              window.confirm(
                                `Are you sure you want to delete ${ing.name} from ingredients?`
                              )
                            ) {
                              StorageService.deleteRawIngredient(ing.id);
                              loadData();
                              showToast(`Deleted raw ingredient: ${ing.name}`);
                            }
                          }}
                          className="p-1.5 rounded-lg bg-neutral-800 hover:bg-red-950 text-neutral-500 hover:text-red-400 transition-colors cursor-pointer"
                          title="Delete ingredient"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ================= MODAL 1: ADD RAW INGREDIENT ================= */}
      {isAddIngredientModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-950/85 backdrop-blur-sm animate-in fade-in">
          <div className="relative w-full max-w-lg bg-neutral-900 border border-neutral-800 rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
              <div className="flex items-center gap-2.5">
                <Scale className="w-5 h-5 text-amber-400" />
                <h3 className="text-base font-bold text-white">
                  {targetRecipeIdForCustomIng
                    ? 'Add Custom Ingredient & Attach to Recipe'
                    : 'Add Custom Raw Ingredient'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsAddIngredientModalOpen(false);
                  setTargetRecipeIdForCustomIng(null);
                }}
                className="text-neutral-400 hover:text-white p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveNewIngredient} className="space-y-3.5 text-xs">
              <div>
                <label className="text-neutral-300 font-bold block mb-1">Ingredient Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Boneless Chicken Thigh, Frying Oil, Brioche Bun, Garlic Mayo"
                  value={newIngName}
                  onChange={(e) => setNewIngName(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-white focus:border-amber-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-neutral-300 font-bold block mb-1">Category</label>
                  <select
                    value={newIngCategory}
                    onChange={(e) => setNewIngCategory(e.target.value as any)}
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-white focus:border-amber-500 focus:outline-none"
                  >
                    <option value="meat">Meat / Poultry / Beef</option>
                    <option value="bakery">Bakery / Buns</option>
                    <option value="dairy">Dairy / Cheese</option>
                    <option value="produce">Produce / Veggies</option>
                    <option value="sauce">Sauces &amp; Condiments</option>
                    <option value="spices">Spices &amp; Seasonings</option>
                    <option value="packaging">Packaging Box / Paper</option>
                    <option value="other">Other / Oil</option>
                  </select>
                </div>

                <div>
                  <label className="text-neutral-300 font-bold block mb-1">Bulk Purchase Unit</label>
                  <select
                    value={newIngUnit}
                    onChange={(e) => setNewIngUnit(e.target.value as IngredientUnit)}
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-white focus:border-amber-500 focus:outline-none"
                  >
                    <option value="kg">Kilogram (kg = 1000g)</option>
                    <option value="liter">Liter (liter = 1000ml)</option>
                    <option value="piece">Per Piece / Unit</option>
                    <option value="packet">Per Packet / Box</option>
                    <option value="g">Grams (g)</option>
                    <option value="ml">Milliliters (ml)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-neutral-300 font-bold block mb-1">
                  Bulk Purchase Price (PKR)
                </label>
                <input
                  type="number"
                  min={1}
                  required
                  value={newIngPrice}
                  onChange={(e) => setNewIngPrice(parseFloat(e.target.value) || 0)}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-white font-mono focus:border-amber-500 focus:outline-none"
                />
                <span className="text-[10px] text-neutral-500 mt-1 block">
                  Calculated unit rate: Rs.{' '}
                  {(newIngUnit === 'kg' || newIngUnit === 'liter'
                    ? newIngPrice / 1000
                    : newIngPrice
                  ).toFixed(4)}{' '}
                  per{' '}
                  {newIngUnit === 'liter' ? 'ml' : newIngUnit === 'piece' ? 'piece' : 'g'}
                </span>
              </div>

              <div>
                <label className="text-neutral-300 font-bold block mb-1">
                  Supplier / Vendor (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Metro / Empress Market / K&N / Local Karachi Distributor"
                  value={newIngSupplier}
                  onChange={(e) => setNewIngSupplier(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-white focus:border-amber-500 focus:outline-none"
                />
              </div>

              <div className="pt-3 border-t border-neutral-800 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => {
                    setIsAddIngredientModalOpen(false);
                    setTargetRecipeIdForCustomIng(null);
                  }}
                  className="px-4 py-2 rounded-xl bg-neutral-800 text-neutral-300 font-bold hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 font-black shadow-md cursor-pointer"
                >
                  Save Ingredient
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL 2: EDIT EXISTING RAW INGREDIENT ================= */}
      {editingIngredient && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-950/85 backdrop-blur-sm animate-in fade-in">
          <div className="relative w-full max-w-lg bg-neutral-900 border border-neutral-800 rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
              <div className="flex items-center gap-2.5">
                <Edit2 className="w-5 h-5 text-amber-400" />
                <h3 className="text-base font-bold text-white">Edit Raw Ingredient</h3>
              </div>
              <button
                type="button"
                onClick={() => setEditingIngredient(null)}
                className="text-neutral-400 hover:text-white p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEditedIngredient} className="space-y-3.5 text-xs">
              <div>
                <label className="text-neutral-300 font-bold block mb-1">Ingredient Name</label>
                <input
                  type="text"
                  required
                  value={editingIngredient.name}
                  onChange={(e) =>
                    setEditingIngredient({ ...editingIngredient, name: e.target.value })
                  }
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-white focus:border-amber-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-neutral-300 font-bold block mb-1">Category</label>
                  <select
                    value={editingIngredient.category}
                    onChange={(e) =>
                      setEditingIngredient({
                        ...editingIngredient,
                        category: e.target.value as any,
                      })
                    }
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-white focus:border-amber-500 focus:outline-none"
                  >
                    <option value="meat">Meat / Poultry / Beef</option>
                    <option value="bakery">Bakery / Buns</option>
                    <option value="dairy">Dairy / Cheese</option>
                    <option value="produce">Produce / Veggies</option>
                    <option value="sauce">Sauces &amp; Condiments</option>
                    <option value="spices">Spices &amp; Seasonings</option>
                    <option value="packaging">Packaging Box / Paper</option>
                    <option value="other">Other / Oil</option>
                  </select>
                </div>

                <div>
                  <label className="text-neutral-300 font-bold block mb-1">Purchase Unit</label>
                  <select
                    value={editingIngredient.purchaseUnit}
                    onChange={(e) =>
                      setEditingIngredient({
                        ...editingIngredient,
                        purchaseUnit: e.target.value as IngredientUnit,
                      })
                    }
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-white focus:border-amber-500 focus:outline-none"
                  >
                    <option value="kg">Kilogram (kg = 1000g)</option>
                    <option value="liter">Liter (liter = 1000ml)</option>
                    <option value="piece">Per Piece / Unit</option>
                    <option value="packet">Per Packet / Box</option>
                    <option value="g">Grams (g)</option>
                    <option value="ml">Milliliters (ml)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-neutral-300 font-bold block mb-1">
                    Bulk Purchase Cost (PKR)
                  </label>
                  <input
                    type="number"
                    min={1}
                    required
                    value={editingIngredient.purchaseCost}
                    onChange={(e) =>
                      setEditingIngredient({
                        ...editingIngredient,
                        purchaseCost: parseFloat(e.target.value) || 0,
                      })
                    }
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-white font-mono focus:border-amber-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-neutral-300 font-bold block mb-1">
                    Usable Yield % (Optional)
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={100}
                    value={editingIngredient.yieldPercent || 100}
                    onChange={(e) =>
                      setEditingIngredient({
                        ...editingIngredient,
                        yieldPercent: parseFloat(e.target.value) || 100,
                      })
                    }
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-white font-mono focus:border-amber-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="text-neutral-300 font-bold block mb-1">Supplier / Vendor</label>
                <input
                  type="text"
                  value={editingIngredient.supplier || ''}
                  onChange={(e) =>
                    setEditingIngredient({ ...editingIngredient, supplier: e.target.value })
                  }
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-white focus:border-amber-500 focus:outline-none"
                />
              </div>

              <div className="pt-3 border-t border-neutral-800 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setEditingIngredient(null)}
                  className="px-4 py-2 rounded-xl bg-neutral-800 text-neutral-300 font-bold hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 font-black shadow-md cursor-pointer"
                >
                  Update Ingredient
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL 3: EDIT EXISTING RECIPE DETAILS ================= */}
      {editingRecipe && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-950/85 backdrop-blur-sm animate-in fade-in">
          <div className="relative w-full max-w-lg bg-neutral-900 border border-neutral-800 rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
              <div className="flex items-center gap-2.5">
                <ChefHat className="w-5 h-5 text-amber-400" />
                <h3 className="text-base font-bold text-white">Edit Recipe BOM Details</h3>
              </div>
              <button
                type="button"
                onClick={() => setEditingRecipe(null)}
                className="text-neutral-400 hover:text-white p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEditedRecipe} className="space-y-3.5 text-xs">
              <div>
                <label className="text-neutral-300 font-bold block mb-1">Recipe / Dish Name</label>
                <input
                  type="text"
                  required
                  value={editingRecipe.name}
                  onChange={(e) => setEditingRecipe({ ...editingRecipe, name: e.target.value })}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-white focus:border-amber-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-neutral-300 font-bold block mb-1">Category</label>
                  <select
                    value={editingRecipe.category}
                    onChange={(e) =>
                      setEditingRecipe({ ...editingRecipe, category: e.target.value as any })
                    }
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-white focus:border-amber-500 focus:outline-none"
                  >
                    <option value="burger">Finished Burger</option>
                    <option value="sides">Fries / Loaded Sides</option>
                    <option value="component">Component / Patty Batch</option>
                    <option value="sauce">Secret Sauce Batch</option>
                    <option value="chicken">Fried Chicken Tenders / Wings</option>
                    <option value="beverage">Beverage / Drink</option>
                  </select>
                </div>

                <div>
                  <label className="text-neutral-300 font-bold block mb-1">Portion Yield</label>
                  <input
                    type="number"
                    min={1}
                    value={editingRecipe.portionYield}
                    onChange={(e) =>
                      setEditingRecipe({
                        ...editingRecipe,
                        portionYield: parseInt(e.target.value) || 1,
                      })
                    }
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-white font-mono focus:border-amber-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-neutral-300 font-bold block mb-1">Menu Selling Price (PKR)</label>
                  <input
                    type="number"
                    min={0}
                    value={editingRecipe.sellingPrice}
                    onChange={(e) =>
                      setEditingRecipe({
                        ...editingRecipe,
                        sellingPrice: parseFloat(e.target.value) || 0,
                      })
                    }
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-white font-mono focus:border-amber-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-neutral-300 font-bold block mb-1">Target Food Cost %</label>
                  <input
                    type="number"
                    min={1}
                    max={100}
                    value={editingRecipe.targetFoodCostPercent || 30}
                    onChange={(e) =>
                      setEditingRecipe({
                        ...editingRecipe,
                        targetFoodCostPercent: parseFloat(e.target.value) || 30,
                      })
                    }
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-white font-mono focus:border-amber-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="text-neutral-300 font-bold block mb-1">Prep / Kitchen Notes</label>
                <textarea
                  rows={2}
                  value={editingRecipe.notes || ''}
                  onChange={(e) => setEditingRecipe({ ...editingRecipe, notes: e.target.value })}
                  placeholder="e.g. Marinate 4 hours with lemon juice and spice blend"
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-white placeholder-neutral-500 focus:border-amber-500 focus:outline-none resize-none"
                />
              </div>

              <div className="pt-3 border-t border-neutral-800 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setEditingRecipe(null)}
                  className="px-4 py-2 rounded-xl bg-neutral-800 text-neutral-300 font-bold hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 font-black shadow-md cursor-pointer"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL 4: CREATE FULL RECIPE BOM ================= */}
      {isCreateRecipeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-950/85 backdrop-blur-sm animate-in fade-in">
          <div className="relative w-full max-w-2xl bg-neutral-900 border border-neutral-800 rounded-3xl p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
              <div className="flex items-center gap-2.5">
                <ChefHat className="w-5 h-5 text-amber-400" />
                <h3 className="text-base font-bold text-white">Create New Recipe BOM</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateRecipeModalOpen(false)}
                className="text-neutral-400 hover:text-white text-lg p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveNewRecipe} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-neutral-300 font-bold block mb-1">
                    Dish / Component Name
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Jalapeno Beast Burger"
                    value={newRecipeName}
                    onChange={(e) => setNewRecipeName(e.target.value)}
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-white focus:border-amber-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-neutral-300 font-bold block mb-1">Category</label>
                  <select
                    value={newRecipeCategory}
                    onChange={(e) => setNewRecipeCategory(e.target.value as any)}
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-white focus:border-amber-500 focus:outline-none"
                  >
                    <option value="burger">Finished Burger</option>
                    <option value="sides">Fries / Loaded Sides</option>
                    <option value="component">Component / Patty Batch</option>
                    <option value="sauce">Secret Sauce Batch</option>
                    <option value="chicken">Fried Chicken Tenders / Wings</option>
                    <option value="beverage">Beverage / Drink</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-neutral-300 font-bold block mb-1">
                    Selling Price (PKR)
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={newRecipeSellingPrice}
                    onChange={(e) => setNewRecipeSellingPrice(parseFloat(e.target.value) || 0)}
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-white font-mono focus:border-amber-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-neutral-300 font-bold block mb-1">Portion Yield</label>
                  <input
                    type="number"
                    min={1}
                    value={newRecipePortionYield}
                    onChange={(e) => setNewRecipePortionYield(parseInt(e.target.value) || 1)}
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-white font-mono focus:border-amber-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-neutral-300 font-bold block mb-1">Target Food Cost %</label>
                  <input
                    type="number"
                    min={1}
                    max={100}
                    value={newRecipeTargetFoodCost}
                    onChange={(e) => setNewRecipeTargetFoodCost(parseFloat(e.target.value) || 30)}
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-white font-mono focus:border-amber-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Recipe Ingredients Picker */}
              <div className="p-4 rounded-2xl bg-neutral-950 border border-neutral-800 space-y-3">
                <span className="text-neutral-300 font-bold block uppercase tracking-wider text-[11px]">
                  Recipe Ingredients &amp; Gram Usages
                </span>

                {selectedIngredientsForNewRecipe.map((sel, idx) => {
                  const ing = ingredientMap.get(sel.ingredientId);
                  const cost = (ing?.costPerBaseUnit || 0) * sel.quantity;
                  const unitLabel =
                    ing?.purchaseUnit === 'liter' ? 'ml' : ing?.purchaseUnit === 'piece' ? 'pc' : 'g';

                  return (
                    <div
                      key={idx}
                      className="flex items-center justify-between gap-2 p-2 rounded-xl bg-neutral-900 border border-neutral-800"
                    >
                      <div className="flex-1">
                        <span className="font-bold text-white">{ing?.name || 'Ingredient'}</span>
                        <span className="text-[10px] text-neutral-500 font-mono ml-2">
                          Rs. {ing?.costPerBaseUnit.toFixed(3)}/{unitLabel}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <input
                          type="number"
                          min={1}
                          value={sel.quantity}
                          onChange={(e) => {
                            const updated = [...selectedIngredientsForNewRecipe];
                            updated[idx].quantity = parseFloat(e.target.value) || 0;
                            setSelectedIngredientsForNewRecipe(updated);
                          }}
                          className="w-20 bg-neutral-950 border border-neutral-700 rounded-lg px-2 py-1 text-xs text-amber-400 font-mono font-bold text-center"
                        />
                        <span className="text-neutral-400 font-mono">{unitLabel}</span>
                        <span className="text-neutral-300 font-mono font-bold ml-2">
                          Rs. {cost.toFixed(1)}
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedIngredientsForNewRecipe(
                              selectedIngredientsForNewRecipe.filter((_, i) => i !== idx)
                            );
                          }}
                          className="p-1 text-neutral-500 hover:text-red-400 ml-1"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}

                {/* Add ingredient picker */}
                <div className="flex items-center gap-2 pt-2">
                  <select
                    id="new-recipe-add-ing-select"
                    defaultValue=""
                    className="flex-1 bg-neutral-900 border border-neutral-800 text-xs text-white rounded-xl px-3 py-2 focus:border-amber-500 focus:outline-none"
                  >
                    <option value="" disabled>
                      Select ingredient to add...
                    </option>
                    {ingredients.map((ing) => (
                      <option key={ing.id} value={ing.id}>
                        {ing.name} (Rs. {ing.costPerBaseUnit.toFixed(2)}/
                        {ing.purchaseUnit === 'liter' ? 'ml' : ing.purchaseUnit === 'piece' ? 'pc' : 'g'})
                      </option>
                    ))}
                  </select>

                  <input
                    type="number"
                    id="new-recipe-add-ing-qty"
                    placeholder="Grams/Units"
                    defaultValue={50}
                    className="w-24 bg-neutral-900 border border-neutral-800 text-xs text-white rounded-xl px-3 py-2 font-mono"
                  />

                  <button
                    type="button"
                    onClick={() => {
                      const selectEl = document.getElementById(
                        'new-recipe-add-ing-select'
                      ) as HTMLSelectElement;
                      const qtyEl = document.getElementById(
                        'new-recipe-add-ing-qty'
                      ) as HTMLInputElement;
                      if (selectEl?.value && qtyEl?.value) {
                        setSelectedIngredientsForNewRecipe([
                          ...selectedIngredientsForNewRecipe,
                          { ingredientId: selectEl.value, quantity: parseFloat(qtyEl.value) || 1 },
                        ]);
                        selectEl.value = '';
                      }
                    }}
                    className="px-3.5 py-2 bg-neutral-800 hover:bg-neutral-750 text-amber-400 font-bold rounded-xl text-xs border border-neutral-700 cursor-pointer"
                  >
                    + Add
                  </button>
                </div>
              </div>

              <div className="pt-3 border-t border-neutral-800 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsCreateRecipeModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-neutral-800 text-neutral-300 font-bold hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 font-black shadow-md cursor-pointer"
                >
                  Save Recipe BOM
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
