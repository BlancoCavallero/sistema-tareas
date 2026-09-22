import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import MiniCalendarCard from './MiniCalendarCard.svelte';
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
 * Mini calendar card coverage (design D5; dashboard spec "Calendario mini
 * month grid"): the Spanish month name titles the card region, the compact
 * ObjectiveGrid renders with its display semantics (no role="grid", `<time
 * datetime>` days, one `aria-current="date"` on today), chips appear on due
 * days, the footer links to `/calendar`, and an empty month shows the Spanish
 * empty state.
 */
describe('MiniCalendarCard', () => {
	it('renders the Spanish month name as the named card region', () => {
		render(MiniCalendarCard, { props: { month: [], today: TODAY, monthKey: '2026-09' } });
		expect(screen.getByRole('region', { name: 'Septiembre de 2026' })).toBeTruthy();
	});

	it('renders the compact grid with day numbers as <time datetime>', () => {
		render(MiniCalendarCard, { props: { month: [], today: TODAY, monthKey: '2026-09' } });
		expect(document.querySelector('.month-grid.compact')).toBeTruthy();
		expect(document.querySelectorAll('.month-grid time.day-number').length).toBe(30);
	});

	it('marks only today with aria-current="date" and never role="grid"', () => {
		render(MiniCalendarCard, { props: { month: [], today: TODAY, monthKey: '2026-09' } });
		const current = document.querySelectorAll('[aria-current="date"]');
		expect(current.length).toBe(1);
		expect(current[0]?.querySelector('time')?.getAttribute('datetime')).toBe(TODAY);
		expect(document.querySelector('[role="grid"]')).toBeNull();
	});

	it('shows a chip on the day an objective is due', () => {
		const month = [objective({ id: 1, title: 'Parcial de álgebra', due_date: '2026-09-25' })];
		render(MiniCalendarCard, { props: { month, today: TODAY, monthKey: '2026-09' } });
		expect(screen.getByText('Parcial de álgebra')).toBeTruthy();
	});

	it('links "Ver calendario completo" to /calendar', () => {
		render(MiniCalendarCard, { props: { month: [], today: TODAY, monthKey: '2026-09' } });
		expect(screen.getByRole('link', { name: 'Ver calendario completo' }).getAttribute('href')).toBe(
			'/calendar'
		);
	});

	it('shows the Spanish empty state for a month without objectives', () => {
		render(MiniCalendarCard, { props: { month: [], today: TODAY, monthKey: '2026-09' } });
		expect(screen.getByText('No hay objetivos este mes.')).toBeTruthy();
	});
});
