<script lang="ts">
	import TaskForm from './TaskForm.svelte';
	import TaskItem from './TaskItem.svelte';
	import type { CompletionRow, TaskWithDone } from '$lib/server/tasks/repository';

	let {
		tasks,
		history = [],
		form = null
	}: {
		tasks: TaskWithDone[];
		history?: CompletionRow[];
		form?: { message?: string } | null;
	} = $props();

	// Group the page's completion log by task — one IN query on the server,
	// grouped here with $derived (server data is never mutated).
	const historyByTask = $derived(
		history.reduce((groups, entry) => {
			const list = groups.get(entry.task_id) ?? [];
			list.push(entry);
			groups.set(entry.task_id, list);
			return groups;
		}, new Map<number, CompletionRow[]>())
	);
</script>

<TaskForm {form} />

{#if tasks.length === 0}
	<p class="empty">No hay tareas todavía.</p>
{:else}
	<ul class="task-list">
		{#each tasks as task (task.id)}
			<li><TaskItem {task} history={historyByTask.get(task.id) ?? []} /></li>
		{/each}
	</ul>
{/if}

<style>
	.task-list {
		list-style: none;
		margin: 0;
		padding: 0;
	}
	.task-list li {
		margin: 0;
	}
	.empty {
		color: #57606a;
	}
</style>
