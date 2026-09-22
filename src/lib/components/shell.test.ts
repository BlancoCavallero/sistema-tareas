import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/svelte';
import { createRawSnippet, type Snippet } from 'svelte';
import AppHeader from './AppHeader.svelte';
import Login from '../../routes/login/+page.svelte';
import Layout from '../../routes/+layout.svelte';

/**
 * `$app/state` is mocked so tests can control the current pathname and
 * exercise the active nav state (design D3: exact match → `aria-current`).
 * `$app/paths` stays real; `resolve()` returns the base-path-less hrefs.
 */
const { mockPage } = vi.hoisted(() => ({ mockPage: { url: { pathname: '/' } } }));
vi.mock('$app/state', () => ({ page: mockPage }));

/** A minimal Snippet so the layout's `{@render children()}` has content. */
const childSnippet = createRawSnippet(() => ({
	render: () => '<p>child</p>'
})) as unknown as Snippet;

const NAV_LABELS = ['Inicio', 'Tareas', 'Calendario', 'Materias', 'Documentos'];
const NAV_HREFS = ['/', '/tareas', '/calendar', '/study', '/documents'];

/**
 * Component coverage for the app shell (design D1–D3/D9): the header's five
 * module links, brand, active state, logout, and the login page rendering
 * standalone (outside the shell).
 */

describe('AppHeader (+lib/components/AppHeader.svelte)', () => {
	beforeEach(() => {
		mockPage.url.pathname = '/';
	});

	it('renders the Estudia brand linking to /', () => {
		render(AppHeader);
		const brand = screen.getByRole('link', { name: 'Estudia' });
		expect(brand.getAttribute('href')).toBe('/');
	});

	it('shows the five module links in order with Spanish labels and resolved hrefs', () => {
		render(AppHeader);
		const topNav = screen.getByRole('navigation', { name: 'Principal' });
		const links = within(topNav).getAllByRole('link');
		expect(links.map((link) => link.textContent?.trim())).toEqual(NAV_LABELS);
		expect(links.map((link) => link.getAttribute('href'))).toEqual(NAV_HREFS);
	});

	it('marks the active link with aria-current="page" by exact pathname match', () => {
		mockPage.url.pathname = '/tareas';
		render(AppHeader);
		const topNav = screen.getByRole('navigation', { name: 'Principal' });
		expect(within(topNav).getByRole('link', { name: 'Tareas' }).getAttribute('aria-current')).toBe(
			'page'
		);
		expect(
			within(topNav).getByRole('link', { name: 'Inicio' }).getAttribute('aria-current')
		).toBeNull();
	});

	it('marks Inicio active on the root path only (no prefix highlight)', () => {
		render(AppHeader);
		const topNav = screen.getByRole('navigation', { name: 'Principal' });
		expect(within(topNav).getByRole('link', { name: 'Inicio' }).getAttribute('aria-current')).toBe(
			'page'
		);
		expect(
			within(topNav).getByRole('link', { name: 'Tareas' }).getAttribute('aria-current')
		).toBeNull();
	});

	it('keeps logout reachable on desktop and mobile', () => {
		render(AppHeader);
		expect(screen.getByRole('button', { name: 'Cerrar sesión' })).toBeTruthy();
		expect(screen.getByRole('button', { name: 'Salir' })).toBeTruthy();
		const bottomNav = screen.getByRole('navigation', { name: 'Navegación inferior' });
		expect(within(bottomNav).getAllByRole('link')).toHaveLength(5);
	});
});

describe('app shell layout (+layout.svelte)', () => {
	it('renders the header on app pages', () => {
		render(Layout, { props: { children: childSnippet } });
		expect(screen.getByRole('navigation', { name: 'Principal' })).toBeTruthy();
		expect(screen.getByRole('button', { name: 'Cerrar sesión' })).toBeTruthy();
	});

	it('renders login standalone without the app shell', () => {
		mockPage.url.pathname = '/login';
		render(Layout, { props: { children: childSnippet } });
		expect(screen.queryByRole('navigation')).toBeNull();
		expect(screen.queryByRole('link')).toBeNull();
		expect(screen.getByText('child')).toBeTruthy();
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
