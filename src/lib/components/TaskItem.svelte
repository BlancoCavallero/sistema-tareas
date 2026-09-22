<script lang="ts" module>
	const WEEKDAY_LABELS: Record<number, string> = {
		1: 'Lunes',
		2: 'Martes',
		3: 'Miércoles',
		4: 'Jueves',
		5: 'Viernes',
		6: 'Sábado',
		7: 'Domingo'
	};
</script>

<script lang="ts">
	import { enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import type { CompletionRow, TaskWithDone } from '$lib/server/tasks/repository';

	let {
		task,
		history = []
	}: {
		task: TaskWithDone;
		history?: CompletionRow[];
	} = $props();

	// Local UI state only — server data arrives as props.
	let editing = $state(false);
	let showHistory = $state(false);
	let editTitle = $state('');

	function startEditing() {
		// Seed the edit input from the current title each time it opens.
		editTitle = task.title;
		editing = true;
	}

	const recurrenceLabel = $derived.by(() => {
		switch (task.recurrence_type) {
			case 'daily':
				return 'Diaria';
			case 'weekly':
				return `Semanal (${WEEKDAY_LABELS[task.recurrence_dow ?? 1] ?? ''})`;
			case 'monthly':
				return `Mensual (día ${task.recurrence_dom ?? 1})`;
			default:
				return null;
		}
	});

	const statusLabel = $derived(task.done ? 'Completada' : 'Pendiente');
	const historyLabel = $derived(
		showHistory ? 'Ocultar historial' : `Historial (${history.length})`
	);

	function onSubmit() {
		return async ({
			update
		}: {
			update: (options?: { reset?: boolean; invalidateAll?: boolean }) => Promise<void>;
		}) => {
			await update({ reset: false });
			editing = false;
			await invalidateAll();
		};
	}
</script>

<article class="task-item" class:done={task.done}>
	<div class="task-main">
		<h3>{task.title}</h3>
		<p class="meta">
			Vence: {task.next_due}
			{#if recurrenceLabel}
				<span class="badge">{recurrenceLabel} ({task.recurrence_mode})</span>
			{/if}
			<span class="status">{statusLabel}</span>
		</p>
	</div>

	{#if editing}
		<form method="POST" action="?/edit" use:enhance={onSubmit} class="edit-form">
			<input type="hidden" name="id" value={task.id} />
			<input name="title" type="text" required bind:value={editTitle} aria-label="Nuevo título" />
			<button type="submit">Guardar</button>
			<button type="button" onclick={() => (editing = false)}>Cancelar</button>
		</form>
	{:else}
		<div class="actions">
			{#if task.done}
				<form method="POST" action="?/uncomplete" use:enhance={onSubmit}>
					<input type="hidden" name="id" value={task.id} />
					<button type="submit">Deshacer</button>
				</form>
			{:else}
				<form method="POST" action="?/complete" use:enhance={onSubmit}>
					<input type="hidden" name="id" value={task.id} />
					<button type="submit">Completar</button>
				</form>
			{/if}
			<button type="button" onclick={startEditing}>Editar</button>
			<form method="POST" action="?/delete" use:enhance={onSubmit}>
				<input type="hidden" name="id" value={task.id} />
				<button type="submit" class="danger">Eliminar</button>
			</form>
		</div>
	{/if}

	<div class="history">
		<button type="button" class="history-toggle" onclick={() => (showHistory = !showHistory)}>
			{historyLabel}
		</button>
		{#if showHistory}
			{#if history.length === 0}
				<p>Sin completados aún.</p>
			{:else}
				<ul>
					{#each history as entry (entry.id)}
						<li>{entry.occurrence_date}</li>
					{/each}
				</ul>
			{/if}
		{/if}
	</div>
</article>

<style>
	.task-item {
		border: 1px solid #d0d7de;
		border-radius: 0.5rem;
		padding: 0.75rem 1rem;
		margin-bottom: 0.75rem;
	}
	.task-item.done {
		opacity: 0.65;
	}
	.task-main {
		display: flex;
		justify-content: space-between;
		align-items: baseline;
		gap: 1rem;
	}
	.task-main h3 {
		margin: 0;
		font-size: 1.05rem;
	}
	.meta {
		display: flex;
		gap: 0.6rem;
		align-items: center;
		margin: 0.25rem 0 0;
		font-size: 0.9rem;
		color: #57606a;
	}
	.badge {
		background: #ddf4ff;
		border-radius: 999px;
		padding: 0.1rem 0.6rem;
	}
	.status {
		font-weight: 600;
	}
	.task-item.done .status {
		color: #1a7f37;
	}
	.actions {
		display: flex;
		gap: 0.5rem;
		margin-top: 0.6rem;
		flex-wrap: wrap;
	}
	.actions form {
		margin: 0;
	}
	.actions button {
		padding: 0.3rem 0.7rem;
	}
	.danger {
		color: #b00020;
	}
	.edit-form {
		display: flex;
		gap: 0.5rem;
		margin-top: 0.6rem;
	}
	.history {
		margin-top: 0.6rem;
	}
	.history-toggle {
		background: none;
		border: none;
		color: #0969da;
		cursor: pointer;
		padding: 0;
		font-size: 0.9rem;
	}
	.history ul {
		margin: 0.4rem 0 0;
		padding-left: 1.2rem;
	}
	.history p {
		margin: 0.4rem 0 0;
		font-size: 0.9rem;
		color: #57606a;
	}
</style>
