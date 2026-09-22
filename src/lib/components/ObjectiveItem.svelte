<script lang="ts" module>
	import type { ObjectiveKind, ObjectiveStatus } from '$lib/domain/objectives';

	/** Spanish labels for the three objective kinds (distinct chips in the UI). */
	export const KIND_LABELS: Record<ObjectiveKind, string> = {
		exam: 'Examen',
		deadline: 'Vencimiento',
		other: 'Otro'
	};

	export const KINDS: { value: ObjectiveKind; label: string }[] = [
		{ value: 'exam', label: KIND_LABELS.exam },
		{ value: 'deadline', label: KIND_LABELS.deadline },
		{ value: 'other', label: KIND_LABELS.other }
	];
</script>

<script lang="ts">
	import { enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import { deriveStatus, formatDisplayDate } from '$lib/domain/objectives';
	import type { ObjectiveRow } from '$lib/server/objectives/repository';

	/**
	 * One objective card. Status is derived at render time from the ART `today`
	 * string (never stored), and the status chip always carries a text cue
	 * ("Próxima" / "Vencida" / "Completada") so meaning never depends on color.
	 */
	let { objective, today }: { objective: ObjectiveRow; today: string } = $props();

	const STATUS_LABELS: Record<ObjectiveStatus, string> = {
		upcoming: 'Próxima',
		overdue: 'Vencida',
		done: 'Completada'
	};

	// Local UI state only — server data arrives as props.
	let editing = $state(false);
	let editTitle = $state('');
	let editKind = $state<ObjectiveKind>('exam');
	let editDue = $state('');
	let editNotes = $state('');

	const status = $derived(deriveStatus(objective.due_date, objective.done, today));
	const kindLabel = $derived(KIND_LABELS[objective.kind]);
	const statusLabel = $derived(STATUS_LABELS[status]);
	const displayDate = $derived(formatDisplayDate(objective.due_date));
	const toggleLabel = $derived(objective.done ? 'Desmarcar' : 'Marcar hecha');

	function startEditing() {
		// Seed the edit fields from the current objective each time the form opens.
		editTitle = objective.title;
		editKind = objective.kind;
		editDue = objective.due_date;
		editNotes = objective.notes ?? '';
		editing = true;
	}

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

<article class="objective-item" class:done={objective.done}>
	<div class="objective-main">
		<h3>{objective.title}</h3>
		<p class="meta">
			<span class="kind kind-{objective.kind}">{kindLabel}</span>
			<time class="due" datetime={objective.due_date}>{displayDate}</time>
			<span class="status status-{status}">{statusLabel}</span>
		</p>
	</div>

	{#if objective.notes}
		<p class="notes">{objective.notes}</p>
	{/if}

	{#if editing}
		<form method="POST" action="?/edit" use:enhance={onSubmit} class="edit-form">
			<input type="hidden" name="id" value={objective.id} />
			<input name="title" type="text" required bind:value={editTitle} aria-label="Título" />
			<select name="kind" bind:value={editKind} aria-label="Tipo">
				{#each KINDS as option (option.value)}
					<option value={option.value}>{option.label}</option>
				{/each}
			</select>
			<input name="due_date" type="date" required bind:value={editDue} aria-label="Fecha" />
			<textarea name="notes" rows="2" bind:value={editNotes} aria-label="Notas"></textarea>
			<button type="submit">Guardar</button>
			<button type="button" onclick={() => (editing = false)}>Cancelar</button>
		</form>
	{:else}
		<div class="actions">
			<form method="POST" action="?/toggle" use:enhance={onSubmit}>
				<input type="hidden" name="id" value={objective.id} />
				<button type="submit">{toggleLabel}</button>
			</form>
			<button type="button" onclick={startEditing}>Editar</button>
			<form method="POST" action="?/delete" use:enhance={onSubmit}>
				<input type="hidden" name="id" value={objective.id} />
				<button type="submit" class="danger">Eliminar</button>
			</form>
		</div>
	{/if}
</article>

<style>
	.objective-item {
		border: 1px solid var(--color-border);
		border-radius: var(--radius-md);
		padding: var(--space-3) var(--space-4);
		margin-bottom: var(--space-3);
	}
	.objective-item.done {
		opacity: 0.65;
	}
	.objective-main {
		display: flex;
		justify-content: space-between;
		align-items: baseline;
		gap: var(--space-4);
	}
	.objective-main h3 {
		margin: 0;
		font-size: var(--text-base);
	}
	.meta {
		display: flex;
		gap: var(--space-2);
		align-items: center;
		flex-wrap: wrap;
		margin: var(--space-1) 0 0;
		font-size: var(--text-sm);
		color: var(--color-text-secondary);
	}
	.kind {
		border-radius: var(--radius-full);
		padding: 0.1rem 0.6rem;
		border: 1px solid transparent;
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
	.status {
		font-weight: 600;
	}
	.status-upcoming {
		color: var(--color-accent);
	}
	.status-overdue {
		background: var(--color-overdue-bg);
		color: var(--color-overdue-text);
		border-radius: var(--radius-full);
		padding: 0.1rem 0.6rem;
	}
	.status-done {
		color: var(--color-success);
	}
	.notes {
		margin: var(--space-2) 0 0;
		font-size: var(--text-sm);
		color: var(--color-text-secondary);
	}
	.actions {
		display: flex;
		gap: var(--space-2);
		margin-top: var(--space-3);
		flex-wrap: wrap;
	}
	.actions form {
		margin: 0;
	}
	.actions button {
		padding: var(--space-1) var(--space-3);
	}
	.danger {
		color: var(--color-danger);
	}
	.edit-form {
		display: flex;
		gap: var(--space-2);
		margin-top: var(--space-3);
		flex-wrap: wrap;
	}
	.edit-form input,
	.edit-form select,
	.edit-form textarea {
		padding: var(--space-1) var(--space-2);
		font-size: var(--text-sm);
		background: var(--color-bg);
		color: var(--color-text);
		border: 1px solid var(--color-border-strong);
		border-radius: var(--radius-sm);
	}
</style>
