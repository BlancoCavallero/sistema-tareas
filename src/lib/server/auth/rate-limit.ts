/**
 * D1-backed login rate limiter: 5 attempts / 15 minutes / IP.
 *
 * Bounded: at most 3 queries per login attempt (prune, count, insert), and the
 * opportunistic prune keeps the `login_attempts` table from growing forever.
 * The store is a structural subset of D1Database so the real binding can be
 * passed directly and unit tests can inject a fake.
 */
export const RATE_LIMIT_MAX_ATTEMPTS = 5;
export const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes

export interface RateLimitStore {
	prepare(sql: string): {
		bind(...values: unknown[]): {
			first<T = Record<string, unknown>>(colName?: string): Promise<T | null>;
			run(): Promise<{ success: boolean }>;
		};
	};
}

/** ISO-8601 UTC instant marking the start of the rate-limit window. */
export function windowStartIso(nowMs: number): string {
	return new Date(nowMs - RATE_LIMIT_WINDOW_MS).toISOString();
}

/** A count at or above the limit is blocked. */
export function attemptCountToBlocked(count: number): boolean {
	return count >= RATE_LIMIT_MAX_ATTEMPTS;
}

/** Count login attempts for `ip` inside the current window. */
export async function countRecentAttempts(
	store: RateLimitStore,
	ip: string,
	nowMs: number
): Promise<number> {
	const row = await store
		.prepare('SELECT COUNT(*) AS n FROM login_attempts WHERE ip = ? AND attempted_at >= ?')
		.bind(ip, windowStartIso(nowMs))
		.first<{ n: number }>();
	return row?.n ?? 0;
}

/** Record a login attempt for `ip`. */
export async function recordAttempt(
	store: RateLimitStore,
	ip: string,
	nowMs: number
): Promise<void> {
	await store
		.prepare('INSERT INTO login_attempts (ip, attempted_at) VALUES (?, ?)')
		.bind(ip, new Date(nowMs).toISOString())
		.run();
}

/** Opportunistically delete attempts outside the window (bounded table). */
export async function pruneOldAttempts(store: RateLimitStore, nowMs: number): Promise<void> {
	await store
		.prepare('DELETE FROM login_attempts WHERE attempted_at < ?')
		.bind(windowStartIso(nowMs))
		.run();
}

/** Check whether `ip` is currently rate-limited. */
export async function checkLoginRateLimit(
	store: RateLimitStore,
	ip: string,
	nowMs: number
): Promise<{ blocked: boolean; remaining: number }> {
	const count = await countRecentAttempts(store, ip, nowMs);
	return {
		blocked: attemptCountToBlocked(count),
		remaining: Math.max(0, RATE_LIMIT_MAX_ATTEMPTS - count)
	};
}
