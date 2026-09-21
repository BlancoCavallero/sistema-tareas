// Note: SvelteKit reserves files prefixed with `+` inside src/routes (verified:
// the route manifest builder rejects `+page.test.ts` with "Files prefixed with
// + are reserved"). The test therefore lives next to the component without the
// prefix; vitest picks it up via `src/**/*.{test,spec}.{js,ts}`.
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import Page from './+page.svelte';

describe('+page.svelte', () => {
	it('renders the Spanish heading', () => {
		render(Page);
		expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Sistema de Tareas');
	});
});
