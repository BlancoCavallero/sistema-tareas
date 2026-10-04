-- 0003_study.sql — study pages schema for the personal organizer.
-- Additive: 0001/0002 untouched. Applied with
-- `wrangler d1 migrations apply sistema-tareas --local|--remote`.

CREATE TABLE subjects (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  name       TEXT NOT NULL,
  year_group TEXT,                       -- nullable cursada grouping
  position   INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL               -- ISO-8601 UTC
);
CREATE INDEX idx_subjects_position ON subjects(position, id);

CREATE TABLE topics (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  subject_id INTEGER NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  title      TEXT NOT NULL,
  position   INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);
CREATE INDEX idx_topics_subject ON topics(subject_id, position, id);

CREATE TABLE ideas (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  topic_id   INTEGER NOT NULL REFERENCES topics(id) ON DELETE CASCADE,
  text       TEXT NOT NULL,
  done       INTEGER NOT NULL DEFAULT 0, -- stored toggle state (D2)
  position   INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);
CREATE INDEX idx_ideas_topic ON ideas(topic_id, position, id);