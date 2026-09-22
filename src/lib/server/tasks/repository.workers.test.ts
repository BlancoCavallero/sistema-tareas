/// <reference types="@cloudflare/vitest-pool-workers/types" />
import { beforeEach, describe, expect, it } from 'vitest';
import { env } from 'cloudflare:test';
import {
	completeTask,
	createTask,
	deleteTask,
	getTask,
	history,
	historyForTasks,
	listTasks,
	materializeStale,
	uncompleteTask,
	updateTask,
	type CreateTaskInput
} from './repository';

/**
 * Integration coverage for the tasks repository (design 5.4) against a real
 * local D1 (migrations applied by the workers setup file): CRUD, completion
 * log + next_due advance, uncomplete, CASCADE cleanup, bounded reads and
 * idempotent load materialization.
 */

const db = env.DB;

function taskInput(partial: Partial<CreateTaskInput> = {}): CreateTaskInput {
	return {
		title: 'Tarea de prueba',
		next_due: '2026-09-21',
		...partial
	};
}

beforeEach(async () => {
	// Tasks cascade to completions; keep each test independent.
	await db.prepare('DELETE FROM tasks').run();
});

describe('CRUD', () => {
	it('creates, lists, reads, updates and deletes a task', async () => {
		const created = await createTask(db, taskInput({ title: 'Estudiar matemática' }));
		expect(created.id).toBeGreaterThan(0);
		expect(created.title).toBe('Estudiar matemática');
		expect(created.next_due).toBe('2026-09-21');
		expect(created.recurrence_mode).toBe('++');

		const list = await listTasks(db);
		expect(list).toHaveLength(1);
		expect(list[0].title).toBe('Estudiar matemática');
		expect(list[0].done).toBe(false);

		const fetched = await getTask(db, created.id);
		expect(fetched?.id).toBe(created.id);

		await updateTask(db, created.id, { title: 'Estudiar física' });
		expect((await getTask(db, created.id))?.title).toBe('Estudiar física');

		await deleteTask(db, created.id);
		expect(await getTask(db, created.id)).toBeNull();
		expect(await listTasks(db)).toHaveLength(0);
	});

	it('orders the list by next occurrence', async () => {
		await createTask(db, taskInput({ title: 'A', next_due: '2026-09-25' }));
		await createTask(db, taskInput({ title: 'B', next_due: '2026-09-20' }));
		await createTask(db, taskInput({ title: 'C', next_due: '2026-09-22' }));
		const list = await listTasks(db);
		expect(list.map((task) => task.title)).toEqual(['B', 'C', 'A']);
	});
});

describe('completion log and recurrence advance', () => {
	it('logs the completion and advances next_due for a daily task', async () => {
		const task = await createTask(
			db,
			taskInput({
				title: 'Daily',
				next_due: '2026-09-21',
				recurrence_type: 'daily',
				recurrence_mode: '++'
			})
		);
		const result = await completeTask(db, task.id, { today: '2026-09-21' });
		expect(result?.occurrence).toBe('2026-09-21');
		expect(result?.nextDue).toBe('2026-09-22');
		expect(result?.recurring).toBe(true);

		expect(await history(db, task.id)).toEqual([
			expect.objectContaining({ task_id: task.id, occurrence_date: '2026-09-21' })
		]);
		// The list join shows the NEW occurrence as pending, not done.
		const list = await listTasks(db);
		expect(list[0].done).toBe(false);
		expect(list[0].next_due).toBe('2026-09-22');
	});

	it('skips missed occurrences when completing late (++ semantics)', async () => {
		const task = await createTask(
			db,
			taskInput({
				title: 'Tarde',
				next_due: '2026-09-19',
				recurrence_type: 'daily',
				recurrence_mode: '++'
			})
		);
		const result = await completeTask(db, task.id, { today: '2026-09-22' });
		expect(result?.occurrence).toBe('2026-09-22'); // logged for today
		expect(result?.nextDue).toBe('2026-09-23'); // missed days skipped
	});

	it('keeps a non-recurring task done after completion (cursor unchanged)', async () => {
		const task = await createTask(db, taskInput({ title: 'Una vez' }));
		await completeTask(db, task.id, { today: '2026-09-21' });
		const list = await listTasks(db);
		expect(list[0].done).toBe(true);
		expect(list[0].next_due).toBe('2026-09-21');
	});

	it('is idempotent: completing the same occurrence logs a single row', async () => {
		const task = await createTask(db, taskInput({ title: 'Repetido' }));
		await completeTask(db, task.id, { today: '2026-09-21' });
		await completeTask(db, task.id, { today: '2026-09-21' });
		expect(await history(db, task.id)).toHaveLength(1);
	});

	it('logs every completion in date order across days', async () => {
		const task = await createTask(
			db,
			taskInput({
				title: 'Serie',
				next_due: '2026-09-21',
				recurrence_type: 'daily',
				recurrence_mode: '++'
			})
		);
		await completeTask(db, task.id, { today: '2026-09-21' });
		await completeTask(db, task.id, { today: '2026-09-22' });
		const rows = await history(db, task.id);
		expect(rows.map((row) => row.occurrence_date)).toEqual(['2026-09-21', '2026-09-22']);
		expect((await historyForTasks(db, [task.id])).map((row) => row.occurrence_date)).toEqual([
			'2026-09-21',
			'2026-09-22'
		]);
	});

	it('uncomplete deletes the most recent log row and un-dones the task', async () => {
		const task = await createTask(db, taskInput({ title: 'Deshacer' }));
		await completeTask(db, task.id, { today: '2026-09-21' });
		expect((await listTasks(db))[0].done).toBe(true);

		const result = await uncompleteTask(db, task.id);
		expect(result).toEqual({ removed: true, occurrence: '2026-09-21' });
		expect((await listTasks(db))[0].done).toBe(false);
		expect(await history(db, task.id)).toHaveLength(0);

		const again = await uncompleteTask(db, task.id);
		expect(again).toEqual({ removed: false });
	});

	it('returns null when completing a missing task', async () => {
		expect(await completeTask(db, 9999, { today: '2026-09-21' })).toBeNull();
	});
});

describe('CASCADE cleanup', () => {
	it('deleting a task removes its completion rows', async () => {
		const task = await createTask(db, taskInput({ title: 'Borrar' }));
		await completeTask(db, task.id, { today: '2026-09-21' });
		expect(await history(db, task.id)).toHaveLength(1);

		await deleteTask(db, task.id);
		expect(await history(db, task.id)).toHaveLength(0);
		expect(await historyForTasks(db, [task.id])).toHaveLength(0);
	});
});

describe('bounded reads and materialization', () => {
	it('bounds the list page to LIMIT', async () => {
		for (let i = 0; i < 30; i++) {
			await createTask(db, taskInput({ title: `Tarea ${i}` }));
		}
		expect(await listTasks(db)).toHaveLength(25);
		expect(await listTasks(db, 10)).toHaveLength(10);
	});

	it('materializes stale ++ tasks on the page, at most once each, idempotently', async () => {
		for (let i = 0; i < 30; i++) {
			await createTask(
				db,
				taskInput({
					title: `Stale ${i}`,
					next_due: '2026-09-01',
					recurrence_type: 'daily',
					recurrence_mode: '++'
				})
			);
		}
		const tasks = await listTasks(db);
		expect(tasks).toHaveLength(25);

		const updated = await materializeStale(db, tasks, '2026-09-23');
		expect(updated).toBe(25); // only the fetched page, <= 1 UPDATE each
		expect(tasks.every((task) => task.next_due === '2026-09-23')).toBe(true);

		// Idempotent: a second pass touches nothing.
		expect(await materializeStale(db, tasks, '2026-09-23')).toBe(0);
	});

	it('materializes weekly and monthly stale slots to the next future date', async () => {
		const weekly = await createTask(
			db,
			taskInput({
				title: 'Semanal',
				next_due: '2026-09-14', // Monday
				recurrence_type: 'weekly',
				recurrence_dow: 1,
				recurrence_mode: '++'
			})
		);
		const monthly = await createTask(
			db,
			taskInput({
				title: 'Mensual',
				next_due: '2026-09-01',
				recurrence_type: 'monthly',
				recurrence_dom: 1,
				recurrence_mode: '++'
			})
		);
		const tasks = await listTasks(db);
		await materializeStale(db, tasks, '2026-09-23'); // Wednesday
		expect((await getTask(db, weekly.id))?.next_due).toBe('2026-09-28'); // next Monday
		expect((await getTask(db, monthly.id))?.next_due).toBe('2026-10-01');
	});

	it('never materializes .+ or non-recurring tasks on load', async () => {
		const relative = await createTask(
			db,
			taskInput({
				title: 'Relativa',
				next_due: '2026-09-01',
				recurrence_type: 'daily',
				recurrence_mode: '.+'
			})
		);
		const oneOff = await createTask(
			db,
			taskInput({ title: 'Suelta', next_due: '2026-09-01' })
		);
		const tasks = await listTasks(db);
		expect(await materializeStale(db, tasks, '2026-09-23')).toBe(0);
		expect((await getTask(db, relative.id))?.next_due).toBe('2026-09-01');
		expect((await getTask(db, oneOff.id))?.next_due).toBe('2026-09-01');
	});

	it('fetches history for a page with a single IN query (no N+1)', async () => {
		const first = await createTask(db, taskInput({ title: 'Uno' }));
		const second = await createTask(db, taskInput({ title: 'Dos' }));
		await completeTask(db, first.id, { today: '2026-09-21' });
		await completeTask(db, second.id, { today: '2026-09-22' });

		const all = await historyForTasks(db, [first.id, second.id]);
		expect(all.map((row) => row.task_id)).toEqual([first.id, second.id]);
		expect(await historyForTasks(db, [])).toEqual([]);
	});
});