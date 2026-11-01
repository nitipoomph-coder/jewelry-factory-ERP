import { createContext } from 'react';

export type Theme = 'dark-gold' | 'royal-white' | 'modern-dark';

export interface ThemeContextValue {
  theme: Theme;
  setTheme: (theme: Theme) => void;
}

export const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);
