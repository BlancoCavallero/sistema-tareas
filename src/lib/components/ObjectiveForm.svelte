<script lang="ts">
	import { enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';

	let { form } = $props<{ form?: { message?: string } | null }>();

	// Local UI state only — server data flows in as props ($derived for computation).
	let title = $state('');
	let kind = $state('exam');
	let dueDate = $state('');
	let notes = $state('');

	const KINDS = [
		{ value: 'exam', label: 'Examen' },
		{ value: 'deadline', label: 'Vencimiento' },
		{ value: 'other', label: 'Otro' }
	];

	function onSubmit() {
		return async ({
			update
		}: {
			update: (options?: { reset?: boolean; invalidateAll?: boolean }) => Promise<void>;
		}) => {
			await update({ reset: false });
			title = '';
			dueDate = '';
			notes = '';
			await invalidateAll();
		};
	}
</script>

<form method="POST" action="?/create" use:enhance={onSubmit} class="objective-form">
	<label for="objective-title">Título</label>
	<input
		id="objective-title"
		name="title"
		type="text"
		placeholder="Ej: Parcial de álgebra"
		required
		bind:value={title}
	/>

	<label for="objective-kind">Tipo</label>
	<select id="objective-kind" name="kind" bind:value={kind}>
		{#each KINDS as option (option.value)}
			<option value={option.value}>{option.label}</option>
		{/each}
	</select>

	<label for="objective-due">Fecha</label>
	<input id="objective-due" name="due_date" type="date" required bind:value={dueDate} />

	<label for="objective-notes">Notas</label>
	<textarea id="objective-notes" name="notes" rows="2" bind:value={notes}></textarea>

	{#if form?.message}
		<p class="error" role="alert">{form.message}</p>
	{/if}

	<button type="submit">Crear objetivo</button>
</form>

<style>
	.objective-form {
		display: grid;
		grid-template-columns: max-content 1fr;
		gap: var(--space-2) var(--space-4);
		align-items: center;
		max-width: 36rem;
		margin-bottom: var(--space-6);
	}
	.objective-form button {
		grid-column: 1 / -1;
		justify-self: start;
		padding: var(--space-2) var(--space-4);
		background: var(--color-accent);
		color: var(--color-bg);
		border: 1px solid var(--color-accent);
		border-radius: var(--radius-sm);
		cursor: pointer;
	}
	.objective-form button:hover {
		opacity: 0.9;
	}
	.objective-form input,
	.objective-form select,
	.objective-form textarea {
		padding: var(--space-2);
		font-size: var(--text-base);
		background: var(--color-bg);
		color: var(--color-text);
		border: 1px solid var(--color-border-strong);
		border-radius: var(--radius-sm);
	}
	.error {
		grid-column: 1 / -1;
		color: var(--color-danger);
		margin: 0;
	}
</style>
