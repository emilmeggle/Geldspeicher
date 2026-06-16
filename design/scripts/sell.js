import {
  closeVault,
  removeDemoSats,
  getPrice,
  getDemoSats,
  animateStackCounter,
  SATS_PER_BTC,
} from './bank.js';

const LOADING_MS = 280;
const SETTLE_MS  = 520; // door starts closing 380ms; wait for canonical respawn

const phone        = document.querySelector('.phone');
const sellButton   = document.querySelector('.vault-action--sell');
const scrim        = document.querySelector('.sell-scrim');
const sheet        = document.querySelector('.sell-sheet');
const chips        = [...document.querySelectorAll('.sell-chip')];
const customTrigger = document.getElementById('sellCustomTrigger');
const customInput   = document.getElementById('sellCustomInput');
const maxBtn        = document.getElementById('sellMaxBtn');
const amountDisplay = document.getElementById('sellAmountDisplay');
const amountSats    = document.getElementById('sellAmountSats');
const nextBtn       = document.getElementById('sellNextBtn');
const confirmAmount = document.getElementById('sellConfirmAmount');
const confirmSats   = document.getElementById('sellConfirmSats');
const backBtn       = document.getElementById('sellBackBtn');
const confirmBtn    = document.getElementById('sellConfirmBtn');

let selectedAmount = 100; // EUR
let isMaxSelected  = false;

const formatEur  = (n) => '€' + Math.round(n).toLocaleString('de-DE');
const formatSats = (n) => n.toLocaleString('de-DE') + ' Sats';

const calcSats = (eur) => {
  const price = getPrice();
  if (!price || eur <= 0) return null;
  return Math.round(eur / price * SATS_PER_BTC);
};

const ownedEur = () => {
  const price = getPrice();
  if (!price) return 0;
  return getDemoSats() * price / SATS_PER_BTC;
};

const updateChipAvailability = () => {
  const owned = ownedEur();
  chips.forEach((c) => {
    const amt = Number(c.dataset.amount);
    c.disabled = amt > owned + 0.5; // tiny tolerance for rounding
  });
};

const updateAmountDisplay = () => {
  amountDisplay.textContent = formatEur(selectedAmount);
  const sats = calcSats(selectedAmount);
  amountSats.textContent = sats != null ? '≈ ' + formatSats(sats) : '— Sats';
  const owned = ownedEur();
  nextBtn.disabled = selectedAmount <= 0 || sats == null || selectedAmount > owned + 0.5;
};

const updateConfirmDisplay = () => {
  confirmAmount.textContent = formatEur(selectedAmount);
  const sats = calcSats(selectedAmount);
  confirmSats.textContent = sats != null ? '≈ ' + formatSats(sats) : '— Sats';
};

const selectChip = (amount) => {
  selectedAmount = amount;
  isMaxSelected  = false;
  customInput.classList.remove('is-visible');
  customInput.value = '';
  chips.forEach((c) => c.classList.toggle('is-active', Number(c.dataset.amount) === amount));
  maxBtn.classList.remove('is-active');
  updateAmountDisplay();
};

const selectMax = () => {
  selectedAmount = Math.max(0, Math.floor(ownedEur()));
  isMaxSelected  = true;
  customInput.classList.remove('is-visible');
  customInput.value = '';
  chips.forEach((c) => c.classList.remove('is-active'));
  maxBtn.classList.add('is-active');
  updateAmountDisplay();
};

const openSellSheet = () => {
  // Refresh chip availability + reset to a sensible default that's actually owned
  updateChipAvailability();
  const owned = ownedEur();
  if (owned <= 0) return; // nothing to sell — silently no-op
  // Pick the largest preset that fits, fall back to "Alles" for tiny holdings
  const presets = [250, 100, 50, 20];
  const fit = presets.find((p) => p <= owned);
  if (fit != null) selectChip(fit);
  else selectMax();
  sheet.dataset.step = 'amount';
  scrim.classList.add('is-active');
};

const closeSellSheet = () => {
  sheet.dataset.step = 'none';
  scrim.classList.remove('is-active');
  confirmBtn.disabled = false;
  confirmBtn.textContent = 'Jetzt verkaufen';
};

const toConfirm = () => {
  updateConfirmDisplay();
  sheet.dataset.step = 'confirm';
};

const executeSell = () => {
  const price = getPrice();
  if (!price || selectedAmount <= 0) return;

  const oldSats = getDemoSats();
  // "Alles verkaufen" sells the exact balance — no rounding off the owned amount
  const sellSats = isMaxSelected
    ? oldSats
    : Math.min(oldSats, Math.round(selectedAmount / price * SATS_PER_BTC));
  if (sellSats <= 0) return;
  const newSats = oldSats - sellSats;

  confirmBtn.disabled = true;
  confirmBtn.textContent = '…';

  setTimeout(() => {
    closeSellSheet();
    // Sign animates down from old → new while the canonical pile rebuilds.
    // removeDemoSats clears + respawns canonical, so bars/medals split into
    // the right number of smaller units.
    animateStackCounter(oldSats, newSats, 1100);
    removeDemoSats(sellSats);
    // After the animation lands, close the vault so the user gets the door
    // shutting on the new balance — feels like the sell completed.
    setTimeout(() => closeVault(), 1100 + SETTLE_MS);
  }, LOADING_MS);
};

// ---- Events ---------------------------------------------------------------
sellButton.addEventListener('click', openSellSheet);
scrim.addEventListener('click', closeSellSheet);
chips.forEach((chip) =>
  chip.addEventListener('click', () => {
    if (chip.disabled) return;
    selectChip(Number(chip.dataset.amount));
  })
);
customTrigger.addEventListener('click', () => {
  customInput.classList.add('is-visible');
  chips.forEach((c) => c.classList.remove('is-active'));
  maxBtn.classList.remove('is-active');
  isMaxSelected = false;
  customInput.focus();
  customInput.select();
});
customInput.addEventListener('input', () => {
  const v = parseFloat(customInput.value);
  selectedAmount = isNaN(v) || v <= 0 ? 0 : Math.min(v, 50_000);
  isMaxSelected  = false;
  chips.forEach((c) => c.classList.remove('is-active'));
  maxBtn.classList.remove('is-active');
  updateAmountDisplay();
});
maxBtn.addEventListener('click', selectMax);
nextBtn.addEventListener('click', toConfirm);
backBtn.addEventListener('click', () => { sheet.dataset.step = 'amount'; });
confirmBtn.addEventListener('click', executeSell);
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && sheet.dataset.step !== 'none') closeSellSheet();
});

// Default chip set on first open via openSellSheet — no boot-time selection needed.
