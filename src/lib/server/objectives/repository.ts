/**
 * D1 repository for calendar objectives.
 *
 * All reads are bounded and index-backed (`idx_objectives_due_date`) so one
 * `/calendar` invocation stays at 2 queries: the not-done list (LIMIT 25) and
 * the month range (LIMIT 200). Status (`upcoming`/`overdue`/`done`) is never
 * stored and never computed with SQL date functions — the caller derives it
 * with the pure domain `today()` helper, and `listObjectives` returns the
 * whole not-done page for the caller to split in memory.
 *
 * `toggleDone` is the only write that depends on current state: it SELECTs the
 * stored `done` flag and flips it (2 queries), so marking/unmarking is always
 * defined by the stored state, never by an assumed one.
 */
import type { ObjectiveKind } from '$lib/domain/objectives';
import type { D1Store } from '$lib/server/db';

export const LIST_LIMIT = 25;
export const MONTH_LIMIT = 200;

export interface ObjectiveRow {
	id: number;
	title: string;
	kind: ObjectiveKind;
	due_date: string; // YYYY-MM-DD, ISO-8601 text
	notes: string | null;
	done: boolean; // SQLite INTEGER 0/1 mapped to boolean
	completed_at: string | null; // ISO-8601 UTC, set while done = 1
	created_at: string; // ISO-8601 UTC
}

export interface CreateObjectiveInput {
	title: string;
	kind: ObjectiveKind;
	due_date: string;
	notes?: string | null;
	created_at?: string;
}

/** Map a raw D1 row (INTEGER `done`) to the domain `ObjectiveRow`. */
function rowToObjective(row: Record<string, unknown>): ObjectiveRow {
	return {
		id: Number(row.id),
		title: String(row.title),
		kind: row.kind as ObjectiveKind,
		due_date: String(row.due_date),
		notes: row.notes == null ? null : String(row.notes),
		done: Boolean(row.done),
		completed_at: row.completed_at == null ? null : String(row.completed_at),
		created_at: String(row.created_at)
	};
}

/**
 * Not-done objectives, ordered by due date then id, bounded to `LIST_LIMIT`.
 * `todayStr` is part of the contract so the caller can split the page into
 * upcoming/overdue in memory (design: "1 query split in memory") — a done
 * objective is excluded here because it never reappears in the lists.
 */
export async function listObjectives(
	store: D1Store,
	todayStr: string,
	limit: number = LIST_LIMIT
): Promise<ObjectiveRow[]> {
	const { results } = await store
		.prepare('SELECT * FROM objectives WHERE done = 0 ORDER BY due_date, id LIMIT ?')
		.bind(limit)
		.all<Record<string, unknown>>();
	return results.map(rowToObjective);
}

/**
 * Objectives whose due date falls inside `[start, end]` (a month range),
 * ordered by due date then id and bounded to `MONTH_LIMIT`.
 */
export async function listMonth(
	store: D1Store,
	start: string,
	end: string,
	limit: number = MONTH_LIMIT
): Promise<ObjectiveRow[]> {
	const { results } = await store
		.prepare(
			'SELECT * FROM objectives WHERE due_date BETWEEN ? AND ? ORDER BY due_date, id LIMIT ?'
		)
		.bind(start, end, limit)
		.all<Record<string, unknown>>();
	return results.map(rowToObjective);
}

/** Fetch a single objective by id, or null. */
export async function getObjective(store: D1Store, id: number): Promise<ObjectiveRow | null> {
	const row = await store
		.prepare('SELECT * FROM objectives WHERE id = ?')
		.bind(id)
		.first<Record<string, unknown>>();
	if (!row) return null;
	return rowToObjective(row);
}

/** Create an objective and return the persisted row (id from last_row_id). */
export async function createObjective(
	store: D1Store,
	input: CreateObjectiveInput
): Promise<ObjectiveRow> {
	const { title, kind, due_date, notes = null, created_at = new Date().toISOString() } = input;
	const result = await store
		.prepare(
			'INSERT INTO objectives (title, kind, due_date, notes, done, created_at) VALUES (?, ?, ?, ?, 0, ?)'
		)
		.bind(title, kind, due_date, notes, created_at)
		.run();
	return {
		id: Number(result.meta?.last_row_id ?? 0),
		title,
		kind,
		due_date,
		notes,
		done: false,
		completed_at: null,
		created_at
	};
}

/** Update mutable columns of an objective (only fields provided). */
export async function updateObjective(
	store: D1Store,
	id: number,
	fields: Partial<Pick<ObjectiveRow, 'title' | 'kind' | 'due_date' | 'notes'>>
): Promise<void> {
	const entries = Object.entries(fields).filter(([, value]) => value !== undefined);
	if (entries.length === 0) return;
	const setClause = entries.map(([column]) => `${column} = ?`).join(', ');
	await store
		.prepare(`UPDATE objectives SET ${setClause} WHERE id = ?`)
		.bind(...entries.map(([, value]) => value), id)
		.run();
}

/** Delete an objective; it disappears from every view. */
export async function deleteObjective(store: D1Store, id: number): Promise<void> {
	await store.prepare('DELETE FROM objectives WHERE id = ?').bind(id).run();
}

/**
 * Toggle done state, idempotent against the stored state (2 queries):
 * SELECT the current `done` flag, flip it, and set `completed_at` to `now`
 * when marking done or NULL when unmarking. Returns the new state, or null
 * when the objective does not exist.
 */
export async function toggleDone(
	store: D1Store,
	id: number,
	opts: { now?: string } = {}
): Promise<{ id: number; done: boolean } | null> {
	const row = await store
		.prepare('SELECT done FROM objectives WHERE id = ?')
		.bind(id)
		.first<{ done: number }>();
	if (!row) return null;
	const done = row.done === 0;
	const now = opts.now ?? new Date().toISOString();
	await store
		.prepare('UPDATE objectives SET done = ?, completed_at = ? WHERE id = ?')
		.bind(done ? 1 : 0, done ? now : null, id)
		.run();
	return { id, done };
}
