import { describe, expect, it } from 'vitest';
import {
	advance,
	clampDay,
	daysInMonth,
	formatDate,
	isLeapYear,
	isoWeekday,
	materialize,
	parseDate,
	today,
	toRecurrenceRule,
	type RecurrenceRule
} from './recurrence';

/**
 * Unit coverage for the pure recurrence engine (design 5.1): daily/weekly/
 * monthly advance, monthly clamping (29-31), leap years, `++` vs `.+`
 * semantics, skip-to-future, and load materialization idempotency.
 */

function rule(partial: Partial<RecurrenceRule> & { type: RecurrenceRule['type'] }): RecurrenceRule {
	return { mode: '++', dow: null, dom: null, anchor: null, ...partial };
}

describe('date helpers', () => {
	it('clamps day-of-month to month end (29-31)', () => {
		expect(clampDay(2026, 2, 31)).toBe(28); // non-leap February
		expect(clampDay(2026, 4, 31)).toBe(30);
		expect(clampDay(2026, 1, 31)).toBe(31);
		expect(clampDay(2026, 2, 29)).toBe(28); // 29 also clamps in non-leap years
	});

	it('knows leap years', () => {
		expect(isLeapYear(2024)).toBe(true);
		expect(isLeapYear(2026)).toBe(false);
		expect(isLeapYear(2000)).toBe(true);
		expect(isLeapYear(1900)).toBe(false);
		expect(daysInMonth(2024, 2)).toBe(29);
		expect(daysInMonth(2026, 2)).toBe(28);
	});

	it('parses and formats YYYY-MM-DD and computes ISO weekdays', () => {
		expect(formatDate(parseDate('2026-09-21'))).toBe('2026-09-21');
		expect(() => parseDate('2026-13-01')).toThrow();
		expect(() => parseDate('2026-09-32')).toThrow();
		expect(() => parseDate('21/09/2026')).toThrow();
		expect(isoWeekday(parseDate('2026-09-21'))).toBe(1); // Monday
		expect(isoWeekday(parseDate('2026-09-27'))).toBe(7); // Sunday
	});

	it('materializes local today() with an injectable timezone', () => {
		// Buenos Aires is UTC-3 year-round: 02:00Z == 23:00 local the day before.
		const instant = new Date('2026-09-21T02:00:00Z');
		expect(today(instant)).toBe('2026-09-20');
		expect(today(instant, 'UTC')).toBe('2026-09-21');
		// 03:00Z == 00:00 local on the same day.
		expect(today(new Date('2026-09-21T03:00:00Z'))).toBe('2026-09-21');
	});
});

describe('advance — daily', () => {
	it('advances one day', () => {
		expect(advance(rule({ type: 'daily' }), '2026-09-21')).toBe('2026-09-22');
	});

	it('crosses month and year boundaries', () => {
		expect(advance(rule({ type: 'daily' }), '2026-09-30')).toBe('2026-10-01');
		expect(advance(rule({ type: 'daily' }), '2026-12-31')).toBe('2027-01-01');
	});

	it('handles leap days', () => {
		expect(advance(rule({ type: 'daily' }), '2024-02-28')).toBe('2024-02-29');
		expect(advance(rule({ type: 'daily' }), '2024-02-29')).toBe('2024-03-01');
	});
});

describe('advance — weekly', () => {
	it('++ advances to the next future occurrence of the anchor weekday', () => {
		// Monday task completed on time (Monday): next Monday.
		const monday = rule({ type: 'weekly', dow: 1 });
		expect(advance(monday, '2026-09-21')).toBe('2026-09-28');
		// Late completion on Wednesday: skips to next Monday.
		expect(advance(monday, '2026-09-23')).toBe('2026-09-28');
		// Sunday completion of a Monday task: tomorrow.
		expect(advance(monday, '2026-09-27')).toBe('2026-09-28');
	});

	it('.+ steps exactly one week from the completion date', () => {
		const relative = rule({ type: 'weekly', mode: '.+', dow: 1 });
		expect(advance(relative, '2026-09-21')).toBe('2026-09-28');
		// Late completion: the interval counts from the completion, not the anchor.
		expect(advance(relative, '2026-09-23')).toBe('2026-09-30');
	});

	it('falls back to the occurrence weekday when dow is missing', () => {
		expect(advance(rule({ type: 'weekly' }), '2026-09-23')).toBe('2026-09-30');
	});
});

describe('advance — monthly clamping (29-31) and leap years', () => {
	it('++ clamps to month end and floats back to the stored day', () => {
		const day31 = rule({ type: 'monthly', dom: 31 });
		expect(advance(day31, '2026-01-31')).toBe('2026-02-28'); // non-leap clamp
		expect(advance(day31, '2026-02-28')).toBe('2026-03-31'); // floats back
		expect(advance(day31, '2026-03-31')).toBe('2026-04-30');
	});

	it('++ handles leap-year February', () => {
		const day29 = rule({ type: 'monthly', dom: 29 });
		expect(advance(day29, '2024-01-29')).toBe('2024-02-29'); // leap year keeps 29
		expect(advance(day29, '2024-02-29')).toBe('2024-03-29');
	});

	it('++ skips a missed day-of-month', () => {
		const day15 = rule({ type: 'monthly', dom: 15 });
		// Completed late on the 20th: the 15th of this month already passed.
		expect(advance(day15, '2026-09-20')).toBe('2026-10-15');
	});

	it('.+ steps one month from the completion, clamped', () => {
		const relative = rule({ type: 'monthly', mode: '.+', dom: 15 });
		expect(advance(relative, '2026-09-15')).toBe('2026-10-15');
		// Late completion on the 31st still steps to the stored day (15).
		expect(advance(relative, '2026-01-31')).toBe('2026-02-15');
		// Day-31 relative tasks clamp to the target month end.
		const day31 = rule({ type: 'monthly', mode: '.+', dom: 31 });
		expect(advance(day31, '2026-01-31')).toBe('2026-02-28');
	});
});

describe('materialize — load-time advancement of stale ++ tasks', () => {
	it('daily: stale cursor jumps to today', () => {
		const daily = rule({ type: 'daily' });
		expect(materialize(daily, '2026-09-19', '2026-09-22')).toBe('2026-09-22');
	});

	it('weekly: stale cursor jumps to the next future weekday slot', () => {
		const monday = rule({ type: 'weekly', dow: 1 });
		// Stale since 09-14, today is Wednesday 09-23 -> next Monday.
		expect(materialize(monday, '2026-09-14', '2026-09-23')).toBe('2026-09-28');
		// Today IS the slot -> stays today.
		expect(materialize(monday, '2026-09-14', '2026-09-21')).toBe('2026-09-21');
	});

	it('monthly: stale cursor jumps to the next future day-of-month', () => {
		const day1 = rule({ type: 'monthly', dom: 1 });
		expect(materialize(day1, '2026-09-01', '2026-09-23')).toBe('2026-10-01');
		const day31 = rule({ type: 'monthly', dom: 31 });
		// Today 02-28 (non-leap) is the clamped slot itself.
		expect(materialize(day31, '2026-01-31', '2026-02-28')).toBe('2026-02-28');
	});

	it('is idempotent: a cursor already >= today is untouched', () => {
		const daily = rule({ type: 'daily' });
		expect(materialize(daily, '2026-09-22', '2026-09-22')).toBe('2026-09-22');
		expect(materialize(daily, '2026-09-23', '2026-09-22')).toBe('2026-09-23');
	});

	it('never touches .+ tasks on load', () => {
		const relative = rule({ type: 'daily', mode: '.+' });
		expect(materialize(relative, '2026-09-19', '2026-09-22')).toBe('2026-09-19');
	});

	it('materializing twice yields the same result (stable fixpoint)', () => {
		const weekly = rule({ type: 'weekly', dow: 3 }); // Wednesday
		const first = materialize(weekly, '2026-09-09', '2026-09-23');
		const second = materialize(weekly, first, '2026-09-23');
		expect(first).toBe('2026-09-23');
		expect(second).toBe(first);
	});
});

describe('toRecurrenceRule', () => {
	it('maps recurrence columns to a rule and defaults mode to ++', () => {
		expect(toRecurrenceRule({ recurrence_type: null })).toBeNull();
		expect(toRecurrenceRule({ recurrence_type: 'bogus' })).toBeNull();
		expect(
			toRecurrenceRule({
				recurrence_type: 'weekly',
				recurrence_dow: 2,
				recurrence_mode: null
			})
		).toEqual({ type: 'weekly', mode: '++', dow: 2, dom: null, anchor: null });
		expect(
			toRecurrenceRule({
				recurrence_type: 'monthly',
				recurrence_dom: 31,
				recurrence_mode: '.+',
				recurrence_anchor: '2026-01-31'
			})
		).toEqual({ type: 'monthly', mode: '.+', dow: null, dom: 31, anchor: '2026-01-31' });
	});
});