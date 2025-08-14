import { useEffect, useState } from 'react';

/**
 * Custom hook to handle dark mode with proper initialization
 * Ensures dark mode works on all pages including custom domain login
 */
export function useDarkMode() {
  const [isDarkMode, setIsDarkMode] = useState<boolean>(false);

  useEffect(() => {
    // Check localStorage first
    const storedTheme = localStorage.getItem('theme');
    
    if (storedTheme) {
      const isDark = storedTheme === 'dark';
      setIsDarkMode(isDark);
      applyTheme(isDark);
    } else {
      // Check system preference
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      setIsDarkMode(mediaQuery.matches);
      applyTheme(mediaQuery.matches);
      
      // Listen for system theme changes
      const handleChange = (e: MediaQueryListEvent) => {
        setIsDarkMode(e.matches);
        applyTheme(e.matches);
      };
      
      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    }
  }, []);

  const applyTheme = (isDark: boolean) => {
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  const toggleDarkMode = () => {
    const newValue = !isDarkMode;
    setIsDarkMode(newValue);
    localStorage.setItem('theme', newValue ? 'dark' : 'light');
    applyTheme(newValue);
  };

  return { isDarkMode, toggleDarkMode };
}
