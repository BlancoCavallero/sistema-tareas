<script lang="ts">
	import { page } from '$app/state';
	import { resolve } from '$app/paths';
	import favicon from '$lib/assets/favicon.svg';
	// Global design tokens — loaded exactly once from the root layout.
	import '$lib/styles/tokens.css';

	let { children } = $props();

	const nav = [
		{ href: resolve('/'), label: 'Tareas' },
		{ href: resolve('/calendar'), label: 'Calendario' },
		{ href: resolve('/documents'), label: 'Documentos' },
		{ href: resolve('/study'), label: 'Estudio' }
	];
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

{#if page.url.pathname === '/login' || page.url.pathname === '/login/'}
	<!-- Login page renders standalone, outside the app shell. -->
	{@render children()}
{:else}
	<header class="shell-header">
		<nav aria-label="Principal">
			<ul>
				{#each nav as item (item.href)}
					<li><a href={item.href}>{item.label}</a></li>
				{/each}
			</ul>
		</nav>
		<form method="POST" action="/logout">
			<button type="submit">Cerrar sesión</button>
		</form>
	</header>
	<main class="shell-main">
		{@render children()}
	</main>
{/if}

<style>
	.shell-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
		padding: 0.75rem 1.5rem;
		border-bottom: 1px solid #d0d7de;
	}
	.shell-header ul {
		display: flex;
		gap: 1.25rem;
		list-style: none;
		margin: 0;
		padding: 0;
	}
	.shell-main {
		max-width: 56rem;
		margin: 0 auto;
		padding: 1.5rem;
	}
</style>
