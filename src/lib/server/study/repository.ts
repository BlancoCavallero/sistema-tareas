/**
 * D1 repository for study pages: subjects -> topics -> ideas.
 *
 * Every read is bounded and index-backed (design D3): subjects (LIMIT 50),
 * topics (LIMIT 50) and ideas (LIMIT 100), each ordered by (position, id)
 * through the composite indexes added in 0003. Topic progress derives at read
 * time from the stored `done` flags (D2) with ONE grouped COUNT query over the
 * bounded topic page (D5) — never per-idea queries.
 *
 * `toggleIdea` is the only write that depends on current state: it SELECTs the
 * stored `done` flag and flips it (2 queries), so checking/unchecking is
 * always defined by the stored state, never by an assumed one (objectives
 * `toggleDone` precedent).
 */
import type { SubjectRow } from '$lib/domain/study';
import type { D1Store } from '$lib/server/db';

export const SUBJECT_LIMIT = 50;
export const TOPIC_LIMIT = 50;
export const IDEA_LIMIT = 100;

export interface TopicRow {
	id: number;
	subject_id: number;
	title: string;
	position: number;
	created_at: string; // ISO-8601 UTC
}

export interface TopicWithProgress extends TopicRow {
	checked: number;
	total: number;
}

export interface IdeaRow {
	id: number;
	topic_id: number;
	text: string;
	done: boolean; // SQLite INTEGER 0/1 mapped to boolean
	position: number;
	created_at: string; // ISO-8601 UTC
}

export interface CreateSubjectInput {
	name: string;
	year_group?: string | null;
	position?: number;
	created_at?: string;
}

export interface CreateTopicInput {
	subject_id: number;
	title: string;
	position?: number;
	created_at?: string;
}

export interface CreateIdeaInput {
	topic_id: number;
	text: string;
	position?: number;
	created_at?: string;
}

/** Map a raw D1 row to the domain `SubjectRow` (exported from study.ts, PR1). */
function rowToSubject(row: Record<string, unknown>): SubjectRow {
	return {
		id: Number(row.id),
		name: String(row.name),
		year_group: row.year_group == null ? null : String(row.year_group),
		position: Number(row.position),
		created_at: String(row.created_at)
	};
}

function rowToTopic(row: Record<string, unknown>): TopicRow {
	return {
		id: Number(row.id),
		subject_id: Number(row.subject_id),
		title: String(row.title),
		position: Number(row.position),
		created_at: String(row.created_at)
	};
}

function rowToIdea(row: Record<string, unknown>): IdeaRow {
	return {
		id: Number(row.id),
		topic_id: Number(row.topic_id),
		text: String(row.text),
		done: Boolean(row.done),
		position: Number(row.position),
		created_at: String(row.created_at)
	};
}

/** Subjects ordered by (position, id), bounded to `SUBJECT_LIMIT`. */
export async function listSubjects(
	store: D1Store,
	limit: number = SUBJECT_LIMIT
): Promise<SubjectRow[]> {
	const { results } = await store
		.prepare('SELECT * FROM subjects ORDER BY position, id LIMIT ?')
		.bind(limit)
		.all<Record<string, unknown>>();
	return results.map(rowToSubject);
}

/** Fetch a single subject by id, or null. */
export async function getSubject(store: D1Store, id: number): Promise<SubjectRow | null> {
	const row = await store
		.prepare('SELECT * FROM subjects WHERE id = ?')
		.bind(id)
		.first<Record<string, unknown>>();
	if (!row) return null;
	return rowToSubject(row);
}

/** Create a subject and return the persisted row (id from last_row_id). */
export async function createSubject(
	store: D1Store,
	input: CreateSubjectInput
): Promise<SubjectRow> {
	const { name, year_group = null, position = 0, created_at = new Date().toISOString() } = input;
	const result = await store
		.prepare('INSERT INTO subjects (name, year_group, position, created_at) VALUES (?, ?, ?, ?)')
		.bind(name, year_group, position, created_at)
		.run();
	return { id: Number(result.meta?.last_row_id ?? 0), name, year_group, position, created_at };
}

/**
 * Topics of a subject ordered by (position, id), bounded to `TOPIC_LIMIT`,
 * each with its derived checked/total progress. Two bounded queries (D5): the
 * topic page through `idx_topics_subject`, then ONE grouped COUNT over the
 * returned topic ids (prefix of `idx_ideas_topic`); a topic with no ideas
 * keeps 0/0.
 */
export async function listTopicsWithProgress(
	store: D1Store,
	subjectId: number,
	limit: number = TOPIC_LIMIT
): Promise<TopicWithProgress[]> {
	const { results } = await store
		.prepare('SELECT * FROM topics WHERE subject_id = ? ORDER BY position, id LIMIT ?')
		.bind(subjectId, limit)
		.all<Record<string, unknown>>();
	if (results.length === 0) return [];

	const topics = results.map(rowToTopic);
	const placeholders = topics.map(() => '?').join(', ');
	const { results: counts } = await store
		.prepare(
			`SELECT topic_id, SUM(done) AS checked, COUNT(*) AS total FROM ideas WHERE topic_id IN (${placeholders}) GROUP BY topic_id`
		)
		.bind(...topics.map((topic) => topic.id))
		.all<{ topic_id: number; checked: number; total: number }>();

	const byTopic = new Map<number, { checked: number; total: number }>();
	for (const row of counts) {
		byTopic.set(Number(row.topic_id), {
			checked: Number(row.checked ?? 0),
			total: Number(row.total)
		});
	}
	return topics.map((topic) => {
		const progress = byTopic.get(topic.id);
		return { ...topic, checked: progress?.checked ?? 0, total: progress?.total ?? 0 };
	});
}

/** Fetch a single topic by id, or null. */
export async function getTopic(store: D1Store, id: number): Promise<TopicRow | null> {
	const row = await store
		.prepare('SELECT * FROM topics WHERE id = ?')
		.bind(id)
		.first<Record<string, unknown>>();
	if (!row) return null;
	return rowToTopic(row);
}

/** Create a topic and return the persisted row (id from last_row_id). */
export async function createTopic(store: D1Store, input: CreateTopicInput): Promise<TopicRow> {
	const { subject_id, title, position = 0, created_at = new Date().toISOString() } = input;
	const result = await store
		.prepare('INSERT INTO topics (subject_id, title, position, created_at) VALUES (?, ?, ?, ?)')
		.bind(subject_id, title, position, created_at)
		.run();
	return { id: Number(result.meta?.last_row_id ?? 0), subject_id, title, position, created_at };
}

/** Ideas of a topic ordered by (position, id), bounded to `IDEA_LIMIT`. */
export async function listIdeas(
	store: D1Store,
	topicId: number,
	limit: number = IDEA_LIMIT
): Promise<IdeaRow[]> {
	const { results } = await store
		.prepare('SELECT * FROM ideas WHERE topic_id = ? ORDER BY position, id LIMIT ?')
		.bind(topicId, limit)
		.all<Record<string, unknown>>();
	return results.map(rowToIdea);
}

/** Create an idea (always unchecked) and return the persisted row. */
export async function createIdea(store: D1Store, input: CreateIdeaInput): Promise<IdeaRow> {
	const { topic_id, text, position = 0, created_at = new Date().toISOString() } = input;
	const result = await store
		.prepare(
			'INSERT INTO ideas (topic_id, text, done, position, created_at) VALUES (?, ?, 0, ?, ?)'
		)
		.bind(topic_id, text, position, created_at)
		.run();
	return {
		id: Number(result.meta?.last_row_id ?? 0),
		topic_id,
		text,
		done: false,
		position,
		created_at
	};
}

/**
 * Toggle an idea's `done` flag against the stored state (2 queries, objectives
 * `toggleDone` precedent): SELECT the current flag, flip it, UPDATE. Returns
 * the new state, or null when the idea does not exist.
 */
export async function toggleIdea(
	store: D1Store,
	id: number
): Promise<{ id: number; done: boolean } | null> {
	const row = await store
		.prepare('SELECT done FROM ideas WHERE id = ?')
		.bind(id)
		.first<{ done: number }>();
	if (!row) return null;
	const done = row.done === 0;
	await store
		.prepare('UPDATE ideas SET done = ? WHERE id = ?')
		.bind(done ? 1 : 0, id)
		.run();
	return { id, done };
}
