import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import SubjectsCard from './SubjectsCard.svelte';

/**
 * Materias entry card coverage (design D7; dashboard spec "Materias entry
 * cards"): a named "Materias" section whose static tiles all link to `/study`.
 * The card takes no props and reads no data — there is no subjects repository
 * yet (per-subject pages are a later change), and the blue/amber/violet tints
 * come from the additive tokens.
 */
describe('SubjectsCard', () => {
	it('renders the Materias section as a named region', () => {
		render(SubjectsCard);
		expect(screen.getByRole('region', { name: 'Materias' })).toBeTruthy();
	});

	it('links every entry card to /study', () => {
		render(SubjectsCard);
		const links = screen.getAllByRole('link');
		expect(links).toHaveLength(3);
		for (const link of links) {
			expect(link.getAttribute('href')).toBe('/study');
		}
	});

	it('applies the blue, amber and violet tint classes (design D7)', () => {
		render(SubjectsCard);
		expect(document.querySelector('.subject-tile-blue')).toBeTruthy();
		expect(document.querySelector('.subject-tile-amber')).toBeTruthy();
		expect(document.querySelector('.subject-tile-violet')).toBeTruthy();
	});

	it('renders static Spanish tiles without any props (no data source)', () => {
		render(SubjectsCard);
		expect(screen.getByRole('heading', { level: 2, name: 'Materias' })).toBeTruthy();
		expect(screen.getByText('Temas')).toBeTruthy();
		expect(screen.getByText('Ideas principales')).toBeTruthy();
	});
});
