<script lang="ts">
	import ObjectiveForm from '$lib/components/ObjectiveForm.svelte';

	let { form } = $props();
</script>

<svelte:head>
	<title>Calendario — Sistema de Tareas</title>
</svelte:head>

<h1>Calendario</h1>

<ObjectiveForm {form} />

<p class="placeholder">
	Las listas de objetivos y la grilla del mes llegarán en una próxima versión.
</p>

<style>
	.placeholder {
		color: var(--color-text-secondary);
	}
</style>
