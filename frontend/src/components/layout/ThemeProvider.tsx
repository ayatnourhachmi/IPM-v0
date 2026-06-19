'use client';

import { createContext, useContext, useEffect, useState } from 'react';

type Theme = 'light' | 'dark';

interface ThemeContextValue {
  theme: Theme;
  toggle: () => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

function applyTheme(theme: Theme) {
  localStorage.setItem('ipm-theme', theme);
  document.documentElement.className = theme;
  document.body.setAttribute('data-theme', theme);

  document.querySelectorAll('iframe').forEach((iframe) => {
    iframe.contentWindow?.postMessage({ type: 'ipm-theme-change', theme }, window.location.origin);
  });
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>('light');

  useEffect(() => {
    const saved = localStorage.getItem('ipm-theme') as Theme | null;
    const resolved = saved === 'dark' ? 'dark' : 'light';
    setTheme(resolved);
    applyTheme(resolved);
  }, []);

  const toggle = () => {
    setTheme(prev => {
      const next: Theme = prev === 'light' ? 'dark' : 'light';
      applyTheme(next);
      return next;
    });
  };

  return (
    <ThemeContext.Provider value={{ theme, toggle }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used inside <ThemeProvider>');
  return ctx;
}
