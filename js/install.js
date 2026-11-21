// "Install as an app": Chrome offers this through the beforeinstallprompt
// event. This file is loaded first thing so the event isn't missed.

let deferred = null;
const listeners = new Set();
const notify = () => listeners.forEach(f => f());

window.addEventListener('beforeinstallprompt', e => {
  e.preventDefault();
  deferred = e;
  notify();
});
window.addEventListener('appinstalled', () => { deferred = null; notify(); });

export const canInstall = () => !!deferred;

export async function install() {
  if (!deferred) return false;
  const prompt = deferred;
  deferred = null;
  prompt.prompt();
  const { outcome } = await prompt.userChoice;
  notify();
  return outcome === 'accepted';
}

export function onInstallChange(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

// ---------- offline copy and updates ----------

let updateReady = false;

// True when the bookshelf is showing with no dialog open, so reloading
// can't lose anything.
const safeToReload = () =>
  (location.hash === '' || location.hash === '#/') &&
  !document.querySelector('#dialog-root .backdrop');

// Switches to a newly downloaded version, but only when it's safe.
// Called whenever the bookshelf opens, and every so often.
export function applyUpdateIfReady() {
  if (updateReady && safeToReload()) {
    updateReady = false;
    location.reload();
    return true;
  }
  return false;
}

// Runs offline after the first visit. Not on this Mac's test server, where
// a cached copy would hide changes.
export function registerOffline() {
  const local = ['localhost', '127.0.0.1'].includes(location.hostname);
  if (!('serviceWorker' in navigator) || (local && !location.search.includes('sw'))) return;
  const hadCopy = !!navigator.serviceWorker.controller;

  // A new version has taken over (sw.js does that as soon as it has
  // downloaded). The very first install isn't an update.
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!hadCopy) return;
    updateReady = true;
    applyUpdateIfReady();
  });

  navigator.serviceWorker.register('sw.js').then(reg => {
    // An installed app can stay open for days, so look for updates now
    // and then, and whenever it comes back to the front.
    const check = () => { if (navigator.onLine) reg.update().catch(() => {}); };
    setInterval(check, 30 * 60 * 1000);
    document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') check(); });
  }).catch(err => console.warn('Offline mode unavailable', err));

  setInterval(applyUpdateIfReady, 60 * 1000);
}
