<script lang="ts">
	import GreetingHeader from '$lib/components/dashboard/GreetingHeader.svelte';
	import MiniCalendarCard from '$lib/components/dashboard/MiniCalendarCard.svelte';
	import SubjectsCard from '$lib/components/dashboard/SubjectsCard.svelte';
	import TasksTodayCard from '$lib/components/dashboard/TasksTodayCard.svelte';
	import UpcomingDeadlinesCard from '$lib/components/dashboard/UpcomingDeadlinesCard.svelte';

	/**
	 * `/` dashboard (design data flow + file-changes table): consumes the
	 * read-only load contract from `+page.server.ts` (`tasks`/`month`/`list`/
	 * `today`) and renders the four cards — Tareas del día, Calendario mini
	 * grid, Próximos vencimientos and Materias. The dashboard mutates no data:
	 * all task CRUD lives at `/tareas` and objective CRUD at `/calendar`.
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
		<div class="card-slot card-slot-calendar">
			<MiniCalendarCard month={data.month} today={data.today} monthKey={data.today.slice(0, 7)} />
		</div>
		<div class="card-slot card-slot-deadlines">
			<UpcomingDeadlinesCard list={data.list} today={data.today} />
		</div>
		<div class="card-slot card-slot-subjects">
			<SubjectsCard />
		</div>
	</div>
</div>

<style>
	.dashboard {
		display: flex;
		flex-direction: column;
		gap: var(--space-8);
	}

	/* Dashboard 12-column grid (design): named areas mirror the reference
	   layout — Tareas tall on the left, Calendario over Próximos vencimientos
	   on the right, Materias full width below. Cards stack on narrow
	   viewports (dashboard spec "Responsive layout and tokens"). */
	.dashboard-grid {
		display: grid;
		grid-template-columns: repeat(12, 1fr);
		grid-template-areas:
			'tasks tasks tasks tasks tasks tasks tasks cal cal cal cal cal'
			'tasks tasks tasks tasks tasks tasks tasks dead dead dead dead dead'
			'subj subj subj subj subj subj subj subj subj subj subj subj';
		gap: var(--space-6);
	}
	.card-slot-tasks {
		grid-area: tasks;
	}
	.card-slot-calendar {
		grid-area: cal;
	}
	.card-slot-deadlines {
		grid-area: dead;
	}
	.card-slot-subjects {
		grid-area: subj;
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

	@media (max-width: 640px) {
		.dashboard-grid {
			grid-template-columns: 1fr;
			grid-template-areas: 'tasks' 'cal' 'dead' 'subj';
		}
	}
</style>
