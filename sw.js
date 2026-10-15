/* PBC Sistem — service worker.
   - Halaman utama: ambil dari internet dulu (supaya pembaruan langsung terlihat), cadangan dari cache saat offline.
   - Pustaka grafik/PDF (cdnjs): cache pertama, diperbarui di belakang layar.
   - Supabase (data & login) TIDAK PERNAH di-cache oleh service worker. */
const VER = 'pbc-v19';
const SHELL = ['./', 'index.html', 'manifest.webmanifest', 'icon-v2-192.png', 'icon-v2-512.png', 'icon-v2-maskable-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VER).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== VER).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.hostname.endsWith('supabase.co') || url.hostname.endsWith('supabase.in')) return;   // data & login: langsung ke jaringan
  if (url.origin === location.origin) {
    e.respondWith(
      fetch(req).then(res => {
        if (res && res.ok) { const copy = res.clone(); caches.open(VER).then(c => c.put(req, copy)); }
        return res;
      }).catch(() => caches.match(req).then(r => r || (req.mode === 'navigate' ? caches.match('index.html') : Response.error())))
    );
    return;
  }
  if (url.hostname === 'cdnjs.cloudflare.com') {
    e.respondWith(caches.open(VER).then(c => c.match(req).then(hit => {
      const net = fetch(req).then(res => { if (res && res.ok) c.put(req, res.clone()); return res; }).catch(() => hit);
      return hit || net;
    })));
  }
});
