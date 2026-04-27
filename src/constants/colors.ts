// Thème clair — charte Marée Safe (design v2)
export const COLORS = {
  // Fond
  paper:     '#ffffff',
  paperSoft: '#f7f9fb',
  bg:        '#fbfcfd',

  // Encre
  ink:  '#0e1726',
  ink2: '#3a4658',
  ink3: '#6b7689',
  ink4: '#a4adbd',

  // Séparateurs
  hairline: '#e8ecf2',

  // Pastels cartes
  tide:     '#d8ebf5',
  tideDeep: '#5b8db0',
  tideInk:  '#1a3a55',

  sand:     '#f4ebd6',
  sandDeep: '#c9a86a',
  sandInk:  '#5a4520',

  lilac:     '#e6e0f4',
  lilacDeep: '#8a7ab8',
  lilacInk:  '#3d3160',

  // Verdict
  go:       '#8fc8a3',
  goDeep:   '#4a9b6b',
  goInk:    '#1d4d33',
  warn:     '#f3b96b',
  warnDeep: '#d18a30',
  stop:     '#e88a82',
  stopDeep: '#c45a52',

  // Brand
  brand:    '#1456ff',
  brandInk: '#ffffff',

  // Alias rétrocompat (utilisés dans verdictCalculator)
  green:      '#8fc8a3',
  greenBg:    'rgba(143,200,163,0.15)',
  greenBorder:'rgba(143,200,163,0.40)',
  orange:     '#f3b96b',
  orangeBg:   'rgba(243,185,107,0.15)',
  orangeBorder:'rgba(243,185,107,0.40)',
  red:        '#e88a82',
  redBg:      'rgba(232,138,130,0.15)',
  redBorder:  'rgba(232,138,130,0.40)',

  textPrimary:   '#0e1726',
  textSecondary: '#3a4658',
  textMuted:     '#6b7689',

  // Héritage chart + anciens composants
  background:    '#fbfcfd',   // alias de bg
  primary:       '#1456ff',
  primaryLight:  '#a4adbd',
  border:        '#e8ecf2',
  borderLight:   '#d0d8e4',
  surface:       '#f7f9fb',
  surface2:      '#edf1f6',
  tidalBarCurrent: '#f3b96b',
  navy:          '#0e1726',
} as const;
