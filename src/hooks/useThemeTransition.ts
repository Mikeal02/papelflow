import { useCallback } from 'react';
import { useTheme } from 'next-themes';

export function useThemeTransition() {
  const { theme, setTheme } = useTheme();

  const toggleTheme = useCallback((e?: React.MouseEvent) => {
    const html = document.documentElement;
    
    // Get click position for radial wipe origin
    const x = e ? (e.clientX / window.innerWidth) * 100 : 50;
    const y = e ? (e.clientY / window.innerHeight) * 100 : 50;
    
    // Add transition class
    html.classList.add('theme-transitioning');
    
    // Create wipe overlay
    const overlay = document.createElement('div');
    overlay.className = 'theme-transition-overlay';
    overlay.style.setProperty('--tx', `${x}%`);
    overlay.style.setProperty('--ty', `${y}%`);
    document.body.appendChild(overlay);
    
    // Toggle theme
    setTheme(theme === 'dark' ? 'light' : 'dark');
    
    // Cleanup
    setTimeout(() => {
      html.classList.remove('theme-transitioning');
      overlay.remove();
    }, 750);
  }, [theme, setTheme]);

  return { theme, toggleTheme };
}
