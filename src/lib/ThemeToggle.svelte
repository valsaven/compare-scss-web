<script lang="ts">
import Sun from './icons/Sun.svelte';
import Moon from './icons/Moon.svelte';


let themeIcon = Sun;

if (localStorage.theme === 'dark' || (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
  document.documentElement.classList.add('dark');
  themeIcon = Sun;
} else {
  document.documentElement.classList.remove('dark');
  themeIcon = Moon;
}

const toggleTheme = () => {
  const isDarkMode = document.documentElement.classList.contains("dark");

  if (isDarkMode) {
    themeIcon = Moon;
    localStorage.theme = "light";
    document.documentElement.classList.remove("dark");
  } else {
    themeIcon = Sun;
    localStorage.theme = "dark";
    document.documentElement.classList.add("dark");
  }
}
</script>

<button type="button" class="toggle-theme-btn" on:click={toggleTheme}>
  <svelte:component this={themeIcon}/>
</button>

<style>
.toggle-theme-btn {
  background: none;
  border: none;
  cursor: pointer;
  padding: 0;
}
</style>
