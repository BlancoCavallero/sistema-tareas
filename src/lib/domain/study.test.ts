import { describe, expect, it } from 'vitest';
import { deriveProgress, groupByYear, isValidName } from './study';
import type { SubjectRow } from './study';

/**
 * Unit coverage for the pure study domain (design "Testing Strategy"):
 * progress math with the 0/0 edge (never NaN), full and partial topics,
 * year grouping with the null cursada group first, and the name guard.
 */

describe('deriveProgress', () => {
	it('maps an empty topic to 0/0 with 0 percent (no NaN)', () => {
		expect(deriveProgress([])).toEqual({ checked: 0, total: 0, percent: 0 });
	});

	it('maps a fully checked topic to 100 percent', () => {
		const ideas = [{ done: true }, { done: true }, { done: true }, { done: true }];
		expect(deriveProgress(ideas)).toEqual({ checked: 4, total: 4, percent: 100 });
	});

	it('maps a partially checked topic to the rounded percent', () => {
		const ideas = [
			{ done: true },
			{ done: true },
			{ done: false },
			{ done: false },
			{ done: false }
		];
		expect(deriveProgress(ideas)).toEqual({ checked: 2, total: 5, percent: 40 });
	});
});

describe('groupByYear', () => {
	const subject = (id: number, name: string, year_group: string | null): SubjectRow => ({
		id,
		name,
		year_group,
		position: 0,
		created_at: '2026-10-03T00:00:00.000Z'
	});

	it('puts the null year_group group first, then named groups in first-encounter order', () => {
		const subjects = [
			subject(1, 'Álgebra', '2026'),
			subject(2, 'Anatomía', null),
			subject(3, 'Física', '2026'),
			subject(4, 'Inglés', '2025')
		];
		const groups = groupByYear(subjects);
		expect(groups.map((group) => group.yearGroup)).toEqual([null, '2026', '2025']);
		const nullGroup = groups.find((group) => group.yearGroup === null);
		expect(nullGroup?.subjects.map((s) => s.name)).toEqual(['Anatomía']);
	});

	it('preserves the input (position, id) order within each group', () => {
		const subjects = [
			{ ...subject(1, 'Álgebra', null), position: 0 },
			{ ...subject(2, 'Anatomía', null), position: 1 },
			{ ...subject(3, 'Física', '2026'), position: 0 },
			{ ...subject(4, 'Inglés', '2026'), position: 1 }
		];
		const groups = groupByYear(subjects);
		expect(groups[0].subjects.map((s) => s.name)).toEqual(['Álgebra', 'Anatomía']);
		expect(groups[1].subjects.map((s) => s.name)).toEqual(['Física', 'Inglés']);
	});

	it('returns an empty list for no subjects', () => {
		expect(groupByYear([])).toEqual([]);
	});
});

describe('isValidName', () => {
	it('accepts a trimmed non-empty name', () => {
		expect(isValidName('Anatomía')).toBe(true);
		expect(isValidName('  Álgebra  ')).toBe(true);
	});

	it('rejects empty and whitespace-only input', () => {
		expect(isValidName('')).toBe(false);
		expect(isValidName('   ')).toBe(false);
	});
});
