import { useEffect, useState } from 'react';

export enum ThemeAppearance {
  Light,
  Dark,
}

// https://stackoverflow.com/questions/59621784/how-to-detect-prefers-color-scheme-change-in-javascript
// https://stackoverflow.com/questions/77024306/radix-ui-theme-dark-mode-not-being-applied
export const useTheme = () => {
  const [theme, setTheme] = useState(ThemeAppearance.Light);
  useEffect(() => {
    const darkThemeListener = (ev: MediaQueryListEvent) => {
      if (ev.matches) {
        setTheme(ThemeAppearance.Dark);
        document.body.classList.remove("light-theme");
        document.body.classList.add("dark-theme");
      }
    };
    const lightThemeListener = (ev: MediaQueryListEvent) => {
      if (ev.matches) {
        setTheme(ThemeAppearance.Light);
        document.body.classList.remove("dark-theme");
        document.body.classList.add("light-theme");
      }
    };
    const darkMatchMedia = window.matchMedia('(prefers-color-scheme: dark)');
    const lightMatchMedia = window.matchMedia('(prefers-color-scheme: light)');
    if (darkMatchMedia.matches) {
      setTheme(ThemeAppearance.Dark);
      document.body.classList.remove("light-theme");
      document.body.classList.add("dark-theme");
    } else if (lightMatchMedia.matches) {
      setTheme(ThemeAppearance.Light);
      document.body.classList.remove("dark-theme");
      document.body.classList.add("light-theme");
    }
    darkMatchMedia.addEventListener('change', darkThemeListener);
    lightMatchMedia.addEventListener('change', lightThemeListener);
    return () => {
      darkMatchMedia.removeEventListener('change', darkThemeListener);
      lightMatchMedia.removeEventListener('change', lightThemeListener);
    };
  }, []);
  return theme;
};
