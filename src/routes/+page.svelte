<script lang="ts">
	import { resolve } from '$app/paths';

	const tareasHref = resolve('/tareas');
</script>

<svelte:head>
	<title>Inicio — Sistema de Tareas</title>
</svelte:head>

<h1>Inicio</h1>
<p>
	Bienvenido a Estudia. Tus tareas están en
	<a href={tareasHref}>Tareas</a>.
</p>
