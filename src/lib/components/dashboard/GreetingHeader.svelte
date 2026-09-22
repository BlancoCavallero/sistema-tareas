<script lang="ts">
	import { parseDate } from '$lib/domain/recurrence';

	/** Spanish long-form date formatter, pinned to UTC so the day never shifts. */
	const esLongDate = new Intl.DateTimeFormat('es-AR', {
		timeZone: 'UTC',
		weekday: 'long',
		day: 'numeric',
		month: 'long'
	});

	/**
	 * Dashboard greeting header (design: `{ today, hour? }` — Spanish long
	 * date + greeting, no user name; design open question resolved).
	 *
	 * Greeting by hour:
	 * - 00–11 → "Buenos días"
	 * - 12–18 → "Buenas tardes"
	 * - 19–23 → "Buenas noches"
	 *
	 * `hour` is optional and defaults to the client clock at render time; the
	 * root load only carries `today`, and tests inject a fixed hour for
	 * deterministic greetings.
	 */
	let { today, hour = new Date().getHours() }: { today: string; hour?: number } = $props();

	const greeting = $derived(
		hour < 12 ? 'Buenos días' : hour < 19 ? 'Buenas tardes' : 'Buenas noches'
	);

	/** e.g. "Martes, 22 de septiembre" — capitalized first letter. */
	const longDate = $derived.by(() => {
		const { year, month, day } = parseDate(today);
		const formatted = esLongDate.format(new Date(Date.UTC(year, month - 1, day)));
		return formatted.charAt(0).toUpperCase() + formatted.slice(1);
	});
</script>

<header class="greeting-header">
	<h1 class="greeting">{greeting}</h1>
	<p class="date">{longDate}</p>
</header>

<style>
	.greeting-header {
		display: flex;
		flex-direction: column;
		gap: var(--space-1);
	}
	.greeting {
		font-size: var(--text-2xl);
		margin: 0;
	}
	.date {
		color: var(--color-text-secondary);
		margin: 0;
	}
</style>
