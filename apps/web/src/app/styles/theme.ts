/** Константы раскладки, не зависящие от темы. */
export const LAYOUT = {
  splitMinWidth: 1280,
  railWidth: 76,
  topbarHeight: 64,
  maxWidth: 1760,
} as const;

export type ThemeMode = 'light' | 'dark';

export interface AppTheme {
  mode: ThemeMode;
  colors: {
    bg: string;
    surface: string;
    surfaceMuted: string;
    surfaceHover: string;
    border: string;
    borderStrong: string;
    text: string;
    textMuted: string;
    textFaint: string;
    accent: string;
    accentSoft: string;
    accentText: string;
    onAccent: string;
    /** Боковая панель навигации: градиент бренда. */
    rail: string;
    railText: string;
    railActive: string;
    danger: string;
    dangerSoft: string;
    warningSoft: string;
    focus: string;
    flash: string;
    /** Статусные цвета эффективности (всегда рядом с числом или подписью). */
    performance: { low: string; medium: string; high: string };
    performanceSoft: { low: string; medium: string; high: string };
    connection: { online: string; connecting: string; offline: string };
    /** Единственная серия графика и его хром. */
    chart: { series: string; seriesSoft: string; grid: string; axis: string };
    /** Иконки уровней в дереве. */
    level: Record<1 | 2 | 3, { fg: string; bg: string }>;
  };
  space: { xs: string; sm: string; md: string; lg: string; xl: string; xxl: string };
  radius: { sm: string; md: string; lg: string; xl: string; pill: string };
  font: {
    family: string;
    mono: string;
    size: { xs: string; sm: string; md: string; lg: string; xl: string; xxl: string; hero: string };
  };
  motion: { fast: string; base: string; flash: string };
  layout: typeof LAYOUT;
  shadow: { sm: string; md: string; lg: string };
}

const shared = {
  space: { xs: '4px', sm: '8px', md: '12px', lg: '16px', xl: '24px', xxl: '32px' },
  radius: { sm: '6px', md: '10px', lg: '14px', xl: '20px', pill: '999px' },
  font: {
    family:
      "system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, 'Noto Sans', sans-serif",
    mono: "ui-monospace, SFMono-Regular, Menlo, Consolas, 'Liberation Mono', monospace",
    size: {
      xs: '11px',
      sm: '12px',
      md: '14px',
      lg: '16px',
      xl: '20px',
      xxl: '24px',
      hero: '26px',
    },
  },
  motion: { fast: '120ms', base: '200ms', flash: '1500ms' },
  layout: LAYOUT,
} as const;

export const lightTheme: AppTheme = {
  mode: 'light',
  colors: {
    bg: '#f4f5f8',
    surface: '#ffffff',
    surfaceMuted: '#f6f7fa',
    surfaceHover: '#eff2f7',
    border: '#e3e6ec',
    borderStrong: '#cfd4dd',
    text: '#161a22',
    textMuted: '#5b6472',
    textFaint: '#8b93a1',
    accent: '#2a78d6',
    accentSoft: '#e6f0fc',
    accentText: '#1c5cab',
    onAccent: '#ffffff',
    rail: 'linear-gradient(180deg, #3b2fb8 0%, #5b3fd6 55%, #7a3ce0 100%)',
    railText: 'rgba(255, 255, 255, 0.78)',
    railActive: 'rgba(255, 255, 255, 0.18)',
    danger: '#d03b3b',
    dangerSoft: '#fdecec',
    warningSoft: '#fff4d6',
    focus: '#86b6ef',
    flash: '#ffe9a3',
    performance: { low: '#d03b3b', medium: '#e0a010', high: '#0ca30c' },
    performanceSoft: { low: '#fbe3e3', medium: '#fff1cf', high: '#dff3df' },
    connection: { online: '#0ca30c', connecting: '#e0a010', offline: '#d03b3b' },
    chart: { series: '#2a78d6', seriesSoft: '#cde2fb', grid: '#e1e0d9', axis: '#c3c2b7' },
    level: {
      1: { fg: '#4a3aa7', bg: '#ece8fb' },
      2: { fg: '#1c5cab', bg: '#e6f0fc' },
      3: { fg: '#0f7a5a', bg: '#dff5ee' },
    },
  },
  shadow: {
    sm: '0 1px 2px rgba(16, 24, 40, 0.05)',
    md: '0 6px 20px rgba(16, 24, 40, 0.07)',
    lg: '0 16px 40px rgba(16, 24, 40, 0.12)',
  },
  ...shared,
};

export const darkTheme: AppTheme = {
  mode: 'dark',
  colors: {
    bg: '#0e0f13',
    surface: '#181a1f',
    surfaceMuted: '#1f2229',
    surfaceHover: '#252932',
    border: 'rgba(255, 255, 255, 0.09)',
    borderStrong: 'rgba(255, 255, 255, 0.18)',
    text: '#f3f4f6',
    textMuted: '#b3b9c4',
    textFaint: '#7d8494',
    accent: '#3987e5',
    accentSoft: 'rgba(57, 135, 229, 0.18)',
    accentText: '#86b6ef',
    onAccent: '#ffffff',
    rail: 'linear-gradient(180deg, #2a2480 0%, #3d2fa8 55%, #5a30b8 100%)',
    railText: 'rgba(255, 255, 255, 0.72)',
    railActive: 'rgba(255, 255, 255, 0.16)',
    danger: '#e66767',
    dangerSoft: 'rgba(230, 103, 103, 0.16)',
    warningSoft: 'rgba(224, 160, 16, 0.16)',
    focus: '#5598e7',
    flash: 'rgba(250, 178, 25, 0.45)',
    performance: { low: '#e66767', medium: '#fab219', high: '#2fbf5a' },
    performanceSoft: {
      low: 'rgba(230,103,103,0.18)',
      medium: 'rgba(250,178,25,0.18)',
      high: 'rgba(47,191,90,0.18)',
    },
    connection: { online: '#2fbf5a', connecting: '#fab219', offline: '#e66767' },
    chart: {
      series: '#3987e5',
      seriesSoft: 'rgba(57, 135, 229, 0.25)',
      grid: '#2c2c2a',
      axis: '#383835',
    },
    level: {
      1: { fg: '#b3a9f6', bg: 'rgba(144, 133, 233, 0.18)' },
      2: { fg: '#86b6ef', bg: 'rgba(57, 135, 229, 0.18)' },
      3: { fg: '#5fd1a8', bg: 'rgba(25, 158, 112, 0.2)' },
    },
  },
  shadow: {
    sm: '0 1px 2px rgba(0, 0, 0, 0.4)',
    md: '0 6px 20px rgba(0, 0, 0, 0.45)',
    lg: '0 16px 40px rgba(0, 0, 0, 0.6)',
  },
  ...shared,
};

/** Тема по умолчанию (светлая): используется тестами и как запасной вариант. */
export const theme: AppTheme = lightTheme;
