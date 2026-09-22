import type { PageServerLoad } from './$types';
import { monthBounds, today } from '$lib/domain/objectives';
import { db } from '$lib/server/db';
import { listMonth, listObjectives } from '$lib/server/objectives/repository';
import { listTasks, materializeStale } from '$lib/server/tasks/repository';

/**
 * Home page (module root) — dashboard load contract (design D8 + data flow).
 *
 * load: read-only aggregation consumed by the dashboard cards: the task page
 * (listTasks(25) + idempotent materializeStale, design D4), the current month
 * range (listMonth, <= 200) and the not-done objective page (listObjectives,
 * <= 25), plus `today` for in-memory splits. No actions: all task CRUD lives
 * at /tareas (design D8). Reads are bounded and index-backed; the only write
 * is the existing idempotent materializeStale.
 */

export const load: PageServerLoad = async (event) => {
	const database = db(event);
	const todayStr = today();
	const tasks = await listTasks(database);
	// Materialize stale ++ occurrences on the fetched page (bounded, idempotent).
	await materializeStale(database, tasks, todayStr);
	const [year, month] = todayStr.slice(0, 7).split('-').map(Number);
	const { start, end } = monthBounds(year, month);
	const [monthObjectives, list] = await Promise.all([
		listMonth(database, start, end),
		listObjectives(database, todayStr)
	]);
	return { tasks, month: monthObjectives, list, today: todayStr };
};
