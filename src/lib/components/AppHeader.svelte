<script lang="ts">
	import { page } from '$app/state';
	import { resolve } from '$app/paths';

	/**
	 * App shell header (design D1/D2/D3/D9): brand → `/`, the five primary
	 * navigation links with inline SVG icons, active state by exact pathname
	 * match, and the logout control. Renders a desktop top nav plus a fixed
	 * mobile bottom nav (icon + label), mutually exclusive via media query.
	 *
	 * No props: the current route is read from `$app/state`, and nav hrefs are
	 * resolved through `$app/paths` (the project's lint rule for route URLs).
	 * All colors and spacing come from global tokens; the global
	 * `:focus-visible` ring covers keyboard focus (D9).
	 */
	const NAV_ITEMS = [
		{
			href: resolve('/'),
			label: 'Inicio',
			icon: ['m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z', 'M9 22V12h6v10']
		},
		{
			href: resolve('/tareas'),
			label: 'Tareas',
			icon: ['m9 11 3 3L22 4', 'M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11']
		},
		{
			href: resolve('/calendar'),
			label: 'Calendario',
			icon: [
				'M8 2v4',
				'M16 2v4',
				'M3 10h18',
				'M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z'
			]
		},
		{
			href: resolve('/study'),
			label: 'Materias',
			icon: [
				'M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z',
				'M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z'
			]
		},
		{
			href: resolve('/documents'),
			label: 'Documentos',
			icon: [
				'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z',
				'M14 2v6h6',
				'M16 13H8',
				'M16 17H8',
				'M10 9H8'
			]
		}
	];
</script>

{#snippet navIcon(paths: string[])}
	<svg
		viewBox="0 0 24 24"
		fill="none"
		stroke="currentColor"
		stroke-width="2"
		stroke-linecap="round"
		stroke-linejoin="round"
		aria-hidden="true"
	>
		{#each paths as d (d)}
			<path {d} />
		{/each}
	</svg>
{/snippet}

{#snippet logoutIcon()}
	<svg
		viewBox="0 0 24 24"
		fill="none"
		stroke="currentColor"
		stroke-width="2"
		stroke-linecap="round"
		stroke-linejoin="round"
		aria-hidden="true"
	>
		<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
		<path d="m16 17 5-5-5-5" />
		<path d="M21 12H9" />
	</svg>
{/snippet}

<header class="app-header">
	<a class="brand" href={resolve('/')}>
		<svg
			class="brand-icon"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			stroke-width="2"
			stroke-linecap="round"
			stroke-linejoin="round"
			aria-hidden="true"
		>
			<path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
			<path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
		</svg>
		<span>Estudia</span>
	</a>

	<nav class="top-nav" aria-label="Principal">
		{#each NAV_ITEMS as item (item.href)}
			<a href={item.href} aria-current={item.href === page.url.pathname ? 'page' : undefined}>
				{@render navIcon(item.icon)}
				<span>{item.label}</span>
			</a>
		{/each}
	</nav>

	<form class="logout" method="POST" action="/logout">
		<button type="submit">
			{@render logoutIcon()}
			<span>Cerrar sesión</span>
		</button>
	</form>
</header>

<nav class="bottom-nav" aria-label="Navegación inferior">
	{#each NAV_ITEMS as item (item.href)}
		<a href={item.href} aria-current={item.href === page.url.pathname ? 'page' : undefined}>
			{@render navIcon(item.icon)}
			<span>{item.label}</span>
		</a>
	{/each}
	<form method="POST" action="/logout">
		<button type="submit">
			{@render logoutIcon()}
			<span>Salir</span>
		</button>
	</form>
</nav>

<style>
	.app-header {
		position: sticky;
		top: 0;
		z-index: 50;
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: var(--space-4);
		padding: var(--space-3) var(--space-6);
		background: var(--color-bg);
		border-bottom: 1px solid var(--color-border);
	}

	.brand {
		display: inline-flex;
		align-items: center;
		gap: var(--space-2);
		color: var(--color-text);
		font-weight: 700;
		text-decoration: none;
	}
	.brand-icon {
		width: 1.75rem;
		height: 1.75rem;
		padding: 0.25rem;
		color: var(--color-bg);
		background: var(--color-accent);
		border-radius: var(--radius-sm);
	}

	.top-nav {
		display: flex;
		align-items: center;
		gap: var(--space-1);
	}
	.top-nav a {
		display: inline-flex;
		align-items: center;
		gap: var(--space-1);
		padding: var(--space-2) var(--space-3);
		color: var(--color-text-secondary);
		text-decoration: none;
		border-bottom: 2px solid transparent;
	}
	.top-nav a:hover {
		color: var(--color-text);
		background: var(--color-hover-bg);
	}
	/* Active state (D3): exact pathname match, accent bottom-border on desktop. */
	.top-nav a[aria-current='page'] {
		color: var(--color-accent);
		border-bottom-color: var(--color-accent);
	}
	.top-nav svg {
		width: 1.125rem;
		height: 1.125rem;
	}

	.logout button {
		display: inline-flex;
		align-items: center;
		gap: var(--space-1);
		padding: var(--space-2) var(--space-3);
		color: var(--color-text-secondary);
		background: none;
		border: 1px solid var(--color-border);
		border-radius: var(--radius-sm);
		cursor: pointer;
	}
	.logout button:hover {
		color: var(--color-text);
		background: var(--color-hover-bg);
	}
	.logout svg {
		width: 1.125rem;
		height: 1.125rem;
	}

	.bottom-nav {
		position: fixed;
		inset-inline: 0;
		bottom: 0;
		z-index: 50;
		display: none;
		align-items: stretch;
		background: var(--color-bg);
		border-top: 1px solid var(--color-border);
		padding: var(--space-1) var(--space-2) env(safe-area-inset-bottom);
	}
	.bottom-nav a,
	.bottom-nav button {
		flex: 1;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.125rem;
		padding: var(--space-2) 0;
		font-size: var(--text-sm);
		color: var(--color-text-secondary);
		text-decoration: none;
		background: none;
		border: none;
		cursor: pointer;
	}
	.bottom-nav a:hover,
	.bottom-nav button:hover {
		color: var(--color-text);
	}
	/* Active state on mobile: accent-filled indicator (D3, app-shell spec). */
	.bottom-nav a[aria-current='page'] {
		color: var(--color-accent);
		background: var(--color-accent-soft);
		border-radius: var(--radius-md);
	}
	.bottom-nav svg {
		width: 1.25rem;
		height: 1.25rem;
	}

	/* Narrow viewports: bottom nav replaces the top nav; logout moves with it. */
	@media (max-width: 640px) {
		.top-nav,
		.logout {
			display: none;
		}
		.bottom-nav {
			display: flex;
		}
	}
</style>
