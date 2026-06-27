import React, { createContext, useState, useEffect } from 'react';

export type ThemeMode = 'system' | 'light' | 'dark';
export type ResolvedThemeMode = 'light' | 'dark';

export interface ThemeContextType {
  theme: ThemeMode;
  resolvedTheme: ResolvedThemeMode;
  setTheme: (theme: ThemeMode) => void;
}

export const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<ThemeMode>(() => {
    const saved = localStorage.getItem('documind-theme') as ThemeMode;
    return saved || 'system';
  });

  const [resolvedTheme, setResolvedTheme] = useState<ResolvedThemeMode>('light');

  const setTheme = (newTheme: ThemeMode) => {
    setThemeState(newTheme);
    localStorage.setItem('documind-theme', newTheme);
  };

  useEffect(() => {
    const root = window.document.documentElement;
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    const updateTheme = () => {
      let activeTheme: ResolvedThemeMode = 'light';

      if (theme === 'system') {
        activeTheme = mediaQuery.matches ? 'dark' : 'light';
      } else {
        activeTheme = theme;
      }

      setResolvedTheme(activeTheme);
      
      // Update HTML attribute
      root.setAttribute('data-theme', theme);
      root.setAttribute('data-resolved-theme', activeTheme);
      root.style.colorScheme = activeTheme;

      // Debugging logs requested by senior architect
      console.log(`[Theme System] Current Theme: ${theme}`);
      console.log(`[Theme System] Applied Theme: ${activeTheme}`);
      console.log(`[Theme System] System Theme: ${mediaQuery.matches ? 'dark' : 'light'}`);
    };

    updateTheme();

    const listener = () => {
      if (theme === 'system') {
        updateTheme();
      }
    };

    mediaQuery.addEventListener('change', listener);
    return () => mediaQuery.removeEventListener('change', listener);
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, resolvedTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};
