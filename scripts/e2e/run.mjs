/**
 * Interaction smoke test.
 *
 * Boots the real React app inside jsdom, then clicks every button in every
 * screen and reports the ones that produce no visible reaction. Requires the
 * Express API to be running on the port given by API_PORT (default 3001).
 *
 *   node scripts/e2e/run.mjs
 */
import { build } from 'esbuild';
import { JSDOM, VirtualConsole } from 'jsdom';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(here, '../..');
const API_PORT = process.env.API_PORT || '3001';
const API_ORIGIN = `http://localhost:${API_PORT}`;

/** Credentials for the auto-seeded super admin. */
const ADMIN_EMAIL = process.env.E2E_EMAIL || 'admin@synthetix.ai';
const ADMIN_PASSWORD = process.env.E2E_PASSWORD || 'Synthetix@2026';

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Node's fetch has no cookie jar, so the session cookie is tracked by hand and
// replayed on every request the app makes.
let sessionCookie = '';

async function apiFetch(path, init = {}) {
  const headers = new Headers(init.headers || {});
  if (sessionCookie) headers.set('Cookie', sessionCookie);
  const res = await fetch(`${API_ORIGIN}${path}`, { ...init, headers });
  const setCookie = res.headers.getSetCookie?.() ?? [];
  for (const raw of setCookie) {
    const pair = raw.split(';')[0];
    if (pair.startsWith('synthetix_sid=')) sessionCookie = pair;
  }
  return res;
}

function labelOf(el) {
  const text = (el.textContent || '').replace(/\s+/g, ' ').trim();
  const title = el.getAttribute('title') || '';
  const aria = el.getAttribute('aria-label') || '';
  return [text.slice(0, 40), title, aria].filter(Boolean).join(' | ') || el.tagName.toLowerCase();
}

async function main() {
  // The run clicks destructive buttons, so start and end from a known dataset.
  const restoreDataset = async () => {
    try {
      let res = await apiFetch('/api/seed/reset', { method: 'POST' });
      // A "Sign out" click during the run ends the session; sign back in.
      if (res.status === 401) {
        await apiFetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD })
        });
        res = await apiFetch('/api/seed/reset', { method: 'POST' });
      }
      if (!res.ok) throw new Error(String(res.status));
    } catch (err) {
      console.warn('Could not reset the studio dataset:', err.message);
    }
  };

  // Sign in first: every business route needs a session, and the app renders
  // the auth gate without one.
  const login = await apiFetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD })
  });
  if (!login.ok) {
    console.warn(`Could not sign in as ${ADMIN_EMAIL} (${login.status}). The app will render the auth gate.`);
  }

  await restoreDataset();

  const bundle = await build({
    entryPoints: [path.join(here, 'entry.tsx')],
    bundle: true,
    write: false,
    format: 'iife',
    platform: 'browser',
    target: 'es2020',
    jsx: 'automatic',
    loader: { '.tsx': 'tsx', '.ts': 'ts' },
    define: {
      'process.env.NODE_ENV': '"development"',
      'import.meta.env': 'globalThis.__VITE_ENV__'
    },
    banner: { js: 'globalThis.__VITE_ENV__ = globalThis.__VITE_ENV__ || {};' },
    tsconfig: path.join(projectRoot, 'tsconfig.json'),
    logLevel: 'error'
  });

  const runtimeErrors = [];
  const virtualConsole = new VirtualConsole();
  virtualConsole.on('jsdomError', (err) => runtimeErrors.push(err.message));
  virtualConsole.on('error', (...args) => runtimeErrors.push(args.join(' ')));

  const dom = new JSDOM(
    `<!doctype html><html><body><div id="root"></div></body></html>`,
    { url: `${API_ORIGIN}/`, pretendToBeVisual: true, virtualConsole, runScripts: 'dangerously' }
  );

  const { window } = dom;
  window.fetch = (input, init) => {
    const url = typeof input === 'string' ? new URL(input, API_ORIGIN).href : input;
    const headers = new Headers(init?.headers || {});
    if (sessionCookie) headers.set('Cookie', sessionCookie);
    return fetch(url, { ...init, headers });
  };
  window.matchMedia = () => ({
    matches: false,
    addListener() {},
    removeListener() {},
    addEventListener() {},
    removeEventListener() {}
  });
  window.ResizeObserver = class { observe() {} unobserve() {} disconnect() {} };
  window.IntersectionObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
    takeRecords() { return []; }
  };

  // canvas-confetti needs a 2D context; jsdom ships none.
  const noopContext = () => ({
    canvas: null,
    fillRect() {},
    clearRect() {},
    getImageData: (x, y, w, h) => ({ data: new Uint8ClampedArray(w * h * 4) }),
    putImageData() {},
    createImageData: (w, h) => ({ data: new Uint8ClampedArray(w * h * 4) }),
    setTransform() {},
    drawImage() {},
    save() {},
    restore() {},
    beginPath() {},
    closePath() {},
    moveTo() {},
    lineTo() {},
    bezierCurveTo() {},
    quadraticCurveTo() {},
    arc() {},
    arcTo() {},
    ellipse() {},
    fill() {},
    stroke() {},
    clip() {},
    translate() {},
    rotate() {},
    scale() {},
    transform() {},
    measureText: () => ({ width: 0 }),
    fillText() {},
    strokeText() {},
    createLinearGradient: () => ({ addColorStop() {} }),
    createRadialGradient: () => ({ addColorStop() {} }),
    createPattern: () => null,
    isPointInPath: () => false,
    rect() {},
    roundRect() {}
  });
  window.HTMLCanvasElement.prototype.getContext = function () {
    if (!this.__ctx) this.__ctx = noopContext();
    this.__ctx.canvas = this;
    return this.__ctx;
  };
  window.HTMLCanvasElement.prototype.toDataURL = () => 'data:image/png;base64,';

  window.Element.prototype.scrollIntoView = () => {};
  Object.defineProperty(window.navigator, 'clipboard', {
    value: { writeText: async () => {} },
    configurable: true
  });
  // jsdom has no alert()/confirm(); a native dialog must never be the app's UI.
  window.alert = (msg) => runtimeErrors.push(`window.alert() called: ${msg}`);
  window.confirm = () => true;
  window.prompt = () => '';
  window.open = () => null;
  window.print = () => {};
  window.URL.createObjectURL = () => 'blob:mock';
  window.URL.revokeObjectURL = () => {};
  window.HTMLAnchorElement.prototype.click = function () {
    this.dispatchEvent(new window.MouseEvent('click', { bubbles: true, cancelable: true }));
  };
  window.addEventListener('error', (e) => runtimeErrors.push(e.message));

  const script = bundle.outputFiles[0].text;
  window.eval(script);

  const mount = () => window.__mount();
  const settle = async (ms = 400) => {
    await sleep(ms);
  };

  await settle(800);

  // Full markup diff: class-only toggles (aspect ratio, theme) leave textContent
  // intact, and controlled checkboxes only change a DOM property — so both the
  // markup and every input's live state are part of the snapshot.
  const screen = () => {
    const root = window.document.getElementById('root');
    if (!root) return '';
    const inputs = Array.from(root.querySelectorAll('input, select, textarea'))
      .map((el) => {
        if (el.type === 'checkbox' || el.type === 'radio') return `${el.type}:${el.checked}`;
        return `${el.tagName}:${el.value}`;
      })
      .join('|');
    return `${root.innerHTML}<<inputs:${inputs}>>`;
  };

  const buttons = () => Array.from(window.document.querySelectorAll('button:not([disabled])'));

  const results = [];

  // Buttons that only switch the active screen are legitimately no-ops when the
  // screen is already showing, so they are skipped instead of reported.
  const TOP_NAV = { 'AI Studio': 'studio', 'Super Admin': 'admin', 'Mobile PWA': 'mobile', Calendar: 'calendar', 'Money Hub': 'marketplace' };
  const MOBILE_NAV = { Home: 'home', Publish: 'publish', Earnings: 'earnings', Profile: 'auth' };

  const textOf = (el) => (el.textContent || '').replace(/\s+/g, ' ').trim();

  const isAlreadyActive = (el, currentTab) => {
    const text = textOf(el);
    const cls = el.className || '';

    if (text.includes('Synthetix AI')) return currentTab === 'studio';
    if (TOP_NAV[text]) return TOP_NAV[text] === currentTab;
    if (MOBILE_NAV[text]) return cls.includes('text-[#15DDF5]');
    if (text === '16:9 Widescreen') return cls.includes('bg-[#508CFF]');
    if (text === '9:16 Shorts') return cls.includes('bg-[#A13DFF]');
    // Sub-tabs render their active state with a solid accent background.
    if (['Creator Wallet', 'Shorts Marketplace', 'Affiliate Engine'].includes(text)) {
      return /\bbg-\[#(15DDF5|A13DFF|19D89B)\]/.test(cls);
    }
    return false;
  };

  const SCREENS = [
    { tab: 'studio', label: 'AI Studio' },
    { tab: 'admin', label: 'Super Admin' },
    { tab: 'mobile', label: 'Mobile PWA' },
    { tab: 'calendar', label: 'Calendar' },
    { tab: 'marketplace', label: 'Money Hub' }
  ];

  for (const screenDef of SCREENS) {
    const { tab, label: navLabel } = screenDef;

    // Per-screen render check: the workspace must actually show content once it
    // boots — this catches cases where a screen renders but never mounts its
    // interactive tree, and where hooks throw before first paint.
    mount();
    await settle(900);
    const afterRender = screen();
    if (!afterRender || afterRender.length < 256) {
      results.push({
        tab,
        label: 'PER-SCREEN RENDER',
        status: 'ERROR',
        detail: `Screen renders an empty or near-empty root on first mount`
      });
      // Still keep the screen's button pass for completeness.
      await settle(200);
    } else {
      results.push({ tab, label: 'PER-SCREEN RENDER', status: 'OK', detail: '' });
    }

    const navButton = buttons().find((b) => textOf(b) === navLabel);
    if (navButton) {
      navButton.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
      await settle(300);
    }

    const labels = buttons().map(labelOf);
    for (let i = 0; i < labels.length; i++) {
      // Re-authenticate if a prior "Sign out" click left us on the auth gate,
      // otherwise the rest of the loop has nothing to click.
      if (/Sign in to your studio/.test(window.document.body.textContent || '')) {
        await apiFetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD })
        });
        await settle(200);
      }

      mount();
      await settle(500);
      const navAgain = buttons().find((b) => textOf(b) === navLabel);
      if (navAgain) {
        navAgain.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
        await settle(250);
      }

      const current = buttons();
      const target = current[i];
      if (!target) continue;

      const before = screen();
      const errorsBefore = runtimeErrors.length;
      const targetLabel = labelOf(target);

      if (isAlreadyActive(target, tab)) {
        results.push({ tab, label: targetLabel, status: 'SKIPPED', detail: 'already the active screen/state' });
        continue;
      }

      try {
        target.dispatchEvent(new window.MouseEvent('click', { bubbles: true, cancelable: true }));
      } catch (err) {
        results.push({ tab, label: targetLabel, status: 'THREW', detail: err.message });
        continue;
      }
      await settle(900);

      const after = screen();
      const newErrors = runtimeErrors.slice(errorsBefore);

      if (newErrors.length) {
        results.push({ tab, label: targetLabel, status: 'ERROR', detail: newErrors[0].slice(0, 160) });
      } else if (after === before) {
        results.push({ tab, label: targetLabel, status: 'NO-REACTION', detail: 'DOM unchanged after click' });
      } else {
        results.push({ tab, label: targetLabel, status: 'OK', detail: '' });
      }
    }
  }

  const summary = results.reduce((acc, r) => ({ ...acc, [r.status]: (acc[r.status] || 0) + 1 }), {});
  console.log('\n=== Interaction summary ===');
  console.log(summary);
  const problems = results.filter((r) => r.status !== 'OK' && r.status !== 'SKIPPED');
  if (problems.length) {
    console.log('\n=== Problem buttons ===');
    for (const p of problems) console.log(`[${p.status}] (${p.tab}) ${p.label} :: ${p.detail}`);
  }
  console.log(`\nTotal clicks tested: ${results.length}`);
  await restoreDataset();
  if (problems.length) process.exitCode = 1;
}

main().catch((err) => {
  console.error('Harness failed:', err);
  process.exit(1);
});
