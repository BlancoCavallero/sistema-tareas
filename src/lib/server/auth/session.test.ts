import { describe, expect, it } from 'vitest';
import {
	signSession,
	verifySession,
	SESSION_COOKIE,
	SESSION_MAX_AGE_SECONDS,
	sessionCookieOptions,
	destroySessionCookieOptions
} from './session';

const SECRET = 'test-secret-that-is-long-enough-for-hmac';

describe('signSession / verifySession', () => {
	it('signs a value that verifies under the same secret', async () => {
		const token = await signSession(SECRET, 1_700_000_000);
		expect(token).toContain('.');
		await expect(verifySession(SECRET, token)).resolves.toBe(true);
	});

	it('encodes the payload version and timestamp', async () => {
		const token = await signSession(SECRET, 1_700_000_000);
		const [payloadB64url] = token.split('.');
		const payload = JSON.parse(atob(payloadB64url.replace(/-/g, '+').replace(/_/g, '/')));
		expect(payload).toEqual({ v: 1, ts: 1_700_000_000 });
	});

	it('rejects a tampered payload', async () => {
		const token = await signSession(SECRET);
		const [payloadB64url, signature] = token.split('.');
		const payload = JSON.parse(atob(payloadB64url.replace(/-/g, '+').replace(/_/g, '/')));
		payload.ts += 1;
		const tampered = btoa(JSON.stringify(payload))
			.replace(/\+/g, '-')
			.replace(/\//g, '_')
			.replace(/=+$/g, '');
		await expect(verifySession(SECRET, `${tampered}.${signature}`)).resolves.toBe(false);
	});

	it('rejects a tampered signature', async () => {
		const token = await signSession(SECRET);
		const [payloadB64url] = token.split('.');
		const badSignature = 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA';
		await expect(verifySession(SECRET, `${payloadB64url}.${badSignature}`)).resolves.toBe(false);
	});

	it('rejects a token signed with a different secret', async () => {
		const token = await signSession('another-secret');
		await expect(verifySession(SECRET, token)).resolves.toBe(false);
	});

	it('rejects malformed values without throwing', async () => {
		await expect(verifySession(SECRET, '')).resolves.toBe(false);
		await expect(verifySession(SECRET, 'no-dot')).resolves.toBe(false);
		await expect(verifySession(SECRET, '.signature-only')).resolves.toBe(false);
		await expect(verifySession(SECRET, 'payload-only.')).resolves.toBe(false);
		await expect(verifySession(SECRET, '!!!.!!!')).resolves.toBe(false);
	});

	it('rejects a structurally valid token with an unknown payload version', async () => {
		// hand-craft {v: 99, ts: 0} with a valid signature
		const payload = btoa(JSON.stringify({ v: 99, ts: 0 }))
			.replace(/\+/g, '-')
			.replace(/\//g, '_')
			.replace(/=+$/g, '');
		const key = await crypto.subtle.importKey(
			'raw',
			new TextEncoder().encode(SECRET),
			{ name: 'HMAC', hash: 'SHA-256' },
			false,
			['sign']
		);
		const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(payload));
		const signature = btoa(String.fromCharCode(...new Uint8Array(sig)))
			.replace(/\+/g, '-')
			.replace(/\//g, '_')
			.replace(/=+$/g, '');
		await expect(verifySession(SECRET, `${payload}.${signature}`)).resolves.toBe(false);
	});
});

describe('cookie options', () => {
	it('defines the session cookie name and 30-day lifetime', () => {
		expect(SESSION_COOKIE).toBe('st_session');
		expect(SESSION_MAX_AGE_SECONDS).toBe(30 * 24 * 60 * 60);
	});

	it('issues httpOnly lax cookies, secure only on https', () => {
		const prod = sessionCookieOptions(true);
		expect(prod).toMatchObject({
			path: '/',
			httpOnly: true,
			sameSite: 'lax',
			secure: true,
			maxAge: 30 * 24 * 60 * 60
		});
		const dev = sessionCookieOptions(false);
		expect(dev.secure).toBe(false);
	});

	it('destroys the cookie with maxAge 0 on logout', () => {
		expect(destroySessionCookieOptions(true)).toMatchObject({
			path: '/',
			httpOnly: true,
			sameSite: 'lax',
			maxAge: 0
		});
	});
});
