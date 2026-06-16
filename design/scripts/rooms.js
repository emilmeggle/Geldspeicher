import { closeVault } from './bank.js';

const phone = document.querySelector('.phone');
const switcherButtons = [...document.querySelectorAll('.room-switcher__btn')];
const isVaultOpen = () => phone.dataset.mode === 'vault-open';

export const setRoom = (room) => {
  if (!['bildung', 'bank', 'bargeld'].includes(room)) return;
  if (room === phone.dataset.room) return;
  // Leaving Bank closes the vault — door shuts behind you.
  if (room !== 'bank' && isVaultOpen()) closeVault();
  phone.dataset.room = room;
  switcherButtons.forEach((btn) => {
    const active = btn.dataset.room === room;
    if (active) btn.setAttribute('aria-current', 'page');
    else btn.removeAttribute('aria-current');
  });
};

switcherButtons.forEach((btn) => {
  btn.addEventListener('click', () => setRoom(btn.dataset.room));
});
