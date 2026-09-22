import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import TasksTodayCard from './TasksTodayCard.svelte';
import type { TaskWithDone } from '$lib/server/tasks/repository';

function task(partial: Partial<TaskWithDone> = {}): TaskWithDone {
	return {
		id: 1,
		title: 'Estudiar álgebra',
		created_at: '2026-09-01T12:00:00.000Z',
		next_due: '2026-09-22',
		recurrence_type: null,
		recurrence_dow: null,
		recurrence_dom: null,
		recurrence_mode: '++',
		recurrence_anchor: null,
		done: false,
		...partial
	};
}

const TODAY = '2026-09-22';

/**
 * Tareas del día card coverage (design D4; dashboard spec "Tareas del día
 * card"): filters the bounded page to today's not-done tasks in memory, shows
 * title + done state, links "Ver todas" to `/tareas`, renders a Spanish empty
 * state that also links to `/tareas`, and exposes no task actions (read-only).
 */
describe('TasksTodayCard', () => {
	const tasks = [
		task({ id: 1, title: 'Estudiar álgebra' }),
		task({ id: 2, title: 'Leer capítulo 3', done: true }),
		task({ id: 3, title: 'Entregar TP', next_due: '2026-09-25' })
	];

	it("lists only today's not-done tasks with title and pending state", () => {
		render(TasksTodayCard, { props: { tasks, today: TODAY } });
		expect(screen.getByText('Estudiar álgebra')).toBeTruthy();
		expect(screen.queryByText('Leer capítulo 3')).toBeNull(); // done today
		expect(screen.queryByText('Entregar TP')).toBeNull(); // due another day
		expect(screen.getAllByText('Pendiente')).toHaveLength(1);
	});

	it('links "Ver todas" to /tareas', () => {
		render(TasksTodayCard, { props: { tasks, today: TODAY } });
		expect(screen.getByRole('link', { name: 'Ver todas' }).getAttribute('href')).toBe('/tareas');
	});

	it('is a named dashboard region with the Spanish card title', () => {
		render(TasksTodayCard, { props: { tasks, today: TODAY } });
		expect(screen.getByRole('region', { name: 'Tareas del día' })).toBeTruthy();
	});

	it('shows a Spanish empty state linking to /tareas when nothing is due today', () => {
		render(TasksTodayCard, { props: { tasks: [], today: TODAY } });
		expect(screen.getByText(/No hay tareas para hoy/)).toBeTruthy();
		expect(screen.getByRole('link', { name: 'Ver todas las tareas' }).getAttribute('href')).toBe(
			'/tareas'
		);
	});

	it('exposes no task actions (read-only card)', () => {
		render(TasksTodayCard, { props: { tasks, today: TODAY } });
		expect(screen.queryByRole('button')).toBeNull();
	});
});
