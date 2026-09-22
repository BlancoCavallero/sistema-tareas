<script lang="ts">
	import { resolve } from '$app/paths';
	import DashboardCard from './DashboardCard.svelte';
	import type { TaskWithDone } from '$lib/server/tasks/repository';

	/**
	 * "Tareas del día" dashboard card (design D4): reuses the bounded
	 * `listTasks(25)` page from the root load and filters in memory to today's
	 * not-done tasks (`next_due === today && !done`) — server data is never
	 * mutated and no new query is introduced.
	 *
	 * Read-only: rows show title + pending state with no create/edit/complete
	 * actions; all task CRUD lives at `/tareas` (design D8). The "Ver todas"
	 * footer links there, and the empty state also links to `/tareas`
	 * (dashboard spec).
	 */
	let { tasks, today }: { tasks: TaskWithDone[]; today: string } = $props();

	const pendingToday = $derived(tasks.filter((task) => task.next_due === today && !task.done));

	const allHref = resolve('/tareas');
</script>

<DashboardCard title="Tareas del día" titleId="tasks-today" href={allHref} linkLabel="Ver todas">
	{#if pendingToday.length === 0}
		<p class="empty">
			No hay tareas para hoy.
			<a class="empty-link" href={allHref}>Ver todas las tareas</a>.
		</p>
	{:else}
		<ul class="task-rows">
			{#each pendingToday as task (task.id)}
				<li class="task-row">
					<span class="task-title">{task.title}</span>
					<span class="task-status">Pendiente</span>
				</li>
			{/each}
		</ul>
	{/if}
</DashboardCard>

<style>
	.task-rows {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: var(--space-2);
	}
	.task-row {
		display: flex;
		align-items: baseline;
		justify-content: space-between;
		gap: var(--space-4);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-sm);
		background: var(--color-bg);
		padding: var(--space-2) var(--space-3);
	}
	.task-title {
		color: var(--color-text);
	}
	.task-status {
		font-size: var(--text-sm);
		color: var(--color-text-secondary);
	}
	.empty {
		color: var(--color-text-secondary);
		margin: 0;
	}
	.empty-link {
		color: var(--color-accent);
	}
</style>
