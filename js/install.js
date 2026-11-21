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

// Runs offline after the first visit. Not on this Mac's test server, where
// a cached copy would hide changes.
export function registerOffline() {
  const local = ['localhost', '127.0.0.1'].includes(location.hostname);
  if (!('serviceWorker' in navigator) || (local && !location.search.includes('sw'))) return;
  navigator.serviceWorker.register('sw.js').catch(err => console.warn('Offline mode unavailable', err));
}
