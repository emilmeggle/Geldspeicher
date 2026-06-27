import {
  openVault,
  closeVault,
  setVaultContent,
  setPreviewCoins,
  buyCoins,
  addSatoshiPiece,
  jiggleTopCoins,
  simulatePriceUpdate,
} from './bank.js';
import { setRoom } from './rooms.js';
import './bildung.js';
import './buy.js';
import './sell.js';
import './bargeld.js';

// Devtools convenience: poke these from the console
Object.assign(window, {
  openVault,
  closeVault,
  setVaultContent,
  setPreviewCoins,
  buyCoins,
  addSatoshiPiece,
  jiggleTopCoins,
  simulatePriceUpdate,
  setRoom,
});
