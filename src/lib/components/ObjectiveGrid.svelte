<script lang="ts">
	import { monthGridDates } from '$lib/domain/objectives';
	import type { ObjectiveRow } from '$lib/server/objectives/repository';
	import { KIND_LABELS } from './ObjectiveItem.svelte';

	/**
	 * Read-only month grid for `/calendar` (design: "semantic display grid").
	 *
	 * This is a VISUALIZATION, not an interactive widget: dates are chosen with
	 * `<input type="date">` in the form, so there is deliberately NO
	 * `role="grid"`, no `gridcell`, no roving tabindex and no arrow-key
	 * machinery (research L1-4/L1-5/L1-6 — faking the APG grid pattern without
	 * its keyboard model would be worse than not using it).
	 *
	 * Layout follows research L1-1: a 7-column `repeat(7, 1fr)` grid, Monday
	 * first (matching `monthGridDates`, whose leading `null` blanks are the ISO
	 * offset), the first day pushed into its weekday column with
	 * `grid-column-start`, and auto-placement flowing the remaining days.
	 * Trailing cells of a partial last week are intentionally NOT padded: the
	 * grid shows leading blanks + days only (design open question resolved in
	 * apply). Day numbers use `<time datetime="YYYY-MM-DD">`, and today's cell
	 * carries `aria-current="date"` (research L1-7, exactly one element).
	 */
	let { month, today, monthKey }: { month: ObjectiveRow[]; today: string; monthKey: string } =
		$props();

	/** Monday-first weekday headers, matching the ISO offset of `monthGridDates`. */
	const WEEKDAYS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

	const cells = $derived.by(() => {
		const [year, monthNumber] = monthKey.split('-').map(Number);
		return monthGridDates(year, monthNumber);
	});

	/** Grid column (1-7) of the first day of the month = leading blanks + 1. */
	const firstDayIndex = $derived(cells.findIndex((cell) => cell !== null));

	/** Objectives grouped by due date so each day cell renders its own chips. */
	const byDay = $derived.by(() => {
		const grouped: Record<string, ObjectiveRow[]> = {};
		for (const objective of month) {
			(grouped[objective.due_date] ??= []).push(objective);
		}
		return grouped;
	});
</script>

{#if month.length === 0}
	<p class="month-empty">No hay objetivos este mes.</p>
{/if}

<div class="month-grid">
	{#each WEEKDAYS as weekday (weekday)}
		<span class="grid-weekday">{weekday}</span>
	{/each}

	{#each cells as cell, index (cell ?? `blank-${index}`)}
		{#if cell === null}
			<span class="grid-cell blank" aria-hidden="true"></span>
		{:else}
			{@const dayObjectives = byDay[cell] ?? []}
			<div
				class="grid-cell"
				class:today={cell === today}
				style:grid-column-start={index === firstDayIndex ? firstDayIndex + 1 : undefined}
				aria-current={cell === today ? 'date' : undefined}
			>
				<time class="day-number" datetime={cell}>{Number(cell.slice(8))}</time>
				{#if dayObjectives.length > 0}
					<ul class="chips">
						{#each dayObjectives as objective (objective.id)}
							<li class="chip chip-{objective.kind}">
								<span class="chip-kind">{KIND_LABELS[objective.kind]}</span>
								<span class="chip-title">{objective.title}</span>
							</li>
						{/each}
					</ul>
				{/if}
			</div>
		{/if}
	{/each}
</div>

<style>
	.month-empty {
		color: var(--color-text-secondary);
		font-size: var(--text-sm);
		margin: 0 0 var(--space-3);
	}
	.month-grid {
		display: grid;
		grid-template-columns: repeat(7, 1fr);
		gap: var(--space-1);
	}
	.grid-weekday {
		font-size: var(--text-sm);
		font-weight: 600;
		color: var(--color-text-secondary);
		text-align: center;
		padding: var(--space-1) 0;
	}
	.grid-cell {
		border: 1px solid var(--color-border);
		border-radius: var(--radius-sm);
		background: var(--color-surface);
		min-height: 5rem;
		padding: var(--space-1);
		overflow: hidden;
	}
	.grid-cell.today {
		border-color: var(--color-accent);
		box-shadow: inset 0 0 0 1px var(--color-accent);
	}
	.grid-cell.blank {
		border: none;
		background: none;
		min-height: 0;
		padding: 0;
	}
	.day-number {
		font-size: var(--text-sm);
		color: var(--color-text);
	}
	.today .day-number {
		color: var(--color-accent);
		font-weight: 700;
	}
	.chips {
		list-style: none;
		margin: var(--space-1) 0 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: var(--space-1);
	}
	.chip {
		display: flex;
		gap: var(--space-1);
		align-items: baseline;
		font-size: var(--text-sm);
		border-radius: var(--radius-full);
		padding: 0.05rem 0.5rem;
		border: 1px solid transparent;
		min-width: 0;
	}
	.chip-exam {
		background: var(--color-accent-soft);
		color: var(--color-accent);
		border-color: var(--color-accent);
	}
	.chip-deadline {
		background: var(--color-overdue-bg);
		color: var(--color-overdue-text);
		border-color: var(--color-overdue-text);
	}
	.chip-other {
		background: var(--color-bg);
		color: var(--color-text-secondary);
		border-color: var(--color-border-strong);
	}
	.chip-kind {
		flex-shrink: 0;
		font-weight: 600;
	}
	.chip-title {
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	/* Narrow screens: cells and chips compact instead of breaking the grid
	   (research L2 — the 7-column grid is kept at all widths). */
	@media (max-width: 480px) {
		.grid-cell {
			min-height: 3.25rem;
			padding: var(--space-1);
		}
		.chip {
			padding: 0 0.35rem;
		}
		.chip-kind {
			display: none; /* title remains; kind is still in the list views */
		}
	}
</style>
