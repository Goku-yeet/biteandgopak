import React from 'react';
import { Palette, Check, Sparkles, Sun, Moon, Zap, Flame, Shield, X } from 'lucide-react';
import { THEME_PRESETS, ThemePresetId, applyThemeToDocument } from '../../utils/theme';

interface ThemeSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentTheme: string;
  onSelectTheme: (themeId: ThemePresetId) => void | Promise<void>;
}

export const ThemeSelectorModal: React.FC<ThemeSelectorModalProps> = ({
  isOpen,
  onClose,
  currentTheme,
  onSelectTheme,
}) => {
  if (!isOpen) return null;

  const baseThemes: ThemePresetId[] = ['white', 'dark', 'midnight'];
  const customThemes: ThemePresetId[] = [
    'karachi_spice',
    'neon_cyberpunk',
    'emerald_royale',
    'royal_velvet',
    'ocean_breeze',
    'sunset_blaze',
    'retro_diner',
    'tokyo_drifter',
    'matcha_zen',
    'golden_sultan',
    'raw_charcoal',
    'bubblegum_pop',
    'cyber_matrix',
    'sapphire_ice',
    'desert_safari',
    'berry_velvet',
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-neutral-950/80 backdrop-blur-md animate-in fade-in">
      <div className="relative w-full max-w-xl bg-neutral-900 border border-neutral-800 rounded-3xl shadow-2xl overflow-hidden p-5 sm:p-6">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-neutral-800 mb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Palette className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <span>Select Store Theme &amp; Mood</span>
                <span className="text-[10px] bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded-full font-bold border border-amber-500/30">
                  {Object.keys(THEME_PRESETS).length} Themes
                </span>
              </h3>
              <p className="text-xs text-neutral-400">
                Switch instantly between Clean White, Midnight Dark, or Signature Custom Themes.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-neutral-400 hover:text-white rounded-xl hover:bg-neutral-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-5 max-h-[65vh] overflow-y-auto pr-1">
          {/* Base Modes: White, Dark, Midnight */}
          <div>
            <h4 className="text-xs font-bold text-neutral-400 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
              <span>Essential Light &amp; Dark Modes</span>
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              {baseThemes.map((themeId) => {
                const t = THEME_PRESETS[themeId];
                const isSelected = currentTheme === themeId;
                return (
                  <button
                    key={themeId}
                    type="button"
                    onClick={() => {
                      onSelectTheme(themeId);
                      applyThemeToDocument(themeId);
                    }}
                    className={`relative p-3 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                      isSelected
                        ? 'border-amber-500 bg-amber-500/10 ring-2 ring-amber-500/25 shadow-lg'
                        : 'border-neutral-800 bg-neutral-950/60 hover:border-neutral-700 hover:bg-neutral-950'
                    }`}
                  >
                    <div>
                      {/* Color dots preview */}
                      <div className="flex items-center gap-1.5 mb-2">
                        <span
                          className="w-4 h-4 rounded-full border border-black/20 shadow-sm"
                          style={{ backgroundColor: t.bgHex }}
                        />
                        <span
                          className="w-4 h-4 rounded-full shadow-sm"
                          style={{ backgroundColor: t.accentHex }}
                        />
                        <span
                          className="w-4 h-4 rounded-full shadow-sm"
                          style={{ backgroundColor: t.cardHex }}
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs text-white block">{t.name}</span>
                        {isSelected && <Check className="w-4 h-4 text-amber-400 shrink-0" />}
                      </div>
                      <span className="text-[10px] text-neutral-400 block mt-1 leading-snug">
                        {t.description.slice(0, 55)}...
                      </span>
                    </div>
                    <span className="mt-3 text-[10px] font-mono px-2 py-0.5 rounded self-start font-bold border border-neutral-700 bg-neutral-900 text-neutral-300">
                      {t.badgeLabel}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Custom Karachi & Signature Themes */}
          <div>
            <h4 className="text-xs font-bold text-neutral-400 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>Signature Custom Themes</span>
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {customThemes.map((themeId) => {
                const t = THEME_PRESETS[themeId];
                const isSelected = currentTheme === themeId;
                return (
                  <button
                    key={themeId}
                    type="button"
                    onClick={() => {
                      onSelectTheme(themeId);
                      applyThemeToDocument(themeId);
                    }}
                    className={`relative p-3 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                      isSelected
                        ? 'border-amber-500 bg-amber-500/10 ring-2 ring-amber-500/25 shadow-lg'
                        : 'border-neutral-800 bg-neutral-950/60 hover:border-neutral-700 hover:bg-neutral-950'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-1.5">
                          <span
                            className="w-4 h-4 rounded-full shadow-sm"
                            style={{ backgroundColor: t.accentHex }}
                          />
                          <span
                            className="w-4 h-4 rounded-full shadow-sm"
                            style={{ backgroundColor: t.secondaryHex }}
                          />
                          <span
                            className="w-4 h-4 rounded-full border border-neutral-700 shadow-sm"
                            style={{ backgroundColor: t.bgHex }}
                          />
                        </div>
                        <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-neutral-900 border border-neutral-800 text-neutral-300">
                          {t.badgeLabel}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs text-white">{t.name}</span>
                        {isSelected && <Check className="w-4 h-4 text-amber-400 shrink-0" />}
                      </div>
                      <p className="text-[11px] text-neutral-400 mt-1 leading-relaxed">
                        {t.description}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-5 pt-4 border-t border-neutral-800 flex items-center justify-between">
          <span className="text-xs text-neutral-400">
            Selected: <strong className="text-amber-400">{THEME_PRESETS[currentTheme as ThemePresetId]?.name || 'Classic Dark'}</strong>
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold text-xs rounded-xl transition-all cursor-pointer shadow"
          >
            Apply &amp; Done
          </button>
        </div>
      </div>
    </div>
  );
};
