import React from 'react';
import { Category } from '../../types';
import { Flame, Drumstick, Zap, Sandwich, Sparkles, CupSoda, UtensilsCrossed } from 'lucide-react';

interface CategoryTabsProps {
  categories: Category[];
  selectedCategoryId: string;
  onSelectCategory: (id: string) => void;
  itemsCountByCat: Record<string, number>;
}

const iconMap: Record<string, React.ReactNode> = {
  Flame: <Flame className="w-4 h-4" />,
  Drumstick: <Drumstick className="w-4 h-4" />,
  Zap: <Zap className="w-4 h-4" />,
  Sandwich: <Sandwich className="w-4 h-4" />,
  Sparkles: <Sparkles className="w-4 h-4" />,
  CupSoda: <CupSoda className="w-4 h-4" />,
};

export const CategoryTabs: React.FC<CategoryTabsProps> = ({
  categories,
  selectedCategoryId,
  onSelectCategory,
  itemsCountByCat,
}) => {
  const [headerOffset, setHeaderOffset] = React.useState(112);

  React.useEffect(() => {
    const updateHeaderOffset = () => {
      const headerEl = document.getElementById('storefront-header');
      if (headerEl) {
        setHeaderOffset(headerEl.offsetHeight);
      }
    };

    updateHeaderOffset();
    window.addEventListener('resize', updateHeaderOffset);
    // Double check after fonts/DOM paint
    const timer = setTimeout(updateHeaderOffset, 200);
    return () => {
      window.removeEventListener('resize', updateHeaderOffset);
      clearTimeout(timer);
    };
  }, []);

  const totalItems = Object.values(itemsCountByCat).reduce((a, b) => a + b, 0);
  const activeCategory = categories.find((c) => c.id === selectedCategoryId);

  return (
    <div
      id="category-tabs-bar"
      style={{ top: `${headerOffset}px` }}
      className="sticky z-30 bg-neutral-950/95 backdrop-blur-md border-y border-neutral-800/80 py-2.5 shadow-lg shadow-black/40 transition-[top] duration-150"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar scroll-smooth py-0.5">
          {/* "All Menu" tab */}
          <button
            onClick={() => {
              onSelectCategory('all');
              const el = document.getElementById('menu-section');
              if (el) {
                const categoryBarEl = document.getElementById('category-tabs-bar');
                const clearance = headerOffset + (categoryBarEl ? categoryBarEl.offsetHeight : 54) + 24;
                const y = el.getBoundingClientRect().top + window.pageYOffset - clearance;
                window.scrollTo({ top: Math.max(0, y), behavior: 'smooth' });
              }
            }}
            className={`flex items-center gap-2 px-3.5 py-2 text-xs font-bold rounded-xl whitespace-nowrap shrink-0 transition-all cursor-pointer ${
              selectedCategoryId === 'all'
                ? 'bg-amber-500 text-neutral-950 shadow-md shadow-amber-500/20'
                : 'bg-neutral-900/90 text-neutral-300 hover:bg-neutral-800 hover:text-white border border-neutral-800'
            }`}
          >
            <UtensilsCrossed className="w-3.5 h-3.5" />
            <span>Full Menu</span>
            <span
              className={`text-[10px] font-mono px-1.5 py-0.2 rounded-md ${
                selectedCategoryId === 'all' ? 'bg-neutral-950/20 text-neutral-950 font-bold' : 'bg-neutral-800 text-neutral-400'
              }`}
            >
              {totalItems}
            </span>
          </button>

          {/* Dynamic category tabs */}
          {categories
            .sort((a, b) => a.order - b.order)
            .map((cat) => {
              const isSelected = selectedCategoryId === cat.id;
              const count = itemsCountByCat[cat.id] || 0;

              return (
                <button
                  key={cat.id}
                  onClick={() => {
                    onSelectCategory(cat.id);
                    const targetEl = document.getElementById(`category-section-${cat.id}`) || document.getElementById('menu-section');
                    if (targetEl) {
                      const categoryBarEl = document.getElementById('category-tabs-bar');
                      const clearance = headerOffset + (categoryBarEl ? categoryBarEl.offsetHeight : 54) + 28;
                      const y = targetEl.getBoundingClientRect().top + window.pageYOffset - clearance;
                      window.scrollTo({ top: Math.max(0, y), behavior: 'smooth' });
                    }
                  }}
                  className={`flex items-center gap-2 px-3.5 py-2 text-xs font-bold rounded-xl whitespace-nowrap shrink-0 transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-amber-500 text-neutral-950 shadow-md shadow-amber-500/20'
                      : 'bg-neutral-900/90 text-neutral-300 hover:bg-neutral-800 hover:text-white border border-neutral-800'
                  }`}
                >
                  <span className={isSelected ? 'text-neutral-950' : 'text-amber-500'}>
                    {iconMap[cat.iconName] || <Flame className="w-3.5 h-3.5" />}
                  </span>
                  <span>{cat.name}</span>
                  {count > 0 && (
                    <span
                      className={`text-[10px] font-mono px-1.5 py-0.2 rounded-md ${
                        isSelected ? 'bg-neutral-950/20 text-neutral-950 font-bold' : 'bg-neutral-800 text-neutral-400'
                      }`}
                    >
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
        </div>
      </div>
    </div>
  );
};
