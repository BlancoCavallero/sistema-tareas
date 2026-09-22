import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import UpcomingDeadlinesCard from './UpcomingDeadlinesCard.svelte';
import type { ObjectiveRow } from '$lib/server/objectives/repository';

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

const TODAY = '2026-09-22';

/**
 * Próximos vencimientos card coverage (design D6; dashboard spec "Próximos
 * vencimientos"): splits the bounded objective page in memory — overdue first
 * with an "Urgente" text label (never color-only), then upcoming due today or
 * later — excludes done objectives, bounds to 25, renders Spanish dates as
 * `<time datetime>`, and shows a Spanish empty state.
 */
describe('UpcomingDeadlinesCard', () => {
	it('lists not-done objectives due today or later, excluding done ones', () => {
		const list = [
			objective({ id: 1, title: 'Entrega TP', kind: 'deadline', due_date: '2026-09-25' }),
			objective({ id: 2, title: 'Parcial de álgebra', due_date: '2026-09-22' }), // due today
			objective({ id: 3, title: 'Hecho', due_date: '2026-09-30', done: true }) // excluded
		];
		render(UpcomingDeadlinesCard, { props: { list, today: TODAY } });
		const card = screen.getByRole('region', { name: 'Próximos vencimientos' });
		expect(card.textContent).toContain('Entrega TP');
		expect(card.textContent).toContain('Parcial de álgebra');
		expect(card.textContent).not.toContain('Hecho');
	});

	it('places overdue objectives on top with the "Urgente" text label, then upcoming', () => {
		const list = [
			objective({ id: 1, title: 'Próxima uno', due_date: '2026-09-25' }),
			objective({ id: 2, title: 'Vencida una', due_date: '2026-09-20' }),
			objective({ id: 3, title: 'Próxima dos', due_date: '2026-09-28' })
		];
		render(UpcomingDeadlinesCard, { props: { list, today: TODAY } });
		const titles = Array.from(document.querySelectorAll('.row-title')).map((el) => el.textContent);
		expect(titles).toEqual(['Vencida una', 'Próxima uno', 'Próxima dos']);
		expect(screen.getByText('Urgente')).toBeTruthy();
		expect(screen.getByText('Vencidos')).toBeTruthy();
		expect(screen.getByText('Próximas')).toBeTruthy();
	});

	it('bounds the rendered list to 25 in memory', () => {
		const list = Array.from({ length: 26 }, (_, index) =>
			objective({ id: index + 1, title: `Objetivo ${index + 1}`, due_date: '2026-09-30' })
		);
		render(UpcomingDeadlinesCard, { props: { list, today: TODAY } });
		expect(document.querySelectorAll('.deadline-row').length).toBe(25);
	});

	it('shows a Spanish empty state when nothing is due or overdue', () => {
		render(UpcomingDeadlinesCard, { props: { list: [], today: TODAY } });
		expect(screen.getByText('No hay vencimientos próximos.')).toBeTruthy();
	});

	it('renders the due date as <time datetime> with a Spanish short label', () => {
		const list = [objective({ id: 1, title: 'Entrega TP', due_date: '2026-09-25' })];
		render(UpcomingDeadlinesCard, { props: { list, today: TODAY } });
		const time = document.querySelector('time');
		expect(time?.getAttribute('datetime')).toBe('2026-09-25');
		expect(time?.textContent).toMatch(/vie, 25 sept/);
	});
});
