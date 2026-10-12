// Design tokens — palette from the "acolhimento" login (client/src/components/auth)

export const colors = {
  background: '#FAF6F1',
  surface: '#FFFFFF',
  surfaceMuted: '#F4EFE8',

  primary: '#2E729B',
  primaryPressed: '#255E80',
  primarySoft: '#E3EEF5',
  onPrimary: '#FFFFFF',

  ink: '#1F3347',
  text: '#1F3347',
  textMuted: '#6B7178',
  textSubtle: '#8A8F96',

  border: '#E3E1DE',
  divider: '#ECE8E3',

  sage: '#B9C4AE',
  sageSoft: '#DCE2D3',
  sageInk: '#3F4A3B',
  lilac: '#CFC6D9',
  lilacSoft: '#E6E0EE',
  lilacInk: '#4A4257',
  sand: '#EAD9C8',
  sandSoft: '#F1E4D6',
  sandInk: '#5C4634',

  success: '#3E8E63',
  successSoft: '#E1F1E7',
  warning: '#B7791F',
  warningSoft: '#FBF0DC',
  danger: '#C2413A',
  dangerSoft: '#FBE4E2',
  info: '#2E729B',
  infoSoft: '#E3EEF5',
} as const;

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;

export const radius = { sm: 8, md: 12, lg: 16, xl: 20, pill: 999 } as const;

export const fonts = {
  regular: 'DMSans_400Regular',
  medium: 'DMSans_500Medium',
  semibold: 'DMSans_600SemiBold',
  bold: 'DMSans_700Bold',
} as const;

export const shadow = {
  card: {
    shadowColor: '#1F3347',
    shadowOpacity: 0.08,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
} as const;
