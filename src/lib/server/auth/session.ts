/**
 * HMAC-signed session cookie.
 *
 * Cookie value: `<base64url(payload)>.<base64url(hmac-sha256(secret, payload))>`
 * Payload: `{ v: 1, ts }` (ts = issued-at Unix seconds). Verification uses
 * `crypto.subtle.verify` (constant-time) on every request. The signing secret
 * comes from a Pages environment variable — never from the repository.
 */
export const SESSION_COOKIE = 'st_session';
export const SESSION_MAX_AGE_SECONDS = 30 * 24 * 60 * 60; // 30 days
const PAYLOAD_VERSION = 1;

interface SessionPayload {
	v: number;
	ts: number;
}

function toBase64Url(bytes: Uint8Array): string {
	let binary = '';
	for (const byte of bytes) binary += String.fromCharCode(byte);
	return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function fromBase64Url(base64url: string): Uint8Array {
	const base64 = base64url.replace(/-/g, '+').replace(/_/g, '/');
	const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=');
	const binary = atob(padded);
	const bytes = new Uint8Array(binary.length);
	for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
	return bytes;
}

async function hmacKey(secret: string): Promise<CryptoKey> {
	return crypto.subtle.importKey(
		'raw',
		new TextEncoder().encode(secret),
		{ name: 'HMAC', hash: 'SHA-256' },
		false,
		['sign', 'verify']
	);
}

async function hmacSign(secret: string, data: string): Promise<string> {
	const signature = await crypto.subtle.sign(
		'HMAC',
		await hmacKey(secret),
		new TextEncoder().encode(data)
	);
	return toBase64Url(new Uint8Array(signature));
}

async function hmacVerify(secret: string, data: string, signatureB64url: string): Promise<boolean> {
	let signature: Uint8Array;
	try {
		signature = fromBase64Url(signatureB64url);
	} catch {
		return false;
	}
	try {
		return await crypto.subtle.verify(
			'HMAC',
			await hmacKey(secret),
			signature as BufferSource,
			new TextEncoder().encode(data)
		);
	} catch {
		return false;
	}
}

/** Sign a fresh session cookie value. */
export async function signSession(
	secret: string,
	nowSeconds: number = Math.floor(Date.now() / 1000)
): Promise<string> {
	const payload = JSON.stringify({ v: PAYLOAD_VERSION, ts: nowSeconds } satisfies SessionPayload);
	const payloadB64url = toBase64Url(new TextEncoder().encode(payload));
	const signature = await hmacSign(secret, payloadB64url);
	return `${payloadB64url}.${signature}`;
}

/** Verify a session cookie value. Never throws. */
export async function verifySession(secret: string, cookieValue: string): Promise<boolean> {
	const dot = cookieValue.indexOf('.');
	if (dot <= 0 || dot === cookieValue.length - 1) return false;
	const payloadB64url = cookieValue.slice(0, dot);
	const signature = cookieValue.slice(dot + 1);
	if (!(await hmacVerify(secret, payloadB64url, signature))) return false;
	let payload: SessionPayload;
	try {
		payload = JSON.parse(new TextDecoder().decode(fromBase64Url(payloadB64url)));
	} catch {
		return false;
	}
	return payload?.v === PAYLOAD_VERSION && Number.isFinite(payload?.ts);
}

export interface SessionCookieOptions {
	path: string;
	httpOnly: boolean;
	sameSite: 'lax';
	secure: boolean;
	maxAge: number;
}

/** Cookie options for a live session (30 days). */
export function sessionCookieOptions(secure: boolean): SessionCookieOptions {
	return {
		path: '/',
		httpOnly: true,
		sameSite: 'lax',
		secure,
		maxAge: SESSION_MAX_AGE_SECONDS
	};
}

/** Cookie options that expire the session immediately (logout). */
export function destroySessionCookieOptions(secure: boolean): SessionCookieOptions {
	return {
		path: '/',
		httpOnly: true,
		sameSite: 'lax',
		secure,
		maxAge: 0
	};
}
