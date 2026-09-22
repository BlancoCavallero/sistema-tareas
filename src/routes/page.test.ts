// Note: SvelteKit reserves files prefixed with `+` inside src/routes (verified:
// the route manifest builder rejects `+page.test.ts` with "Files prefixed with
// + are reserved"). The test therefore lives next to the component without the
// prefix; vitest picks it up via `src/**/*.{test,spec}.{js,ts}`.
//
// The home page is a temporary placeholder until the dashboard cards land; the
// full dashboard assertion rewrite is part of the dashboard slice (3.10).
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import Page from './+page.svelte';

describe('+page.svelte (home)', () => {
	it('renders a Spanish home heading', () => {
		render(Page);
		expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Inicio');
	});

	it('does not render the task list at the root (tasks live at /tareas)', () => {
		render(Page);
		expect(screen.queryByRole('button', { name: 'Crear tarea' })).toBeNull();
		expect(screen.queryByText('No hay tareas todavía.')).toBeNull();
	});

	it('links to the task page at /tareas', () => {
		render(Page);
		expect(screen.getByRole('link', { name: 'Tareas' }).getAttribute('href')).toBe('/tareas');
	});
});
