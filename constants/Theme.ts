/**
 * Theme.ts — Design tokens extracted from design-reference/freshtrack_design_system/DESIGN.md
 *
 * Primary font: Plus Jakarta Sans
 * These values must not be changed arbitrarily — they come from the supplied designs.
 */

export const Colors = {
  // Brand
  primary: '#006948',
  primaryContainer: '#00855d',
  onPrimary: '#ffffff',
  onPrimaryContainer: '#f5fff7',
  inversePrimary: '#68dba9',

  // Secondary (amber / warning)
  secondary: '#855300',
  secondaryContainer: '#fea619',
  onSecondary: '#ffffff',

  // Tertiary (rose / critical)
  tertiary: '#b90538',
  tertiaryContainer: '#dc2c4f',
  onTertiary: '#ffffff',

  // Surface
  surface: '#faf8ff',
  surfaceDim: '#d2d9f4',
  surfaceBright: '#faf8ff',
  surfaceContainerLowest: '#ffffff',
  surfaceContainerLow: '#f2f3ff',
  surfaceContainer: '#eaedff',
  surfaceContainerHigh: '#e2e7ff',
  surfaceContainerHighest: '#dae2fd',

  // On-surface
  onSurface: '#131b2e',
  onSurfaceVariant: '#3d4a42',
  inverseSurface: '#283044',
  inverseOnSurface: '#eef0ff',

  // Outlines
  outline: '#6d7a72',
  outlineVariant: '#bccac0',

  // Background
  background: '#faf8ff',
  onBackground: '#131b2e',

  // Error
  error: '#ba1a1a',
  onError: '#ffffff',
  errorContainer: '#ffdad6',
  onErrorContainer: '#93000a',

  // Semantic / freshness
  freshGreen: '#059669',
  freshGreenBg: '#ECFDF5',
  cautionAmber: '#D97706',
  cautionAmberBg: '#FFFBEB',
  criticalRose: '#E11D48',
  criticalRoseBg: '#FFF1F2',
  smartAzure: '#0EA5E9',

  // Whites / utility
  white: '#ffffff',
  black: '#000000',
  transparent: 'transparent',
} as const;

export const Spacing = {
  xs2: 2,
  xs: 4,
  sm: 8,
  md: 12,
  base: 16,
  lg: 20,
  xl: 24,
  xl2: 32,
  xl3: 40,
  screenGutter: 16,
  navClearance: 88,
} as const;

export const Radius = {
  sm: 4,
  DEFAULT: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 9999,
} as const;

export const FontSize = {
  displayLg: 30,
  headlineLg: 26,
  headlineMd: 20,
  headlineSm: 17,
  bodyLg: 16,
  bodyMd: 14,
  bodySm: 13,
  labelLg: 14,
  labelMd: 12,
  labelSm: 11,
  statCounter: 24,
} as const;

export const FontWeight = {
  regular: '400' as const,
  semibold: '600' as const,
  bold: '700' as const,
  extrabold: '800' as const,
};

export const Elevation = {
  card: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  sheet: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 24,
    elevation: 6,
  },
  floatingNav: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.12,
    shadowRadius: 32,
    elevation: 10,
  },
} as const;
