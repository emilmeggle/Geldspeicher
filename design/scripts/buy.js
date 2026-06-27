import {
  openVault,
  buyEUR,
  getPrice,
  getDemoSats,
  animateStackCounter,
  SATS_PER_BTC,
} from './bank.js';
const LOADING_MS = 280;        // "…" loading beat before buy fires
const VAULT_SIGN_DELAY_MS = 300; // matches CSS transition-delay for the stack sign
// Focus restore must wait past the CTA swap: on a completed buy the vault-actions
// row is visibility:hidden for the first 300ms of the open choreography (bank.css
// transition-delay), and a hidden element can't take focus.
const CLOSE_FOCUS_MS = 380;

const phone      = document.querySelector('.phone');
const buyButton  = document.querySelector('.buy');
const sendAction = document.querySelector('.vault-action--send');
const scrim     = document.querySelector('.buy-scrim');
const sheet     = document.querySelector('.buy-sheet');
const chips     = [...document.querySelectorAll('.buy-chip')];
const customTrigger  = document.getElementById('buyCustomTrigger');
const customInput    = document.getElementById('buyCustomInput');
const amountDisplay  = document.getElementById('buyAmountDisplay');
const amountSats     = document.getElementById('buyAmountSats');
const nextBtn        = document.getElementById('buyNextBtn');
const confirmAmount  = document.getElementById('buyConfirmAmount');
const confirmSats    = document.getElementById('buyConfirmSats');
const backBtn        = document.getElementById('buyBackBtn');
const confirmBtn     = document.getElementById('buyConfirmBtn');

let selectedAmount = 100; // EUR

const formatEur  = (n) => '€' + Math.round(n).toLocaleString('de-DE');
const formatSats = (n) => n.toLocaleString('de-DE') + ' Sats';

const calcSats = (eur) => {
  const price = getPrice();
  if (!price || eur <= 0) return null;
  return Math.round(eur / price * SATS_PER_BTC);
};

const updateAmountDisplay = () => {
  amountDisplay.textContent = formatEur(selectedAmount);
  const sats = calcSats(selectedAmount);
  amountSats.textContent = sats != null ? '≈ ' + formatSats(sats) : '— Sats';
  nextBtn.disabled = selectedAmount <= 0 || sats == null;
};

const updateConfirmDisplay = () => {
  confirmAmount.textContent = formatEur(selectedAmount);
  const sats = calcSats(selectedAmount);
  confirmSats.textContent = sats != null ? '≈ ' + formatSats(sats) : '— Sats';
};

const selectChip = (amount) => {
  selectedAmount = amount;
  customInput.classList.remove('is-visible');
  customInput.value = '';
  chips.forEach((c) => c.classList.toggle('is-active', Number(c.dataset.amount) === amount));
  updateAmountDisplay();
};

const openBuySheet = () => {
  sheet.dataset.step = 'amount';
  scrim.classList.add('is-active');
  updateAmountDisplay();
};

// After the sheet closes, focus would orphan to <body> (the confirm button is
// hidden with the sheet). Restore it to whatever CTA is now primary: the buy
// button when it's the active control (closed / open-empty vault), otherwise the
// vault Senden action. preventScroll so we never nudge the room track sideways.
const focusPrimaryCTA = () => {
  const target = buyButton.getAttribute('aria-hidden') === 'false' ? buyButton : sendAction;
  target?.focus({ preventScroll: true });
};

const closeBuySheet = () => {
  const wasOpen = sheet.dataset.step !== 'none';
  sheet.dataset.step = 'none';
  scrim.classList.remove('is-active');
  confirmBtn.disabled = false;
  confirmBtn.textContent = 'Jetzt kaufen';
  // Defer past the CTA swap so the now-primary control is visible (focusable)
  // before we target it — covers both the cancel (buy button) and the completed-buy
  // (Senden, which fades in after 300ms) cases.
  if (wasOpen) setTimeout(focusPrimaryCTA, CLOSE_FOCUS_MS);
};

const toConfirm = () => {
  updateConfirmDisplay();
  sheet.dataset.step = 'confirm';
};

const executeBuy = () => {
  const price = getPrice();
  if (!price || selectedAmount <= 0) return;

  const oldSats = getDemoSats();
  const newSats = oldSats + Math.round(selectedAmount / price * SATS_PER_BTC);
  const wasOpen = phone.dataset.mode === 'vault-open';

  confirmBtn.disabled = true;
  confirmBtn.textContent = '…';

  setTimeout(() => {
    closeBuySheet();
    buyEUR(selectedAmount);   // updates demoSats + queues coin/satoshi spawns
    if (!wasOpen) openVault();
    // Sign is the truth — animate it from old → new over the same window the
    // pile is showering in. Final sign matches demoSats; pile undercounts by
    // sub-5k residual (accepted granularity loss).
    const signDelay = wasOpen ? 50 : VAULT_SIGN_DELAY_MS;
    setTimeout(() => animateStackCounter(oldSats, newSats, 1100), signDelay);
  }, LOADING_MS);
};

// ---- Events ---------------------------------------------------------------
buyButton.addEventListener('click', openBuySheet);
scrim.addEventListener('click', closeBuySheet);
chips.forEach((chip) =>
  chip.addEventListener('click', () => selectChip(Number(chip.dataset.amount)))
);
customTrigger.addEventListener('click', () => {
  customInput.classList.add('is-visible');
  chips.forEach((c) => c.classList.remove('is-active'));
  customInput.focus();
  customInput.select();
});
customInput.addEventListener('input', () => {
  const v = parseFloat(customInput.value);
  selectedAmount = isNaN(v) || v <= 0 ? 0 : Math.min(v, 50_000);
  chips.forEach((c) => c.classList.remove('is-active'));
  updateAmountDisplay();
});
nextBtn.addEventListener('click', toConfirm);
backBtn.addEventListener('click', () => { sheet.dataset.step = 'amount'; });
confirmBtn.addEventListener('click', executeBuy);
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && sheet.dataset.step !== 'none') closeBuySheet();
});

// Default chip
selectChip(100);
