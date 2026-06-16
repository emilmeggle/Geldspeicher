import { getPrice, getDemoSats, removeDemoSats } from './bank.js';

const NS = 'http://www.w3.org/2000/svg';
const SATS_PER_BTC = 100_000_000;

const phone    = document.querySelector('.phone');
const eurEl    = document.getElementById('bargeldEur');
const numberEl = document.getElementById('bargeldNumber');

let bargeldSats = 0;
let animating   = false;

const fmtInt = (n) => n.toLocaleString('de-DE');
const fmtEur = (sats, price) =>
  (price * sats / SATS_PER_BTC).toLocaleString('de-DE', {
    minimumFractionDigits: 2, maximumFractionDigits: 2
  }) + ' €';

const update = () => {
  const price = getPrice();
  numberEl.textContent = fmtInt(bargeldSats) + ' Sats';
  eurEl.textContent    = price != null ? fmtEur(bargeldSats, price) : '0,00 €';
};

new MutationObserver(() => {
  if (phone.dataset.room === 'bargeld') update();
}).observe(phone, { attributes: true, attributeFilter: ['data-room'] });

update();

// ─── Empty vault nudge ───
const showEmptyNudge = () => {
  const nudge = document.createElement('div');
  Object.assign(nudge.style, {
    position:      'absolute',
    bottom:        '160px',
    left:          '50%',
    transform:     'translateX(-50%) translateY(10px) scale(0.9)',
    background:    '#1A2028',
    color:         '#F5EDD8',
    border:        '2.5px solid #1A2028',
    borderRadius:  '999px',
    padding:       '12px 26px',
    fontSize:      '14px',
    fontWeight:    '900',
    fontFamily:    "'Comic Sans MS','Marker Felt',system-ui,sans-serif",
    whiteSpace:    'nowrap',
    pointerEvents: 'none',
    zIndex:        '400',
    boxShadow:     '0 4px 0 rgba(0,0,0,0.45)',
    opacity:       '0',
    transition:    'opacity 200ms ease, transform 220ms cubic-bezier(.34,1.56,.64,1)',
  });
  nudge.textContent = 'Tresor leer — erst kaufen!';
  phone.appendChild(nudge);

  requestAnimationFrame(() => requestAnimationFrame(() => {
    nudge.style.opacity   = '1';
    nudge.style.transform = 'translateX(-50%) translateY(0px) scale(1)';
  }));
  setTimeout(() => {
    nudge.style.opacity   = '0';
    nudge.style.transform = 'translateX(-50%) translateY(-8px) scale(0.95)';
    setTimeout(() => nudge.remove(), 220);
  }, 2500);
};

// ─── Impact burst: orange ring + gold spokes ───
const impactBurst = (x, y) => {
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('viewBox', '-50 -50 100 100');
  Object.assign(svg.style, {
    position:      'absolute',
    left:          `${x - 50}px`,
    top:           `${y - 50}px`,
    width:         '100px',
    height:        '100px',
    pointerEvents: 'none',
    zIndex:        '302',
    overflow:      'visible',
  });

  const ring = document.createElementNS(NS, 'circle');
  ring.setAttribute('cx', '0'); ring.setAttribute('cy', '0'); ring.setAttribute('r', '10');
  ring.setAttribute('fill', 'none');
  ring.setAttribute('stroke', '#F7931A');
  ring.setAttribute('stroke-width', '4.5');
  svg.appendChild(ring);

  for (let i = 0; i < 8; i++) {
    const a    = (i * 45) * Math.PI / 180;
    const line = document.createElementNS(NS, 'line');
    line.setAttribute('x1', `${Math.cos(a) * 13}`);
    line.setAttribute('y1', `${Math.sin(a) * 13}`);
    line.setAttribute('x2', `${Math.cos(a) * 26}`);
    line.setAttribute('y2', `${Math.sin(a) * 26}`);
    line.setAttribute('stroke', '#F8C247');
    line.setAttribute('stroke-width', '2.5');
    line.setAttribute('stroke-linecap', 'round');
    svg.appendChild(line);
  }

  phone.appendChild(svg);
  svg.animate([
    { transform: 'scale(0.25)', opacity: 1, offset: 0   },
    { transform: 'scale(1.3)',  opacity: 1, offset: 0.5 },
    { transform: 'scale(2.2)', opacity: 0, offset: 1   },
  ], { duration: 420, easing: 'ease-out', fill: 'forwards' })
  .finished.then(() => svg.remove());
};

// ─── Balance smash ───
const smashBalance = () => {
  [numberEl, eurEl].forEach((el, i) => {
    el.animate([
      { transform: 'scale(1)',    offset: 0    },
      { transform: 'scale(1.65)', offset: 0.18 },
      { transform: 'scale(0.88)', offset: 0.55 },
      { transform: 'scale(1.06)', offset: 0.76 },
      { transform: 'scale(1)',    offset: 1    },
    ], { duration: 520, delay: i * 55, easing: 'cubic-bezier(.34,1.56,.64,1)' });
  });
};

// ─── Coin flight: left edge → balance ───
// onImpact fires when the last coin reaches the target (update data + visual smash).
// onArrival fires after all coin pop-animations finish (cleanup only).
const animateCoinFlight = (onImpact, onArrival) => {
  const phoneRect  = phone.getBoundingClientRect();
  const targetRect = eurEl.getBoundingClientRect();
  const targetX    = targetRect.left - phoneRect.left + targetRect.width  / 2;
  const targetY    = targetRect.top  - phoneRect.top  + targetRect.height / 2;

  const SIZE      = 30;
  const COUNT     = 2;
  const TOTAL_MS  = 920;
  const LAND_FRAC = 0.70;
  let   done      = 0;

  for (let i = 0; i < COUNT; i++) {
    const startY = phoneRect.height * 0.44 + (i === 0 ? -13 : 15);
    const delay  = i * 130;

    const svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('viewBox', '-14 -14 28 28');
    Object.assign(svg.style, {
      position:      'absolute',
      left:          '0px',
      top:           `${startY - SIZE / 2}px`,
      width:         `${SIZE}px`,
      height:        `${SIZE}px`,
      pointerEvents: 'none',
      zIndex:        '300',
      overflow:      'visible',
    });

    const g = document.createElementNS(NS, 'g');
    g.innerHTML = [
      '<circle cx="1.4" cy="1.4" r="13" fill="#1A2028" opacity="0.40"/>',
      '<circle cx="0" cy="0" r="13" fill="#F8C247" stroke="#1A2028" stroke-width="2.5"/>',
      '<ellipse cx="-4" cy="-5" rx="4.5" ry="2.8" fill="#FFFFFF" opacity="0.50"/>',
      '<ellipse cx="-5.5" cy="-5.8" rx="1.8" ry="1.1" fill="#FFFFFF" opacity="0.80"/>',
      '<text x="0.5" y="5" text-anchor="middle" font-size="12" fill="#1A2028"',
      ' font-weight="900" font-family="Georgia,serif">₿</text>',
    ].join('');
    svg.appendChild(g);
    phone.appendChild(svg);

    // SVG left edge is at phone x=0; coin center starts at x=SIZE/2.
    // Subtract SIZE/2 so translate lands the center exactly on targetX.
    const dx = targetX - SIZE / 2;
    const dy = targetY - startY;

    if (i === COUNT - 1) {
      setTimeout(() => {
        impactBurst(targetX, targetY);
        onImpact();
      }, delay + TOTAL_MS * LAND_FRAC);
    }

    svg.animate([
      { transform: `translate(-${SIZE + 8}px, 0px) rotate(0deg) scale(0.70)`,                    opacity: 1, offset: 0         },
      { transform: `translate(${dx * 0.43}px, ${dy * 0.26 - 56}px) rotate(225deg) scale(1.40)`, opacity: 1, offset: 0.40      },
      { transform: `translate(${dx}px, ${dy}px) rotate(420deg) scale(0.90)`,                     opacity: 1, offset: LAND_FRAC },
      { transform: `translate(${dx}px, ${dy}px) rotate(432deg) scale(1.60)`,                     opacity: 1, offset: 0.84      },
      { transform: `translate(${dx}px, ${dy}px) rotate(432deg) scale(0)`,                        opacity: 0, offset: 1         },
    ], { duration: TOTAL_MS, delay, easing: 'cubic-bezier(.22,.9,.28,1)', fill: 'forwards' })
    .finished.then(() => {
      svg.remove();
      if (++done === COUNT) onArrival();
    });
  }
};

// ─── Sheet helpers ───

const scrim         = document.getElementById('bargeldScrim');
const sendSheet     = document.getElementById('bargeldSendSheet');
const recvSheet     = document.getElementById('bargeldReceiveSheet');
const aufladenSheet = document.getElementById('bargeldAufladenSheet');

const openSheet = (sheet) => { sheet.classList.add('is-active'); scrim.classList.add('is-active'); };
const closeAll  = () => {
  [sendSheet, recvSheet, aufladenSheet].forEach(s => s.classList.remove('is-active'));
  scrim.classList.remove('is-active');
  sendSheet.dataset.step = '1';
};

document.getElementById('bargeldReceiveBtn').addEventListener('click',  () => openSheet(recvSheet));
document.getElementById('bargeldSendBtn').addEventListener('click',     () => { if (!animating) openSheet(sendSheet); });
document.getElementById('bargeldAufladenClose').addEventListener('click', closeAll);
document.getElementById('bargeldSendClose').addEventListener('click',    closeAll);
document.getElementById('bargeldReceiveClose').addEventListener('click', closeAll);
scrim.addEventListener('click', closeAll);

// ─── Send: two-step ───

document.getElementById('bargeldSendNextBtn').addEventListener('click', () => {
  sendSheet.dataset.step = '2';
});
document.getElementById('bargeldSendBackBtn').addEventListener('click', () => {
  sendSheet.dataset.step = '1';
});
document.getElementById('bargeldSendConfirmBtn').addEventListener('click', () => {
  bargeldSats = Math.max(0, bargeldSats - 1200);
  update();
  closeAll();
});

// ─── Aufladen: EUR presets + live display ───

const aufladenEurEl  = document.getElementById('aufladenEur');
const aufladenSatsEl = document.getElementById('aufladenSats');
const aufladenCustom = document.getElementById('aufladenCustom');
const aufladenChips  = document.querySelectorAll('.bargeld-aufladen-chip');

let aufladenEurAmount = 10;

const fmtEurFixed = (eur) =>
  eur.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €';

const updateAufladenDisplay = () => {
  const price = getPrice() ?? 90_000;
  const sats  = Math.round(aufladenEurAmount / price * SATS_PER_BTC);
  aufladenEurEl.textContent  = fmtEurFixed(aufladenEurAmount);
  aufladenSatsEl.textContent = '≈ ' + fmtInt(sats) + ' Sats';
};

aufladenChips.forEach(chip => {
  chip.addEventListener('click', () => {
    aufladenChips.forEach(c => c.classList.remove('is-active'));
    chip.classList.add('is-active');
    aufladenCustom.value  = '';
    aufladenEurAmount = parseFloat(chip.dataset.eur);
    updateAufladenDisplay();
  });
});

aufladenCustom.addEventListener('input', () => {
  const val = parseFloat(aufladenCustom.value.replace(',', '.'));
  if (!isNaN(val) && val > 0) {
    aufladenChips.forEach(c => c.classList.remove('is-active'));
    aufladenEurAmount = val;
    updateAufladenDisplay();
  }
});

document.getElementById('bargeldAufladenBtn').addEventListener('click', () => {
  if (!animating) { openSheet(aufladenSheet); updateAufladenDisplay(); }
});

document.getElementById('bargeldAufladenConfirm').addEventListener('click', () => {
  if (animating) return;

  if (getDemoSats() === 0) {
    closeAll();
    showEmptyNudge();
    return;
  }

  const price   = getPrice() ?? 90_000;
  const satsAmt = Math.round(aufladenEurAmount / price * SATS_PER_BTC);

  animating = true;
  closeAll();

  setTimeout(() => {
    animateCoinFlight(
      () => { removeDemoSats(satsAmt); bargeldSats += satsAmt; update(); smashBalance(); },
      () => { animating = false; }
    );
  }, 200);
});

// ─── Kopieren ───

const copyBtn = document.getElementById('bargeldCopyBtn');
copyBtn.addEventListener('click', () => {
  const addr = document.getElementById('bargeldAddress').textContent.trim();
  navigator.clipboard?.writeText(addr).catch(() => {});
  copyBtn.textContent = 'Kopiert!';
  copyBtn.classList.remove('is-copied');
  void copyBtn.offsetWidth;
  copyBtn.classList.add('is-copied');
  setTimeout(() => {
    copyBtn.textContent = 'Kopieren';
    copyBtn.classList.remove('is-copied');
  }, 1800);
});
