import { fail, redirect } from '@sveltejs/kit';
import type { Actions } from '@sveltejs/kit';
import { verifyPassword } from '$lib/server/auth/password';
import { SESSION_COOKIE, signSession, sessionCookieOptions } from '$lib/server/auth/session';
import {
	checkLoginRateLimit,
	pruneOldAttempts,
	recordAttempt,
	type RateLimitStore
} from '$lib/server/auth/rate-limit';

export const actions: Actions = {
	/**
	 * Login: rate limit -> PBKDF2 verify -> HMAC session cookie -> redirect.
	 * Failures return a generic message and never set a cookie.
	 */
	async login(event) {
		const env = event.platform?.env;
		if (!env?.DB || !env.SESSION_SECRET || !env.PASSWORD_HASH) {
			// Fail closed: secrets unset -> refuse login with a generic error.
			return fail(500, { message: 'Error interno. Intente más tarde.' });
		}

		let ip = 'unknown';
		try {
			ip = event.getClientAddress();
		} catch {
			// Address unavailable (e.g. some proxies) — rate limit under a sentinel.
		}
		const nowMs = Date.now();
		const store: RateLimitStore = env.DB;

		await pruneOldAttempts(store, nowMs);
		const { blocked } = await checkLoginRateLimit(store, ip, nowMs);
		if (blocked) {
			return fail(429, { message: 'Demasiados intentos. Intente más tarde.' });
		}

		const form = await event.request.formData();
		const password = String(form.get('password') ?? '');

		await recordAttempt(store, ip, nowMs);

		const ok = await verifyPassword(password, env.PASSWORD_HASH);
		if (!ok) {
			return fail(401, { message: 'Contraseña incorrecta.' });
		}

		const token = await signSession(env.SESSION_SECRET, Math.floor(nowMs / 1000));
		event.cookies.set(SESSION_COOKIE, token, sessionCookieOptions(event.url.protocol === 'https:'));
		throw redirect(303, '/');
	}
};
