// Applies a saved Light, Dark or Auto choice before the page is drawn.
// With no choice saved, <html data-theme="auto"> follows the phone.
try {
  var t = localStorage.getItem('invitations:theme')
  if (t === 'auto' || t === 'light' || t === 'dark') document.documentElement.setAttribute('data-theme', t)
} catch (e) {}
