import { describe, expect, it } from 'vitest';
import {
	RATE_LIMIT_MAX_ATTEMPTS,
	RATE_LIMIT_WINDOW_MS,
	attemptCountToBlocked,
	checkLoginRateLimit,
	countRecentAttempts,
	pruneOldAttempts,
	recordAttempt,
	type RateLimitStore,
	windowStartIso
} from './rate-limit';

/**
 * In-memory fake of the D1-backed store that mirrors the SQL window filter:
 * only rows with attempted_at >= the bound window start count for the IP.
 */
class FakeStore implements RateLimitStore {
	rows: { ip: string; attempted_at: string }[] = [];

	prepare(sql: string) {
		return {
			bind: (...values: unknown[]) => ({
				first: async <T = Record<string, unknown>>() => {
					if (sql.includes('COUNT(*)')) {
						const [ip, since] = values as [string, string];
						const n = this.rows.filter((r) => r.ip === ip && r.attempted_at >= since).length;
						return { n } as T;
					}
					return null as T;
				},
				run: async () => {
					if (sql.trimStart().startsWith('INSERT')) {
						const [ip, at] = values as [string, string];
						this.rows.push({ ip, attempted_at: at });
					} else if (sql.trimStart().startsWith('DELETE')) {
						const [since] = values as [string];
						this.rows = this.rows.filter((r) => r.attempted_at >= since);
					}
					return { success: true };
				}
			})
		};
	}
}

const NOW = Date.parse('2026-09-21T12:00:00.000Z');

describe('window helpers', () => {
	it('windowStartIso is exactly one window behind now', () => {
		expect(Date.parse(windowStartIso(NOW))).toBe(NOW - RATE_LIMIT_WINDOW_MS);
	});

	it('attemptCountToBlocked blocks at the configured limit', () => {
		expect(attemptCountToBlocked(0)).toBe(false);
		expect(attemptCountToBlocked(RATE_LIMIT_MAX_ATTEMPTS - 1)).toBe(false);
		expect(attemptCountToBlocked(RATE_LIMIT_MAX_ATTEMPTS)).toBe(true);
		expect(attemptCountToBlocked(RATE_LIMIT_MAX_ATTEMPTS + 1)).toBe(true);
	});
});

describe('D1-backed rate limiting (fake store)', () => {
	it('allows attempts up to the limit and blocks the next one', async () => {
		const store = new FakeStore();
		// Mirror the login flow: check the limit first, record only on attempt.
		for (let i = 0; i < RATE_LIMIT_MAX_ATTEMPTS; i++) {
			const { blocked } = await checkLoginRateLimit(store, '1.2.3.4', NOW + i * 1000);
			expect(blocked).toBe(false);
			await recordAttempt(store, '1.2.3.4', NOW + i * 1000);
		}
		const sixth = await checkLoginRateLimit(store, '1.2.3.4', NOW + RATE_LIMIT_MAX_ATTEMPTS * 1000);
		expect(sixth.blocked).toBe(true);
		expect(sixth.remaining).toBe(0);
	});

	it('counts only attempts inside the window', async () => {
		const store = new FakeStore();
		// two attempts 20 minutes ago (outside), one now (inside)
		await recordAttempt(store, '9.9.9.9', NOW - 20 * 60 * 1000);
		await recordAttempt(store, '9.9.9.9', NOW - 20 * 60 * 1000 + 1);
		await recordAttempt(store, '9.9.9.9', NOW);
		await expect(countRecentAttempts(store, '9.9.9.9', NOW)).resolves.toBe(1);
	});

	it('scopes counts per IP', async () => {
		const store = new FakeStore();
		await recordAttempt(store, '5.5.5.5', NOW);
		await recordAttempt(store, '5.5.5.5', NOW);
		await recordAttempt(store, '6.6.6.6', NOW);
		await expect(countRecentAttempts(store, '5.5.5.5', NOW)).resolves.toBe(2);
		await expect(countRecentAttempts(store, '6.6.6.6', NOW)).resolves.toBe(1);
	});

	it('prunes old attempts so the table stays bounded', async () => {
		const store = new FakeStore();
		await recordAttempt(store, '7.7.7.7', NOW - 60 * 60 * 1000);
		await recordAttempt(store, '7.7.7.7', NOW);
		await pruneOldAttempts(store, NOW);
		await expect(countRecentAttempts(store, '7.7.7.7', NOW)).resolves.toBe(1);
	});

	it('reports remaining attempts before blocking', async () => {
		const store = new FakeStore();
		await recordAttempt(store, '8.8.8.8', NOW);
		const { blocked, remaining } = await checkLoginRateLimit(store, '8.8.8.8', NOW);
		expect(blocked).toBe(false);
		expect(remaining).toBe(RATE_LIMIT_MAX_ATTEMPTS - 1);
	});
});
