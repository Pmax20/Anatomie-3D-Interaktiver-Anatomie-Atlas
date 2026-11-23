// Service Worker – Anatomie 3D (offline-fähig)
const SHELL = 'shell-550182e80c', DATA = 'data-3cf7322379';
const PAGE = './';
const SHELL_FILES = ['manifest.webmanifest', 'icon-192.png', 'icon-512.png', 'apple-touch-icon.png', 'favicon-32.png'];
const BASE = ["data/muscles.glb","data/muscles.json","data/patches.glb","data/skeleton.glb","data/skeleton.json","data/sys_J.glb","data/sys_J.json","data/sys_N.glb","data/sys_N.json","data/sys_O.glb","data/sys_O.json","data/sys_R.glb","data/sys_R.json","data/sys_V.glb","data/sys_V.json","data/sys_Y.glb","data/sys_Y.json","data/lex/lex_0.json","data/lex/lex_1.json","data/lex/lex_10.json","data/lex/lex_11.json","data/lex/lex_12.json","data/lex/lex_13.json","data/lex/lex_14.json","data/lex/lex_15.json","data/lex/lex_16.json","data/lex/lex_17.json","data/lex/lex_18.json","data/lex/lex_19.json","data/lex/lex_2.json","data/lex/lex_20.json","data/lex/lex_21.json","data/lex/lex_22.json","data/lex/lex_23.json","data/lex/lex_24.json","data/lex/lex_25.json","data/lex/lex_26.json","data/lex/lex_27.json","data/lex/lex_28.json","data/lex/lex_29.json","data/lex/lex_3.json","data/lex/lex_30.json","data/lex/lex_31.json","data/lex/lex_32.json","data/lex/lex_33.json","data/lex/lex_34.json","data/lex/lex_35.json","data/lex/lex_36.json","data/lex/lex_37.json","data/lex/lex_38.json","data/lex/lex_39.json","data/lex/lex_4.json","data/lex/lex_40.json","data/lex/lex_41.json","data/lex/lex_42.json","data/lex/lex_43.json","data/lex/lex_44.json","data/lex/lex_45.json","data/lex/lex_46.json","data/lex/lex_47.json","data/lex/lex_48.json","data/lex/lex_49.json","data/lex/lex_5.json","data/lex/lex_50.json","data/lex/lex_51.json","data/lex/lex_52.json","data/lex/lex_53.json","data/lex/lex_54.json","data/lex/lex_55.json","data/lex/lex_56.json","data/lex/lex_57.json","data/lex/lex_58.json","data/lex/lex_59.json","data/lex/lex_6.json","data/lex/lex_60.json","data/lex/lex_61.json","data/lex/lex_62.json","data/lex/lex_63.json","data/lex/lex_7.json","data/lex/lex_8.json","data/lex/lex_9.json"];
const LITE = ["data/muscles_q.glb","data/sys_N_q.glb","data/sys_O_q.glb","data/sys_V_q.glb"];
// Umgeleitete Antworten (z. B. /index.html → /) dürfen Browser nicht für Seitenaufrufe verwenden → bereinigte Kopie speichern
async function clean(res) { return res.redirected ? new Response(await res.blob(), { status: res.status, statusText: res.statusText, headers: res.headers }) : res; }
async function savePage(c) { const r = await fetch(PAGE, { cache: 'no-store' }); if (r.ok) await c.put(PAGE, await clean(r)); }
self.addEventListener('install', (e) => {
  e.waitUntil((async () => {
    const c = await caches.open(SHELL);
    await savePage(c).catch(() => {});
    for (const f of SHELL_FILES) { try { const r = await fetch(f, { cache: 'no-cache' }); if (r.ok) await c.put(f, await clean(r)); } catch (err) { /* später */ } }
    await self.skipWaiting();
  })());
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== SHELL && k !== DATA).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
const isData = (u) => u.pathname.includes('/data/');
const okGlb = async (res, url) => { if (!res.ok) return false; if (!/.glb$/.test(url)) return true; const b = await res.clone().arrayBuffer(); return b.byteLength > 12 && new Uint32Array(b, 0, 1)[0] === 0x46546c67; };
self.addEventListener('fetch', (e) => {
  const req = e.request; if (req.method !== 'GET') return;
  const u = new URL(req.url); if (u.origin !== location.origin) return;
  if (u.pathname.endsWith('/data/voice.json')) {
    // Sprachaufnahmen: immer frisch, offline aus dem Speicher
    e.respondWith((async () => { const c = await caches.open(DATA); try { const r = await fetch(req, { cache: 'no-store' }); if (r.ok) c.put(req, r.clone()); return r; } catch (err) { return (await c.match(req)) || Response.error(); } })());
    return;
  }
  if (u.pathname.includes('/voice/')) {
    // Sprachaufnahmen: Liste immer frisch (neue Aufnahmen), Audio aus dem Speicher (offline)
    if (!u.pathname.endsWith('index.json')) {
      e.respondWith((async () => { const c = await caches.open(DATA); const hit = await c.match(req); if (hit) return hit; const r = await fetch(req); if (r.ok && r.status === 200) c.put(req, r.clone()); return r; })());
      return;
    }
    e.respondWith((async () => { const c = await caches.open(DATA); try { const r = await fetch(req, { cache: 'no-store' }); if (r.ok) { c.put(req, r.clone()); } return r; } catch (err) { return (await c.match(req)) || Response.error(); } })());
    return;
  }
  if (isData(u) && /.txt$/.test(u.pathname)) {
    // Rettungsnetz für alte App-Versionen: .txt (Base64) aus der .glb erzeugen
    e.respondWith((async () => {
      try { const r = await fetch(req); if (r.ok) return r; } catch (err) { /* weiter */ }
      const gp = u.pathname.slice(u.pathname.indexOf('data/')).replace(/.txt$/, '.glb');
      const c = await caches.open(DATA);
      let g = await c.match(gp); if (!g) { g = await clean(await fetch(gp)); if (await okGlb(g, gp)) await c.put(gp, g.clone()); }
      const bytes = new Uint8Array(await g.arrayBuffer()); let bin = '';
      for (let i = 0; i < bytes.length; i += 32768) bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 32768));
      return new Response(btoa(bin), { headers: { 'Content-Type': 'text/plain' } });
    })());
    return;
  }
  if (isData(u)) {
    // Modelle & Texte: zuerst aus dem Speicher, sonst laden und merken
    e.respondWith(caches.open(DATA).then(async (c) => {
      const key = u.pathname.slice(u.pathname.indexOf('data/'));
      const hit = await c.match(key); if (hit) return hit;
      const res = await clean(await fetch(req));
      if (await okGlb(res, u.pathname)) await c.put(key, res.clone());
      return res;
    }));
    return;
  }
  if (u.pathname.endsWith('version.json')) return; // immer direkt übers Netz
  if (req.mode === 'navigate') {
    // Seite: online immer frisch (für Updates), offline aus dem Speicher
    e.respondWith((async () => {
      const c = await caches.open(SHELL);
      try {
        const ctl = new AbortController(); const t = setTimeout(() => ctl.abort(), 6000);
        let res = await fetch(req.url, { signal: ctl.signal, cache: 'no-store', credentials: 'same-origin' }); clearTimeout(t);
        res = await clean(res);
        if (res.ok) await c.put(PAGE, res.clone());
        return res;
      } catch (err) {
        return (await c.match(PAGE)) || (await caches.match(PAGE)) || new Response('<h1>Offline</h1><p>Bitte einmal mit Internet öffnen, damit die App gespeichert wird.</p>', { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
      }
    })());
    return;
  }
  e.respondWith(caches.match(req, { ignoreSearch: true }).then((hit) => hit || fetch(req).then(async (res) => { res = await clean(res); if (res.ok) { const cp = res.clone(); caches.open(SHELL).then((c) => c.put(req, cp)); } return res; })));
});
// Alle Modelle im Hintergrund vorladen (vom Programm angestoßen)
let running = false;
self.addEventListener('message', (e) => {
  if (!e.data || e.data.type !== 'precache' || running) return;
  running = true;
  const files = e.data.lite ? [...BASE.filter((f) => !LITE.includes(f.replace(/.glb$/, '_q.glb'))), ...LITE] : BASE;
  e.waitUntil((async () => {
    const post = (msg) => self.clients.matchAll().then((cl) => cl.forEach((x) => x.postMessage(msg)));
    const s = await caches.open(SHELL);
    if (!(await s.match(PAGE))) await savePage(s).catch(() => {});
    const c = await caches.open(DATA); let done = 0, failed = 0;
    for (const f of files) {
      try {
        if (!(await c.match(f))) { const res = await clean(await fetch(f, { cache: 'no-cache' })); if (await okGlb(res, f)) await c.put(f, res); else failed++; }
      } catch (err) { failed++; }
      done++; if (done % 4 === 0 || done === files.length) post({ type: 'precache', done, total: files.length, failed, page: !!(await s.match(PAGE)) });
    }
    running = false;
  })());
});
