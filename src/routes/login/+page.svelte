<script lang="ts">
	import { enhance } from '$app/forms';

	let { form } = $props();
</script>

<svelte:head>
	<title>Iniciar sesión — Sistema de Tareas</title>
</svelte:head>

<main class="login">
	<h1>Sistema de Tareas</h1>
	<p>Ingrese la contraseña para acceder.</p>

	{#if form?.message}
		<p class="error" role="alert">{form.message}</p>
	{/if}

	<form method="POST" action="?/login" use:enhance>
		<label for="password">Contraseña</label>
		<input id="password" name="password" type="password" required autocomplete="current-password" />
		<button type="submit">Ingresar</button>
	</form>
</main>

<style>
	.login {
		max-width: 24rem;
		margin: 4rem auto;
		padding: 0 1rem;
	}
	.error {
		color: #b00020;
	}
	form {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}
	input {
		padding: 0.5rem;
		font-size: 1rem;
	}
	button {
		padding: 0.5rem;
		font-size: 1rem;
	}
</style>
