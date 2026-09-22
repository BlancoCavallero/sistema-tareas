import { error, fail } from '@sveltejs/kit';
import type { Actions } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { today, type RecurrenceMode, type RecurrenceType } from '$lib/domain/recurrence';
import {
	completeTask,
	createTask,
	deleteTask,
	historyForTasks,
	listTasks,
	materializeStale,
	uncompleteTask,
	updateTask,
	type D1TaskStore
} from '$lib/server/tasks/repository';

/**
 * Tasks page (module root).
 *
 * load: bounded page read; stale `++` occurrences are materialized in place
 * (idempotent writes during GET, <= 1 UPDATE per stale task — no cron, per
 * design); the completion log for the page arrives in ONE IN query.
 *
 * Actions: create / edit / delete / complete / uncomplete, all driven from the
 * components with `use:enhance`.
 */

/**
 * Resolve the D1 binding structurally (D1Database is not a resolvable global in
 * the app tsconfig; the repository store type is its structural subset).
 */
function db(event: { platform?: App.Platform | null }): D1TaskStore {
	const database = event.platform?.env?.DB;
	if (!database) {
		throw error(500, 'Base de datos no disponible.');
	}
	return database;
}

function taskId(form: FormData): number | null {
	const raw = form.get('id');
	const id = Number(raw);
	return raw !== null && Number.isInteger(id) && id > 0 ? id : null;
}

interface ParsedRecurrence {
	type: RecurrenceType;
	dow: number | null;
	dom: number | null;
	mode: RecurrenceMode;
	anchor: string | null;
}

/** Parse the recurrence group of the create form; null when absent or invalid. */
function parseRecurrence(form: FormData): ParsedRecurrence | null {
	const rawType = String(form.get('recurrence_type') ?? '');
	if (!rawType || rawType === 'none') return null;
	if (rawType !== 'daily' && rawType !== 'weekly' && rawType !== 'monthly') return null;

	let dow: number | null = null;
	let dom: number | null = null;
	if (rawType === 'weekly') {
		const rawDow = Number(form.get('recurrence_dow'));
		if (!Number.isInteger(rawDow) || rawDow < 1 || rawDow > 7) return null;
		dow = rawDow;
	}
	if (rawType === 'monthly') {
		const rawDom = Number(form.get('recurrence_dom'));
		if (!Number.isInteger(rawDom) || rawDom < 1 || rawDom > 31) return null;
		dom = rawDom;
	}

	const rawMode = String(form.get('recurrence_mode') ?? '++');
	if (rawMode !== '++' && rawMode !== '.+') return null;

	const rawAnchor = form.get('recurrence_anchor');
	const anchor = typeof rawAnchor === 'string' && rawAnchor ? rawAnchor : null;
	return { type: rawType, dow, dom, mode: rawMode, anchor };
}

export const load: PageServerLoad = async (event) => {
	const database = db(event);
	const todayStr = today();
	const tasks = await listTasks(database);
	// Materialize stale ++ occurrences on the fetched page (bounded, idempotent).
	await materializeStale(database, tasks, todayStr);
	const history = await historyForTasks(
		database,
		tasks.map((task) => task.id)
	);
	return { tasks, history, today: todayStr };
};

export const actions: Actions = {
	/** Create a task: title required, optional recurrence. */
	async create(event) {
		const database = db(event);
		const form = await event.request.formData();
		const title = String(form.get('title') ?? '').trim();
		if (!title) {
			return fail(400, { message: 'El título es obligatorio.' });
		}
		const recurrence = parseRecurrence(form);
		if (String(form.get('recurrence_type') ?? '') !== 'none' && !recurrence) {
			return fail(400, { message: 'La repetición ingresada no es válida.' });
		}
		await createTask(database, {
			title,
			next_due: recurrence?.anchor ?? today(),
			recurrence_type: recurrence?.type ?? null,
			recurrence_dow: recurrence?.dow ?? null,
			recurrence_dom: recurrence?.dom ?? null,
			recurrence_mode: recurrence?.mode ?? '++',
			recurrence_anchor: recurrence?.anchor ?? null
		});
		return { ok: true };
	},

	/** Edit a task title. */
	async edit(event) {
		const database = db(event);
		const form = await event.request.formData();
		const id = taskId(form);
		if (id === null) {
			return fail(400, { message: 'Tarea inválida.' });
		}
		const title = String(form.get('title') ?? '').trim();
		if (!title) {
			return fail(400, { message: 'El título es obligatorio.' });
		}
		await updateTask(database, id, { title });
		return { ok: true, taskId: id };
	},

	/** Delete a task (completions cascade). */
	async delete(event) {
		const database = db(event);
		const form = await event.request.formData();
		const id = taskId(form);
		if (id === null) {
			return fail(400, { message: 'Tarea inválida.' });
		}
		await deleteTask(database, id);
		return { ok: true, taskId: id };
	},

	/** Complete a task: log max(next_due, today) and advance next_due. */
	async complete(event) {
		const database = db(event);
		const form = await event.request.formData();
		const id = taskId(form);
		if (id === null) {
			return fail(400, { message: 'Tarea inválida.' });
		}
		const result = await completeTask(database, id);
		if (!result) {
			return fail(404, { message: 'La tarea no existe.' });
		}
		return { ok: true, taskId: id, occurrence: result.occurrence, done: true };
	},

	/** Uncomplete a task: remove the most recent completion log entry. */
	async uncomplete(event) {
		const database = db(event);
		const form = await event.request.formData();
		const id = taskId(form);
		if (id === null) {
			return fail(400, { message: 'Tarea inválida.' });
		}
		const result = await uncompleteTask(database, id);
		if (!result.removed) {
			return fail(404, { message: 'No hay un completado para deshacer.' });
		}
		return { ok: true, taskId: id };
	}
};
