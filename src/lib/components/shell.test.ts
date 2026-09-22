import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import type { Snippet } from 'svelte';
import Login from '../../routes/login/+page.svelte';
import Layout from '../../routes/+layout.svelte';

/** A minimal Snippet so the layout's `{@render children()}` has content. */
const childSnippet = (() => 'child') as unknown as Snippet;

/**
 * Component coverage for the app shell and login form (design 5.6): module nav
 * and Spanish labels. The layout is rendered directly with a children snippet;
 * the login page renders standalone (outside the shell).
 */

describe('app shell nav (+layout.svelte)', () => {
	it('shows the four module links and the logout button', () => {
		render(Layout, { props: { children: childSnippet } });
		const links = screen.getAllByRole('link');
		expect(links.map((link) => link.textContent)).toEqual([
			'Tareas',
			'Calendario',
			'Documentos',
			'Estudio'
		]);
		expect(screen.getByRole('button', { name: 'Cerrar sesión' })).toBeTruthy();
	});
});

describe('login form (+page.svelte)', () => {
	it('renders the Spanish password form', () => {
		render(Login);
		expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Sistema de Tareas');
		expect(screen.getByText('Ingrese la contraseña para acceder.')).toBeTruthy();
		expect(screen.getByLabelText('Contraseña')).toBeTruthy();
		expect(screen.getByRole('button', { name: 'Ingresar' })).toBeTruthy();
	});

	it('renders a server error message in Spanish', () => {
		render(Login, { props: { form: { message: 'Contraseña incorrecta.' } } });
		expect(screen.getByRole('alert').textContent).toBe('Contraseña incorrecta.');
	});
});
