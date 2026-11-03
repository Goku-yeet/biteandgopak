export type ThemeAccent = 'amber' | 'emerald' | 'crimson' | 'indigo' | 'orange' | 'cyan' | 'rose' | 'violet';

export type ThemePresetId =
  | 'white'
  | 'dark'
  | 'midnight'
  | 'karachi_spice'
  | 'neon_cyberpunk'
  | 'emerald_royale'
  | 'royal_velvet'
  | 'ocean_breeze'
  | 'sunset_blaze'
  | 'retro_diner'
  | 'tokyo_drifter'
  | 'matcha_zen'
  | 'golden_sultan'
  | 'raw_charcoal'
  | 'bubblegum_pop'
  | 'cyber_matrix'
  | 'sapphire_ice'
  | 'desert_safari'
  | 'berry_velvet'
  | 'smoky_bbq'
  | 'pistachio_cream'
  | 'electric_amethyst'
  | 'platinum_minimal';

export interface ThemePresetDefinition {
  id: ThemePresetId;
  name: string;
  category: 'base' | 'custom';
  description: string;
  mode: 'light' | 'dark';
  accentHex: string;
  secondaryHex: string;
  bgHex: string;
  cardHex: string;
  borderHex: string;
  textHex: string;
  badgeLabel: string;
  // Classes
  bgPrimary: string;
  textPrimary: string;
  borderPrimary: string;
  badgeSubtle: string;
}

export const THEME_PRESETS: Record<ThemePresetId, ThemePresetDefinition> = {
  white: {
    id: 'white',
    name: 'White Porcelain (Clean Light)',
    category: 'base',
    description: 'Crisp snow background, rich charcoal typography, and warm amber gold highlights. Clean & bright day mode.',
    mode: 'light',
    accentHex: '#d97706',
    secondaryHex: '#f59e0b',
    bgHex: '#f8fafc',
    cardHex: '#ffffff',
    borderHex: '#e2e8f0',
    textHex: '#0f172a',
    badgeLabel: '☀️ Light Day',
    bgPrimary: 'bg-amber-600',
    textPrimary: 'text-amber-700',
    borderPrimary: 'border-amber-500/40',
    badgeSubtle: 'bg-amber-100 text-amber-900 border border-amber-300',
  },
  dark: {
    id: 'dark',
    name: 'Smash Dark (Classic)',
    category: 'base',
    description: 'Signature dark grillhouse atmosphere with deep charcoal canvas and vibrant golden smash accents.',
    mode: 'dark',
    accentHex: '#f59e0b',
    secondaryHex: '#d97706',
    bgHex: '#0a0a0a',
    cardHex: '#171717',
    borderHex: '#262626',
    textHex: '#f5f5f5',
    badgeLabel: '🌙 Classic Dark',
    bgPrimary: 'bg-amber-500',
    textPrimary: 'text-amber-400',
    borderPrimary: 'border-amber-500/40',
    badgeSubtle: 'bg-amber-500/15 text-amber-400 border border-amber-500/30',
  },
  midnight: {
    id: 'midnight',
    name: 'OLED Midnight Black',
    category: 'base',
    description: 'Pitch black #000000 background engineered for OLED displays with icy electric blue accents.',
    mode: 'dark',
    accentHex: '#38bdf8',
    secondaryHex: '#0284c7',
    bgHex: '#000000',
    cardHex: '#09090b',
    borderHex: '#18181b',
    textHex: '#ffffff',
    badgeLabel: '⚡ Pure OLED',
    bgPrimary: 'bg-sky-500',
    textPrimary: 'text-sky-400',
    borderPrimary: 'border-sky-500/40',
    badgeSubtle: 'bg-sky-500/15 text-sky-400 border border-sky-500/30',
  },
  karachi_spice: {
    id: 'karachi_spice',
    name: 'Karachi Street Spice',
    category: 'custom',
    description: 'Fiery tandoori saffron, chili red & toasted aromatics inspired by North Nazimabad & Burns Road food culture.',
    mode: 'dark',
    accentHex: '#ea580c',
    secondaryHex: '#dc2626',
    bgHex: '#140803',
    cardHex: '#220e06',
    borderHex: '#3f1a0b',
    textHex: '#fff7ed',
    badgeLabel: '🌶️ Spice Grill',
    bgPrimary: 'bg-orange-600',
    textPrimary: 'text-orange-400',
    borderPrimary: 'border-orange-500/40',
    badgeSubtle: 'bg-orange-500/15 text-orange-400 border border-orange-500/30',
  },
  neon_cyberpunk: {
    id: 'neon_cyberpunk',
    name: 'Cyberpunk Neon',
    category: 'custom',
    description: 'High-voltage electric cyan, hot magenta pink and dark futuristic synthwave energy.',
    mode: 'dark',
    accentHex: '#06b6d4',
    secondaryHex: '#ec4899',
    bgHex: '#080614',
    cardHex: '#120e29',
    borderHex: '#261b4d',
    textHex: '#fdf4ff',
    badgeLabel: '🔮 Neon Synth',
    bgPrimary: 'bg-cyan-500',
    textPrimary: 'text-cyan-400',
    borderPrimary: 'border-cyan-500/40',
    badgeSubtle: 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/30',
  },
  emerald_royale: {
    id: 'emerald_royale',
    name: 'Emerald Royale',
    category: 'custom',
    description: 'Deep forest green luxury with imperial gold trim and rich velvet botanical depth.',
    mode: 'dark',
    accentHex: '#10b981',
    secondaryHex: '#eab308',
    bgHex: '#03120b',
    cardHex: '#082215',
    borderHex: '#113f28',
    textHex: '#ecfdf5',
    badgeLabel: '👑 Royale Gold',
    bgPrimary: 'bg-emerald-500',
    textPrimary: 'text-emerald-400',
    borderPrimary: 'border-emerald-500/40',
    badgeSubtle: 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30',
  },
  royal_velvet: {
    id: 'royal_velvet',
    name: 'Royal Velvet',
    category: 'custom',
    description: 'Opulent amethyst purple and radiant lavender with polished metallic elegance.',
    mode: 'dark',
    accentHex: '#8b5cf6',
    secondaryHex: '#c084fc',
    bgHex: '#0d0818',
    cardHex: '#170e2a',
    borderHex: '#2c1a52',
    textHex: '#faf5ff',
    badgeLabel: '💜 Velvet Amethyst',
    bgPrimary: 'bg-violet-600',
    textPrimary: 'text-violet-400',
    borderPrimary: 'border-violet-500/40',
    badgeSubtle: 'bg-violet-500/15 text-violet-400 border border-violet-500/30',
  },
  ocean_breeze: {
    id: 'ocean_breeze',
    name: 'Arabian Sea Breeze',
    category: 'custom',
    description: 'Deep marine navy azure and refreshing turquoise surf inspired by the Karachi coastline.',
    mode: 'dark',
    accentHex: '#0284c7',
    secondaryHex: '#14b8a6',
    bgHex: '#03101b',
    cardHex: '#081d30',
    borderHex: '#103352',
    textHex: '#f0f9ff',
    badgeLabel: '🌊 Coastal Wave',
    bgPrimary: 'bg-sky-600',
    textPrimary: 'text-sky-400',
    borderPrimary: 'border-sky-500/40',
    badgeSubtle: 'bg-sky-500/15 text-sky-400 border border-sky-500/30',
  },
  sunset_blaze: {
    id: 'sunset_blaze',
    name: 'Sunset Blaze (Coral & Gold)',
    category: 'custom',
    description: 'Vivid molten coral pink, toasted caramel amber, and warm dusk gradient ambiance.',
    mode: 'dark',
    accentHex: '#f43f5e',
    secondaryHex: '#f59e0b',
    bgHex: '#140609',
    cardHex: '#220b12',
    borderHex: '#451221',
    textHex: '#fff1f2',
    badgeLabel: '🌅 Sunset Coral',
    bgPrimary: 'bg-rose-500',
    textPrimary: 'text-rose-400',
    borderPrimary: 'border-rose-500/40',
    badgeSubtle: 'bg-rose-500/15 text-rose-400 border border-rose-500/30',
  },
  retro_diner: {
    id: 'retro_diner',
    name: 'Retro 50s Route Diner',
    category: 'custom',
    description: 'Vintage checkerboard cherry crimson, classic turquoise neon, and nostalgic milk-shake parlor energy.',
    mode: 'dark',
    accentHex: '#dc2626',
    secondaryHex: '#06b6d4',
    bgHex: '#120505',
    cardHex: '#220b0b',
    borderHex: '#421616',
    textHex: '#fef2f2',
    badgeLabel: '🍒 Retro Diner',
    bgPrimary: 'bg-red-600',
    textPrimary: 'text-red-400',
    borderPrimary: 'border-red-500/40',
    badgeSubtle: 'bg-red-500/15 text-red-400 border border-red-500/30',
  },
  tokyo_drifter: {
    id: 'tokyo_drifter',
    name: 'Tokyo Drift Neon',
    category: 'custom',
    description: 'Hyper-vibrant hot magenta and electric violet synthwave glow over deep obsidian asphalt.',
    mode: 'dark',
    accentHex: '#d946ef',
    secondaryHex: '#8b5cf6',
    bgHex: '#0f0412',
    cardHex: '#1d0722',
    borderHex: '#3d1247',
    textHex: '#fdf4ff',
    badgeLabel: '🏎️ Tokyo Synth',
    bgPrimary: 'bg-fuchsia-600',
    textPrimary: 'text-fuchsia-400',
    borderPrimary: 'border-fuchsia-500/40',
    badgeSubtle: 'bg-fuchsia-500/15 text-fuchsia-400 border border-fuchsia-500/30',
  },
  matcha_zen: {
    id: 'matcha_zen',
    name: 'Matcha Forest Zen',
    category: 'custom',
    description: 'Earthy organic ceremonial matcha green, warm roasted sesame bamboo, and calming minimalist tea house.',
    mode: 'dark',
    accentHex: '#84cc16',
    secondaryHex: '#eab308',
    bgHex: '#071003',
    cardHex: '#111e0a',
    borderHex: '#223d16',
    textHex: '#f7fee7',
    badgeLabel: '🍵 Matcha Zen',
    bgPrimary: 'bg-lime-600',
    textPrimary: 'text-lime-400',
    borderPrimary: 'border-lime-500/40',
    badgeSubtle: 'bg-lime-500/15 text-lime-400 border border-lime-500/30',
  },
  golden_sultan: {
    id: 'golden_sultan',
    name: 'Golden Sultan Luxury',
    category: 'custom',
    description: 'Opulent 24-Karat mirror gold leaf and deep royal espresso lacquer with prestige hospitality polish.',
    mode: 'dark',
    accentHex: '#fbbf24',
    secondaryHex: '#f59e0b',
    bgHex: '#100c02',
    cardHex: '#1c1505',
    borderHex: '#3c2e0e',
    textHex: '#fffbeb',
    badgeLabel: '✨ 24K Gold',
    bgPrimary: 'bg-amber-400',
    textPrimary: 'text-amber-300',
    borderPrimary: 'border-amber-400/40',
    badgeSubtle: 'bg-amber-400/15 text-amber-300 border border-amber-400/30',
  },
  raw_charcoal: {
    id: 'raw_charcoal',
    name: 'Raw Smoked Charcoal (Matte Minimalist)',
    category: 'custom',
    description: 'Ultra-slick industrial matte graphite canvas, charred volcanic smoke, and glowing ember flame edge.',
    mode: 'dark',
    accentHex: '#f97316',
    secondaryHex: '#fb923c',
    bgHex: '#0d0d0e',
    cardHex: '#18181b',
    borderHex: '#27272a',
    textHex: '#fafafa',
    badgeLabel: '🔥 Smoked Ember',
    bgPrimary: 'bg-orange-500',
    textPrimary: 'text-orange-400',
    borderPrimary: 'border-orange-500/40',
    badgeSubtle: 'bg-orange-500/15 text-orange-400 border border-orange-500/30',
  },
  bubblegum_pop: {
    id: 'bubblegum_pop',
    name: 'Neon Flamingo (Y2K Pop)',
    category: 'custom',
    description: 'Playful vibrant electric strawberry magenta and breezy mint cyan over a sleek velvet noir base.',
    mode: 'dark',
    accentHex: '#ec4899',
    secondaryHex: '#06b6d4',
    bgHex: '#100511',
    cardHex: '#1f0a21',
    borderHex: '#3b123e',
    textHex: '#fdf2f8',
    badgeLabel: '🦩 Neon Pop',
    bgPrimary: 'bg-pink-500',
    textPrimary: 'text-pink-400',
    borderPrimary: 'border-pink-500/40',
    badgeSubtle: 'bg-pink-500/15 text-pink-400 border border-pink-500/30',
  },
  cyber_matrix: {
    id: 'cyber_matrix',
    name: 'Terminal Matrix Green',
    category: 'custom',
    description: 'Phosphorescent phosphor cyber green glow on pure deep hacker terminal obsidian black.',
    mode: 'dark',
    accentHex: '#22c55e',
    secondaryHex: '#4ade80',
    bgHex: '#020d06',
    cardHex: '#06170c',
    borderHex: '#0f381c',
    textHex: '#f0fdf4',
    badgeLabel: '📟 Cyber Matrix',
    bgPrimary: 'bg-green-500',
    textPrimary: 'text-green-400',
    borderPrimary: 'border-green-500/40',
    badgeSubtle: 'bg-green-500/15 text-green-400 border border-green-500/30',
  },
  sapphire_ice: {
    id: 'sapphire_ice',
    name: 'Nordic Glacier Sapphire',
    category: 'custom',
    description: 'Frosty arctic diamond cyan and deep abyssal royal sapphire inspired by glacial ice caves.',
    mode: 'dark',
    accentHex: '#0ea5e9',
    secondaryHex: '#38bdf8',
    bgHex: '#020c16',
    cardHex: '#061729',
    borderHex: '#0c2d52',
    textHex: '#f0f9ff',
    badgeLabel: '🧊 Arctic Ice',
    bgPrimary: 'bg-sky-500',
    textPrimary: 'text-sky-400',
    borderPrimary: 'border-sky-500/40',
    badgeSubtle: 'bg-sky-500/15 text-sky-400 border border-sky-500/30',
  },
  desert_safari: {
    id: 'desert_safari',
    name: 'Desert Dune & Saffron',
    category: 'custom',
    description: 'Rich golden desert dunes, roasted Moroccan terracotta clay, and sunset dusk warmth.',
    mode: 'dark',
    accentHex: '#eab308',
    secondaryHex: '#d97706',
    bgHex: '#120c04',
    cardHex: '#211607',
    borderHex: '#3d2b0e',
    textHex: '#fefce8',
    badgeLabel: '🏜️ Desert Dune',
    bgPrimary: 'bg-yellow-500',
    textPrimary: 'text-yellow-400',
    borderPrimary: 'border-yellow-500/40',
    badgeSubtle: 'bg-yellow-500/15 text-yellow-400 border border-yellow-500/30',
  },
  berry_velvet: {
    id: 'berry_velvet',
    name: 'Blackberry Noir & Plum',
    category: 'custom',
    description: 'Deep ripe wild blackberry velvet, vintage cabernet wine, and subtle metallic rose gold highlights.',
    mode: 'dark',
    accentHex: '#e11d48',
    secondaryHex: '#f43f5e',
    bgHex: '#120409',
    cardHex: '#240813',
    borderHex: '#471125',
    textHex: '#fff1f2',
    badgeLabel: '🍷 Wild Berry',
    bgPrimary: 'bg-rose-600',
    textPrimary: 'text-rose-400',
    borderPrimary: 'border-rose-500/40',
    badgeSubtle: 'bg-rose-500/15 text-rose-400 border border-rose-500/30',
  },
  smoky_bbq: {
    id: 'smoky_bbq',
    name: 'Texas Hickory BBQ & Copper',
    category: 'custom',
    description: 'Deep smoked hickory oak canvas, burnt copper ember highlights, and warm bourbon glaze.',
    mode: 'dark',
    accentHex: '#d97706',
    secondaryHex: '#b45309',
    bgHex: '#130c06',
    cardHex: '#1f130a',
    borderHex: '#3b2210',
    textHex: '#fef3c7',
    badgeLabel: '🍖 Hickory BBQ',
    bgPrimary: 'bg-amber-600',
    textPrimary: 'text-amber-400',
    borderPrimary: 'border-amber-600/40',
    badgeSubtle: 'bg-amber-600/15 text-amber-400 border border-amber-600/30',
  },
  pistachio_cream: {
    id: 'pistachio_cream',
    name: 'Pistachio Gelato & Cream (Light)',
    category: 'custom',
    description: 'Refreshing pale Sicilian pistachio green, delicate almond cream surfaces, and dark espresso typography.',
    mode: 'light',
    accentHex: '#059669',
    secondaryHex: '#10b981',
    bgHex: '#f2f8f4',
    cardHex: '#ffffff',
    borderHex: '#d1e7dd',
    textHex: '#064e3b',
    badgeLabel: '🍨 Pistachio Gelato',
    bgPrimary: 'bg-emerald-600',
    textPrimary: 'text-emerald-700',
    borderPrimary: 'border-emerald-500/40',
    badgeSubtle: 'bg-emerald-100 text-emerald-900 border border-emerald-300',
  },
  electric_amethyst: {
    id: 'electric_amethyst',
    name: 'Electric Amethyst & Ultraviolet',
    category: 'custom',
    description: 'Deep interstellar cosmic purple, neon fluorescent violet glow, and cyberpunk lavender accents.',
    mode: 'dark',
    accentHex: '#a855f7',
    secondaryHex: '#c084fc',
    bgHex: '#0c0516',
    cardHex: '#170a2a',
    borderHex: '#301357',
    textHex: '#faf5ff',
    badgeLabel: '🔮 Electric Amethyst',
    bgPrimary: 'bg-purple-600',
    textPrimary: 'text-purple-400',
    borderPrimary: 'border-purple-500/40',
    badgeSubtle: 'bg-purple-500/15 text-purple-400 border border-purple-500/30',
  },
  platinum_minimal: {
    id: 'platinum_minimal',
    name: 'Platinum Slate Minimalist',
    category: 'custom',
    description: 'Ultra-refined architectural slate gray, cool stainless steel borders, and crisp high-contrast mono typography.',
    mode: 'dark',
    accentHex: '#94a3b8',
    secondaryHex: '#cbd5e1',
    bgHex: '#0b0f15',
    cardHex: '#131923',
    borderHex: '#253043',
    textHex: '#f8fafc',
    badgeLabel: '📐 Platinum Slate',
    bgPrimary: 'bg-slate-500',
    textPrimary: 'text-slate-300',
    borderPrimary: 'border-slate-500/40',
    badgeSubtle: 'bg-slate-500/15 text-slate-300 border border-slate-500/30',
  },
};

export interface ThemeDefinition {
  id: ThemeAccent;
  name: string;
  hex: string;
  hoverHex: string;
  textOnPrimary: string;
  bgPrimary: string;
  bgHover: string;
  textPrimary: string;
  borderPrimary: string;
  badgeSubtle: string;
  glowShadow: string;
}

export const THEME_CONFIGS: Record<ThemeAccent, ThemeDefinition> = {
  amber: {
    id: 'amber',
    name: 'Classic Gold',
    hex: '#f59e0b',
    hoverHex: '#d97706',
    textOnPrimary: 'text-neutral-950',
    bgPrimary: 'bg-amber-500',
    bgHover: 'hover:bg-amber-400',
    textPrimary: 'text-amber-400',
    borderPrimary: 'border-amber-500/40',
    badgeSubtle: 'bg-amber-500/15 text-amber-400 border border-amber-500/30',
    glowShadow: 'shadow-amber-500/20',
  },
  crimson: {
    id: 'crimson',
    name: 'Smash Red',
    hex: '#ef4444',
    hoverHex: '#dc2626',
    textOnPrimary: 'text-white',
    bgPrimary: 'bg-red-600',
    bgHover: 'hover:bg-red-500',
    textPrimary: 'text-red-400',
    borderPrimary: 'border-red-500/40',
    badgeSubtle: 'bg-red-500/15 text-red-400 border border-red-500/30',
    glowShadow: 'shadow-red-500/20',
  },
  emerald: {
    id: 'emerald',
    name: 'Fresh Green',
    hex: '#10b981',
    hoverHex: '#059669',
    textOnPrimary: 'text-neutral-950',
    bgPrimary: 'bg-emerald-500',
    bgHover: 'hover:bg-emerald-400',
    textPrimary: 'text-emerald-400',
    borderPrimary: 'border-emerald-500/40',
    badgeSubtle: 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30',
    glowShadow: 'shadow-emerald-500/20',
  },
  indigo: {
    id: 'indigo',
    name: 'Cyber Violet',
    hex: '#6366f1',
    hoverHex: '#4f46e5',
    textOnPrimary: 'text-white',
    bgPrimary: 'bg-indigo-600',
    bgHover: 'hover:bg-indigo-500',
    textPrimary: 'text-indigo-400',
    borderPrimary: 'border-indigo-500/40',
    badgeSubtle: 'bg-indigo-500/15 text-indigo-400 border border-indigo-500/30',
    glowShadow: 'shadow-indigo-500/20',
  },
  orange: {
    id: 'orange',
    name: 'Sunset Fire',
    hex: '#f97316',
    hoverHex: '#ea580c',
    textOnPrimary: 'text-white',
    bgPrimary: 'bg-orange-500',
    bgHover: 'hover:bg-orange-400',
    textPrimary: 'text-orange-400',
    borderPrimary: 'border-orange-500/40',
    badgeSubtle: 'bg-orange-500/15 text-orange-400 border border-orange-500/30',
    glowShadow: 'shadow-orange-500/20',
  },
  cyan: {
    id: 'cyan',
    name: 'Electric Cyan',
    hex: '#06b6d4',
    hoverHex: '#0891b2',
    textOnPrimary: 'text-neutral-950',
    bgPrimary: 'bg-cyan-500',
    bgHover: 'hover:bg-cyan-400',
    textPrimary: 'text-cyan-400',
    borderPrimary: 'border-cyan-500/40',
    badgeSubtle: 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/30',
    glowShadow: 'shadow-cyan-500/20',
  },
  rose: {
    id: 'rose',
    name: 'Neon Rose',
    hex: '#f43f5e',
    hoverHex: '#e11d48',
    textOnPrimary: 'text-white',
    bgPrimary: 'bg-rose-500',
    bgHover: 'hover:bg-rose-400',
    textPrimary: 'text-rose-400',
    borderPrimary: 'border-rose-500/40',
    badgeSubtle: 'bg-rose-500/15 text-rose-400 border border-rose-500/30',
    glowShadow: 'shadow-rose-500/20',
  },
  violet: {
    id: 'violet',
    name: 'Royal Purple',
    hex: '#8b5cf6',
    hoverHex: '#7c3aed',
    textOnPrimary: 'text-white',
    bgPrimary: 'bg-violet-600',
    bgHover: 'hover:bg-violet-500',
    textPrimary: 'text-violet-400',
    borderPrimary: 'border-violet-500/40',
    badgeSubtle: 'bg-violet-500/15 text-violet-400 border border-violet-500/30',
    glowShadow: 'shadow-violet-500/20',
  },
};

export function getTheme(themeAccent?: string): ThemeDefinition {
  const key = (themeAccent as ThemeAccent) || 'amber';
  return THEME_CONFIGS[key] || THEME_CONFIGS.amber;
}

export function getThemePreset(presetId?: string): ThemePresetDefinition {
  const key = (presetId as ThemePresetId) || 'dark';
  return THEME_PRESETS[key] || THEME_PRESETS.dark;
}

export function applyThemeToDocument(presetIdOrAccent?: string) {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;

  // Check if it's a known preset
  if (presetIdOrAccent && THEME_PRESETS[presetIdOrAccent as ThemePresetId]) {
    const preset = THEME_PRESETS[presetIdOrAccent as ThemePresetId];
    root.setAttribute('data-theme', preset.id);
    root.setAttribute('data-theme-mode', preset.mode);
    root.style.setProperty('--theme-accent', preset.accentHex);
    root.style.setProperty('--theme-accent-hover', preset.secondaryHex);
    root.style.setProperty('--theme-accent-text', preset.mode === 'light' ? '#0f172a' : '#ffffff');
    root.style.setProperty('--bg-app', preset.bgHex);
    root.style.setProperty('--bg-card', preset.cardHex);
    root.style.setProperty('--border-subtle', preset.borderHex);
    return;
  }

  // Fallback to legacy accent mapping
  const t = getTheme(presetIdOrAccent);
  root.setAttribute('data-theme', t.id);
  root.setAttribute('data-theme-mode', 'dark');
  root.style.setProperty('--theme-accent', t.hex);
  root.style.setProperty('--theme-accent-hover', t.hoverHex);
  root.style.setProperty('--theme-accent-text', t.textOnPrimary === 'text-white' ? '#ffffff' : '#0a0a0a');
}
