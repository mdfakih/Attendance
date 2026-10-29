'use client';

import { DEFAULT_BRANDING, type Branding } from '@attendance/contracts';
import { alpha, createTheme, getContrastRatio, lighten, type Theme } from '@mui/material/styles';

const SANS = 'var(--font-sans), "Inter", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';
const DISPLAY = 'var(--font-display), var(--font-sans), "Inter", system-ui, sans-serif';

const LIGHT = { background: '#F4F6FB', paper: '#FFFFFF', text: '#0F172A', muted: '#5B6475', divider: 'rgba(15, 23, 42, 0.09)' };
const DARK = { background: '#0A0E17', paper: '#111723', text: '#E6E9F0', muted: '#97A1B3', divider: 'rgba(148, 163, 184, 0.16)' };

/** Brand colours can be dark; lift them until they read well on the dark surface. */
export function readableOnDark(color: string): string {
  let result = color;
  for (let step = 1; step <= 7 && getContrastRatio(result, DARK.paper) < 4.5; step += 1) {
    result = lighten(color, step * 0.1);
  }
  return result;
}

/** White or near-black, whichever reads better on the colour (matches MUI's contrastText choice). */
export function contrastText(color: string): string {
  return getContrastRatio(color, '#FFFFFF') >= 3 ? '#FFFFFF' : 'rgba(0, 0, 0, 0.87)';
}

export const SURFACES = { light: LIGHT, dark: DARK } as const;

function palette(mode: 'light' | 'dark', branding: Branding) {
  const base = mode === 'light' ? LIGHT : DARK;
  const primary = mode === 'light' ? branding.primaryColor : readableOnDark(branding.primaryColor);
  const secondary = mode === 'light' ? branding.accentColor : readableOnDark(branding.accentColor);
  return {
    primary: { main: primary },
    secondary: { main: secondary },
    success: { main: mode === 'light' ? '#15803D' : '#4ADE80' },
    warning: { main: mode === 'light' ? '#B45309' : '#FBBF24' },
    error: { main: mode === 'light' ? '#DC2626' : '#F87171' },
    info: { main: mode === 'light' ? '#0369A1' : '#38BDF8' },
    background: { default: base.background, paper: base.paper },
    text: { primary: base.text, secondary: base.muted },
    divider: base.divider,
  };
}

/** The whole look of the app for one brand, in light and dark. */
export function createAppTheme(branding: Branding = DEFAULT_BRANDING): Theme {
  return createTheme({
    cssVariables: { colorSchemeSelector: 'class' },
    colorSchemes: {
      light: { palette: palette('light', branding) },
      dark: { palette: palette('dark', branding) },
    },
    shape: { borderRadius: 10 },
    typography: {
      fontFamily: SANS,
      h1: { fontFamily: DISPLAY, fontWeight: 800, letterSpacing: '-0.025em' },
      h2: { fontFamily: DISPLAY, fontWeight: 800, letterSpacing: '-0.025em' },
      h3: { fontFamily: DISPLAY, fontWeight: 700, letterSpacing: '-0.02em' },
      h4: { fontFamily: DISPLAY, fontWeight: 700, fontSize: '1.75rem', letterSpacing: '-0.02em' },
      h5: { fontFamily: DISPLAY, fontWeight: 700, fontSize: '1.375rem', letterSpacing: '-0.015em' },
      h6: { fontFamily: DISPLAY, fontWeight: 700, fontSize: '1.0625rem', letterSpacing: '-0.01em' },
      subtitle1: { fontWeight: 600 },
      subtitle2: { fontWeight: 600 },
      button: { fontWeight: 600, textTransform: 'none', letterSpacing: 0 },
      overline: { fontWeight: 700, fontSize: '0.6875rem', letterSpacing: '0.08em', lineHeight: 1.8 },
    },
    components: {
      MuiCssBaseline: {
        styleOverrides: (theme) => ({
          body: { WebkitFontSmoothing: 'antialiased', MozOsxFontSmoothing: 'grayscale' },
          '::selection': { backgroundColor: alpha(theme.palette.primary.main, 0.2) },
          '*::-webkit-scrollbar': { width: 10, height: 10 },
          '*::-webkit-scrollbar-thumb': { backgroundColor: theme.vars?.palette.divider, borderRadius: 8, border: '2px solid transparent', backgroundClip: 'content-box' },
        }),
      },
      MuiButton: {
        defaultProps: { disableElevation: true },
        styleOverrides: {
          root: { borderRadius: 9, paddingInline: 14 },
          sizeLarge: { minHeight: 46, fontSize: '0.975rem', paddingInline: 20 },
          outlined: ({ theme }) => ({ borderColor: theme.vars?.palette.divider }),
        },
      },
      MuiIconButton: { styleOverrides: { root: { borderRadius: 9 } } },
      MuiPaper: {
        styleOverrides: {
          root: { backgroundImage: 'none' },
          outlined: ({ theme }) => ({ borderColor: theme.vars?.palette.divider }),
        },
      },
      MuiCard: {
        defaultProps: { variant: 'outlined' },
        styleOverrides: {
          root: ({ theme }) => ({
            borderRadius: 14,
            borderColor: theme.vars?.palette.divider,
            boxShadow: '0 1px 2px rgba(15, 23, 42, 0.04)',
            ...theme.applyStyles('dark', { boxShadow: 'none' }),
          }),
        },
      },
      MuiCardContent: { styleOverrides: { root: { padding: 20, '&:last-child': { paddingBottom: 20 } } } },
      MuiChip: {
        styleOverrides: {
          root: { fontWeight: 600, borderRadius: 8 },
          sizeSmall: { height: 24, fontSize: '0.75rem' },
        },
      },
      MuiTextField: { defaultProps: { size: 'small', fullWidth: true } },
      MuiSelect: { defaultProps: { size: 'small' } },
      MuiOutlinedInput: {
        styleOverrides: {
          root: ({ theme }) => ({
            borderRadius: 9,
            backgroundColor: theme.vars?.palette.background.paper,
            '&:not(.Mui-focused):not(.Mui-error):hover .MuiOutlinedInput-notchedOutline': { borderColor: theme.vars?.palette.text.secondary },
          }),
          notchedOutline: ({ theme }) => ({
            borderColor: 'rgba(15, 23, 42, 0.16)',
            ...theme.applyStyles('dark', { borderColor: 'rgba(148, 163, 184, 0.26)' }),
          }),
        },
      },
      MuiInputLabel: { styleOverrides: { root: { fontWeight: 500 } } },
      MuiFormHelperText: { styleOverrides: { root: { marginLeft: 2 } } },
      MuiDialog: { styleOverrides: { paper: { borderRadius: 16, backgroundImage: 'none' } } },
      MuiDialogTitle: { styleOverrides: { root: { fontWeight: 700, fontSize: '1.125rem', padding: '20px 24px 8px' } } },
      MuiDialogActions: { styleOverrides: { root: { padding: '12px 24px 20px', gap: 8 } } },
      MuiTooltip: { defaultProps: { arrow: true }, styleOverrides: { tooltip: { fontSize: '0.75rem', fontWeight: 500, borderRadius: 8 } } },
      MuiTabs: { styleOverrides: { indicator: { height: 3, borderRadius: '3px 3px 0 0' } } },
      MuiTab: { styleOverrides: { root: { textTransform: 'none', fontWeight: 600, minHeight: 46, paddingInline: 14 } } },
      MuiTableCell: {
        styleOverrides: {
          root: ({ theme }) => ({ borderColor: theme.vars?.palette.divider }),
          head: ({ theme }) => ({ fontWeight: 600, fontSize: '0.75rem', color: theme.vars?.palette.text.secondary, textTransform: 'uppercase', letterSpacing: '0.04em' }),
        },
      },
      MuiListItemButton: { styleOverrides: { root: { borderRadius: 9 } } },
      MuiAlert: { styleOverrides: { root: { borderRadius: 12, alignItems: 'center' } } },
      MuiLinearProgress: { styleOverrides: { root: { borderRadius: 4 } } },
      MuiMenu: {
        styleOverrides: {
          paper: ({ theme }) => ({
            borderRadius: 12,
            border: `1px solid ${theme.vars?.palette.divider}`,
            boxShadow: '0 12px 32px rgba(15, 23, 42, 0.12)',
          }),
        },
      },
      MuiMenuItem: { styleOverrides: { root: { borderRadius: 8, marginInline: 6, minHeight: 38 } } },
      MuiSkeleton: { defaultProps: { animation: 'wave' } },
      MuiAvatar: { styleOverrides: { root: { fontWeight: 700 } } },
      MuiAppBar: { defaultProps: { elevation: 0, color: 'inherit' } },
      MuiSnackbarContent: { styleOverrides: { root: { borderRadius: 12 } } },
    },
  });
}
