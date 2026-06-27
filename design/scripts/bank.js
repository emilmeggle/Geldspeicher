const PRICE_REFRESH_MS  = 5 * 60_000;
const FETCH_TIMEOUT_MS  = 4500;
const PRICE_URL         = 'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=eur';
const PRICE_CACHE_KEY   = 'bb-last-price';
const SATS_PER_BTC             = 100_000_000;
const COIN_VALUE_SATS    = 100_000;        // 1 Taler = 100.000 Sats ≈ €90
const COINS_PER_NUGGET   = 10;
// Live merge thresholds — value-preserving so each unit's sat-value is exact:
//   10 Talers × 100k  = 1M sats    = 1 Goldnugget
//   10 Nuggets × 1M   = 10M sats   = 1 Goldbarren
//   10 Barren × 10M   = 100M sats  = 1 orange medal (1 BTC)
//   10 medals × 100M  = 1B sats    = 1 black medal (10 BTC)
// Each step is 10× — clean ladder. Goldnugget sits between Taler and Goldbarren
// (raw mined gold, the unrefined mid-step before the poured ingot).
const MERGE_COIN_COUNT  = 10;
const NUGGET_PER_BARREN = 10;
const BARREN_PER_MEDAL  = 10;
const MEDALS_PER_BLACK  = 10;

// Sat-values per visible unit (canonical ladder — used everywhere)
const NUGGET_VALUE = COIN_VALUE_SATS * COINS_PER_NUGGET;     //   1.000.000 sats (≈ €900)
const BARREN_VALUE = NUGGET_VALUE * NUGGET_PER_BARREN;       //  10.000.000 sats (≈ €9.000)
const MEDAL_VALUE  = SATS_PER_BTC;                           // 100.000.000 sats (1 BTC)
const BLACK_VALUE  = SATS_PER_BTC * MEDALS_PER_BLACK;        // 1.000.000.000 sats (10 BTC)

// Tier physics densities — strictly escalating so a heavier unit always sinks
// through a lighter one in the pile. Sat is the lightest, Black Medal the
// heaviest. Each tier is meaningfully denser than the one below.
const DENSITY_SAT    = 0.0008;
const DENSITY_TALER  = 0.0014;
const DENSITY_NUGGET = 0.0080;
const DENSITY_BARREN = 0.0180;
const DENSITY_MEDAL  = 0.0240;
const DENSITY_BLACK  = 0.0380;

let demoSats = 500 * COIN_VALUE_SATS;

// Live buys grow the pile organically (coins shower → some live merges fire).
// The pile composition can drift from canonical (what `respawnStack` would build)
// because buys are capped at MAX_COINS and the height-trigger may not fire on
// short stacks. Set when a buy happens; cleared whenever the pile is canonicalized
// (via respawnStack — used by sells, preview, and the on-close snap).
let needsCanonicalSnap = false;

const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const phone              = document.querySelector('.phone');
const sign               = document.querySelector('.price-sign');
const leftString         = sign.querySelector('.sign-string--left');
const rightString        = sign.querySelector('.sign-string--right');
const signBody           = sign.querySelector('.sign-body-group');
const priceEl            = document.getElementById('priceText');
const stackMainEl        = document.getElementById('stackMainText');
const stackEurEl         = document.getElementById('stackEurText');
const vaultButton        = document.querySelector('.vault-button');
const buyButton          = document.querySelector('.buy');
const vaultActions       = document.querySelector('.vault-actions');
const vaultActionButtons = [...vaultActions.querySelectorAll('button')];
const previewToggles     = [...document.querySelectorAll('[data-preview-coins]')];
const vaultPile          = document.getElementById('vaultPile');
const barGroup           = document.getElementById('barGroup');
const coinGroup          = document.getElementById('coinGroup');

// ── Pendulum constants ────────────────────────────────────────────────────────
const ARM_LENGTH        = 47;
const SWING_AMPLITUDE   = 100;
const SWING_PERIOD_MS   = 620;
const SWING_DAMPING     = 0.0028;
const SWING_DURATION_MS = 1800;
const FADE_OUT_MS       = 220;
const OPACITY_RAMP_MS   = 80;

let currentPrice = null;
let lastFetchAt  = 0;
let activeAnim   = null;

const isVaultOpen    = () => phone.dataset.mode === 'vault-open';
const formatEUR      = (n) => '€' + Math.round(n).toLocaleString('de-DE');
// The wooden counter is the SOURCE OF TRUTH — what the user actually owns.
// The pile inside the vault is a visual representation rounded down to the
// nearest representable unit (5k sats). Sign tells truth; vault is approximate.
const activeSats = () => phone.dataset.vaultContent === 'stack' ? demoSats : 0;
const talerCount     = () => Math.floor(demoSats / COIN_VALUE_SATS);
const formatMain = (sats) => {
  if (sats === 0) return '0 Sats';
  if (sats < SATS_PER_BTC) return sats.toLocaleString('de-DE') + ' Sats';
  return (sats / SATS_PER_BTC).toLocaleString('de-DE', { minimumFractionDigits: 3, maximumFractionDigits: 8 }) + ' BTC';
};

const formatEurValue = (sats) => {
  if (sats === 0 || typeof currentPrice !== 'number') return '';
  return Math.round(currentPrice * sats / SATS_PER_BTC).toLocaleString('de-DE') + ' €';
};

// Memo'd so per-frame updates from the physics loop are free unless the
// visual-sum or the live price actually changed.
let lastSignSats  = -1;
let lastSignPrice = null;
const updateStackValue = () => {
  const sats = activeSats();
  if (sats === lastSignSats && currentPrice === lastSignPrice) return;
  lastSignSats  = sats;
  lastSignPrice = currentPrice;
  stackMainEl.textContent = formatMain(sats);
  stackEurEl.textContent  = formatEurValue(sats);
};

const setPrice = (n) => {
  priceEl.textContent = formatEUR(n);
  sign.setAttribute('aria-label', `Bitcoinpreis: 1 Bitcoin kostet ${Math.round(n).toLocaleString('de-DE')} Euro`);
  if (!isVaultOpen()) sign.removeAttribute('aria-hidden');
  updateStackValue();
};

const fetchPrice = async () => {
  const ctrl  = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);
  try {
    const r = await fetch(PRICE_URL, { signal: ctrl.signal });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const j = await r.json();
    lastFetchAt = Date.now();
    return j?.bitcoin?.eur ?? null;
  } catch (e) {
    console.warn('[price] fetch failed:', e.message || e);
    return null;
  } finally { clearTimeout(timer); }
};

const saveCachedPrice = (n) => {
  try { localStorage.setItem(PRICE_CACHE_KEY, JSON.stringify({ price: n, t: Date.now() })); }
  catch { /* private mode / quota */ }
};
const loadCachedPrice = () => {
  try {
    const raw = localStorage.getItem(PRICE_CACHE_KEY);
    if (!raw) return null;
    const { price } = JSON.parse(raw);
    return typeof price === 'number' ? price : null;
  } catch { return null; }
};

// ── Pendulum animation ────────────────────────────────────────────────────────
const clearStyles = () => {
  [leftString, rightString, signBody].forEach((el) => { el.style.transform = ''; el.style.opacity = ''; });
};
const applyFrame = (angleDeg, opacity) => {
  const theta = angleDeg * Math.PI / 180;
  const dx = -ARM_LENGTH * Math.sin(theta);
  const dy = -ARM_LENGTH * (1 - Math.cos(theta));
  leftString.style.transform  = `rotate(${angleDeg}deg)`;
  rightString.style.transform = `rotate(${angleDeg}deg)`;
  signBody.style.transform    = `translate(${dx}px, ${dy}px)`;
  leftString.style.opacity = rightString.style.opacity = signBody.style.opacity = opacity;
};

const swingIn = () => {
  if (activeAnim) activeAnim.cancelled = true;
  if (prefersReducedMotion) { clearStyles(); sign.classList.remove('is-hidden'); return Promise.resolve(); }
  const anim = { cancelled: false };
  activeAnim = anim;
  applyFrame(SWING_AMPLITUDE, 0);
  sign.classList.remove('is-hidden');
  const start = performance.now();
  return new Promise((resolve) => {
    const frame = (now) => {
      if (anim.cancelled) return resolve();
      const t = now - start;
      if (t >= SWING_DURATION_MS) { clearStyles(); if (activeAnim === anim) activeAnim = null; return resolve(); }
      applyFrame(
        SWING_AMPLITUDE * Math.exp(-SWING_DAMPING * t) * Math.cos((t / SWING_PERIOD_MS) * 2 * Math.PI),
        Math.min(t / OPACITY_RAMP_MS, 1)
      );
      requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
  });
};

const fadeOut = () => {
  if (sign.classList.contains('is-hidden')) return Promise.resolve();
  if (activeAnim) activeAnim.cancelled = true;
  if (prefersReducedMotion) { sign.classList.add('is-hidden'); clearStyles(); return Promise.resolve(); }
  const anim = { cancelled: false };
  activeAnim = anim;
  const start      = performance.now();
  const startStyles = [leftString, rightString, signBody].map((el) => getComputedStyle(el).transform);
  return new Promise((resolve) => {
    const frame = (now) => {
      if (anim.cancelled) return resolve();
      const t = now - start;
      if (t >= FADE_OUT_MS) { sign.classList.add('is-hidden'); clearStyles(); if (activeAnim === anim) activeAnim = null; return resolve(); }
      const opacity = Math.max(1 - t / FADE_OUT_MS, 0);
      [leftString, rightString, signBody].forEach((el, i) => {
        if (startStyles[i] && startStyles[i] !== 'none') el.style.transform = startStyles[i];
        el.style.opacity = opacity;
      });
      requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
  });
};

const swap = async (newPrice) => { await fadeOut(); setPrice(newPrice); if (!isVaultOpen()) await swingIn(); };

const setOpenActions = (open) => {
  buyButton.setAttribute('aria-hidden', open ? 'true' : 'false');
  buyButton.tabIndex = open ? -1 : 0;
  vaultActions.setAttribute('aria-hidden', open ? 'false' : 'true');
  vaultActionButtons.forEach((b) => { b.tabIndex = open ? 0 : -1; });
};

export const openVault = () => {
  phone.dataset.mode = 'vault-open';
  vaultButton.setAttribute('aria-pressed', 'true');
  vaultButton.setAttribute('aria-label', 'Geldspeicher schließen');
  sign.removeAttribute('aria-hidden');
  setOpenActions(true);
  updateStackValue();
  if (activeAnim) activeAnim.cancelled = true;
  clearStyles();
  setTimeout(() => jiggleTopCoins(6, 0.0014), 380);
};

export const closeVault = () => {
  phone.dataset.mode = 'closed';
  vaultButton.setAttribute('aria-pressed', 'false');
  vaultButton.setAttribute('aria-label', 'Geldspeicher öffnen');
  setOpenActions(false);
  if (currentPrice != null) {
    sign.removeAttribute('aria-hidden');
    if (activeAnim) activeAnim.cancelled = true;
    sign.classList.remove('is-hidden');
    clearStyles();
  }
  // Snap pile to canonical composition while the door covers the chamber.
  // Door close animation is 460ms; we wait ~400ms so the door is most of the
  // way over the pile before the clear/respawn happens. If the user reopens
  // mid-close, skip the snap (the still-organic pile is already on screen).
  if (needsCanonicalSnap) {
    setTimeout(() => {
      if (phone.dataset.mode !== 'closed') return;
      if (!needsCanonicalSnap) return;
      // Don't churn the DOM (clearAll + respawn) during a room crossfade. If we've
      // left Bank, keep the snap pending — it runs on the next vault close on Bank.
      if (phone.dataset.room !== 'bank') return;
      respawnStack();
    }, 400);
  }
};

// ── Physics setup ─────────────────────────────────────────────────────────────
const { Engine, World, Bodies, Body } = Matter;
const CHAMBER = { cx: 120, cy: 120, r: 72 };

const physEngine = Engine.create({
  enableSleeping: true,
  gravity: { x: 0, y: 1.0, scale: 0.0014 },
  positionIterations: 4,   // fewer iterations = less collision work per frame
  velocityIterations: 3,
});
const physWorld = physEngine.world;

// Full 360° circular cage — 24 segments, wall at r=69 (3px inside visual r=72).
// No gap: coins spawn inside the chamber so nothing escapes over the top.
{
  const WALL_R = CHAMBER.r - 3;
  const N      = 24;
  const segLen = (2 * Math.PI * WALL_R) / N * 1.20;
  for (let i = 0; i < N; i++) {
    const a = (i + 0.5) / N * 2 * Math.PI;
    World.add(physWorld, Bodies.rectangle(
      CHAMBER.cx + WALL_R * Math.cos(a),
      CHAMBER.cy + WALL_R * Math.sin(a),
      segLen, 7,
      { isStatic: true, angle: a + Math.PI / 2, friction: 0.65, restitution: 0.06 }
    ));
  }
}

// ── Bitcoin ₿ path — clean geometric letterform shared across every tier ──────
// One glyph for the whole ladder: same shape on Sat/Taler/Nugget/Barren/Medals,
// only colour varies. Bowls + top/bottom horns; bbox auto-measured below.
const OFFICIAL_B_PATH = "M5.5 13v1.25c0 .138.112.25.25.25h1a.25.25 0 0 0 .25-.25V13h.5v1.25c0 .138.112.25.25.25h1a.25.25 0 0 0 .25-.25V13h.084c1.992 0 3.416-1.033 3.416-2.82 0-1.502-1.007-2.323-2.186-2.44v-.088c.97-.242 1.683-.974 1.683-2.19C11.997 3.93 10.847 3 9.092 3H9V1.75a.25.25 0 0 0-.25-.25h-1a.25.25 0 0 0-.25.25V3h-.573V1.75a.25.25 0 0 0-.25-.25H5.75a.25.25 0 0 0-.25.25V3l-1.998.011a.25.25 0 0 0-.25.25v.989c0 .137.11.25.248.25l.755-.005a.75.75 0 0 1 .745.75v5.505a.75.75 0 0 1-.75.75l-.748.011a.25.25 0 0 0-.25.25v1c0 .138.112.25.25.25L5.5 13zm1.427-8.513h1.719c.906 0 1.438.498 1.438 1.312 0 .871-.575 1.362-1.877 1.362h-1.28V4.487zm0 4.051h1.84c1.137 0 1.756.58 1.756 1.524 0 .953-.626 1.45-1.847 1.45H6.927V8.539z";

let OFFICIAL_BB_CX = 12.7, OFFICIAL_BB_CY = 14.5, OFFICIAL_BB_H = 18;
{
  const NS = 'http://www.w3.org/2000/svg';
  const tmp = document.createElementNS(NS, 'svg');
  tmp.setAttribute('style', 'position:absolute;width:0;height:0;visibility:hidden;');
  const p = document.createElementNS(NS, 'path');
  p.setAttribute('d', OFFICIAL_B_PATH);
  tmp.appendChild(p);
  document.body.appendChild(tmp);
  const bb = p.getBBox();
  document.body.removeChild(tmp);
  OFFICIAL_BB_CX = bb.x + bb.width / 2;
  OFFICIAL_BB_CY = bb.y + bb.height / 2;
  OFFICIAL_BB_H  = bb.height;
}

const VISUAL_CENTRE_X_OFFSET = 0;

// drawB — perspective-distorted ₿ for coin faces (shapeRatio squishes vertically)
const drawB = (cx, cy, h, shapeRatio) => {
  const sx = h / OFFICIAL_BB_H, sy = sx * shapeRatio;
  return `<g transform="translate(${cx.toFixed(2)} ${cy.toFixed(2)}) scale(${sx.toFixed(4)} ${sy.toFixed(4)}) translate(${(-OFFICIAL_BB_CX - VISUAL_CENTRE_X_OFFSET).toFixed(2)} ${(-OFFICIAL_BB_CY).toFixed(2)})" fill="var(--coin-stamp)"><path d="${OFFICIAL_B_PATH}"/></g>`;
};

// drawBFlat — flat-on ₿ with custom fill colour, for bars and medals
const drawBFlat = (cx, cy, h, fill) => {
  const s = h / OFFICIAL_BB_H;
  return `<g transform="translate(${cx.toFixed(2)} ${cy.toFixed(2)}) scale(${s.toFixed(4)} ${s.toFixed(4)}) translate(${(-OFFICIAL_BB_CX - VISUAL_CENTRE_X_OFFSET).toFixed(2)} ${(-OFFICIAL_BB_CY).toFixed(2)})" fill="${fill}"><path d="${OFFICIAL_B_PATH}"/></g>`;
};

// ── Taler atom ────────────────────────────────────────────────────────────────
const drawTaler = (r, shapeRatio = 0.55) => {
  const ry = r * shapeRatio;
  const thickness  = Math.max(0.7, r * 0.55 * (1 - shapeRatio));
  const stroke     = Math.max(0.4, r * 0.10);
  const ridgeStroke = Math.max(0.25, r * 0.06);
  let rimSvg = '';
  if (thickness > 0.6) {
    rimSvg = `<path d="M ${(-r).toFixed(2)} 0 A ${r} ${ry.toFixed(2)} 0 0 0 ${r.toFixed(2)} 0 L ${r.toFixed(2)} ${thickness.toFixed(2)} A ${r} ${ry.toFixed(2)} 0 0 1 ${(-r).toFixed(2)} ${thickness.toFixed(2)} Z" fill="var(--coin-rim)" stroke="var(--coin-stamp)" stroke-width="${stroke.toFixed(2)}" stroke-linejoin="round"/>`;
    if (r >= 3.5 && thickness > 1.2) {
      const n = Math.max(8, Math.min(20, Math.round(r * 0.85)));
      const inset = 0.05, capPad = ridgeStroke * 0.55, usable = thickness - capPad * 2;
      let ridges = '';
      for (let i = 0; i < n; i++) {
        const t = inset + ((i + 0.5) / n) * (1 - inset * 2);
        const rx = -r + t * 2 * r, profile = Math.sin(t * Math.PI);
        const yTop = ry * profile + capPad, len = usable * (0.30 + 0.70 * profile);
        ridges += `<line x1="${rx.toFixed(2)}" y1="${yTop.toFixed(2)}" x2="${rx.toFixed(2)}" y2="${(yTop + len).toFixed(2)}" stroke="var(--coin-rim-shadow)" stroke-width="${ridgeStroke.toFixed(2)}" stroke-linecap="round" opacity="0.95"/>`;
      }
      rimSvg += ridges;
    }
  }
  const faceSvg = `<ellipse cx="0" cy="0" rx="${r.toFixed(2)}" ry="${ry.toFixed(2)}" fill="var(--coin-face)" stroke="var(--coin-stamp)" stroke-width="${stroke.toFixed(2)}"/>`;
  const hlSvg   = r >= 3 ? `<ellipse cx="${(-r * 0.34).toFixed(2)}" cy="${(-ry * 0.45).toFixed(2)}" rx="${(r * 0.32).toFixed(2)}" ry="${(ry * 0.32).toFixed(2)}" fill="var(--coin-highlight)" opacity="0.85"/>` : '';
  const stamp   = r >= 5 ? drawB(0, 0, r * 0.85, shapeRatio) : '';
  return rimSvg + faceSvg + hlSvg + stamp;
};

// ── Goldnugget atom (10 Talers = 1M sats ≈ €900) ────────────────────────────
// Raw mined gold. Faceted polygon silhouette with light/dark shadow planes at
// the corners; ₿ stamp owns a clean front face (no facet edges crossing it).
// Five variants picked at random per spawn for visual variety in the pile.
const NUGGET_R = 12; // physics radius for the round-ish body

// Each variant returns the SVG inner content (no <svg> wrapper). All use the
// same coordinate space (~±11) so the physics circle radius stays constant.
const drawNugget1 = () => [
  // ground shadow
  `<ellipse cx="2" cy="11" rx="9.5" ry="1.5" fill="#1A2028" opacity="0.45"/>`,
  // main polygon — 7-vertex chunk leaning right
  `<path d="M -8 -5 L -3 -8 L 4 -7 L 9 -3 L 10 3 L 4 8 L -7 7 Z" fill="#F8C247" stroke="#1A2028" stroke-width="1.4" stroke-linejoin="round"/>`,
  // light facet (top strip)
  `<path d="M -8 -5 L -3 -8 L 4 -7 L 2 -6 L -5 -6 Z" fill="#FFE89A" stroke="#1A2028" stroke-width="0.6" stroke-opacity="0.55" stroke-linejoin="round"/>`,
  // dark facet (right strip)
  `<path d="M 9 -3 L 10 3 L 4 8 L 5 4 L 5 -1 L 8 -3 Z" fill="#A86512" fill-opacity="0.5" stroke="#1A2028" stroke-width="0.6" stroke-opacity="0.55" stroke-linejoin="round"/>`,
  // ₿ stamp — sits on the lit lower face, off-center to clear the dark facet
  drawBFlat(-1, 1, 7, '#1A2028'),
].join('');

const drawNugget2 = () => [
  `<ellipse cx="2" cy="11" rx="11" ry="1.6" fill="#1A2028" opacity="0.45"/>`,
  // 11-vertex rounder rock, low and wide
  `<path d="M -10 -2 L -6 -5 L 0 -6 L 6 -5 L 10 -2 L 11 1 L 8 6 L 3 8 L -3 8 L -8 6 L -11 1 Z" fill="#F8C247" stroke="#1A2028" stroke-width="1.4" stroke-linejoin="round"/>`,
  // light strip across the top
  `<path d="M -10 -2 L -6 -5 L 0 -6 L 6 -5 L 10 -2 L 7 -4 L -7 -4 Z" fill="#FFE89A" stroke="#1A2028" stroke-width="0.6" stroke-opacity="0.55" stroke-linejoin="round"/>`,
  // dark corner lower-right
  `<path d="M 11 1 L 8 6 L 3 8 L 4 5 L 8 1 Z" fill="#A86512" fill-opacity="0.5" stroke="#1A2028" stroke-width="0.6" stroke-opacity="0.55" stroke-linejoin="round"/>`,
  drawBFlat(-2, 1, 8, '#1A2028'),
].join('');

const drawNugget3 = () => [
  `<ellipse cx="2" cy="11" rx="9.5" ry="1.5" fill="#1A2028" opacity="0.45"/>`,
  // leaning shape with peak top-right
  `<path d="M -9 1 L -4 -3 L 3 -7 L 9 -8 L 11 -2 L 9 5 L 3 9 L -5 7 Z" fill="#F8C247" stroke="#1A2028" stroke-width="1.4" stroke-linejoin="round"/>`,
  // light at the peak
  `<path d="M 3 -7 L 9 -8 L 11 -2 L 8 -3 L 5 -5 Z" fill="#FFE89A" stroke="#1A2028" stroke-width="0.6" stroke-opacity="0.55" stroke-linejoin="round"/>`,
  // dark at the lower-left
  `<path d="M -9 1 L -4 -3 L -3 -1 L -5 3 L -5 7 Z" fill="#A86512" fill-opacity="0.5" stroke="#1A2028" stroke-width="0.6" stroke-opacity="0.55" stroke-linejoin="round"/>`,
  drawBFlat(1, 2, 7, '#1A2028'),
].join('');

const drawNugget4 = () => [
  `<ellipse cx="2" cy="11" rx="10" ry="1.5" fill="#1A2028" opacity="0.45"/>`,
  // pyramidal shape with pointed peak
  `<path d="M -9 5 L -4 -3 L 1 -9 L 8 -2 L 10 5 L 5 8 L -5 8 Z" fill="#F8C247" stroke="#1A2028" stroke-width="1.4" stroke-linejoin="round"/>`,
  // light at top-left of peak
  `<path d="M -9 5 L -4 -3 L 1 -9 L -2 -1 Z" fill="#FFE89A" stroke="#1A2028" stroke-width="0.6" stroke-opacity="0.55" stroke-linejoin="round"/>`,
  // dark at top-right of peak
  `<path d="M 1 -9 L 8 -2 L 10 5 L 4 -1 Z" fill="#A86512" fill-opacity="0.5" stroke="#1A2028" stroke-width="0.6" stroke-opacity="0.55" stroke-linejoin="round"/>`,
  drawBFlat(0, 3, 6, '#1A2028'),
].join('');

const drawNugget5 = () => [
  `<ellipse cx="2" cy="11" rx="10" ry="1.5" fill="#1A2028" opacity="0.45"/>`,
  // 12-vertex complex polygon
  `<path d="M -8 -2 L -6 -6 L -1 -8 L 4 -7 L 8 -4 L 10 0 L 9 5 L 5 8 L 0 9 L -4 8 L -7 5 L -9 1 Z" fill="#F8C247" stroke="#1A2028" stroke-width="1.4" stroke-linejoin="round"/>`,
  // light strip top
  `<path d="M -6 -6 L -1 -8 L 4 -7 L 2 -5 L -3 -5 Z" fill="#FFE89A" stroke="#1A2028" stroke-width="0.6" stroke-opacity="0.55" stroke-linejoin="round"/>`,
  // dark right corner
  `<path d="M 10 0 L 9 5 L 5 8 L 5 4 L 7 1 Z" fill="#A86512" fill-opacity="0.5" stroke="#1A2028" stroke-width="0.6" stroke-opacity="0.55" stroke-linejoin="round"/>`,
  // dark hint left corner
  `<path d="M -9 1 L -7 5 L -5 3 L -6 0 Z" fill="#A86512" fill-opacity="0.3" stroke="#1A2028" stroke-width="0.6" stroke-opacity="0.4" stroke-linejoin="round"/>`,
  drawBFlat(-1, 2, 7, '#1A2028'),
].join('');

// ── Goldbarren atom (10 Goldnuggets = 10M sats ≈ €9.000) ─────────────────────
// Trapezoidal gold ingot — bevel depth on right + bottom faces, inner frame
// border, cream highlight, flat ₿ stamp. Physics body has Infinity inertia
// so bars always lie flat and never tip over each other.
const BARREN_W = 34, BARREN_H = 18, BARREN_TAPER = 3;

const drawBarren = () => {
  const hw = BARREN_W / 2, hh = BARREN_H / 2;
  const tL = -hw + BARREN_TAPER, tR = hw - BARREN_TAPER;
  const stamp = drawBFlat(0.5, 0, BARREN_H * 0.60, '#A86512');
  return [
    `<path d="M${tL+2} ${-hh+2} L${tR+2} ${-hh+2} L${hw+2} ${hh+2} L${-hw+2} ${hh+2} Z" fill="#1A2028" opacity="0.45"/>`,
    `<path d="M${tR} ${-hh} L${tR+2} ${-hh+2} L${hw+2} ${hh+2} L${hw} ${hh} Z" fill="#A86512" stroke="#1A2028" stroke-width="0.8" stroke-linejoin="round"/>`,
    `<path d="M${-hw} ${hh} L${hw} ${hh} L${hw+2} ${hh+2} L${-hw+2} ${hh+2} Z" fill="#8A5210" stroke="#1A2028" stroke-width="0.8" stroke-linejoin="round"/>`,
    `<path d="M${tL} ${-hh} L${tR} ${-hh} L${hw} ${hh} L${-hw} ${hh} Z" fill="#F8C247" stroke="#1A2028" stroke-width="1.6" stroke-linejoin="round"/>`,
    `<path d="M${tL+2.5} ${-hh+2.5} L${tR-2} ${-hh+2.5} L${hw-2.5} ${hh-2.5} L${-hw+2.5} ${hh-2.5} Z" fill="none" stroke="#C7892A" stroke-width="0.9" opacity="0.88"/>`,
    `<ellipse cx="${(-hw*0.30).toFixed(2)}" cy="${(-hh*0.42).toFixed(2)}" rx="${(hw*0.30).toFixed(2)}" ry="${(hh*0.30).toFixed(2)}" fill="#FFE6A0" opacity="0.76"/>`,
    stamp,
  ].join('');
};

// ── Bitcoin medal atom (1 BTC) ────────────────────────────────────────────────
// The canonical public-domain Bitcoin logo: orange disc, cream ₿, thick ink
// outline + hard shadow. Heaviest single piece in the chamber — sinks to the
// bottom and stays there. Spawns when BARREN_PER_MEDAL sacks merge.
const MEDAL_R = 22;

const drawMedal = () => {
  const r = MEDAL_R;
  return [
    // Hard drop shadow
    `<circle cx="3" cy="3" r="${r}" fill="#1A2028" opacity="0.50"/>`,
    // Bitcoin orange disc
    `<circle cx="0" cy="0" r="${r}" fill="#F7931A" stroke="#1A2028" stroke-width="2.5"/>`,
    // Embossed inner ring
    `<circle cx="0" cy="0" r="${r-4}" fill="none" stroke="#FFB347" stroke-width="1.2" opacity="0.55"/>`,
    // Highlight
    `<ellipse cx="${(-r*0.28).toFixed(2)}" cy="${(-r*0.35).toFixed(2)}" rx="${(r*0.28).toFixed(2)}" ry="${(r*0.22).toFixed(2)}" fill="#FFD080" opacity="0.60"/>`,
    // Cream ₿ — flat-on, no perspective squish
    drawBFlat(0, 0, r * 1.25, '#F5EDD8'),
  ].join('');
};

// ── Black ₿ medal atom (10 BTC) ───────────────────────────────────────────────
// Larger than the orange medal, dark-charcoal disc with cool highlight and
// scratch marks — visually heavy, rare. Spawns when MEDALS_PER_BLACK orange
// medals merge.
const BLACK_R = 26;

const drawBlack = () => {
  const r = BLACK_R;
  return [
    `<circle cx="4" cy="4" r="${r}" fill="#1A2028" opacity="0.70"/>`,
    `<circle cx="0" cy="0" r="${r}" fill="#1C2533" stroke="#1A2028" stroke-width="2.5"/>`,
    `<circle cx="0" cy="0" r="${r-4}" fill="none" stroke="#384858" stroke-width="1.2" opacity="0.70"/>`,
    `<ellipse cx="${(-r*0.30).toFixed(2)}" cy="${(-r*0.38).toFixed(2)}" rx="${(r*0.26).toFixed(2)}" ry="${(r*0.18).toFixed(2)}" fill="#4A6080" opacity="0.38"/>`,
    `<line x1="${(-r*0.55).toFixed(2)}" y1="${(-r*0.10).toFixed(2)}" x2="${(r*0.35).toFixed(2)}" y2="${(r*0.05).toFixed(2)}" stroke="#3A4A58" stroke-width="0.9" opacity="0.65"/>`,
    `<line x1="${(-r*0.30).toFixed(2)}" y1="${(r*0.25).toFixed(2)}" x2="${(r*0.25).toFixed(2)}" y2="${(-r*0.30).toFixed(2)}" stroke="#3A4A58" stroke-width="0.7" opacity="0.50"/>`,
    drawBFlat(0, 0, r * 1.20, '#F5EDD8'),
  ].join('');
};

// 5 nugget variants — random per spawn so the pile reads like real mined gold
// (every nugget unique) instead of stamped copies.
const NUGGET_TEMPLATES = [drawNugget1(), drawNugget2(), drawNugget3(), drawNugget4(), drawNugget5()];
const pickNuggetTemplate = () => NUGGET_TEMPLATES[Math.floor(Math.random() * NUGGET_TEMPLATES.length)];
const BARREN_TEMPLATE = drawBarren();
const MEDAL_TEMPLATE  = drawMedal();
const BLACK_TEMPLATE  = drawBlack();

// ── Satoshi atom (sub-Taler micro-coin, ≈ 5k Sats ≈ €4.50) ───────────────────
const SATOSHI_VALUE_SATS  = 5_000;
const SATOSHI_MERGE_COUNT = 20;     // 20 × 5k = 100k = 1 Taler
const MAX_SATOSHIS        = 30;
const SATOSHI_R           = 4;

const drawSatoshi = () => {
  const r = SATOSHI_R;
  return [
    `<circle cx="1.2" cy="1.2" r="${r}" fill="#1A2028" opacity="0.55"/>`,
    `<circle cx="0" cy="0" r="${r}" fill="#F7931A" stroke="#1A2028" stroke-width="1.4"/>`,
    `<ellipse cx="${(-r * 0.30).toFixed(2)}" cy="${(-r * 0.35).toFixed(2)}" rx="${(r * 0.32).toFixed(2)}" ry="${(r * 0.24).toFixed(2)}" fill="#FFD080" opacity="0.60"/>`,
    drawBFlat(0, 0, r * 1.05, '#F5EDD8'),
  ].join('');
};
const SATOSHI_TEMPLATE = drawSatoshi();

// ── Physics body pools ────────────────────────────────────────────────────────
const COIN_RADIUS      = 6;
const COIN_SHAPE_RATIO = 1.0;
const MAX_COINS        = 45;   // keep body count low for performance
const TALER_TEMPLATE   = drawTaler(COIN_RADIUS, COIN_SHAPE_RATIO);
const SVG_NS           = 'http://www.w3.org/2000/svg';

const coinList       = [];  // { body, element, merging? }
const nuggetList        = [];  // { body, element, merging? }
const barrenList       = [];  // { body, element, merging? }
const medalList      = [];  // { body, element, merging? }
const blackMedalList = [];  // { body, element }
const satoshiList    = [];  // { body, element, merging? }

const spawnCoin = (opts = {}) => {
  if (coinList.length >= MAX_COINS) return null;
  let x, y, vx, vy, omega;
  if (opts.fromDoor) {
    // Buy: upper-left interior, rightward arc
    const angle = -Math.PI * 0.85 + Math.random() * 0.35;
    const r = CHAMBER.r * (0.15 + Math.random() * 0.40);
    x = CHAMBER.cx + r * Math.cos(angle); y = CHAMBER.cy + r * Math.sin(angle);
    vx = 0.9 + Math.random() * 1.1; vy = 0.4 + Math.random() * 0.5;
    omega = 0.08 + Math.random() * 0.10;
  } else {
    // Default: upper half of chamber, falls straight down
    const angle = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI * 0.5;
    const r = CHAMBER.r * (0.10 + Math.random() * 0.48);
    x = CHAMBER.cx + r * Math.cos(angle); y = CHAMBER.cy + r * Math.sin(angle);
    vx = (Math.random() - 0.5) * 0.8; vy = 0.5 + Math.random() * 0.5;
    omega = (Math.random() - 0.5) * 0.08;
  }
  const body = Bodies.circle(x, y, COIN_RADIUS, { restitution: 0.07, friction: 0.70, frictionAir: 0.032, density: DENSITY_TALER });
  Body.setVelocity(body, { x: vx, y: vy });
  Body.setAngle(body, Math.random() * Math.PI * 2);
  Body.setAngularVelocity(body, omega);
  const g = document.createElementNS(SVG_NS, 'g');
  g.setAttribute('class', 'coin');
  g.innerHTML = TALER_TEMPLATE;
  coinGroup.appendChild(g);
  const coin = { body, element: g };
  coinList.push(coin);
  World.add(physWorld, body);
  return coin;
};

const removeCoin = () => {
  const c = coinList.pop();
  if (!c) return;
  World.remove(physWorld, c.body);
  c.element.remove();
};

const spawnNugget = (x, y) => {
  const body = Bodies.circle(x, y, NUGGET_R, {
    density: DENSITY_NUGGET,
    restitution: 0.05,
    friction: 0.92,
    frictionAir: 0.16,
  });
  Body.setVelocity(body, { x: (Math.random() - 0.5) * 0.6, y: 0.4 });
  Body.setInertia(body, Infinity); // nuggets keep their drawn orientation (variety from 5 variants, not rotation)
  const g = document.createElementNS(SVG_NS, 'g');
  g.setAttribute('class', 'nugget');
  g.innerHTML = pickNuggetTemplate();
  barGroup.appendChild(g);
  const nugget = { body, element: g };
  nuggetList.push(nugget);
  World.add(physWorld, body);
  return nugget;
};

const spawnBarren = (x, y) => {
  const body = Bodies.rectangle(x, y, BARREN_W, BARREN_H, {
    density: DENSITY_BARREN,
    restitution: 0.0,
    friction: 0.95,
    frictionAir: 0.18,
  });
  Body.setVelocity(body, { x: (Math.random() - 0.5) * 0.8, y: 0.5 });
  Body.setAngle(body, (Math.random() - 0.5) * 0.08);
  const g = document.createElementNS(SVG_NS, 'g');
  g.setAttribute('class', 'barren');
  g.innerHTML = BARREN_TEMPLATE;
  barGroup.insertBefore(g, barGroup.firstChild); // render behind nuggets/medals
  const barren = { body, element: g };
  barrenList.push(barren);
  World.add(physWorld, body);
  return barren;
};

const clearBarrens = () => {
  while (barrenList.length) { const b = barrenList.pop(); World.remove(physWorld, b.body); b.element.remove(); }
};

const spawnMedal = (x, y) => {
  const body = Bodies.circle(x, y, MEDAL_R, {
    density: DENSITY_MEDAL,
    restitution: 0.0,
    friction: 0.95,
    frictionAir: 0.14,
  });
  Body.setVelocity(body, { x: 0, y: 0.3 });
  Body.setInertia(body, Infinity);  // doesn't spin
  const g = document.createElementNS(SVG_NS, 'g');
  g.setAttribute('class', 'medal');
  g.innerHTML = MEDAL_TEMPLATE;
  barGroup.appendChild(g);  // render behind coins
  const medal = { body, element: g };
  medalList.push(medal);
  World.add(physWorld, body);
  return medal;
};

const spawnBlack = (x, y) => {
  const body = Bodies.circle(x, y, BLACK_R, {
    density: DENSITY_BLACK,
    restitution: 0.0,
    friction: 0.95,
    frictionAir: 0.16,
  });
  Body.setVelocity(body, { x: 0, y: 0.3 });
  Body.setInertia(body, Infinity);
  const g = document.createElementNS(SVG_NS, 'g');
  g.setAttribute('class', 'black-medal');
  g.innerHTML = BLACK_TEMPLATE;
  barGroup.insertBefore(g, barGroup.firstChild);  // render behind bars + orange medals
  const medal = { body, element: g };
  blackMedalList.push(medal);
  World.add(physWorld, body);
  return medal;
};

const clearNuggets = () => {
  while (nuggetList.length) { const b = nuggetList.pop(); World.remove(physWorld, b.body); b.element.remove(); }
};
const clearMedals = () => {
  while (medalList.length) { const m = medalList.pop(); World.remove(physWorld, m.body); m.element.remove(); }
};
const clearBlacks = () => {
  while (blackMedalList.length) { const m = blackMedalList.pop(); World.remove(physWorld, m.body); m.element.remove(); }
};
const spawnSatoshi = (opts = {}) => {
  if (satoshiList.length >= MAX_SATOSHIS) return null;
  let x, y, vx, vy;
  if (opts.fromDoor) {
    const angle = -Math.PI * 0.85 + Math.random() * 0.35;
    const r = CHAMBER.r * (0.10 + Math.random() * 0.38);
    x = CHAMBER.cx + r * Math.cos(angle); y = CHAMBER.cy + r * Math.sin(angle);
    vx = 0.7 + Math.random() * 0.9; vy = 0.3 + Math.random() * 0.4;
  } else {
    const angle = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI * 0.5;
    const r = CHAMBER.r * (0.10 + Math.random() * 0.45);
    x = CHAMBER.cx + r * Math.cos(angle); y = CHAMBER.cy + r * Math.sin(angle);
    vx = (Math.random() - 0.5) * 0.6; vy = 0.4 + Math.random() * 0.4;
  }
  const body = Bodies.circle(x, y, SATOSHI_R, { restitution: 0.14, friction: 0.60, frictionAir: 0.022, density: DENSITY_SAT });
  Body.setVelocity(body, { x: vx, y: vy });
  const g = document.createElementNS(SVG_NS, 'g');
  g.setAttribute('class', 'satoshi');
  g.innerHTML = SATOSHI_TEMPLATE;
  coinGroup.appendChild(g);
  const s = { body, element: g };
  satoshiList.push(s);
  World.add(physWorld, body);
  return s;
};
const clearSatoshis = () => {
  while (satoshiList.length) { const s = satoshiList.pop(); World.remove(physWorld, s.body); s.element.remove(); }
};
const clearWealth = () => { clearBlacks(); clearMedals(); clearBarrens(); clearNuggets(); clearSatoshis(); };

// ── Spawn queues ──────────────────────────────────────────────────────────────
let pendingSpawns           = 0;
let pendingBuySpawns        = 0;
let pendingRemovals         = 0;
let pendingNuggetSpawns        = 0;
let pendingBarrenSpawns       = 0;
let pendingMedalSpawns      = 0;
let pendingBlackSpawns      = 0;
let pendingSatoshiSpawns    = 0;
let pendingSatoshiBuySpawns = 0;
const SPAWN_PER_FRAME     = 2;
const BUY_SPAWN_PER_FRAME = 2;
const REMOVE_PER_FRAME    = 8;

const stateCap = (count) => {
  if (count <= 30)    return count;
  if (count <= 200)   return Math.min(count, 30);
  if (count <= 2000)  return Math.min(count, 45);
  if (count <= 20000) return 55;
  return MAX_COINS;
};

const setCoinTarget = (target) => {
  const cap   = Math.min(stateCap(Math.max(0, target)), MAX_COINS);
  const delta = cap - coinList.length;
  if (delta > 0)      { pendingSpawns   = delta;  pendingRemovals = 0; }
  else if (delta < 0) { pendingRemovals = -delta; pendingSpawns   = 0; }
};

// ── Merge system ──────────────────────────────────────────────────────────────
// Value-preserving cascade, each step ×10:
//   20 satoshis → 1 Taler        (sub-coin merge)
//   10 Talers   → 1 Goldnugget   (only when pile reaches MERGE_TRIGGER_Y)
//   10 Nuggets  → 1 Goldbarren
//   10 Barren   → 1 orange medal (1 BTC)
//   10 medals   → 1 black medal  (10 BTC)
// One animation at a time, gated by `mergeCooldown` to keep the rhythm calm.

const MERGE_TRIGGER_Y       = CHAMBER.cy + CHAMBER.r * 0.30;  // ≈ y 142 — easier than the old "tall pile" line
const MERGE_DURATION_MS     = 260;
const MERGE_COOLDOWN_FRAMES = 20;

let coinMergeInProgress    = false;
let nuggetMergeInProgress     = false;
let barrenMergeInProgress    = false;
let blackMergeInProgress   = false;
let satoshiMergeInProgress = false;
let mergeCooldown          = MERGE_COOLDOWN_FRAMES;

const flashAt = (x, y, r0 = 16, color = '#FFE6A0') => {
  const c = document.createElementNS(SVG_NS, 'circle');
  c.setAttribute('cx', x.toFixed(1)); c.setAttribute('cy', y.toFixed(1));
  c.setAttribute('r', r0); c.setAttribute('fill', color); c.setAttribute('opacity', '0.92');
  c.style.pointerEvents = 'none';
  coinGroup.appendChild(c);
  const t0 = performance.now();
  const fade = (now) => {
    const t = Math.min((now - t0) / 340, 1);
    c.setAttribute('opacity', (0.92 * (1 - t)).toFixed(2));
    c.setAttribute('r', (r0 + t * r0 * 0.9).toFixed(1));
    if (t < 1) requestAnimationFrame(fade); else c.remove();
  };
  requestAnimationFrame(fade);
};

// Generic implosion: animate `items` (each with .element + .mergeOrigin) toward (cx,cy),
// call onDone when complete.
const implode = (items, cx, cy, onDone) => {
  const t0 = performance.now();
  const animate = (now) => {
    const raw = Math.min((now - t0) / MERGE_DURATION_MS, 1);
    const t   = raw * raw * (3 - 2 * raw);
    for (const item of items) {
      const x = item.mergeOrigin.x + (cx - item.mergeOrigin.x) * t;
      const y = item.mergeOrigin.y + (cy - item.mergeOrigin.y) * t;
      item.element.setAttribute('transform', `translate(${x.toFixed(2)} ${y.toFixed(2)}) scale(${Math.max(0, 1 - t).toFixed(3)})`);
    }
    if (raw < 1) requestAnimationFrame(animate);
    else onDone();
  };
  requestAnimationFrame(animate);
};

// Coin → Goldnugget merge (10 Talers × 100k = 1M)
const triggerCoinMerge = (toMerge) => {
  coinMergeInProgress = true;
  mergeCooldown = 0;
  let cx = 0, cy = 0;
  for (const c of toMerge) { cx += c.body.position.x; cy += c.body.position.y; }
  cx /= toMerge.length; cy /= toMerge.length;
  for (const c of toMerge) {
    Body.setStatic(c.body, true);
    c.merging     = true;
    c.mergeOrigin = { x: c.body.position.x, y: c.body.position.y };
  }
  implode(toMerge, cx, cy, () => {
    for (const c of toMerge) {
      const idx = coinList.indexOf(c);
      if (idx !== -1) coinList.splice(idx, 1);
      World.remove(physWorld, c.body);
      c.element.remove();
    }
    flashAt(cx, cy, 16, '#FFE6A0');
    spawnNugget(cx, Math.min(cy - NUGGET_R * 2, CHAMBER.cy - CHAMBER.r * 0.22));
    coinMergeInProgress = false;
    mergeCooldown = MERGE_COOLDOWN_FRAMES;
    // No refill: remaining coin bodies are the correct visual state.
    // Chain: give the new Nugget ~350ms to land, then check if Nugget merge is ready
    setTimeout(() => checkNuggetMergeTrigger(), 350);
  });
};

// Goldnugget → Goldbarren merge (10 Nuggets × 1M = 10M)
const triggerNuggetMerge = (toMerge) => {
  nuggetMergeInProgress = true;
  mergeCooldown = 0;
  let cx = 0, cy = 0;
  for (const b of toMerge) { cx += b.body.position.x; cy += b.body.position.y; }
  cx /= toMerge.length; cy /= toMerge.length;
  for (const b of toMerge) {
    Body.setStatic(b.body, true);
    b.merging     = true;
    b.mergeOrigin = { x: b.body.position.x, y: b.body.position.y };
  }
  implode(toMerge, cx, cy, () => {
    for (const b of toMerge) {
      const idx = nuggetList.indexOf(b);
      if (idx !== -1) nuggetList.splice(idx, 1);
      World.remove(physWorld, b.body);
      b.element.remove();
    }
    flashAt(cx, cy, 22, '#FFE6A0');
    spawnBarren(cx, Math.min(cy - BARREN_H, CHAMBER.cy - CHAMBER.r * 0.18));
    nuggetMergeInProgress = false;
    mergeCooldown = MERGE_COOLDOWN_FRAMES;
    // Chain: more Nuggets → another Barren; then check if Barrens can form a medal
    setTimeout(() => checkNuggetMergeTrigger(),  350);
    setTimeout(() => checkBarrenMergeTrigger(), 700);
  });
};

// Goldbarren → orange medal merge (10 Barren × 10M = 100M = 1 BTC)
const triggerBarrenMerge = (toMerge) => {
  barrenMergeInProgress = true;
  mergeCooldown = 0;
  let cx = 0, cy = 0;
  for (const s of toMerge) { cx += s.body.position.x; cy += s.body.position.y; }
  cx /= toMerge.length; cy /= toMerge.length;
  for (const s of toMerge) {
    Body.setStatic(s.body, true);
    s.merging     = true;
    s.mergeOrigin = { x: s.body.position.x, y: s.body.position.y };
  }
  implode(toMerge, cx, cy, () => {
    for (const s of toMerge) {
      const idx = barrenList.indexOf(s);
      if (idx !== -1) barrenList.splice(idx, 1);
      World.remove(physWorld, s.body);
      s.element.remove();
    }
    flashAt(cx, cy, 28, '#F7931A');
    spawnMedal(cx, CHAMBER.cy + CHAMBER.r * 0.05);
    barrenMergeInProgress = false;
    mergeCooldown = MERGE_COOLDOWN_FRAMES;
    // Chain: more Barrens → another medal; then check if medals can form a black ₿
    setTimeout(() => checkBarrenMergeTrigger(),  350);
    setTimeout(() => checkBlackMergeTrigger(), 700);
  });
};

// Orange medals → black ₿ merge
const triggerBlackMerge = (toMerge) => {
  blackMergeInProgress = true;
  mergeCooldown = 0;
  let cx = 0, cy = 0;
  for (const m of toMerge) { cx += m.body.position.x; cy += m.body.position.y; }
  cx /= toMerge.length; cy /= toMerge.length;
  for (const m of toMerge) {
    Body.setStatic(m.body, true);
    m.merging     = true;
    m.mergeOrigin = { x: m.body.position.x, y: m.body.position.y };
  }
  implode(toMerge, cx, cy, () => {
    for (const m of toMerge) {
      const idx = medalList.indexOf(m);
      if (idx !== -1) medalList.splice(idx, 1);
      World.remove(physWorld, m.body);
      m.element.remove();
    }
    flashAt(cx, cy, 34, '#F5EDD8');
    spawnBlack(cx, CHAMBER.cy + CHAMBER.r * 0.10);
    blackMergeInProgress = false;
    mergeCooldown = MERGE_COOLDOWN_FRAMES;
    // Chain: check if more black medals can form
    setTimeout(() => checkBlackMergeTrigger(), 400);
  });
};

const inProgress = () => coinMergeInProgress || nuggetMergeInProgress || barrenMergeInProgress || blackMergeInProgress || satoshiMergeInProgress;

const checkCoinMergeTrigger = () => {
  if (inProgress()) return;
  mergeCooldown++;
  if (mergeCooldown < MERGE_COOLDOWN_FRAMES) return;
  if (coinList.length < MERGE_COIN_COUNT) return;
  const topY = Math.min(...coinList.map(c => c.body.position.y));
  if (topY > MERGE_TRIGGER_Y) return;
  const eligible = coinList.filter(c => !c.merging);
  if (eligible.length < MERGE_COIN_COUNT) return;
  const toMerge = [...eligible].sort((a, b) => b.body.position.y - a.body.position.y).slice(0, MERGE_COIN_COUNT);
  triggerCoinMerge(toMerge);
};

const checkNuggetMergeTrigger = () => {
  if (inProgress()) return;
  const eligible = nuggetList.filter(b => !b.merging);
  if (eligible.length < NUGGET_PER_BARREN) return;
  triggerNuggetMerge(eligible.slice(0, NUGGET_PER_BARREN));
};

const checkBarrenMergeTrigger = () => {
  if (inProgress()) return;
  const eligible = barrenList.filter(s => !s.merging);
  if (eligible.length < BARREN_PER_MEDAL) return;
  triggerBarrenMerge(eligible.slice(0, BARREN_PER_MEDAL));
};

const checkBlackMergeTrigger = () => {
  if (inProgress()) return;
  const eligible = medalList.filter(m => !m.merging);
  if (eligible.length < MEDALS_PER_BLACK) return;
  triggerBlackMerge(eligible.slice(0, MEDALS_PER_BLACK));
};

// Satoshi → Taler merge: 20 micro-coins implode into one Taler
const triggerSatoshiMerge = (toMerge) => {
  satoshiMergeInProgress = true;
  let cx = 0, cy = 0;
  for (const s of toMerge) { cx += s.body.position.x; cy += s.body.position.y; }
  cx /= toMerge.length; cy /= toMerge.length;
  for (const s of toMerge) {
    Body.setStatic(s.body, true);
    s.merging     = true;
    s.mergeOrigin = { x: s.body.position.x, y: s.body.position.y };
  }
  implode(toMerge, cx, cy, () => {
    for (const s of toMerge) {
      const idx = satoshiList.indexOf(s);
      if (idx !== -1) satoshiList.splice(idx, 1);
      World.remove(physWorld, s.body);
      s.element.remove();
    }
    flashAt(cx, cy, 10, '#F7931A');
    spawnCoin();
    satoshiMergeInProgress = false;
    setTimeout(() => checkCoinMergeTrigger(), 350);
  });
  // Safety reset in case animation callback is never called
  setTimeout(() => { satoshiMergeInProgress = false; }, 2000);
};
const checkSatoshiMergeTrigger = () => {
  if (inProgress()) return;
  const eligible = satoshiList.filter(s => !s.merging);
  if (eligible.length < SATOSHI_MERGE_COUNT) return;
  triggerSatoshiMerge(eligible.slice(0, SATOSHI_MERGE_COUNT));
};

// ── Render loop ───────────────────────────────────────────────────────────────
let lastFrame = performance.now();
const stepPhysics = (now) => {
  const dt = Math.min(16, now - lastFrame); // cap at 1 frame — prevents lag spiral
  lastFrame = now;

  // Only run the pile (physics, spawn drains, transforms, merges) while Bank is the
  // active room. Off Bank the chamber is hidden, so this work is pure overhead — and
  // running it would jank the foundational 460ms CSS room crossfade. Keep the rAF alive
  // so it resumes instantly on return.
  if (phone.dataset.room !== 'bank') { requestAnimationFrame(stepPhysics); return; }

  // Heaviest first (black ₿ → orange medal → Geldsack → Goldbarren → coins)
  if (pendingBlackSpawns > 0) {
    const x = CHAMBER.cx + (Math.random() - 0.5) * 20;
    spawnBlack(x, CHAMBER.cy - CHAMBER.r * 0.50);
    pendingBlackSpawns--;
  }
  if (pendingMedalSpawns > 0) {
    const x = CHAMBER.cx + (Math.random() - 0.5) * 28;
    spawnMedal(x, CHAMBER.cy - CHAMBER.r * 0.55);
    pendingMedalSpawns--;
  }
  let toBarrens = Math.min(2, pendingBarrenSpawns);
  while (toBarrens-- > 0) {
    const x = CHAMBER.cx + (Math.random() - 0.5) * 56;
    spawnBarren(x, CHAMBER.cy - CHAMBER.r * 0.60);
    pendingBarrenSpawns--;
  }
  let toNuggets = Math.min(2, pendingNuggetSpawns);
  while (toNuggets-- > 0) {
    const x = CHAMBER.cx + (Math.random() - 0.5) * 40;
    spawnNugget(x, CHAMBER.cy - CHAMBER.r * 0.65);
    pendingNuggetSpawns--;
  }

  let toBuy = Math.min(BUY_SPAWN_PER_FRAME, pendingBuySpawns);
  while (toBuy-- > 0)    { spawnCoin({ fromDoor: true }); pendingBuySpawns--; }
  let toSpawn = Math.min(SPAWN_PER_FRAME, pendingSpawns);
  while (toSpawn-- > 0)  { spawnCoin(); pendingSpawns--; }
  let toRemove = Math.min(REMOVE_PER_FRAME, pendingRemovals);
  while (toRemove-- > 0) { removeCoin(); pendingRemovals--; }
  let toSatoshiBuy = Math.min(BUY_SPAWN_PER_FRAME, pendingSatoshiBuySpawns);
  while (toSatoshiBuy-- > 0) { spawnSatoshi({ fromDoor: true }); pendingSatoshiBuySpawns--; }
  let toSatoshi = Math.min(SPAWN_PER_FRAME, pendingSatoshiSpawns);
  while (toSatoshi-- > 0)    { spawnSatoshi(); pendingSatoshiSpawns--; }

  // Skip physics step when nothing is moving — saves CPU while vault is idle
  const anyAwake = coinList.some(c => !c.body.isSleeping && !c.merging)
    || nuggetList.some(b  => !b.body.isSleeping && !b.merging)
    || barrenList.some(s => !s.body.isSleeping && !s.merging)
    || medalList.some(m => !m.body.isSleeping && !m.merging)
    || blackMedalList.some(m => !m.body.isSleeping)
    || satoshiList.some(s => !s.body.isSleeping && !s.merging)
    || pendingSpawns > 0 || pendingBuySpawns > 0 || pendingNuggetSpawns > 0
    || pendingBarrenSpawns > 0 || pendingMedalSpawns > 0 || pendingBlackSpawns > 0
    || pendingSatoshiSpawns > 0 || pendingSatoshiBuySpawns > 0 || pendingRemovals > 0;
  if (anyAwake) Engine.update(physEngine, dt);

  for (const c of coinList) {
    if (c.merging || c.body.isSleeping) continue;
    const { x, y } = c.body.position;
    c.element.setAttribute('transform', `translate(${x.toFixed(1)} ${y.toFixed(1)}) rotate(${(c.body.angle * 180 / Math.PI).toFixed(1)})`);
  }
  for (const b of nuggetList) {
    if (b.merging || b.body.isSleeping) continue;
    const { x, y } = b.body.position;
    const deg = Math.max(-15, Math.min(15, b.body.angle * 180 / Math.PI));
    b.element.setAttribute('transform', `translate(${x.toFixed(1)} ${y.toFixed(1)}) rotate(${deg.toFixed(1)})`);
  }
  for (const s of barrenList) {
    if (s.merging || s.body.isSleeping) continue;
    const { x, y } = s.body.position;
    s.element.setAttribute('transform', `translate(${x.toFixed(1)} ${y.toFixed(1)})`);
  }
  for (const m of medalList) {
    if (m.merging || m.body.isSleeping) continue;
    const { x, y } = m.body.position;
    m.element.setAttribute('transform', `translate(${x.toFixed(1)} ${y.toFixed(1)})`);
  }
  for (const bm of blackMedalList) {
    if (bm.merging || bm.body.isSleeping) continue;
    const { x, y } = bm.body.position;
    bm.element.setAttribute('transform', `translate(${x.toFixed(1)} ${y.toFixed(1)})`);
  }
  for (const s of satoshiList) {
    if (s.merging || s.body.isSleeping) continue;
    const { x, y } = s.body.position;
    s.element.setAttribute('transform', `translate(${x.toFixed(1)} ${y.toFixed(1)})`);
  }

  checkCoinMergeTrigger();
  checkSatoshiMergeTrigger();
  // Higher tiers can now be spawned directly by a buy (queueBuyTiers no longer spills down
  // to coins), so consolidate them here too — not only via the coin-merge chain. Each is
  // gated by inProgress() so only one merge animates at a time.
  checkNuggetMergeTrigger();
  checkBarrenMergeTrigger();
  checkBlackMergeTrigger();
  requestAnimationFrame(stepPhysics);
};
requestAnimationFrame(stepPhysics);

// ── Vault content control ─────────────────────────────────────────────────────
const clearAll = () => {
  while (coinList.length) { const c = coinList.pop(); World.remove(physWorld, c.body); c.element.remove(); }
  clearWealth();  // clears bars, sacks, medals, blacks, satoshis
  pendingSpawns = pendingBuySpawns = pendingRemovals = 0;
  pendingNuggetSpawns = pendingBarrenSpawns = pendingMedalSpawns = pendingBlackSpawns = 0;
  pendingSatoshiSpawns = pendingSatoshiBuySpawns = 0;
  coinMergeInProgress    = false;
  nuggetMergeInProgress     = false;
  barrenMergeInProgress    = false;
  blackMergeInProgress   = false;
  satoshiMergeInProgress = false;
  mergeCooldown          = MERGE_COOLDOWN_FRAMES;
};

export const setVaultContent = (content) => {
  if (!['empty', 'stack'].includes(content)) return;
  phone.dataset.vaultContent = content;
  if (content === 'stack') {
    setCoinTarget(talerCount());
  } else {
    setCoinTarget(0);
    clearWealth();
  }
  updateStackValue();
};

// Shared tier-spawn logic. Clears all bodies and queues a fresh canonical
// composition that sums (within the residual <5k sats) to demoSats.
// A respawn IS the canonical state, so any pending snap is satisfied here.
//
// Reads demoSats directly so the sub-taler remainder also gets visualized as
// satoshi pieces — without that, every snap silently dropped up to 95k sats.
const respawnStack = () => {
  needsCanonicalSnap = false;
  clearAll();
  if (demoSats <= 0) { phone.dataset.vaultContent = 'empty'; return; }
  phone.dataset.vaultContent = 'stack';

  let remaining = demoSats;

  // Each tier maxes at 9 (the next would auto-merge to one of the next tier),
  // so canonical never needs more than 9 + 9 + 9 + 9 + 19 + a couple of blacks.
  const physBlacks = Math.min(2, Math.floor(remaining / BLACK_VALUE));
  remaining -= physBlacks * BLACK_VALUE;

  const physMedals = Math.min(9, Math.floor(remaining / MEDAL_VALUE));
  remaining -= physMedals * MEDAL_VALUE;

  const physSacks = Math.min(9, Math.floor(remaining / BARREN_VALUE));
  remaining -= physSacks * BARREN_VALUE;

  const physBars = Math.min(9, Math.floor(remaining / NUGGET_VALUE));
  remaining -= physBars * NUGGET_VALUE;

  const physCoins = Math.min(9, Math.floor(remaining / COIN_VALUE_SATS));
  remaining -= physCoins * COIN_VALUE_SATS;

  const physSatoshis = Math.min(19, Math.floor(remaining / SATOSHI_VALUE_SATS));
  // Residual < SATOSHI_VALUE_SATS (5k sats) is unrepresentable — accepted loss.

  pendingBlackSpawns   = physBlacks;
  pendingMedalSpawns   = physMedals;
  pendingBarrenSpawns    = physSacks;
  pendingNuggetSpawns     = physBars;
  pendingSpawns        = physCoins;
  pendingSatoshiSpawns = physSatoshis;
};

export const setPreviewCoins = (count) => {
  const n = Math.max(0, Math.floor(count));
  demoSats = n * COIN_VALUE_SATS;
  respawnStack();
  updateStackValue();
  previewToggles.forEach((b) => {
    const active = Number(b.dataset.previewCoins) === n;
    b.classList.toggle('is-active', active);
    b.setAttribute('aria-pressed', active ? 'true' : 'false');
  });
};

// Dev-only: spawn a single Satoshi piece (the smallest visible unit, 5.000 sats)
// Wired to a "+1 Sat-Münze" button in the preview tools. Bumps demoSats so
// canonical snap stays in sync.
export const addSatoshiPiece = () => {
  if (phone.dataset.vaultContent === 'empty') phone.dataset.vaultContent = 'stack';
  demoSats += SATOSHI_VALUE_SATS;
  const cap = MAX_SATOSHIS - satoshiList.length - pendingSatoshiBuySpawns;
  if (cap > 0) pendingSatoshiBuySpawns += 1;
  needsCanonicalSnap = true;
  updateStackValue();
};

// Remove sats from the vault and update the visual stack.
// Handles the reverse-split case: medals/Barren/Nuggets split back into the right
// number of smaller units to match the new demoSats.
export const removeDemoSats = (sats) => {
  demoSats = Math.max(0, demoSats - sats);
  respawnStack();
  updateStackValue();
};

// ── Buy + jiggle ──────────────────────────────────────────────────────────────
// Decompose `sats` into the canonical denomination ladder and queue each tier.
// Caps mirror respawnStack so physics body counts stay sane. Used by every buy
// path so a 1-BTC buy queues 1 medal directly, not 1.000 talers (which would
// silently clip at MAX_COINS=45 and merge into a sad pair of Barrens).
const queueBuyTiers = (sats) => {
  let remaining = sats;

  // Top tier can't merge upward, so it stays capped at its visual max (2); any value
  // beyond that decomposes into the tiers below and is corrected by the canonical snap.
  const blackCap = Math.max(0, 2 - blackMedalList.length - pendingBlackSpawns);
  const blacks   = Math.min(blackCap, Math.floor(remaining / BLACK_VALUE));
  pendingBlackSpawns += blacks;
  remaining -= blacks * BLACK_VALUE;

  // Mid tiers: spawn the FULL count and let the live merge system consolidate (10 → next
  // tier). Do NOT cap-and-spill the remainder down into coins — that produced a spurious
  // coins → nugget → bar cascade whenever a tier was already near its merge count.
  const medals = Math.floor(remaining / MEDAL_VALUE);
  pendingMedalSpawns += medals;
  remaining -= medals * MEDAL_VALUE;

  const sacks = Math.floor(remaining / BARREN_VALUE);   // Goldbarren
  pendingBarrenSpawns += sacks;
  remaining -= sacks * BARREN_VALUE;

  const bars = Math.floor(remaining / NUGGET_VALUE);    // Goldnuggets
  pendingNuggetSpawns += bars;
  remaining -= bars * NUGGET_VALUE;

  // Genuine sub-nugget remainder only: coins (< 10) then satoshis (< 20), capped at body limits.
  const coinCap = Math.max(0, MAX_COINS - coinList.length - pendingBuySpawns);
  const coins   = Math.min(coinCap, Math.floor(remaining / COIN_VALUE_SATS));
  pendingBuySpawns += coins;
  remaining -= coins * COIN_VALUE_SATS;

  const satCap   = Math.max(0, MAX_SATOSHIS - satoshiList.length - pendingSatoshiBuySpawns);
  const satCoins = Math.min(satCap, Math.floor(remaining / SATOSHI_VALUE_SATS));
  pendingSatoshiBuySpawns += satCoins;
  // Sub-5k residual lives in demoSats only (sign tells the truth).
};

export const buyCoins = (n = 10) => {
  if (phone.dataset.vaultContent === 'empty') phone.dataset.vaultContent = 'stack';
  demoSats += n * COIN_VALUE_SATS;
  // Stop any preset drip; the buy decomposition drives the visual now
  pendingSpawns = pendingSatoshiSpawns = 0;
  queueBuyTiers(n * COIN_VALUE_SATS);
  needsCanonicalSnap = true;
  updateStackValue();
};

// Visual-only: eject coins from door without changing demoSats (used by Aufladen)
export const ejectCoins = (n) => {
  const cap = MAX_COINS - coinList.length - pendingBuySpawns;
  pendingBuySpawns += Math.max(0, Math.min(n, cap));
  needsCanonicalSnap = true;
};

export const buyEUR = (eur) => {
  const price   = currentPrice ?? 90_000;
  const newSats = Math.round(eur / price * SATS_PER_BTC);
  demoSats     += newSats;
  phone.dataset.vaultContent = 'stack';
  // Stop any preset drip; the buy decomposition drives the visual now
  pendingSpawns = pendingSatoshiSpawns = 0;
  queueBuyTiers(newSats);
  needsCanonicalSnap = true;
  updateStackValue();
};

export const jiggleTopCoins = (count = 5, strength = 0.0014) => {
  if (coinList.length === 0) return;
  const top = [...coinList].sort((a, b) => a.body.position.y - b.body.position.y).slice(0, Math.min(count, coinList.length));
  for (const c of top) Body.applyForce(c.body, c.body.position, { x: (Math.random() - 0.5) * strength * 0.7, y: -strength });
};

// ── Price fetching ────────────────────────────────────────────────────────────
const tick = async () => {
  const p = await fetchPrice();
  if (p == null) return;
  saveCachedPrice(p);
  if (currentPrice == null) { currentPrice = p; setPrice(p); if (!isVaultOpen()) swingIn(); return; }
  if (Math.round(p) !== Math.round(currentPrice)) {
    currentPrice = p;
    if (isVaultOpen()) setPrice(p); else swap(p);
  }
};

// ── Event wiring ──────────────────────────────────────────────────────────────
vaultButton.addEventListener('click', () => { if (isVaultOpen()) closeVault(); else openVault(); });
previewToggles.forEach((b) => b.addEventListener('click', () => setPreviewCoins(Number(b.dataset.previewCoins))));

document.querySelectorAll('[data-buy-talers]').forEach((btn) =>
  btn.addEventListener('click', () => buyCoins(Number(btn.dataset.buyTalers)))
);
document.querySelectorAll('[data-buy-satoshi]').forEach((btn) =>
  btn.addEventListener('click', () => addSatoshiPiece())
);

// ── Mobile vault fit ────────────────────────────────────────────────────────
// The vault is a fixed 354px square; on a phone that's wider than the room and
// taller than the space between the hanging sign and the bottom-pinned buttons.
// Scale it down to the largest size (capped at 1 — never enlarge) that still
// fits the frame, taking whichever of width/height binds. The buttons are
// pinned to the bottom in CSS and the vault may overlap them, so the vault only
// needs to fit between the sign and the room's bottom edge, not above the
// buttons. Desktop (>720px viewport) skips this and keeps the 354px vault.
const VAULT_NATURAL = 354;
const room = phone.querySelector('.room--bank');
const fitVaultScale = () => {
  if (!window.matchMedia('(max-width: 720px)').matches) {
    phone.style.removeProperty('--vault-scale');
    return;
  }
  const roomBox    = room.getBoundingClientRect();
  const signBottom = sign.getBoundingClientRect().bottom;
  const availH = roomBox.bottom - signBottom - 12; // 12px breathing room
  const availW = roomBox.width - 20;               // 10px off each side wall
  const scale  = Math.max(0.55, Math.min(1, availH / VAULT_NATURAL, availW / VAULT_NATURAL));
  phone.style.setProperty('--vault-scale', scale.toFixed(3));
};
fitVaultScale();
window.addEventListener('resize', fitVaultScale);
window.addEventListener('orientationchange', fitVaultScale);

// Boot
const cached = loadCachedPrice();
if (cached != null) { currentPrice = cached; setPrice(cached); swingIn(); }
else { updateStackValue(); }
setOpenActions(false);
setPreviewCoins(talerCount());
tick();
setInterval(tick, PRICE_REFRESH_MS);
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible' && Date.now() - lastFetchAt > 30_000) tick();
});

// ── Exports ───────────────────────────────────────────────────────────────────
export { COIN_VALUE_SATS, SATS_PER_BTC };
export const getPrice    = () => currentPrice;
export const getDemoSats = () => activeSats();
export const addDemoCoins = (n) => { demoSats = Math.max(0, demoSats + Math.floor(n) * COIN_VALUE_SATS); setCoinTarget(talerCount()); };

// Synthetic count-up for the wooden sign during a buy — interpolates from the
// pre-buy total to the new demoSats over ~1.1s. Pile is showering in parallel,
// so the two animations land together. Used by buy.js after a confirm.
export const animateStackCounter = (fromSats, toSats, durationMs = 1100) => {
  const startTime = performance.now();
  const tick = (now) => {
    const t    = Math.min((now - startTime) / durationMs, 1);
    const ease = t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2;
    const sats = Math.round(fromSats + (toSats - fromSats) * ease);
    stackMainEl.textContent = formatMain(sats);
    stackEurEl.textContent  = formatEurValue(sats);
    if (t < 1) requestAnimationFrame(tick); else updateStackValue();
  };
  requestAnimationFrame(tick);
};

export const simulatePriceUpdate = (delta = 137) => {
  const hadPrice  = currentPrice != null;
  const nextPrice = hadPrice ? currentPrice + delta : 87456 + delta;
  currentPrice    = nextPrice;
  if (isVaultOpen()) { setPrice(nextPrice); return; }
  if (hadPrice) swap(nextPrice); else { setPrice(nextPrice); swingIn(); }
};
