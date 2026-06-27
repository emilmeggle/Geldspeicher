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
import { setRoom } from './rooms.js?v=2';
import './bildung.js?v=2';
import './buy.js?v=2';
import './sell.js?v=2';
import './bargeld.js?v=2';

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
