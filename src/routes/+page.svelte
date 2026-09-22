<script lang="ts">
	import GreetingHeader from '$lib/components/dashboard/GreetingHeader.svelte';
	import TasksTodayCard from '$lib/components/dashboard/TasksTodayCard.svelte';

	/**
	 * `/` dashboard (design data flow + file-changes table): consumes the
	 * read-only load contract from `+page.server.ts` (`tasks`/`month`/`list`/
	 * `today`). This slice renders the greeting header and the Tareas del día
	 * card; the calendar/deadlines/subjects cards land in the next PR slice
	 * (tasks 3.4–3.8) and slot into the same 12-column grid. The dashboard
	 * mutates no data — all task CRUD lives at `/tareas`.
	 */
	let { data } = $props();
</script>

<svelte:head>
	<title>Inicio — Sistema de Tareas</title>
</svelte:head>

<div class="dashboard">
	<GreetingHeader today={data.today} />

	<div class="dashboard-grid">
		<div class="card-slot card-slot-tasks">
			<TasksTodayCard tasks={data.tasks} today={data.today} />
		</div>
	</div>
</div>

<style>
	.dashboard {
		display: flex;
		flex-direction: column;
		gap: var(--space-8);
	}

	/* Dashboard 12-column grid (design): cards span the full width on narrow
	   viewports and split across columns on wide ones. */
	.dashboard-grid {
		display: grid;
		grid-template-columns: repeat(12, 1fr);
		gap: var(--space-6);
		align-items: start;
	}
	.card-slot {
		grid-column: span 12;
	}

	/* Subtle entrance for cards; durations come from tokens, so the global
	   prefers-reduced-motion override in tokens.css collapses it to ~0ms. */
	.dashboard-grid > * {
		animation: card-rise var(--duration-base) var(--ease-out) both;
	}
	@keyframes card-rise {
		from {
			opacity: 0;
			transform: translateY(4px);
		}
		to {
			opacity: 1;
			transform: none;
		}
	}

	@media (min-width: 640px) {
		.card-slot-tasks {
			grid-column: span 6;
		}
	}
</style>
