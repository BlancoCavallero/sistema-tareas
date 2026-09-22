import { describe, expect, it } from 'vitest';
import {
	deriveStatus,
	formatDisplayDate,
	isObjectiveKind,
	monthBounds,
	monthGridDates
} from './objectives';

/**
 * Unit coverage for the pure objectives domain (design "Testing Strategy"):
 * status boundaries (due today = upcoming, due yesterday = overdue, done is
 * never overdue), kind narrowing, month bounds, grid offset (2026-09-01 is a
 * Tuesday -> one leading blank), and Spanish UTC-safe display dates.
 */

describe('deriveStatus', () => {
	it('marks an objective due today as upcoming', () => {
		expect(deriveStatus('2026-09-22', false, '2026-09-22')).toBe('upcoming');
	});

	it('marks an objective due in the future as upcoming', () => {
		expect(deriveStatus('2026-09-30', false, '2026-09-22')).toBe('upcoming');
	});

	it('marks a not-done objective due yesterday as overdue', () => {
		expect(deriveStatus('2026-09-21', false, '2026-09-22')).toBe('overdue');
	});

	it('never marks a done objective as overdue, even with a past due date', () => {
		expect(deriveStatus('2026-09-01', true, '2026-09-22')).toBe('done');
	});

	it('lets done win over an upcoming due date', () => {
		expect(deriveStatus('2026-10-01', true, '2026-09-22')).toBe('done');
	});
});

describe('isObjectiveKind', () => {
	it('accepts the three supported kinds', () => {
		expect(isObjectiveKind('exam')).toBe(true);
		expect(isObjectiveKind('deadline')).toBe(true);
		expect(isObjectiveKind('other')).toBe(true);
	});

	it('rejects anything else', () => {
		expect(isObjectiveKind('bogus')).toBe(false);
		expect(isObjectiveKind('')).toBe(false);
	});
});

describe('monthBounds', () => {
	it('returns the first and last day of the month', () => {
		expect(monthBounds(2026, 9)).toEqual({ start: '2026-09-01', end: '2026-09-30' });
		expect(monthBounds(2026, 12)).toEqual({ start: '2026-12-01', end: '2026-12-31' });
	});

	it('clamps February to the year-aware month length', () => {
		expect(monthBounds(2026, 2)).toEqual({ start: '2026-02-01', end: '2026-02-28' });
		expect(monthBounds(2024, 2)).toEqual({ start: '2024-02-01', end: '2024-02-29' });
	});
});

describe('monthGridDates', () => {
	it('leads with one blank for a Tuesday start (2026-09-01)', () => {
		// September 2026 starts on a Tuesday: Monday-first grid -> 1 null + 30 days.
		expect(monthGridDates(2026, 9)).toHaveLength(31);
		expect(monthGridDates(2026, 9)[0]).toBeNull();
		expect(monthGridDates(2026, 9)[1]).toBe('2026-09-01');
		expect(monthGridDates(2026, 9)[30]).toBe('2026-09-30');
	});

	it('starts with no blanks on a Monday (2026-06-01)', () => {
		expect(monthGridDates(2026, 6)[0]).toBe('2026-06-01');
		expect(monthGridDates(2026, 6)).toHaveLength(30);
	});

	it('leads with six blanks for a Sunday start (2026-02-01)', () => {
		const cells = monthGridDates(2026, 2);
		expect(cells).toHaveLength(34); // 6 blanks + 28 days
		expect(cells.slice(0, 6).every((cell) => cell === null)).toBe(true);
		expect(cells[6]).toBe('2026-02-01');
	});

	it('never contains blanks between day cells', () => {
		const cells = monthGridDates(2026, 9).filter(
			(cell, i, arr) => cell !== null && i > 0 && arr[i - 1] === null
		);
		expect(cells).toHaveLength(1); // only the leading blank boundary
	});
});

describe('formatDisplayDate', () => {
	it('formats a date in Spanish', () => {
		expect(formatDisplayDate('2026-09-21')).toBe('lun, 21 sept');
	});

	it('is UTC-safe across year boundaries', () => {
		expect(formatDisplayDate('2026-01-01')).toBe('jue, 1 ene');
		expect(formatDisplayDate('2026-12-31')).toBe('jue, 31 dic');
	});
});
