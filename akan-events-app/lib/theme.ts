// Theme colors and styles for Akan Events

import { Theme } from '@/lib/types';

export const THEMES: Record<'dark' | 'light', Theme> = {
  dark: {
    bg: '#0c0805',
    surface: '#18110b',
    surface2: '#241812',
    terra: '#c96c4a',
    terraDark: '#a85432',
    cream: '#f1e6d3',
    text: '#f1e6d3',
    creamDim: 'rgba(241, 230, 211, 0.62)',
    muted: 'rgba(241, 230, 211, 0.38)',
    hairline: 'rgba(241, 230, 211, 0.14)',
    softTint: 'rgba(241, 230, 211, 0.08)',
    softTint2: 'rgba(241, 230, 211, 0.04)',
    accentTint: 'rgba(201, 108, 74, 0.12)',
    accentBorder: 'rgba(201, 108, 74, 0.25)',
    progressTrack: 'rgba(241, 230, 211, 0.14)',
    isDark: true,
  },
  light: {
    bg: '#f9f6f0',
    surface: '#fdfbf8',
    surface2: '#f5f1eb',
    terra: '#b8451f',
    terraDark: '#8b3315',
    cream: '#0f0805',
    text: '#0f0805',
    creamDim: 'rgba(15, 8, 5, 0.78)',
    muted: 'rgba(15, 8, 5, 0.56)',
    hairline: 'rgba(15, 8, 5, 0.18)',
    softTint: 'rgba(15, 8, 5, 0.06)',
    softTint2: 'rgba(15, 8, 5, 0.03)',
    accentTint: 'rgba(184, 69, 31, 0.14)',
    accentBorder: 'rgba(184, 69, 31, 0.28)',
    progressTrack: 'rgba(15, 8, 5, 0.18)',
    isDark: false,
  },
};

// Hue color mappings (for event cards)
export const HUE_COLORS: Record<string, string> = {
  sunny: '#f5b968',
  tomato: '#d97757',
  citrus: '#f5a962',
  sea: '#4a9d7f',
  tan: '#c4a882',
  crimson: '#b8453f',
  amber: '#d4a574',
  jade: '#3d8b79',
  violet: '#7d5fa8',
  indigo: '#4d5f94',
  mango: '#f4a460',
  storm: '#5a7a8c',
  gold: '#d4af37',
};

// Google Fonts used
export const FONTS = {
  serif: 'Fraunces, Georgia, serif',
  sans: 'Inter, -apple-system, system-ui, sans-serif',
  mono: 'Geist Mono, monospace',
  serif_alt: 'Instrument Serif, Georgia, serif',
  sans_alt: 'Manrope, -apple-system, system-ui, sans-serif',
};
