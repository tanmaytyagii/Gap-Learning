// Applies the saved or system color theme before first paint to avoid a flash.
(function () {
  var theme = 'light';
  try {
    var saved = localStorage.getItem('gaplearning:theme');
    if (saved === 'light' || saved === 'dark') theme = saved;
    else if (window.matchMedia('(prefers-color-scheme: dark)').matches) theme = 'dark';
  } catch {
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) theme = 'dark';
  }
  document.documentElement.dataset.theme = theme;
})();
