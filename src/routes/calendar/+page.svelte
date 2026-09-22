<script lang="ts">
	import ObjectiveForm from '$lib/components/ObjectiveForm.svelte';
	import ObjectiveList from '$lib/components/ObjectiveList.svelte';

	let { data, form } = $props();
</script>

<svelte:head>
	<title>Calendario — Sistema de Tareas</title>
</svelte:head>

<h1>Calendario</h1>

<ObjectiveForm {form} />

<ObjectiveList list={data.list} today={data.today} />
