<script lang="ts">
	import { resolve } from '$app/paths';
	import DashboardCard from './DashboardCard.svelte';

	/**
	 * "Materias" dashboard card (design D7 + dashboard spec "Materias entry
	 * cards"): static entry tiles linking to `/study`. No subjects repository
	 * exists yet (per-subject pages are a later change), so the tiles describe
	 * the planned study structure — subject → topic → main ideas — and never
	 * read data. Tints come from the additive tokens: blue reuses
	 * `--color-accent-soft`, amber and violet use the new pairs from task 3.8.
	 */
	const studyHref = resolve('/study');

	const TILES = [
		{ tint: 'blue', title: 'Materias', text: 'Cada materia, tema e ideas principales' },
		{ tint: 'amber', title: 'Temas', text: 'Seguimiento del avance por tema' },
		{ tint: 'violet', title: 'Ideas principales', text: 'Se completa al marcar todas sus ideas' }
	];
</script>

<DashboardCard title="Materias" titleId="materias">
	<ul class="subject-tiles">
		{#each TILES as tile (tile.title)}
			<li>
				<a class="subject-tile subject-tile-{tile.tint}" href={studyHref}>
					<span class="tile-title">{tile.title}</span>
					<span class="tile-text">{tile.text}</span>
				</a>
			</li>
		{/each}
	</ul>
</DashboardCard>

<style>
	.subject-tiles {
		list-style: none;
		margin: 0;
		padding: 0;
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(10rem, 1fr));
		gap: var(--space-3);
	}
	.subject-tile {
		display: flex;
		flex-direction: column;
		gap: var(--space-1);
		height: 100%;
		padding: var(--space-3) var(--space-4);
		border: 1px solid transparent;
		border-radius: var(--radius-md);
		text-decoration: none;
	}
	.subject-tile:hover {
		border-color: currentColor;
	}
	.tile-title {
		font-weight: 700;
	}
	.tile-text {
		font-size: var(--text-sm);
	}
	.subject-tile-blue {
		background: var(--color-accent-soft);
		color: var(--color-accent);
	}
	.subject-tile-amber {
		background: var(--color-amber-soft);
		color: var(--color-amber);
	}
	.subject-tile-violet {
		background: var(--color-violet-soft);
		color: var(--color-violet);
	}
</style>
