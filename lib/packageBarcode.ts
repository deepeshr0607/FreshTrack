/** Retail GTIN only: preserve leading zeroes and reject QR payloads/invalid check digits. */
// @ts-expect-error Node tests need the explicit extension; Metro also resolves it.
import { packageBarcode } from '../backend/src/contracts/barcode.ts';
export { packageBarcode };

/** Synchronous latch closes before React renders, including bursts of native events. */
export function createBarcodeLatch() {
  let armed = false;
  return {
    arm() { armed = true; },
    stop() { armed = false; },
    accept(value: string) {
      if (!armed) return null;
      const code = packageBarcode(value);
      if (code) armed = false;
      return code;
    },
  };
}
