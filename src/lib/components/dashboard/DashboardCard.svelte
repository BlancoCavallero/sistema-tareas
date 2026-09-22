<script lang="ts">
	import type { ResolvedPathname } from '$app/types';
	import type { Snippet } from 'svelte';

	/**
	 * Dashboard card shell (design file-changes table): a titled section with
	 * an optional footer link and a content slot ("snippet"). Every dashboard
	 * card wraps its content in this shell so the `/` page keeps one visual
	 * card language.
	 *
	 * - The section is labelled by its own heading (`aria-labelledby`), so it
	 *   is exposed as a named region to assistive tech.
	 * - `href`/`linkLabel` are optional: without them no footer renders.
	 * - The shell never builds URLs; callers pass hrefs resolved through
	 *   `$app/paths` (typed `ResolvedPathname`, which the project's
	 *   no-navigation-without-resolve rule requires on every link).
	 * - `titleId` defaults to a slug of the Spanish title (accents stripped)
	 *   when a card does not provide a stable id.
	 */
	let {
		title,
		titleId = slug(title),
		href,
		linkLabel,
		children
	}: {
		title: string;
		titleId?: string;
		href?: ResolvedPathname;
		linkLabel?: string;
		children: Snippet;
	} = $props();

	/** Stable element id from a Spanish title: strip accents, lowercase, dash-join. */
	function slug(text: string): string {
		return text
			.normalize('NFD')
			.replace(/[\u0300-\u036f]/g, '')
			.toLowerCase()
			.replace(/[^a-z0-9]+/g, '-')
			.replace(/^-+|-+$/g, '');
	}
</script>

<section class="dashboard-card" aria-labelledby={titleId}>
	<h2 class="card-title" id={titleId}>{title}</h2>
	<div class="card-body">
		{@render children()}
	</div>
	{#if href && linkLabel}
		<footer class="card-footer">
			<a class="card-link" {href}>{linkLabel}</a>
		</footer>
	{/if}
</section>

<style>
	.dashboard-card {
		display: flex;
		flex-direction: column;
		gap: var(--space-3);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-md);
		background: var(--color-surface);
		padding: var(--space-5);
		height: 100%;
	}
	.card-title {
		font-size: var(--text-lg);
		margin: 0;
	}
	.card-body {
		flex: 1;
	}
	.card-footer {
		border-top: 1px solid var(--color-border);
		padding-top: var(--space-3);
	}
	.card-link {
		color: var(--color-accent);
		text-decoration: none;
		font-weight: 600;
	}
	.card-link:hover {
		text-decoration: underline;
	}
</style>
