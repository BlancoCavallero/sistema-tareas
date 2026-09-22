import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import GreetingHeader from './GreetingHeader.svelte';

/**
 * Greeting header coverage (design: `{ today, hour? }`; dashboard spec:
 * "Greeting and date header"): Spanish long date on a known date and the
 * hour-based greeting split (morning / afternoon / night). `hour` is injected
 * so the greeting is deterministic; the component defaults to the client
 * clock when the page omits it.
 */
describe('GreetingHeader', () => {
	it('renders the date in Spanish long format with a capitalized weekday', () => {
		render(GreetingHeader, { props: { today: '2026-09-22', hour: 9 } });
		expect(screen.getByText('Martes, 22 de septiembre')).toBeTruthy();
	});

	it('greets "Buenos días" in the morning', () => {
		render(GreetingHeader, { props: { today: '2026-09-22', hour: 9 } });
		expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Buenos días');
	});

	it('greets "Buenas tardes" in the afternoon', () => {
		render(GreetingHeader, { props: { today: '2026-09-22', hour: 14 } });
		expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Buenas tardes');
	});

	it('greets "Buenas noches" at night', () => {
		render(GreetingHeader, { props: { today: '2026-09-22', hour: 22 } });
		expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Buenas noches');
	});

	it('renders the date without a year, e.g. "Jueves, 1 de octubre"', () => {
		render(GreetingHeader, { props: { today: '2026-10-01', hour: 9 } });
		expect(screen.getByText('Jueves, 1 de octubre')).toBeTruthy();
	});
});
