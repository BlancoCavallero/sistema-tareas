import { redirect } from '@sveltejs/kit';
import type { Handle } from '@sveltejs/kit';
import { SESSION_COOKIE, verifySession } from '$lib/server/auth/session';

const LOGIN_PATH = '/login';

/**
 * Auth gate — runs before any route is served.
 *
 * Fail-closed: every request to a data route (anything other than the login
 * page) must present a valid HMAC-signed session cookie, otherwise the visitor
 * is redirected to the login page and no data is read or written. If the
 * signing secret is unset the gate redirects everything — no session is ever
 * issued.
 */
export const handle: Handle = async ({ event, resolve }) => {
	const { pathname } = event.url;
	const isLoginPage = pathname === LOGIN_PATH || pathname === `${LOGIN_PATH}/`;

	if (!isLoginPage) {
		const secret = event.platform?.env?.SESSION_SECRET;
		if (!secret) {
			throw redirect(303, LOGIN_PATH);
		}
		const cookie = event.cookies.get(SESSION_COOKIE);
		const sessionValid = cookie !== undefined && (await verifySession(secret, cookie));
		if (!sessionValid) {
			throw redirect(303, LOGIN_PATH);
		}
	}

	return resolve(event);
};
