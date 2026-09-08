(() => {
  try {
    const theme = localStorage.getItem('zhr-theme');
    if (theme === 'light' || theme === 'dark') document.documentElement.dataset.theme = theme;
  } catch (_) { /* Use the default theme when browser storage is disabled. */ }
})();
