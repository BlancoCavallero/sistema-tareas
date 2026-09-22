/**
 * Pure domain for calendar objectives — no D1 access, no Svelte runes.
 *
 * Objectives are one-off dated events (exam / deadline / other). Status is
 * derived at read time from the Buenos Aires `today()` helper (reused from the
 * recurrence module), never stored and never computed with SQL date functions.
 *
 * All dates are YYYY-MM-DD strings (lexicographic order == chronological).
 * Date math is UTC-based so timezone shifts never affect grid offsets.
 */
import { daysInMonth, formatDate, isoWeekday, parseDate, today } from './recurrence';

export type ObjectiveKind = 'exam' | 'deadline' | 'other';
export type ObjectiveStatus = 'upcoming' | 'overdue' | 'done';

/**
 * Re-export the ART date helper so calendar code can import it from the
 * objectives domain. `recurrence.ts` stays untouched (read-only dependency).
 */
export { today };

/**
 * Derive the read-time status of an objective.
 * `done` wins: a completed objective is never overdue. A not-done objective
 * due strictly before `todayStr` is overdue; due today or later is upcoming.
 */
export function deriveStatus(dueDate: string, done: boolean, todayStr: string): ObjectiveStatus {
	if (done) return 'done';
	if (dueDate < todayStr) return 'overdue';
	return 'upcoming';
}

/** Narrow a raw string (form input, DB row) to an ObjectiveKind. */
export function isObjectiveKind(v: string): v is ObjectiveKind {
	return v === 'exam' || v === 'deadline' || v === 'other';
}

/** First and last day of a month as YYYY-MM-DD, for a BETWEEN range query. */
export function monthBounds(year: number, month: number): { start: string; end: string } {
	return {
		start: formatDate({ year, month, day: 1 }),
		end: formatDate({ year, month, day: daysInMonth(year, month) })
	};
}

/**
 * Grid cells for a month, Monday-first (ISO): leading `null` blanks for the
 * weekday offset, then one YYYY-MM-DD string per day. Trailing blanks for a
 * partial final week are a rendering concern and are left to the UI.
 */
export function monthGridDates(year: number, month: number): (string | null)[] {
	const first = { year, month, day: 1 };
	const offset = isoWeekday(first) - 1; // Monday = 0 blanks .. Sunday = 6 blanks
	const cells: (string | null)[] = [];
	for (let i = 0; i < offset; i++) cells.push(null);
	for (let day = 1; day <= daysInMonth(year, month); day++) {
		cells.push(formatDate({ year, month, day }));
	}
	return cells;
}

/**
 * Spanish display date (e.g. "lun, 21 sept"). Built from Date.UTC parts and
 * formatted with an explicit UTC timeZone so the output never shifts a day,
 * regardless of the runtime's local timezone.
 */
export function formatDisplayDate(iso: string): string {
	const { year, month, day } = parseDate(iso);
	return new Intl.DateTimeFormat('es-AR', {
		timeZone: 'UTC',
		weekday: 'short',
		day: 'numeric',
		month: 'short'
	}).format(new Date(Date.UTC(year, month - 1, day)));
}
