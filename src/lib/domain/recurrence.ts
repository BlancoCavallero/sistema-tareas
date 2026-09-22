/**
 * Pure recurrence engine for quick tasks — no D1 access, no Svelte runes.
 *
 * Semantics follow org-mode repeaters:
 * - `++` (default): calendar-anchored. On completion the cursor advances to the
 *   NEXT FUTURE occurrence of the scheduled slot (weekday / day-of-month),
 *   skipping any missed occurrences in between. A stale `++` task is also
 *   advanced to the next occurrence >= today when the page loads (materialize).
 * - `.+`: relative. The next occurrence is computed from the completion date
 *   (occurrence + interval), never from the anchor, and is NOT materialized on
 *   load — it only moves when the task is completed.
 *
 * Monthly slots are clamped to the end of the target month (29–31): a task
 * anchored to day 31 advances Jan 31 -> Feb 28 -> Mar 31 (float-back to the
 * stored day-of-month). Leap years are handled by the same clamp.
 *
 * All dates are YYYY-MM-DD strings (lexicographic order == chronological).
 */
export const DEFAULT_TIME_ZONE = 'America/Argentina/Buenos_Aires';

export type RecurrenceType = 'daily' | 'weekly' | 'monthly';
export type RecurrenceMode = '++' | '.+';

export interface RecurrenceRule {
	type: RecurrenceType;
	mode: RecurrenceMode;
	/** 1-7 ISO (Monday = 1), weekly only. */
	dow: number | null;
	/** 1-31, clamped to month end, monthly only. */
	dom: number | null;
	/** YYYY-MM-DD seed date. */
	anchor: string | null;
}

/** Structural subset of a tasks row — lets the domain map DB rows without importing them. */
export interface RecurrenceFields {
	recurrence_type: RecurrenceType | string | null;
	recurrence_dow?: number | null;
	recurrence_dom?: number | null;
	recurrence_mode?: string | null;
	recurrence_anchor?: string | null;
}

export interface DateParts {
	year: number;
	month: number; // 1-12
	day: number; // 1-31
}

/** Strictly parse a YYYY-MM-DD string. Throws on malformed input. */
export function parseDate(iso: string): DateParts {
	const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
	if (!match) throw new Error(`Invalid date: ${iso}`);
	const year = Number(match[1]);
	const month = Number(match[2]);
	const day = Number(match[3]);
	if (month < 1 || month > 12 || day < 1 || day > 31) throw new Error(`Invalid date: ${iso}`);
	return { year, month, day };
}

/** Format parts as YYYY-MM-DD. */
export function formatDate(parts: DateParts): string {
	const year = String(parts.year).padStart(4, '0');
	const month = String(parts.month).padStart(2, '0');
	const day = String(parts.day).padStart(2, '0');
	return `${year}-${month}-${day}`;
}

export function isLeapYear(year: number): boolean {
	return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

/** Days in a month (1-12), leap-year aware. */
export function daysInMonth(year: number, month: number): number {
	switch (month) {
		case 2:
			return isLeapYear(year) ? 29 : 28;
		case 4:
		case 6:
		case 9:
		case 11:
			return 30;
		default:
			return 31;
	}
}

/** Clamp a day-of-month to the month's length (29-31 handling). */
export function clampDay(year: number, month: number, day: number): number {
	return Math.min(day, daysInMonth(year, month));
}

/** Add a number of days using UTC so DST/timezone shifts never affect the math. */
export function addDays(parts: DateParts, days: number): DateParts {
	const date = new Date(Date.UTC(parts.year, parts.month - 1, parts.day + days));
	return { year: date.getUTCFullYear(), month: date.getUTCMonth() + 1, day: date.getUTCDate() };
}

/** ISO weekday (Monday = 1 .. Sunday = 7). */
export function isoWeekday(parts: DateParts): number {
	const date = new Date(Date.UTC(parts.year, parts.month - 1, parts.day));
	const jsDay = date.getUTCDay(); // 0 = Sunday
	return jsDay === 0 ? 7 : jsDay;
}

export function compareDates(a: string, b: string): number {
	return a < b ? -1 : a > b ? 1 : 0;
}

function addMonthsRaw(year: number, month: number, delta: number): DateParts {
	const total = year * 12 + (month - 1) + delta;
	return { year: Math.floor(total / 12), month: (total % 12) + 1, day: 1 };
}

/** Smallest date strictly after `from` whose ISO weekday is `dow`. */
function nextWeekdayAfter(from: DateParts, dow: number): DateParts {
	let candidate = addDays(from, 1);
	while (isoWeekday(candidate) !== dow) candidate = addDays(candidate, 1);
	return candidate;
}

/** Smallest date >= `from` whose ISO weekday is `dow`. */
function nextWeekdayAtOrFrom(from: DateParts, dow: number): DateParts {
	let candidate = from;
	while (isoWeekday(candidate) !== dow) candidate = addDays(candidate, 1);
	return candidate;
}

/** Smallest date strictly after `from` whose (clamped) day-of-month is `dom`. */
function nextDomAfter(from: DateParts, dom: number): DateParts {
	const thisMonth = clampDay(from.year, from.month, dom);
	if (thisMonth > from.day) return { year: from.year, month: from.month, day: thisMonth };
	const next = addMonthsRaw(from.year, from.month, 1);
	return { year: next.year, month: next.month, day: clampDay(next.year, next.month, dom) };
}

/** Smallest date >= `from` whose (clamped) day-of-month is `dom`. */
function nextDomAtOrFrom(from: DateParts, dom: number): DateParts {
	const thisMonth = clampDay(from.year, from.month, dom);
	if (thisMonth >= from.day) return { year: from.year, month: from.month, day: thisMonth };
	const next = addMonthsRaw(from.year, from.month, 1);
	return { year: next.year, month: next.month, day: clampDay(next.year, next.month, dom) };
}

/** Day `dom` (clamped) of the month after `from` — the `.+` monthly step. */
function nextMonthDay(from: DateParts, dom: number): DateParts {
	const next = addMonthsRaw(from.year, from.month, 1);
	return { year: next.year, month: next.month, day: clampDay(next.year, next.month, dom) };
}

/**
 * Advance the recurrence cursor after a completion.
 *
 * `occurrence` is the completed occurrence (max(next_due, today) — computed by
 * the caller). `++` skips to the next future slot, `.+` steps the interval
 * from the completion date.
 */
export function advance(rule: RecurrenceRule, occurrence: string): string {
	const occ = parseDate(occurrence);
	switch (rule.type) {
		case 'daily':
			return formatDate(addDays(occ, 1));
		case 'weekly':
			if (rule.mode === '++') {
				const dow = rule.dow ?? isoWeekday(occ);
				return formatDate(nextWeekdayAfter(occ, dow));
			}
			return formatDate(addDays(occ, 7));
		case 'monthly': {
			const dom = rule.dom ?? occ.day;
			if (rule.mode === '++') return formatDate(nextDomAfter(occ, dom));
			return formatDate(nextMonthDay(occ, dom));
		}
	}
}

/**
 * Load-time materialization: advance a stale `++` task to the next occurrence
 * >= today. Idempotent — a cursor already >= today (or a `.+` / non-recurring
 * task) is returned unchanged.
 */
export function materialize(rule: RecurrenceRule, nextDue: string, todayStr: string): string {
	if (rule.mode !== '++') return nextDue;
	if (compareDates(nextDue, todayStr) >= 0) return nextDue;
	const due = parseDate(nextDue);
	const now = parseDate(todayStr);
	switch (rule.type) {
		case 'daily':
			return todayStr;
		case 'weekly': {
			const dow = rule.dow ?? isoWeekday(due);
			return formatDate(nextWeekdayAtOrFrom(now, dow));
		}
		case 'monthly': {
			const dom = rule.dom ?? due.day;
			return formatDate(nextDomAtOrFrom(now, dom));
		}
	}
}

/** Map recurrence columns to a rule, or null when the task does not repeat. */
export function toRecurrenceRule(fields: RecurrenceFields): RecurrenceRule | null {
	const type = fields.recurrence_type;
	if (type !== 'daily' && type !== 'weekly' && type !== 'monthly') return null;
	return {
		type,
		mode: fields.recurrence_mode === '.+' ? '.+' : '++',
		dow: fields.recurrence_dow ?? null,
		dom: fields.recurrence_dom ?? null,
		anchor: fields.recurrence_anchor ?? null
	};
}

/**
 * Local calendar date (YYYY-MM-DD) in the app timezone. Injectable for tests;
 * defaults to America/Argentina/Buenos_Aires (design: open question resolved
 * in apply).
 */
export function today(now: Date = new Date(), timeZone: string = DEFAULT_TIME_ZONE): string {
	const parts = new Intl.DateTimeFormat('en-US', {
		timeZone,
		year: 'numeric',
		month: '2-digit',
		day: '2-digit'
	}).formatToParts(now);
	const get = (type: string) => parts.find((part) => part.type === type)?.value ?? '';
	return `${get('year')}-${get('month')}-${get('day')}`;
}