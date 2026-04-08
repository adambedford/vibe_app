/**
 * Design System Colors from DESIGN.md
 * Vibe App - Playful-Industrial aesthetic
 */

// Primary accent - Plasma Orange (signals energy/creation)
export const plasma = {
  DEFAULT: '#FF6B35',
  dim: '#CC5529',
  light: '#E55A2B',
} as const;

// Secondary accent - Soft Violet
export const violet = {
  DEFAULT: '#A78BFA',
  dim: '#8B6FD9',
  light: '#7C5CD9',
} as const;

// Semantic colors
export const success = { DEFAULT: '#3DDC84', light: '#22A563' } as const;
export const warning = { DEFAULT: '#FBBF24', light: '#D97706' } as const;
export const error = { DEFAULT: '#FF3366', light: '#DC2651' } as const;
export const info = { DEFAULT: '#60A5FA', light: '#2563EB' } as const;

// Theme-aware colors (backwards compatible)
export default {
  light: {
    // Legacy compatibility
    text: '#0A0A0C',
    background: '#FFFFFF',
    tint: plasma.light,
    tabIconDefault: '#8A8A8E',
    tabIconSelected: plasma.light,

    // New design system tokens
    void: '#FFFFFF',
    surface: '#F5F5F7',
    elevated: '#EBEBED',
    hover: '#E0E0E2',
    accentPrimary: plasma.light,
    accentPrimaryDim: '#CC4D22',
    accentSecondary: violet.light,
    accentSecondaryDim: '#6648C2',
    textPrimary: '#0A0A0C',
    textSecondary: '#4A4A4E',
    textMuted: '#8A8A8E',
    success: success.light,
    warning: warning.light,
    error: error.light,
    info: info.light,
  },
  dark: {
    // Legacy compatibility
    text: '#F5F5F5',
    background: '#0A0A0C',
    tint: plasma.DEFAULT,
    tabIconDefault: '#6B6B6B',
    tabIconSelected: plasma.DEFAULT,

    // New design system tokens
    void: '#0A0A0C',
    surface: '#151518',
    elevated: '#1E1E22',
    hover: '#252529',
    accentPrimary: plasma.DEFAULT,
    accentPrimaryDim: plasma.dim,
    accentSecondary: violet.DEFAULT,
    accentSecondaryDim: violet.dim,
    textPrimary: '#F5F5F5',
    textSecondary: '#B8B8B8',
    textMuted: '#6B6B6B',
    success: success.DEFAULT,
    warning: warning.DEFAULT,
    error: error.DEFAULT,
    info: info.DEFAULT,
  },
};
