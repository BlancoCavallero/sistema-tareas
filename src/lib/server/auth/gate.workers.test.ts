/// <reference types="@cloudflare/vitest-pool-workers/types" />
import { beforeEach, describe, expect, it } from 'vitest';
import { env } from 'cloudflare:test';
import type { RequestEvent } from '@sveltejs/kit';
import { handle } from '../../../hooks.server';
import { actions } from '../../../routes/login/+page.server';
import { SESSION_COOKIE, signSession } from './session';
import { hashPassword } from './password';

/**
 * Integration coverage for the auth gate (design 5.5), against a real local D1
 * (migrations applied by the workers setup file): fail-closed gate, cookie
 * tampering, missing secret, and login ok/wrong/rate-limited.
 */

interface CookieJar {
	values: Map<string, string>;
	get(name: string): string | undefined;
	set(name: string, value: string): void;
	delete(name: string): void;
}

function makeCookieJar(initial?: string): CookieJar {
	const values = new Map<string, string>();
	if (initial !== undefined) values.set(SESSION_COOKIE, initial);
	return {
		values,
		get(name: string) {
			return values.get(name);
		},
		set(name: string, value: string) {
			values.set(name, value);
		},
		delete(name: string) {
			values.delete(name);
		}
	};
}

interface MakeEventOptions {
	pathname?: string;
	cookie?: string;
	envOverrides?: Record<string, unknown>;
	method?: string;
	body?: BodyInit | null;
}

function makeEvent({
	pathname = '/',
	cookie,
	envOverrides = {},
	method = 'GET',
	body = null
}: MakeEventOptions = {}): { event: RequestEvent; cookies: CookieJar } {
	const url = new URL(`http://localhost${pathname}`);
	const request = new Request(url, { method, body });
	const cookies = makeCookieJar(cookie);
	const event = {
		request,
		url,
		params: {},
		locals: {},
		platform: {
			env: { DB: env.DB, SESSION_SECRET: 'secret-for-tests', ...envOverrides }
		},
		cookies,
		clientAddress: '127.0.0.1',
		getClientAddress: () => '127.0.0.1',
		fetch: () => Promise.resolve(new Response())
	} as unknown as RequestEvent;
	return { event, cookies };
}

async function expectRedirect(run: () => unknown, location: string): Promise<void> {
	try {
		await run();
	} catch (error) {
		const e = error as { status?: number; location?: string };
		expect(e.status).toBe(303);
		expect(e.location).toBe(location);
		return;
	}
	expect.unreachable('expected a redirect to be thrown');
}

const resolve = async () => new Response('ok');

beforeEach(async () => {
	// rate-limit rows persist across tests in the same file's isolated D1;
	// keep each test independent.
	await env.DB.prepare('DELETE FROM login_attempts').run();
});

describe('auth gate (hooks.server.ts)', () => {
	it('redirects an unauthenticated visitor and serves no data', async () => {
		const { event } = makeEvent({ pathname: '/' });
		let resolved = false;
		await expectRedirect(
			() => handle({ event, resolve: () => ((resolved = true), Promise.resolve(new Response())) }),
			'/login'
		);
		expect(resolved).toBe(false);
	});

	it('lets an authenticated visitor through', async () => {
		const token = await signSession('secret-for-tests', 1_700_000_000);
		const { event } = makeEvent({ pathname: '/', cookie: token });
		const response = await handle({ event, resolve });
		expect(await response.text()).toBe('ok');
	});

	it('rejects a tampered cookie (valid payload, bad signature)', async () => {
		const token = await signSession('secret-for-tests', 1_700_000_000);
		const [payloadB64url] = token.split('.');
		const tampered = `${payloadB64url}.AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA`;
		const { event } = makeEvent({ pathname: '/', cookie: tampered });
		await expectRedirect(() => handle({ event, resolve }), '/login');
	});

	it('rejects a cookie signed with a different secret', async () => {
		const token = await signSession('another-secret', 1_700_000_000);
		const { event } = makeEvent({ pathname: '/', cookie: token });
		await expectRedirect(() => handle({ event, resolve }), '/login');
	});

	it('fails closed when the signing secret is missing', async () => {
		const { event } = makeEvent({ pathname: '/', envOverrides: { SESSION_SECRET: undefined } });
		await expectRedirect(() => handle({ event, resolve }), '/login');
	});

	it('exempts the login page from the gate', async () => {
		const { event } = makeEvent({ pathname: '/login' });
		const response = await handle({ event, resolve });
		expect(await response.text()).toBe('ok');
	});
});

describe('login action', () => {
	it('rejects a wrong password with a generic error and no cookie', async () => {
		const hash = await hashPassword('la-clave-correcta');
		const { event, cookies } = makeEvent({
			pathname: '/login',
			method: 'POST',
			envOverrides: { SESSION_SECRET: 'secret-for-tests', PASSWORD_HASH: hash },
			body: loginBody('la-clave-incorrecta')
		});
		const result = (await actions.login(event)) as { status: number; data: { message: string } };
		expect(result.status).toBe(401);
		expect(result.data.message).toBeTruthy();
		expect(cookies.values.has(SESSION_COOKIE)).toBe(false);
	});

	it('issues a session cookie and redirects on the correct password', async () => {
		const hash = await hashPassword('la-clave-correcta');
		const { event, cookies } = makeEvent({
			pathname: '/login',
			method: 'POST',
			envOverrides: { SESSION_SECRET: 'secret-for-tests', PASSWORD_HASH: hash },
			body: loginBody('la-clave-correcta')
		});
		await expectRedirect(() => actions.login(event), '/');
		expect(cookies.values.has(SESSION_COOKIE)).toBe(true);
	});

	it('fails closed with a generic error when secrets are unset', async () => {
		const { event, cookies } = makeEvent({
			pathname: '/login',
			method: 'POST',
			envOverrides: { SESSION_SECRET: undefined, PASSWORD_HASH: undefined },
			body: loginBody('cualquiera')
		});
		const result = (await actions.login(event)) as { status: number };
		expect(result.status).toBe(500);
		expect(cookies.values.has(SESSION_COOKIE)).toBe(false);
	});

	it('blocks the 6th attempt within the window (5/15min/IP)', async () => {
		const hash = await hashPassword('la-clave-correcta');
		const attempt = (password: string) =>
			actions.login(
				makeEvent({
					pathname: '/login',
					method: 'POST',
					envOverrides: { SESSION_SECRET: 'secret-for-tests', PASSWORD_HASH: hash },
					body: loginBody(password)
				}).event
			);

		for (let i = 0; i < 5; i++) {
			const result = (await attempt('incorrecta')) as { status: number };
			expect(result.status).toBe(401);
		}
		const sixth = (await attempt('la-clave-correcta')) as { status: number };
		expect(sixth.status).toBe(429);
	});
});

function loginBody(password: string): FormData {
	const form = new FormData();
	form.set('password', password);
	return form;
}
