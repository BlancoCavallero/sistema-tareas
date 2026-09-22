<script lang="ts">
	import TaskList from '$lib/components/TaskList.svelte';

	let { data, form } = $props();
</script>

<svelte:head>
	<title>Tareas — Sistema de Tareas</title>
</svelte:head>

<h1>Tareas</h1>
<TaskList tasks={data.tasks} history={data.history} {form} />
