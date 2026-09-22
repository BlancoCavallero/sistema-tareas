import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import { createRawSnippet, type Snippet } from 'svelte';
import DashboardCard from './DashboardCard.svelte';

/** A minimal content Snippet so the card's default slot has something to show. */
const contentSnippet = createRawSnippet(() => ({
	render: () => '<p>contenido</p>'
})) as unknown as Snippet;

/**
 * Card shell coverage: the titled section exposes as a named region, the
 * content slot renders, and the footer link appears only when href + linkLabel
 * are provided (design file-changes table; dashboard spec card requirements).
 */
describe('DashboardCard', () => {
	it('renders the Spanish title as a level-2 heading', () => {
		render(DashboardCard, { props: { title: 'Tareas del día', children: contentSnippet } });
		expect(screen.getByRole('heading', { level: 2, name: 'Tareas del día' })).toBeTruthy();
	});

	it('renders the card content slot', () => {
		render(DashboardCard, { props: { title: 'Tareas del día', children: contentSnippet } });
		expect(screen.getByText('contenido')).toBeTruthy();
	});

	it('exposes the card as a region named by its title', () => {
		render(DashboardCard, { props: { title: 'Tareas del día', children: contentSnippet } });
		expect(screen.getByRole('region', { name: 'Tareas del día' })).toBeTruthy();
	});

	it('renders the footer link when href and linkLabel are provided', () => {
		render(DashboardCard, {
			props: {
				title: 'Tareas del día',
				href: '/tareas',
				linkLabel: 'Ver todas',
				children: contentSnippet
			}
		});
		expect(screen.getByRole('link', { name: 'Ver todas' }).getAttribute('href')).toBe('/tareas');
	});

	it('renders no footer link without href and linkLabel', () => {
		render(DashboardCard, { props: { title: 'Tareas del día', children: contentSnippet } });
		expect(screen.queryByRole('link')).toBeNull();
	});
});
