/**
 * PBKDF2 password hashing and verification (WebCrypto).
 *
 * Hash format: `pbkdf2$sha256$<iterations>$<salt-b64>$<hash-b64>`
 *
 * Iteration count: 15,000 — below the OWASP minimum (recorded tradeoff, see
 * design "Decision: PBKDF2 iteration tradeoff"). Mitigations: the hash runs
 * once per login only, plus login rate limiting (5 attempts / 15 min / IP).
 * The spec allows 10,000–25,000; out-of-range hashes are rejected defensively.
 */
export const HASH_PREFIX = 'pbkdf2$sha256$';
export const DEFAULT_ITERATIONS = 15_000;
export const MIN_ITERATIONS = 10_000;
export const MAX_ITERATIONS = 25_000;
export const KEY_LENGTH_BYTES = 32;
const SALT_LENGTH_BYTES = 16;

function bytesToBase64(bytes: Uint8Array): string {
	let binary = '';
	for (const byte of bytes) binary += String.fromCharCode(byte);
	return btoa(binary);
}

function base64ToBytes(base64: string): Uint8Array {
	const binary = atob(base64);
	const bytes = new Uint8Array(binary.length);
	for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
	return bytes;
}

async function deriveKey(
	password: string,
	salt: Uint8Array,
	iterations: number
): Promise<Uint8Array> {
	const encoder = new TextEncoder();
	const keyMaterial = await crypto.subtle.importKey(
		'raw',
		encoder.encode(password),
		'PBKDF2',
		false,
		['deriveBits']
	);
	const bits = await crypto.subtle.deriveBits(
		{ name: 'PBKDF2', salt: salt as BufferSource, iterations, hash: 'SHA-256' },
		keyMaterial,
		KEY_LENGTH_BYTES * 8
	);
	return new Uint8Array(bits);
}

/** Constant-time comparison: every byte is inspected, no early exit. */
function constantTimeEqual(a: Uint8Array, b: Uint8Array): boolean {
	if (a.length !== b.length) return false;
	let diff = 0;
	for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
	return diff === 0;
}

/** Hash a password into the `pbkdf2$sha256$...` format. */
export async function hashPassword(
	password: string,
	iterations: number = DEFAULT_ITERATIONS
): Promise<string> {
	const salt = crypto.getRandomValues(new Uint8Array(SALT_LENGTH_BYTES));
	const key = await deriveKey(password, salt, iterations);
	return `${HASH_PREFIX}${iterations}$${bytesToBase64(salt)}$${bytesToBase64(key)}`;
}

/** Verify a password against a stored `pbkdf2$sha256$...` hash. Never throws. */
export async function verifyPassword(password: string, encoded: string): Promise<boolean> {
	const parts = encoded.split('$');
	if (parts.length !== 5) return false;
	const [algorithm, digest, iterationsRaw, saltB64, hashB64] = parts;
	if (algorithm !== 'pbkdf2' || digest !== 'sha256') return false;
	const iterations = Number(iterationsRaw);
	if (!Number.isInteger(iterations) || iterations < MIN_ITERATIONS || iterations > MAX_ITERATIONS) {
		return false;
	}
	let salt: Uint8Array;
	let expected: Uint8Array;
	try {
		salt = base64ToBytes(saltB64);
		expected = base64ToBytes(hashB64);
	} catch {
		return false;
	}
	if (expected.length !== KEY_LENGTH_BYTES) return false;
	const actual = await deriveKey(password, salt, iterations);
	return constantTimeEqual(actual, expected);
}
