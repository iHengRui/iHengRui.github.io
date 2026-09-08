(() => {
  const toggle = document.querySelector('.theme-toggle');
  const updateTheme = (theme) => {
    document.documentElement.dataset.theme = theme;
    const next = theme === 'dark' ? 'light' : 'dark';
    toggle?.setAttribute('aria-label', `Switch to ${next} theme`);
    toggle?.setAttribute('title', `Switch to ${next} theme`);
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme === 'dark' ? '#161817' : '#f7f8f5');
  };
  if (toggle) {
    toggle.hidden = false;
    updateTheme(document.documentElement.dataset.theme || 'dark');
    toggle.addEventListener('click', () => {
      const theme = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
      updateTheme(theme);
      try { localStorage.setItem('zhr-theme', theme); } catch (_) {}
    });
  }
  const links = [...document.querySelectorAll('.main-nav a[data-section]')];
  if ('IntersectionObserver' in window && links.length) {
    const visible = new Set();
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => entry.isIntersecting ? visible.add(entry.target.id) : visible.delete(entry.target.id));
      const active = links.find(link => visible.has(link.dataset.section));
      links.forEach(link => link === active ? link.setAttribute('aria-current', 'location') : link.removeAttribute('aria-current'));
    }, { rootMargin: '-110px 0px -40% 0px', threshold: 0 });
    links.forEach(link => { const section = document.getElementById(link.dataset.section); if (section) observer.observe(section); });
  }
})();
