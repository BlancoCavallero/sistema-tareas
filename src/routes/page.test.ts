// Note: SvelteKit reserves files prefixed with `+` inside src/routes (verified:
// the route manifest builder rejects `+page.test.ts` with "Files prefixed with
// + are reserved"). The test therefore lives next to the component without the
// prefix; vitest picks it up via `src/**/*.{test,spec}.{js,ts}`.
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import Page from './+page.svelte';
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

/** Root load contract (design data flow): tasks / month / list / today. */
const dashboardData = {
	tasks: [
		task({ id: 1, title: 'Estudiar álgebra' }),
		task({ id: 2, title: 'Leer capítulo 3', done: true }),
		task({ id: 3, title: 'Entregar TP', next_due: '2026-09-25' })
	],
	month: [],
	list: [],
	today: '2026-09-22'
};

/**
 * `/` is the dashboard (quick-tasks delta: the root no longer hosts the task
 * list; dashboard spec "Dashboard home route" + "Tareas del día card"): the
 * greeting/date header renders, only today's pending tasks appear, the card
 * links to `/tareas`, no task actions exist at the root, and the Spanish
 * document title is set. `month`/`list` are consumed by cards in the next PR
 * slice (3.4–3.8) and are not asserted here yet.
 */
describe('+page.svelte (dashboard)', () => {
	it('renders the Spanish greeting and long date header', () => {
		render(Page, { props: { data: dashboardData } });
		const heading = screen.getByRole('heading', { level: 1 }).textContent;
		expect(['Buenos días', 'Buenas tardes', 'Buenas noches']).toContain(heading);
		expect(screen.getByText('Martes, 22 de septiembre')).toBeTruthy();
	});

	it("shows only today's not-done tasks on the dashboard", () => {
		render(Page, { props: { data: dashboardData } });
		const card = screen.getByRole('region', { name: 'Tareas del día' });
		expect(card.textContent).toContain('Estudiar álgebra');
		expect(card.textContent).not.toContain('Leer capítulo 3');
		expect(card.textContent).not.toContain('Entregar TP');
	});

	it('links "Ver todas" from the Tareas del día card to /tareas', () => {
		render(Page, { props: { data: dashboardData } });
		expect(screen.getByRole('link', { name: 'Ver todas' }).getAttribute('href')).toBe('/tareas');
	});

	it('does not render the task list or its actions at the root', () => {
		render(Page, { props: { data: dashboardData } });
		expect(screen.queryByRole('button', { name: 'Crear tarea' })).toBeNull();
		expect(screen.queryByText('No hay tareas todavía.')).toBeNull();
	});

	it('sets a Spanish document title', () => {
		render(Page, { props: { data: dashboardData } });
		expect(document.title).toBe('Inicio — Sistema de Tareas');
	});
});
