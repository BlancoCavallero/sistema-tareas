<script lang="ts">
	import ObjectiveItem from './ObjectiveItem.svelte';
	import { deriveStatus } from '$lib/domain/objectives';
	import type { ObjectiveRow } from '$lib/server/objectives/repository';

	/**
	 * List sections for `/calendar`. The route's `load` issues one bounded
	 * `done = 0 LIMIT 25` query and hands the flat page here; the three sections
	 * are split in memory with `$derived` (server data is never mutated), so each
	 * section stays a subset of that bounded page.
	 */
	let { list, today }: { list: ObjectiveRow[]; today: string } = $props();

	const upcoming = $derived(
		list.filter(
			(objective) => deriveStatus(objective.due_date, objective.done, today) === 'upcoming'
		)
	);
	const overdue = $derived(
		list.filter(
			(objective) => deriveStatus(objective.due_date, objective.done, today) === 'overdue'
		)
	);
	const all = $derived(list);
</script>

<section class="objective-section" aria-labelledby="objectives-upcoming">
	<h2 id="objectives-upcoming">Próximas</h2>
	{#if upcoming.length === 0}
		<p class="empty">No hay objetivos próximos.</p>
	{:else}
		<ul class="objective-list">
			{#each upcoming as objective (objective.id)}
				<li><ObjectiveItem {objective} {today} /></li>
			{/each}
		</ul>
	{/if}
</section>

<section class="objective-section" aria-labelledby="objectives-overdue">
	<h2 id="objectives-overdue">Vencidas</h2>
	{#if overdue.length === 0}
		<p class="empty">No hay objetivos vencidos.</p>
	{:else}
		<ul class="objective-list">
			{#each overdue as objective (objective.id)}
				<li><ObjectiveItem {objective} {today} /></li>
			{/each}
		</ul>
	{/if}
</section>

<section class="objective-section" aria-labelledby="objectives-all">
	<h2 id="objectives-all">Todas</h2>
	{#if all.length === 0}
		<p class="empty">No hay objetivos todavía.</p>
	{:else}
		<ul class="objective-list">
			{#each all as objective (objective.id)}
				<li><ObjectiveItem {objective} {today} /></li>
			{/each}
		</ul>
	{/if}
</section>

<style>
	.objective-section {
		margin-bottom: var(--space-8);
	}
	.objective-section h2 {
		font-size: var(--text-lg);
		margin: 0 0 var(--space-3);
	}
	.objective-list {
		list-style: none;
		margin: 0;
		padding: 0;
	}
	.objective-list li {
		margin: 0;
	}
	.empty {
		color: var(--color-text-secondary);
		margin: 0;
	}
</style>
