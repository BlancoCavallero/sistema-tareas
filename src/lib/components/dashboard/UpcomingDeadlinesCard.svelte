<script lang="ts">
	import { deriveStatus, formatDisplayDate } from '$lib/domain/objectives';
	import type { ObjectiveRow } from '$lib/server/objectives/repository';
	import { KIND_LABELS } from '../ObjectiveItem.svelte';
	import DashboardCard from './DashboardCard.svelte';

	/**
	 * "Próximos vencimientos" dashboard card (design D6 + dashboard spec
	 * "Próximos vencimientos"): reuses the bounded `listObjectives` page from
	 * the root load and splits it in memory — overdue not-done objectives on
	 * top with an "Urgente" text label (never color-only), then upcoming ones
	 * due today or later. The repository page is already bounded to 25; an
	 * explicit in-memory slice keeps the card honest even if a caller passes a
	 * larger list. No new query, no mutation of server data — done objectives
	 * never appear (the page query excludes them).
	 */
	let { list, today }: { list: ObjectiveRow[]; today: string } = $props();

	/**
	 * In-memory bound matching the repository's `LIST_LIMIT` (25). The value
	 * cannot be imported from `$lib/server` here: the SvelteKit browser guard
	 * rejects server-module value imports in client components, so the limit is
	 * redeclared with the repository as the single authoritative query bound.
	 */
	const CARD_LIMIT = 25;

	const page = $derived(list.slice(0, CARD_LIMIT));
	const overdue = $derived(
		page.filter(
			(objective) => deriveStatus(objective.due_date, objective.done, today) === 'overdue'
		)
	);
	const upcoming = $derived(
		page.filter(
			(objective) => deriveStatus(objective.due_date, objective.done, today) === 'upcoming'
		)
	);
</script>

<DashboardCard title="Próximos vencimientos" titleId="proximos-vencimientos">
	{#if overdue.length === 0 && upcoming.length === 0}
		<p class="empty">No hay vencimientos próximos.</p>
	{:else}
		{#if overdue.length > 0}
			<h3 class="group-heading">Vencidos</h3>
			<ul class="deadline-rows">
				{#each overdue as objective (objective.id)}
					<li class="deadline-row">
						<span class="urgent">Urgente</span>
						<span class="row-title">{objective.title}</span>
						<span class="row-kind kind-{objective.kind}">{KIND_LABELS[objective.kind]}</span>
						<time class="row-date" datetime={objective.due_date}
							>{formatDisplayDate(objective.due_date)}</time
						>
					</li>
				{/each}
			</ul>
		{/if}
		{#if upcoming.length > 0}
			<h3 class="group-heading">Próximas</h3>
			<ul class="deadline-rows">
				{#each upcoming as objective (objective.id)}
					<li class="deadline-row">
						<span class="row-title">{objective.title}</span>
						<span class="row-kind kind-{objective.kind}">{KIND_LABELS[objective.kind]}</span>
						<time class="row-date" datetime={objective.due_date}
							>{formatDisplayDate(objective.due_date)}</time
						>
					</li>
				{/each}
			</ul>
		{/if}
	{/if}
</DashboardCard>

<style>
	.empty {
		color: var(--color-text-secondary);
		margin: 0;
	}
	.group-heading {
		font-size: var(--text-sm);
		text-transform: uppercase;
		letter-spacing: 0.04em;
		color: var(--color-text-secondary);
		margin: 0 0 var(--space-2);
	}
	.deadline-rows {
		list-style: none;
		margin: 0 0 var(--space-3);
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: var(--space-2);
	}
	.deadline-rows:last-child {
		margin-bottom: 0;
	}
	.deadline-row {
		display: flex;
		align-items: baseline;
		gap: var(--space-2);
		flex-wrap: wrap;
		border: 1px solid var(--color-border);
		border-radius: var(--radius-sm);
		background: var(--color-bg);
		padding: var(--space-2) var(--space-3);
	}
	.row-title {
		color: var(--color-text);
	}
	.row-kind {
		border-radius: var(--radius-full);
		padding: 0.05rem 0.5rem;
		border: 1px solid transparent;
		font-size: var(--text-sm);
	}
	.kind-exam {
		background: var(--color-accent-soft);
		color: var(--color-accent);
		border-color: var(--color-accent);
	}
	.kind-deadline {
		background: var(--color-overdue-bg);
		color: var(--color-overdue-text);
		border-color: var(--color-overdue-text);
	}
	.kind-other {
		background: var(--color-surface);
		color: var(--color-text-secondary);
		border-color: var(--color-border-strong);
	}
	.urgent {
		font-size: var(--text-sm);
		font-weight: 700;
		background: var(--color-overdue-bg);
		color: var(--color-overdue-text);
		border-radius: var(--radius-full);
		padding: 0.05rem 0.5rem;
	}
	.row-date {
		font-size: var(--text-sm);
		color: var(--color-text-secondary);
		margin-left: auto;
	}
</style>
