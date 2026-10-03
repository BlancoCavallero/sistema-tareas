/**
 * Pure domain for study pages — no D1 access, no Svelte runes.
 *
 * Study pages organize subjects -> topics -> main ideas. Completion derives at
 * read time from each idea's stored `done` flag (design D2), never stored, so
 * the only invariants live in this module: `deriveProgress` never produces NaN
 * (0/0 -> 0) and `groupByYear` keeps the null cursada group first while each
 * group preserves the (position, id) order of its input.
 */

export interface SubjectRow {
	id: number;
	name: string;
	year_group: string | null; // nullable cursada grouping
	position: number;
	created_at: string; // ISO-8601 UTC
}

export interface IdeaProgress {
	checked: number;
	total: number;
	percent: number; // 0..100, rounded; 0/0 -> 0 (never NaN)
}

/**
 * Derive read-time completion for a topic from its idea rows.
 * An empty topic maps to 0% instead of NaN; otherwise percent is
 * `Math.round(checked / total * 100)`.
 */
export function deriveProgress(ideas: { done: boolean }[]): IdeaProgress {
	const total = ideas.length;
	const checked = ideas.filter((idea) => idea.done).length;
	const percent = total === 0 ? 0 : Math.round((checked / total) * 100);
	return { checked, total, percent };
}

export interface YearGroup {
	yearGroup: string | null;
	subjects: SubjectRow[];
}

/**
 * Group subjects by their nullable `year_group`. The null (uncursada) group
 * always comes first; named groups keep first-encounter order. Within each
 * group the input order (position, id) is preserved.
 */
export function groupByYear(subjects: SubjectRow[]): YearGroup[] {
	const groups: YearGroup[] = [];
	const index = new Map<string | null, number>();
	for (const subject of subjects) {
		const key = subject.year_group;
		const existing = index.get(key);
		if (existing === undefined) {
			index.set(key, groups.length);
			groups.push({ yearGroup: key, subjects: [subject] });
		} else {
			groups[existing].subjects.push(subject);
		}
	}
	return groups.sort((a, b) => {
		if (a.yearGroup === null && b.yearGroup !== null) return -1;
		if (a.yearGroup !== null && b.yearGroup === null) return 1;
		return 0;
	});
}

/** A name is valid when trimming leaves something (create-form guard). */
export function isValidName(raw: string): boolean {
	return raw.trim().length > 0;
}
