try {
  var t = localStorage.getItem('invitations:theme')
  if (t === 'auto' || t === 'dark') document.documentElement.setAttribute('data-theme', t)
} catch (e) {}
