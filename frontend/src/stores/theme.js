import { defineStore } from 'pinia';
import { ref, watch } from 'vue';

export const useThemeStore = defineStore('theme', () => {
  const saved = localStorage.getItem('theme');
  const dark = ref(saved === 'dark');

  function toggle() {
    dark.value = !dark.value;
  }

  function apply(isDark) {
    document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
  }

  // Appliquer immédiatement au chargement
  apply(dark.value);

  watch(dark, apply);

  return { dark, toggle };
});
