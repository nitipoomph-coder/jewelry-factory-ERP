import { useState, useEffect, type ReactNode } from 'react';
import { ThemeContext, type Theme } from './themeContextValue';

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>(() => {
    // Check localStorage first
    const savedTheme = localStorage.getItem('app-theme') as Theme;
    if (savedTheme && ['dark-gold', 'royal-white', 'modern-dark'].includes(savedTheme)) return savedTheme;
    return 'royal-white'; // Default
  });

  const handleSetTheme = (newTheme: Theme) => {
    if (newTheme === theme) return;
    setTheme(newTheme);
  };

  useEffect(() => {
    localStorage.setItem('app-theme', theme);
    // Remove all previous theme classes
    document.body.classList.remove('theme-dark-gold', 'theme-royal-white', 'theme-modern-dark');
    // Add the active theme class
    document.body.classList.add(`theme-${theme}`);
    // Sync Tailwind dark mode class
    const isDark = theme !== 'royal-white';
    document.documentElement.classList.toggle('dark', isDark);
    document.body.classList.toggle('dark', isDark);
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme: handleSetTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}
