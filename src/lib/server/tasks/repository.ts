/**
 * D1 repository for quick tasks.
 *
 * All reads are indexed and bounded so an invocation stays well under the
 * 50-query cap and list views cannot exhaust the daily row-read limits:
 * - listTasks: single LEFT JOIN with LIMIT (no N+1 — `done` comes from the
 *   join, history is fetched once per page with an IN clause).
 * - materializeStale: at most 1 UPDATE per stale `++` task on the fetched page
 *   (worst case 1 SELECT + 25 UPDATEs = 26 queries incl. the list read).
 * - completeTask: SELECT + INSERT (idempotent via the UNIQUE constraint) +
 *   UPDATE next_due = 3 queries.
 */
import {
	advance,
	materialize,
	toRecurrenceRule,
	today,
	type RecurrenceMode,
	type RecurrenceType
} from '$lib/domain/recurrence';

export const LIST_LIMIT = 25;

export interface TaskRow {
	id: number;
	title: string;
	created_at: string; // ISO-8601 UTC
	next_due: string; // YYYY-MM-DD, recurrence cursor
	recurrence_type: RecurrenceType | null;
	recurrence_dow: number | null;
	recurrence_dom: number | null;
	recurrence_mode: RecurrenceMode;
	recurrence_anchor: string | null;
}

export interface TaskWithDone extends TaskRow {
	done: boolean;
}

export interface CompletionRow {
	id: number;
	task_id: number;
	occurrence_date: string;
	completed_at: string;
}

export interface CreateTaskInput {
	title: string;
	next_due: string;
	recurrence_type?: RecurrenceType | null;
	recurrence_dow?: number | null;
	recurrence_dom?: number | null;
	recurrence_mode?: RecurrenceMode;
	recurrence_anchor?: string | null;
	created_at?: string;
}

export interface CompleteResult {
	taskId: number;
	occurrence: string;
	nextDue: string;
	recurring: boolean;
}

export interface UncompleteResult {
	removed: boolean;
	occurrence?: string;
}

/**
 * Structural subset of D1Database — the real binding satisfies it directly and
 * tests can inject it without importing Workers types into the domain.
 */
export interface D1TaskStore {
	prepare(sql: string): {
		bind(...values: unknown[]): {
			first<T = Record<string, unknown>>(colName?: string): Promise<T | null>;
			all<T = Record<string, unknown>>(): Promise<{ results: T[] }>;
			run(): Promise<{ success: boolean; meta?: { last_row_id?: number } }>;
		};
	};
}

function rowToTask(row: Record<string, unknown>): TaskRow {
	return {
		id: Number(row.id),
		title: String(row.title),
		created_at: String(row.created_at),
		next_due: String(row.next_due),
		recurrence_type: (row.recurrence_type as RecurrenceType | null) ?? null,
		recurrence_dow: row.recurrence_dow == null ? null : Number(row.recurrence_dow),
		recurrence_dom: row.recurrence_dom == null ? null : Number(row.recurrence_dom),
		recurrence_mode: (row.recurrence_mode as RecurrenceMode) ?? '++',
		recurrence_anchor: (row.recurrence_anchor as string | null) ?? null
	};
}

function rowToTaskWithDone(row: Record<string, unknown>): TaskWithDone {
	return { ...rowToTask(row), done: Boolean(row.done) };
}

/**
 * Bounded page of tasks with the `done` flag derived from the completions log
 * (single LEFT JOIN, no N+1), ordered by next occurrence.
 */
export async function listTasks(
	store: D1TaskStore,
	limit: number = LIST_LIMIT
): Promise<TaskWithDone[]> {
	const { results } = await store
		.prepare(
			`SELECT t.*, tc.occurrence_date IS NOT NULL AS done
			 FROM tasks t
			 LEFT JOIN task_completions tc
			   ON tc.task_id = t.id AND tc.occurrence_date = t.next_due
			 ORDER BY t.next_due ASC, t.id ASC
			 LIMIT ?`
		)
		.bind(limit)
		.all<Record<string, unknown>>();
	return results.map(rowToTaskWithDone);
}

/** Fetch a single task by id, or null. */
export async function getTask(store: D1TaskStore, id: number): Promise<TaskRow | null> {
	const row = await store
		.prepare('SELECT * FROM tasks WHERE id = ?')
		.bind(id)
		.first<Record<string, unknown>>();
	if (!row) return null;
	return rowToTask(row);
}

/** Create a task and return the persisted row (id from last_row_id). */
export async function createTask(store: D1TaskStore, input: CreateTaskInput): Promise<TaskRow> {
	const {
		title,
		next_due,
		recurrence_type = null,
		recurrence_dow = null,
		recurrence_dom = null,
		recurrence_mode = '++',
		recurrence_anchor = null,
		created_at = new Date().toISOString()
	} = input;
	const result = await store
		.prepare(
			`INSERT INTO tasks
			 (title, created_at, next_due, recurrence_type, recurrence_dow, recurrence_dom, recurrence_mode, recurrence_anchor)
			 VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
		)
		.bind(
			title,
			created_at,
			next_due,
			recurrence_type,
			recurrence_dow,
			recurrence_dom,
			recurrence_mode,
			recurrence_anchor
		)
		.run();
	return {
		id: Number(result.meta?.last_row_id ?? 0),
		title,
		created_at,
		next_due,
		recurrence_type,
		recurrence_dow,
		recurrence_dom,
		recurrence_mode,
		recurrence_anchor
	};
}

/** Update mutable columns of a task (only fields provided). */
export async function updateTask(
	store: D1TaskStore,
	id: number,
	fields: Partial<Pick<TaskRow, 'title' | 'next_due'>>
): Promise<void> {
	const entries = Object.entries(fields).filter(([, value]) => value !== undefined);
	if (entries.length === 0) return;
	const setClause = entries.map(([column]) => `${column} = ?`).join(', ');
	await store
		.prepare(`UPDATE tasks SET ${setClause} WHERE id = ?`)
		.bind(...entries.map(([, value]) => value), id)
		.run();
}

/** Delete a task; `task_completions` rows cascade. */
export async function deleteTask(store: D1TaskStore, id: number): Promise<void> {
	await store.prepare('DELETE FROM tasks WHERE id = ?').bind(id).run();
}

/**
 * Complete a task: log the occurrence (max(next_due, today), idempotent via
 * the UNIQUE(task_id, occurrence_date) constraint) and advance next_due with
 * the recurrence rule. Non-recurring tasks keep their cursor so the list join
 * shows them as done.
 */
export async function completeTask(
	store: D1TaskStore,
	id: number,
	opts: { today?: string; now?: string } = {}
): Promise<CompleteResult | null> {
	const task = await getTask(store, id);
	if (!task) return null;
	const todayStr = opts.today ?? today();
	const occurrence = todayStr > task.next_due ? todayStr : task.next_due;
	await store
		.prepare(
			'INSERT OR IGNORE INTO task_completions (task_id, occurrence_date, completed_at) VALUES (?, ?, ?)'
		)
		.bind(id, occurrence, opts.now ?? new Date().toISOString())
		.run();
	const rule = toRecurrenceRule(task);
	let nextDue = task.next_due;
	if (rule) {
		nextDue = advance(rule, occurrence);
		await updateTask(store, id, { next_due: nextDue });
	}
	return { taskId: id, occurrence, nextDue, recurring: rule !== null };
}

/**
 * Uncomplete a task by deleting its most recent completion log row. Returns
 * whether a row was removed (and which occurrence).
 */
export async function uncompleteTask(store: D1TaskStore, id: number): Promise<UncompleteResult> {
	const latest = await store
		.prepare(
			'SELECT occurrence_date FROM task_completions WHERE task_id = ? ORDER BY occurrence_date DESC LIMIT 1'
		)
		.bind(id)
		.first<{ occurrence_date: string }>();
	if (!latest) return { removed: false };
	await store
		.prepare('DELETE FROM task_completions WHERE task_id = ? AND occurrence_date = ?')
		.bind(id, latest.occurrence_date)
		.run();
	return { removed: true, occurrence: latest.occurrence_date };
}

/** Full completion log of one task in chronological order. */
export async function history(store: D1TaskStore, taskId: number): Promise<CompletionRow[]> {
	const { results } = await store
		.prepare(
			'SELECT id, task_id, occurrence_date, completed_at FROM task_completions WHERE task_id = ? ORDER BY occurrence_date ASC'
		)
		.bind(taskId)
		.all<CompletionRow>();
	return results;
}

/**
 * Completion log for a whole page of tasks — ONE query with an IN clause
 * (bounded by the page limit), never one query per task.
 */
export async function historyForTasks(
	store: D1TaskStore,
	taskIds: number[]
): Promise<CompletionRow[]> {
	if (taskIds.length === 0) return [];
	const placeholders = taskIds.map(() => '?').join(', ');
	const { results } = await store
		.prepare(
			`SELECT id, task_id, occurrence_date, completed_at FROM task_completions
			 WHERE task_id IN (${placeholders})
			 ORDER BY occurrence_date ASC`
		)
		.bind(...taskIds)
		.all<CompletionRow>();
	return results;
}

/**
 * Load-time materialization: advance stale `++` tasks of the fetched page to
 * the next occurrence >= today (idempotent, <= 1 UPDATE per stale task).
 * Mutates the given tasks in place and returns how many were updated. `.+` and
 * non-recurring tasks are never touched here.
 */
export async function materializeStale(
	store: D1TaskStore,
	tasks: TaskWithDone[],
	todayStr: string = today()
): Promise<number> {
	let updated = 0;
	for (const task of tasks) {
		const rule = toRecurrenceRule(task);
		if (!rule || rule.mode !== '++') continue;
		if (task.next_due >= todayStr) continue;
		const next = materialize(rule, task.next_due, todayStr);
		if (next !== task.next_due) {
			await updateTask(store, task.id, { next_due: next });
			task.next_due = next;
			updated++;
		}
	}
	return updated;
}
