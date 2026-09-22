import { webcrypto } from 'node:crypto';

// jsdom does not implement SubtleCrypto. The auth modules rely on
// `crypto.subtle` (available in workerd / Cloudflare Workers), so polyfill it
// with Node's webcrypto for the jsdom unit tests. Guarded: only assign when
// missing so real implementations are never clobbered.
if (!globalThis.crypto?.subtle) {
	try {
		Object.defineProperty(globalThis, 'crypto', {
			value: webcrypto as unknown as Crypto,
			writable: true,
			configurable: true
		});
	} catch {
		(globalThis as { crypto?: Crypto }).crypto = webcrypto as unknown as Crypto;
	}
}
