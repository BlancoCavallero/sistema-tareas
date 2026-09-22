<script lang="ts">
	import { resolve } from '$app/paths';
	import ObjectiveForm from '$lib/components/ObjectiveForm.svelte';
	import ObjectiveGrid from '$lib/components/ObjectiveGrid.svelte';
	import ObjectiveList from '$lib/components/ObjectiveList.svelte';

	/**
	 * `/calendar` page. The route `load` resolves `?month=YYYY-MM` (defaulting
	 * to the current ART month) and returns `{ list, month, today, monthKey }`;
	 * the grid + month navigation are driven by `monthKey` and the lists by
	 * `list`/`today` (upcoming/overdue/all split inside ObjectiveList).
	 */
	let { data, form } = $props();

	/** Spanish month heading, e.g. "Septiembre de 2026". */
	function monthName(key: string): string {
		const [year, month] = key.split('-').map(Number);
		const name = new Intl.DateTimeFormat('es-AR', {
			timeZone: 'UTC',
			month: 'long',
			year: 'numeric'
		}).format(new Date(Date.UTC(year, month - 1, 1)));
		return name.charAt(0).toUpperCase() + name.slice(1);
	}

	/** Shift a YYYY-MM key by a signed number of months (UTC-safe, no Date math). */
	function shiftMonth(key: string, delta: number): string {
		const [year, month] = key.split('-').map(Number);
		const total = year * 12 + (month - 1) + delta;
		const shiftedYear = Math.floor(total / 12);
		const shiftedMonth = (total % 12) + 1;
		return `${shiftedYear}-${String(shiftedMonth).padStart(2, '0')}`;
	}

	const heading = $derived(monthName(data.monthKey));
	const prevKey = $derived(shiftMonth(data.monthKey, -1));
	const nextKey = $derived(shiftMonth(data.monthKey, 1));
	const prevLabel = $derived(monthName(prevKey));
	const nextLabel = $derived(monthName(nextKey));

	/** Calendar page href for a month key, resolved for `kit.paths.base` (lint rule). */
	const prevHref = $derived(resolve(`/calendar?month=${prevKey}`));
	const nextHref = $derived(resolve(`/calendar?month=${nextKey}`));
</script>

<svelte:head>
	<title>Calendario — Sistema de Tareas</title>
</svelte:head>

<h1>Calendario</h1>

<ObjectiveForm {form} />

<section class="objective-grid-section" aria-labelledby="objectives-grid">
	<div class="grid-heading">
		<h2 id="objectives-grid">{heading}</h2>
		<nav class="month-nav" aria-label="Navegar meses">
			<a href={prevHref} aria-label="Mes anterior: {prevLabel}">← {prevLabel}</a>
			<a href={nextHref} aria-label="Mes siguiente: {nextLabel}">{nextLabel} →</a>
		</nav>
	</div>
	<ObjectiveGrid month={data.month} today={data.today} monthKey={data.monthKey} />
</section>

<ObjectiveList list={data.list} today={data.today} />

<style>
	.objective-grid-section {
		margin-bottom: var(--space-8);
	}
	.grid-heading {
		display: flex;
		align-items: baseline;
		justify-content: space-between;
		gap: var(--space-4);
		flex-wrap: wrap;
		margin-bottom: var(--space-3);
	}
	.grid-heading h2 {
		font-size: var(--text-lg);
		margin: 0;
	}
	.month-nav {
		display: flex;
		gap: var(--space-3);
		font-size: var(--text-sm);
	}
	.month-nav a {
		color: var(--color-accent);
		text-decoration: none;
	}
	.month-nav a:hover {
		text-decoration: underline;
	}
</style>
