// Note: SvelteKit reserves files prefixed with `+` inside src/routes (verified:
// the route manifest builder rejects `+page.test.ts` with "Files prefixed with
// + are reserved"). The test therefore lives next to the component without the
// prefix; vitest picks it up via `src/**/*.{test,spec}.{js,ts}`.
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import Page from './+page.svelte';

const emptyData = {
	tasks: [],
	history: [],
	today: '2026-09-21'
};

describe('+page.svelte', () => {
	it('renders the Spanish tasks heading', () => {
		render(Page, { props: { data: emptyData, form: null } });
		expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Tareas');
	});

	it('shows the empty state in Spanish', () => {
		render(Page, { props: { data: emptyData, form: null } });
		expect(screen.getByText('No hay tareas todavía.')).toBeTruthy();
		expect(screen.getByRole('button', { name: 'Crear tarea' })).toBeTruthy();
	});
});
