(() => {
  document.documentElement.dataset.theme = 'light';
  try {
    const policy = 'light-default-20261104';
    if (localStorage.getItem('optproof-theme-policy') !== policy) {
      localStorage.setItem('optproof-theme', 'light');
      localStorage.setItem('optproof-theme-policy', policy);
    }
    const theme = localStorage.getItem('optproof-theme');
    if (theme === 'light' || theme === 'dark') document.documentElement.dataset.theme = theme;
  } catch (_) {}
})();
