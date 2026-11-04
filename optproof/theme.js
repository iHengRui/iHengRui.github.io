(() => {
  try {
    const theme = localStorage.getItem('optproof-theme');
    if (theme === 'light' || theme === 'dark') document.documentElement.dataset.theme = theme;
  } catch (_) {}
})();
