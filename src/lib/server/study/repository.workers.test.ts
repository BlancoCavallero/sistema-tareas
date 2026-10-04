/// <reference types="@cloudflare/vitest-pool-workers/types" />
import { beforeEach, describe, expect, it } from 'vitest';
import { env } from 'cloudflare:test';
import {
	createIdea,
	createSubject,
	createTopic,
	getSubject,
	getTopic,
	listIdeas,
	listSubjects,
	listTopicsWithProgress,
	toggleIdea,
	type CreateIdeaInput,
	type CreateSubjectInput,
	type CreateTopicInput
} from './repository';

/**
 * Integration coverage for the study repository against a real local D1
 * (0003 auto-applied by the workers setup file): CRUD round-trips, the
 * subject -> topics -> ideas cascade, the 50/50/100 read bounds, the ONE
 * grouped progress query with 0/0 for empty topics, the stored-state toggle
 * and the (position, id) ordering at each level.
 */

const db = env.DB;

function subjectInput(partial: Partial<CreateSubjectInput> = {}): CreateSubjectInput {
	return { name: 'Anatomía', ...partial };
}

function topicInput(partial: Partial<CreateTopicInput> = {}): CreateTopicInput {
	return { subject_id: 0, title: 'Sistema óseo', ...partial };
}

function ideaInput(partial: Partial<CreateIdeaInput> = {}): CreateIdeaInput {
	return { topic_id: 0, text: 'Huesos largos', ...partial };
}

beforeEach(async () => {
	await db.prepare('DELETE FROM ideas').run();
	await db.prepare('DELETE FROM topics').run();
	await db.prepare('DELETE FROM subjects').run();
});

describe('CRUD', () => {
	it('creates, lists and reads a subject', async () => {
		const created = await createSubject(db, subjectInput({ name: 'Álgebra', year_group: '2026' }));
		expect(created.id).toBeGreaterThan(0);
		expect(created.name).toBe('Álgebra');
		expect(created.year_group).toBe('2026');
		expect(created.position).toBe(0);
		expect(created.created_at).toMatch(/^\d{4}-\d{2}-\d{2}T/);

		const list = await listSubjects(db);
		expect(list).toHaveLength(1);
		expect(list[0]).toEqual(created);

		const fetched = await getSubject(db, created.id);
		expect(fetched).toEqual(created);
	});

	it('creates, lists and reads topics and ideas', async () => {
		const subject = await createSubject(db, subjectInput());
		const topic = await createTopic(db, topicInput({ subject_id: subject.id, title: 'Huesos' }));
		expect(topic.id).toBeGreaterThan(0);
		expect(topic.subject_id).toBe(subject.id);

		const idea = await createIdea(db, ideaInput({ topic_id: topic.id, text: 'Fémur' }));
		expect(idea.id).toBeGreaterThan(0);
		expect(idea.done).toBe(false);

		const ideas = await listIdeas(db, topic.id);
		expect(ideas).toHaveLength(1);
		expect(ideas[0]).toEqual(idea);

		const fetched = await getTopic(db, topic.id);
		expect(fetched).toEqual(topic);
	});

	it('returns null when reading missing rows', async () => {
		expect(await getSubject(db, 9999)).toBeNull();
		expect(await getTopic(db, 9999)).toBeNull();
	});
});

describe('cascade delete', () => {
	it('deletes topics and ideas when the subject is deleted', async () => {
		const subject = await createSubject(db, subjectInput());
		const topic = await createTopic(db, topicInput({ subject_id: subject.id }));
		await createIdea(db, ideaInput({ topic_id: topic.id }));

		await db.prepare('DELETE FROM subjects WHERE id = ?').bind(subject.id).run();

		expect(await getSubject(db, subject.id)).toBeNull();
		expect(await getTopic(db, topic.id)).toBeNull();
		expect(await listTopicsWithProgress(db, subject.id)).toHaveLength(0);
		const { results } = await db
			.prepare('SELECT * FROM ideas WHERE topic_id = ?')
			.bind(topic.id)
			.all();
		expect(results).toHaveLength(0);
	});
});

describe('bounded reads', () => {
	it('bounds the subject list to SUBJECT_LIMIT (60 -> 50)', async () => {
		for (let i = 0; i < 60; i++) {
			await createSubject(db, subjectInput({ name: `Materia ${i}` }));
		}
		expect(await listSubjects(db)).toHaveLength(50);
		expect(await listSubjects(db, 10)).toHaveLength(10);
	});

	it('bounds the topic list to TOPIC_LIMIT', async () => {
		const subject = await createSubject(db, subjectInput());
		for (let i = 0; i < 60; i++) {
			await createTopic(db, topicInput({ subject_id: subject.id, title: `Tema ${i}` }));
		}
		expect(await listTopicsWithProgress(db, subject.id)).toHaveLength(50);
		expect(await listTopicsWithProgress(db, subject.id, 10)).toHaveLength(10);
	});

	it('bounds the idea list to IDEA_LIMIT', async () => {
		const subject = await createSubject(db, subjectInput());
		const topic = await createTopic(db, topicInput({ subject_id: subject.id }));
		for (let i = 0; i < 120; i++) {
			await createIdea(db, ideaInput({ topic_id: topic.id, text: `Idea ${i}` }));
		}
		expect(await listIdeas(db, topic.id)).toHaveLength(100);
		expect(await listIdeas(db, topic.id, 10)).toHaveLength(10);
	});
});

describe('grouped progress', () => {
	it('returns per-topic checked/total from one grouped query, 0/0 for empty', async () => {
		const subject = await createSubject(db, subjectInput());
		const full = await createTopic(db, topicInput({ subject_id: subject.id, title: 'Completo' }));
		const partial = await createTopic(db, topicInput({ subject_id: subject.id, title: 'Parcial' }));
		await createTopic(db, topicInput({ subject_id: subject.id, title: 'Vacío' }));

		for (let i = 0; i < 4; i++) {
			const idea = await createIdea(db, ideaInput({ topic_id: full.id, text: `Idea ${i}` }));
			await toggleIdea(db, idea.id);
		}
		for (let i = 0; i < 5; i++) {
			await createIdea(db, ideaInput({ topic_id: partial.id, text: `Idea ${i}` }));
		}
		const partialIdeas = await listIdeas(db, partial.id);
		await toggleIdea(db, partialIdeas[0].id);
		await toggleIdea(db, partialIdeas[1].id);

		const progress = await listTopicsWithProgress(db, subject.id);
		const byTitle = new Map(progress.map((topic) => [topic.title, topic]));
		expect(byTitle.get('Completo')).toMatchObject({ checked: 4, total: 4 });
		expect(byTitle.get('Parcial')).toMatchObject({ checked: 2, total: 5 });
		expect(byTitle.get('Vacío')).toMatchObject({ checked: 0, total: 0 });
	});

	it('returns an empty list for a subject without topics', async () => {
		const subject = await createSubject(db, subjectInput());
		expect(await listTopicsWithProgress(db, subject.id)).toEqual([]);
	});
});

describe('toggleIdea', () => {
	it('flips the stored done flag and back (idempotent against stored state)', async () => {
		const subject = await createSubject(db, subjectInput());
		const topic = await createTopic(db, topicInput({ subject_id: subject.id }));
		const idea = await createIdea(db, ideaInput({ topic_id: topic.id, text: 'Fémur' }));

		const marked = await toggleIdea(db, idea.id);
		expect(marked).toEqual({ id: idea.id, done: true });
		expect((await listIdeas(db, topic.id))[0].done).toBe(true);

		const unmarked = await toggleIdea(db, idea.id);
		expect(unmarked).toEqual({ id: idea.id, done: false });
		expect((await listIdeas(db, topic.id))[0].done).toBe(false);
	});

	it('returns null when toggling a missing idea', async () => {
		expect(await toggleIdea(db, 9999)).toBeNull();
	});
});

describe('ordering', () => {
	it('orders subjects by position then id', async () => {
		await createSubject(db, subjectInput({ name: 'C', position: 2 }));
		await createSubject(db, subjectInput({ name: 'A', position: 0 }));
		await createSubject(db, subjectInput({ name: 'B', position: 1 }));

		expect((await listSubjects(db)).map((subject) => subject.name)).toEqual(['A', 'B', 'C']);
	});

	it('orders ideas by position then id within a topic', async () => {
		const subject = await createSubject(db, subjectInput());
		const topic = await createTopic(db, topicInput({ subject_id: subject.id }));
		await createIdea(db, ideaInput({ topic_id: topic.id, text: 'C', position: 2 }));
		await createIdea(db, ideaInput({ topic_id: topic.id, text: 'A', position: 0 }));
		await createIdea(db, ideaInput({ topic_id: topic.id, text: 'B', position: 1 }));

		expect((await listIdeas(db, topic.id)).map((idea) => idea.text)).toEqual(['A', 'B', 'C']);
	});
});
