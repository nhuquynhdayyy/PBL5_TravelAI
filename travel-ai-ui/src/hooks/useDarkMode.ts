import { useEffect, useState } from 'react';

const STORAGE_KEY = 'travelai-dark-mode';

export const useDarkMode = () => {
  const [isDark, setIsDark] = useState<boolean>(() => {
    // Ưu tiên preference đã lưu, fallback về system preference
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored !== null) return stored === 'true';
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  useEffect(() => {
    const root = document.documentElement;
    if (isDark) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem(STORAGE_KEY, String(isDark));
  }, [isDark]);

  const toggle = () => setIsDark(prev => !prev);

  return { isDark, toggle };
};
