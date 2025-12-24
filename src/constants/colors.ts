/**
 * Linha Viva Porto Color Palette
 * Derived from Porto/STCP branding.
*/

export const COLORS = {
  primary: {
    50: '#eef7ff',
    100: '#d9edff',
    200: '#bce0ff',
    300: '#8ecfff',
    400: '#57b3ff',
    500: '#2f94ff',
    600: '#1a75ff',
    700: '#005596',
    800: '#0a49a3',
    900: '#0e3f82',
    950: '#0e274f',
  },
  secondary: {
    50: '#fff9eb',
    100: '#feefc7',
    200: '#fde08a',
    300: '#fbc94d',
    400: '#f9b022',
    500: '#f6ae2d',
    600: '#d9820e',
    700: '#b45f0e',
    800: '#924a13',
    900: '#783e14',
    950: '#462006',
  },
} as const;

export const BRAND_COLORS = {
  primary: COLORS.primary[700],
  secondary: COLORS.secondary[500],
};

