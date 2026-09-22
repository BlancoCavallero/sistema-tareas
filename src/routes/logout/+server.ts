import { redirect } from '@sveltejs/kit';
import type { RequestEvent } from '@sveltejs/kit';
import { SESSION_COOKIE, destroySessionCookieOptions } from '$lib/server/auth/session';

/** POST /logout — destroy the session cookie and return to the login page. */
export function POST(event: RequestEvent) {
	event.cookies.delete(
		SESSION_COOKIE,
		destroySessionCookieOptions(event.url.protocol === 'https:')
	);
	throw redirect(303, '/login');
}
