<script lang="ts">
	import { page } from '$app/state';
	import favicon from '$lib/assets/favicon.svg';
	import AppHeader from '$lib/components/AppHeader.svelte';
	// Global design tokens — loaded exactly once from the root layout.
	import '$lib/styles/tokens.css';

	let { children } = $props();
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

{#if page.url.pathname === '/login' || page.url.pathname === '/login/'}
	<!-- Login page renders standalone, outside the app shell. -->
	{@render children()}
{:else}
	<AppHeader />
	<main class="shell-main">
		{@render children()}
	</main>
{/if}

<style>
	.shell-main {
		max-width: 56rem;
		margin: 0 auto;
		padding: var(--space-6);
	}

	/* Narrow viewports: the fixed bottom nav must never permanently obscure
	   the last interactive element, so the main column clears its height. */
	@media (max-width: 640px) {
		.shell-main {
			padding-bottom: calc(5rem + env(safe-area-inset-bottom));
		}
	}
</style>
