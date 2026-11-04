(() => {
  document.documentElement.dataset.theme = 'light';
  try {
    const policy = 'light-default-20261104';
    if (localStorage.getItem('zhr-theme-policy') !== policy) {
      localStorage.setItem('zhr-theme', 'light');
      localStorage.setItem('zhr-theme-policy', policy);
    }
    const theme = localStorage.getItem('zhr-theme');
    if (theme === 'light' || theme === 'dark') document.documentElement.dataset.theme = theme;
  } catch (_) { /* Keep light mode when browser storage is unavailable. */ }
})();
