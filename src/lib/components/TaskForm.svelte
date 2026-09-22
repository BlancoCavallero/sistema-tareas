<script lang="ts">
	import { enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';

	let { form } = $props<{ form?: { message?: string } | null }>();

	// Local UI state only — server data flows in as props ($derived for computation).
	let title = $state('');
	let recurrenceType = $state('none');
	let recurrenceDow = $state('1');
	let recurrenceDom = $state('1');
	let recurrenceMode = $state('++');

	const WEEKDAYS = [
		{ value: '1', label: 'Lunes' },
		{ value: '2', label: 'Martes' },
		{ value: '3', label: 'Miércoles' },
		{ value: '4', label: 'Jueves' },
		{ value: '5', label: 'Viernes' },
		{ value: '6', label: 'Sábado' },
		{ value: '7', label: 'Domingo' }
	];

	function onSubmit() {
		return async ({
			update
		}: {
			update: (options?: { reset?: boolean; invalidateAll?: boolean }) => Promise<void>;
		}) => {
			await update({ reset: false });
			if (title) title = '';
			await invalidateAll();
		};
	}
</script>

<form method="POST" action="?/create" use:enhance={onSubmit} class="task-form">
	<label for="task-title">Título</label>
	<input
		id="task-title"
		name="title"
		type="text"
		placeholder="¿Qué hay que hacer?"
		required
		bind:value={title}
	/>

	<label for="task-recurrence">Repetición</label>
	<select id="task-recurrence" name="recurrence_type" bind:value={recurrenceType}>
		<option value="none">Sin repetición</option>
		<option value="daily">Diaria</option>
		<option value="weekly">Semanal</option>
		<option value="monthly">Mensual</option>
	</select>

	{#if recurrenceType === 'weekly'}
		<label for="task-dow">Día de la semana</label>
		<select id="task-dow" name="recurrence_dow" bind:value={recurrenceDow}>
			{#each WEEKDAYS as day (day.value)}
				<option value={day.value}>{day.label}</option>
			{/each}
		</select>
	{/if}

	{#if recurrenceType === 'monthly'}
		<label for="task-dom">Día del mes (1-31)</label>
		<input
			id="task-dom"
			name="recurrence_dom"
			type="number"
			min="1"
			max="31"
			bind:value={recurrenceDom}
		/>
	{/if}

	{#if recurrenceType !== 'none'}
		<label for="task-mode">Modo</label>
		<select id="task-mode" name="recurrence_mode" bind:value={recurrenceMode}>
			<option value="++">Fija (++): avanza al próximo día hábil</option>
			<option value=".+">Relativa (.+): cuenta desde la fecha completada</option>
		</select>
	{/if}

	{#if form?.message}
		<p class="error" role="alert">{form.message}</p>
	{/if}

	<button type="submit">Crear tarea</button>
</form>

<style>
	.task-form {
		display: grid;
		grid-template-columns: max-content 1fr;
		gap: 0.5rem 1rem;
		align-items: center;
		max-width: 36rem;
		margin-bottom: 1.5rem;
	}
	.task-form button {
		grid-column: 1 / -1;
		justify-self: start;
		padding: 0.5rem 1rem;
	}
	.task-form input,
	.task-form select {
		padding: 0.4rem;
		font-size: 1rem;
	}
	.error {
		grid-column: 1 / -1;
		color: #b00020;
		margin: 0;
	}
</style>
