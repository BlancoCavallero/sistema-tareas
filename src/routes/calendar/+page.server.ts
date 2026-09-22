import { fail } from '@sveltejs/kit';
import type { Actions } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { isObjectiveKind, monthBounds, today, type ObjectiveKind } from '$lib/domain/objectives';
import { parseDate } from '$lib/domain/recurrence';
import { db } from '$lib/server/db';
import {
	createObjective,
	deleteObjective,
	getObjective,
	listMonth,
	listObjectives,
	toggleDone,
	updateObjective
} from '$lib/server/objectives/repository';

/**
 * Calendar objectives page.
 *
 * load: exactly 2 bounded queries per invocation (design) — the not-done list
 * (LIMIT 25, split into upcoming/overdue/all by later slices) and the month
 * range (LIMIT 200) — both index-backed. `today` comes from the ART `today()`
 * helper (re-exported from the objectives domain, never SQL date functions);
 * `monthKey` resolves `?month=YYYY-MM`, defaulting to the current ART month.
 *
 * Actions: create / edit / delete / toggle, all driven from the components
 * with `use:enhance`, following the tasks-page pattern: FormData validation
 * first, then `fail(400)` with Spanish messages; missing rows fail 404.
 */

const MONTH_KEY_PATTERN = /^(\d{4})-(\d{2})$/;

/** Parse a positive integer objective id from the form, or null. */
function objectiveId(form: FormData): number | null {
	const raw = form.get('id');
	const id = Number(raw);
	return raw !== null && Number.isInteger(id) && id > 0 ? id : null;
}

/** Resolve `?month=YYYY-MM` to a valid month key, defaulting to the current ART month. */
function resolveMonthKey(raw: string | null, todayStr: string): string {
	if (raw) {
		const match = MONTH_KEY_PATTERN.exec(raw);
		if (match) {
			const month = Number(match[2]);
			if (month >= 1 && month <= 12) return raw;
		}
	}
	return todayStr.slice(0, 7);
}

type ObjectiveFields =
	| { ok: true; title: string; kind: ObjectiveKind; due_date: string; notes: string | null }
	| { ok: false; message: string };

/** Parse and validate the objective fields shared by the create and edit actions. */
function parseObjectiveFields(form: FormData): ObjectiveFields {
	const title = String(form.get('title') ?? '').trim();
	if (!title) {
		return { ok: false, message: 'El título es obligatorio.' };
	}

	const rawKind = String(form.get('kind') ?? '');
	if (!isObjectiveKind(rawKind)) {
		return { ok: false, message: 'El tipo no es válido.' };
	}

	const rawDue = String(form.get('due_date') ?? '');
	if (!/^\d{4}-\d{2}-\d{2}$/.test(rawDue)) {
		return { ok: false, message: 'La fecha no es válida.' };
	}
	try {
		parseDate(rawDue);
	} catch {
		return { ok: false, message: 'La fecha no es válida.' };
	}

	const rawNotes = String(form.get('notes') ?? '').trim();
	return { ok: true, title, kind: rawKind, due_date: rawDue, notes: rawNotes || null };
}

export const load: PageServerLoad = async (event) => {
	const database = db(event);
	const todayStr = today();
	const monthKey = resolveMonthKey(event.url.searchParams.get('month'), todayStr);
	const [year, month] = monthKey.split('-').map(Number);
	const { start, end } = monthBounds(year, month);
	const [list, monthObjectives] = await Promise.all([
		listObjectives(database, todayStr),
		listMonth(database, start, end)
	]);
	return { list, month: monthObjectives, today: todayStr, monthKey };
};

export const actions: Actions = {
	/** Create an objective: title required, valid kind and due date, notes optional. */
	async create(event) {
		const database = db(event);
		const form = await event.request.formData();
		const parsed = parseObjectiveFields(form);
		if (!parsed.ok) {
			return fail(400, { message: parsed.message });
		}
		await createObjective(database, {
			title: parsed.title,
			kind: parsed.kind,
			due_date: parsed.due_date,
			notes: parsed.notes
		});
		return { ok: true };
	},

	/** Edit an objective's mutable fields (same validation as create). */
	async edit(event) {
		const database = db(event);
		const form = await event.request.formData();
		const id = objectiveId(form);
		if (id === null) {
			return fail(400, { message: 'Objetivo inválido.' });
		}
		const parsed = parseObjectiveFields(form);
		if (!parsed.ok) {
			return fail(400, { message: parsed.message });
		}
		await updateObjective(database, id, {
			title: parsed.title,
			kind: parsed.kind,
			due_date: parsed.due_date,
			notes: parsed.notes
		});
		return { ok: true, objectiveId: id };
	},

	/** Delete an objective; a missing row fails 404. */
	async delete(event) {
		const database = db(event);
		const form = await event.request.formData();
		const id = objectiveId(form);
		if (id === null) {
			return fail(400, { message: 'Objetivo inválido.' });
		}
		const existing = await getObjective(database, id);
		if (!existing) {
			return fail(404, { message: 'El objetivo no existe.' });
		}
		await deleteObjective(database, id);
		return { ok: true, objectiveId: id };
	},

	/** Toggle done state (idempotent against stored state); a missing row fails 404. */
	async toggle(event) {
		const database = db(event);
		const form = await event.request.formData();
		const id = objectiveId(form);
		if (id === null) {
			return fail(400, { message: 'Objetivo inválido.' });
		}
		const result = await toggleDone(database, id);
		if (!result) {
			return fail(404, { message: 'El objetivo no existe.' });
		}
		return { ok: true, objectiveId: id, done: result.done };
	}
};
