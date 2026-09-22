<script lang="ts">
	import { resolve } from '$app/paths';
	import type { ObjectiveRow } from '$lib/server/objectives/repository';
	import ObjectiveGrid from '../ObjectiveGrid.svelte';
	import DashboardCard from './DashboardCard.svelte';

	/**
	 * "Calendario" dashboard card (design D5 + dashboard spec "Calendario mini
	 * month grid"): wraps the ObjectiveGrid in its compact mode for the current
	 * month (`monthKey`), titled with the Spanish month name, with a footer
	 * link to the full `/calendar` page. It consumes the bounded `listMonth`
	 * read from the root load (<= 200) — no new query. The grid keeps its
	 * display semantics: `<time datetime>` day numbers and exactly one
	 * `aria-current="date"` on today (never an ARIA `role="grid"`).
	 */
	let { month, today, monthKey }: { month: ObjectiveRow[]; today: string; monthKey: string } =
		$props();

	/** Spanish month heading, e.g. "Septiembre de 2026" (UTC-pinned). */
	function monthName(key: string): string {
		const [year, monthNumber] = key.split('-').map(Number);
		const name = new Intl.DateTimeFormat('es-AR', {
			timeZone: 'UTC',
			month: 'long',
			year: 'numeric'
		}).format(new Date(Date.UTC(year, monthNumber - 1, 1)));
		return name.charAt(0).toUpperCase() + name.slice(1);
	}

	const heading = $derived(monthName(monthKey));
	const allHref = resolve('/calendar');
</script>

<DashboardCard
	title={heading}
	titleId="mini-calendar"
	href={allHref}
	linkLabel="Ver calendario completo"
>
	<ObjectiveGrid {month} {today} {monthKey} compact />
</DashboardCard>
