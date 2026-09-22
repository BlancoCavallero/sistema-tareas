/// <reference types="@cloudflare/vitest-pool-workers/types" />
import { beforeEach, describe, expect, it } from 'vitest';
import { env } from 'cloudflare:test';
import {
	createObjective,
	deleteObjective,
	getObjective,
	listMonth,
	listObjectives,
	toggleDone,
	updateObjective,
	type CreateObjectiveInput
} from './repository';

/**
 * Integration coverage for the objectives repository against a real local D1
 * (migrations applied by the workers setup file): CRUD round-trip, the
 * stored-state toggle with `completed_at` set/cleared, bounded list reads and
 * the BETWEEN month query with `due_date, id` ordering.
 */

const db = env.DB;

function objectiveInput(partial: Partial<CreateObjectiveInput> = {}): CreateObjectiveInput {
	return {
		title: 'Objetivo de prueba',
		kind: 'other',
		due_date: '2026-09-21',
		...partial
	};
}

beforeEach(async () => {
	// Objectives have no child rows; keep each test independent.
	await db.prepare('DELETE FROM objectives').run();
});

describe('CRUD', () => {
	it('creates, lists, reads, updates and deletes an objective', async () => {
		const created = await createObjective(
			db,
			objectiveInput({ title: 'Parcial de matemática', kind: 'exam', due_date: '2026-09-25' })
		);
		expect(created.id).toBeGreaterThan(0);
		expect(created.title).toBe('Parcial de matemática');
		expect(created.kind).toBe('exam');
		expect(created.due_date).toBe('2026-09-25');
		expect(created.done).toBe(false);
		expect(created.completed_at).toBeNull();

		const list = await listObjectives(db, '2026-09-20');
		expect(list).toHaveLength(1);
		expect(list[0].title).toBe('Parcial de matemática');

		const fetched = await getObjective(db, created.id);
		expect(fetched?.id).toBe(created.id);
		expect(fetched?.kind).toBe('exam');

		await updateObjective(db, created.id, { title: 'Parcial de física', notes: 'Temas 1-5' });
		const updated = await getObjective(db, created.id);
		expect(updated?.title).toBe('Parcial de física');
		expect(updated?.notes).toBe('Temas 1-5');

		await deleteObjective(db, created.id);
		expect(await getObjective(db, created.id)).toBeNull();
		expect(await listObjectives(db, '2026-09-20')).toHaveLength(0);
	});

	it('returns null when reading a missing objective', async () => {
		expect(await getObjective(db, 9999)).toBeNull();
	});
});

describe('manual completion toggle', () => {
	it('marks done with completed_at and unmarks clearing it', async () => {
		const created = await createObjective(
			db,
			objectiveInput({ title: 'Entrega del TP', kind: 'deadline', due_date: '2026-09-30' })
		);

		const marked = await toggleDone(db, created.id, { now: '2026-09-22T12:00:00.000Z' });
		expect(marked).toEqual({ id: created.id, done: true });
		const doneRow = await getObjective(db, created.id);
		expect(doneRow?.done).toBe(true);
		expect(doneRow?.completed_at).toBe('2026-09-22T12:00:00.000Z');

		const unmarked = await toggleDone(db, created.id);
		expect(unmarked).toEqual({ id: created.id, done: false });
		const backRow = await getObjective(db, created.id);
		expect(backRow?.done).toBe(false);
		expect(backRow?.completed_at).toBeNull();
	});

	it('defaults `now` when omitted and keeps flipping from the stored state', async () => {
		const created = await createObjective(db, objectiveInput({ title: 'Coloquio' }));
		await toggleDone(db, created.id, { now: '2026-01-01T00:00:00.000Z' });
		await toggleDone(db, created.id); // no `now` -> unmark, completed_at cleared
		const cleared = await getObjective(db, created.id);
		expect(cleared?.done).toBe(false);
		expect(cleared?.completed_at).toBeNull();

		await toggleDone(db, created.id); // no `now` -> mark with current time
		const marked = await getObjective(db, created.id);
		expect(marked?.done).toBe(true);
		expect(marked?.completed_at).not.toBeNull();
		expect(marked?.completed_at).not.toBe('2026-01-01T00:00:00.000Z');
	});

	it('returns null when toggling a missing objective', async () => {
		expect(await toggleDone(db, 9999)).toBeNull();
	});
});

describe('bounded reads', () => {
	it('bounds listObjectives to LIST_LIMIT', async () => {
		for (let i = 0; i < 30; i++) {
			await createObjective(db, objectiveInput({ title: `Objetivo ${i}`, due_date: '2026-09-01' }));
		}
		expect(await listObjectives(db, '2026-09-15')).toHaveLength(25);
		expect(await listObjectives(db, '2026-09-15', 10)).toHaveLength(10);
	});

	it('excludes done objectives from the list', async () => {
		const done = await createObjective(
			db,
			objectiveInput({ title: 'Hecho', due_date: '2026-09-01' })
		);
		await createObjective(db, objectiveInput({ title: 'Pendiente', due_date: '2026-09-10' }));
		await toggleDone(db, done.id, { now: '2026-09-02T00:00:00.000Z' });

		const list = await listObjectives(db, '2026-09-05');
		expect(list.map((objective) => objective.title)).toEqual(['Pendiente']);
	});

	it('bounds listMonth to MONTH_LIMIT', async () => {
		for (let i = 0; i < 205; i++) {
			await createObjective(db, objectiveInput({ title: `Mes ${i}`, due_date: '2026-10-15' }));
		}
		expect(await listMonth(db, '2026-10-01', '2026-10-31')).toHaveLength(200);
		expect(await listMonth(db, '2026-10-01', '2026-10-31', 50)).toHaveLength(50);
	});
});

describe('month range query', () => {
	it('returns only rows inside the BETWEEN range', async () => {
		await createObjective(db, objectiveInput({ title: 'Antes', due_date: '2026-09-30' }));
		await createObjective(db, objectiveInput({ title: 'Dentro', due_date: '2026-10-15' }));
		await createObjective(db, objectiveInput({ title: 'Después', due_date: '2026-11-01' }));

		const month = await listMonth(db, '2026-10-01', '2026-10-31');
		expect(month.map((objective) => objective.title)).toEqual(['Dentro']);
	});

	it('includes rows on the boundary dates of the range', async () => {
		await createObjective(db, objectiveInput({ title: 'Primer día', due_date: '2026-10-01' }));
		await createObjective(db, objectiveInput({ title: 'Último día', due_date: '2026-10-31' }));

		const month = await listMonth(db, '2026-10-01', '2026-10-31');
		expect(month.map((objective) => objective.title)).toEqual(['Primer día', 'Último día']);
	});
});

describe('ordering', () => {
	it('orders by due_date then id', async () => {
		await createObjective(db, objectiveInput({ title: 'C', due_date: '2026-09-22' }));
		await createObjective(db, objectiveInput({ title: 'A', due_date: '2026-09-20' }));
		await createObjective(db, objectiveInput({ title: 'B', due_date: '2026-09-20' }));

		const list = await listObjectives(db, '2026-09-01');
		expect(list.map((objective) => objective.title)).toEqual(['A', 'B', 'C']);
	});
});
