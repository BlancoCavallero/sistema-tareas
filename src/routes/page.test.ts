// Note: SvelteKit reserves files prefixed with `+` inside src/routes (verified:
// the route manifest builder rejects `+page.test.ts` with "Files prefixed with
// + are reserved"). The test therefore lives next to the component without the
// prefix; vitest picks it up via `src/**/*.{test,spec}.{js,ts}`.
import { describe, expect, it } from 'vitest';
import { render, screen, within } from '@testing-library/svelte';
import Page from './+page.svelte';
import type { ObjectiveRow } from '$lib/server/objectives/repository';
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

function objective(partial: Partial<ObjectiveRow> = {}): ObjectiveRow {
	return {
		id: 1,
		title: 'Parcial de álgebra',
		kind: 'exam',
		due_date: '2026-09-25',
		notes: null,
		done: false,
		completed_at: null,
		created_at: '2026-09-21T12:00:00.000Z',
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
	month: [objective({ id: 10, title: 'Parcial de álgebra', due_date: '2026-09-25' })],
	list: [
		objective({ id: 11, title: 'Entrega TP', kind: 'deadline', due_date: '2026-09-21' }),
		objective({ id: 12, title: 'Recuperatorio', due_date: '2026-09-25' })
	],
	today: '2026-09-22'
};

/**
 * `/` is the dashboard (quick-tasks delta: the root no longer hosts the task
 * list; dashboard spec "Dashboard home route" + all card requirements): the
 * greeting/date header renders, only today's pending tasks appear with a link
 * to `/tareas`, the mini calendar grid and the upcoming-deadlines card consume
 * `month`/`list`, the Materias entry cards link to `/study`, no task actions
 * exist at the root, and the Spanish document title is set.
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

	it('renders the mini calendar card with the Spanish month heading and its chip', () => {
		render(Page, { props: { data: dashboardData } });
		const calendar = screen.getByRole('region', { name: 'Septiembre de 2026' });
		expect(within(calendar).getByText('Parcial de álgebra')).toBeTruthy();
		expect(screen.getByRole('link', { name: 'Ver calendario completo' }).getAttribute('href')).toBe(
			'/calendar'
		);
	});

	it('marks today with aria-current="date" in the mini calendar', () => {
		render(Page, { props: { data: dashboardData } });
		const current = document.querySelectorAll('[aria-current="date"]');
		expect(current.length).toBe(1);
		expect(current[0]?.querySelector('time')?.getAttribute('datetime')).toBe('2026-09-22');
	});

	it('renders upcoming deadlines and labels overdue ones "Urgente"', () => {
		render(Page, { props: { data: dashboardData } });
		const deadlines = screen.getByRole('region', { name: 'Próximos vencimientos' });
		expect(deadlines.textContent).toContain('Recuperatorio');
		expect(deadlines.textContent).toContain('Entrega TP');
		expect(screen.getByText('Urgente')).toBeTruthy();
	});

	it('renders the Materias entry cards linking to /study', () => {
		render(Page, { props: { data: dashboardData } });
		const materias = screen.getByRole('region', { name: 'Materias' });
		const links = within(materias).getAllByRole('link');
		expect(links.length).toBeGreaterThanOrEqual(1);
		for (const link of links) {
			expect(link.getAttribute('href')).toBe('/study');
		}
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
