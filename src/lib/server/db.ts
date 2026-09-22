import { error } from '@sveltejs/kit';

/**
 * Canonical structural subset of the Workers D1 binding — the real
 * `D1Database` satisfies it directly and tests can inject a fake without
 * importing Workers types into server code. Shared by every repository
 * (tasks keeps its identical `D1TaskStore` for now; objectives uses this one).
 */
export interface D1Store {
	prepare(sql: string): {
		bind(...values: unknown[]): {
			first<T = Record<string, unknown>>(colName?: string): Promise<T | null>;
			all<T = Record<string, unknown>>(): Promise<{ results: T[] }>;
			run(): Promise<{ success: boolean; meta?: { last_row_id?: number } }>;
		};
	};
}

/**
 * Resolve the D1 binding structurally (`D1Database` is not a resolvable global
 * in the app tsconfig; `D1Store` is its structural subset). Throws 500 when
 * the binding is missing so a misconfigured deploy fails loudly.
 */
export function db(event: { platform?: App.Platform | null }): D1Store {
	const database = event.platform?.env?.DB;
	if (!database) {
		throw error(500, 'Base de datos no disponible.');
	}
	return database;
}
