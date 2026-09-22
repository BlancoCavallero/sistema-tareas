-- 0002_objectives.sql — calendar objectives for the personal organizer.
-- Additive: 0001 is untouched. Applied with
-- `wrangler d1 migrations apply sistema-tareas --local|--remote`.

CREATE TABLE objectives (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  title        TEXT NOT NULL,
  kind         TEXT NOT NULL CHECK (kind IN ('exam','deadline','other')),
  due_date     TEXT NOT NULL,             -- YYYY-MM-DD, ISO-8601 text
  notes        TEXT,
  done         INTEGER NOT NULL DEFAULT 0,
  completed_at TEXT,                      -- ISO-8601 UTC, set when done = 1
  created_at   TEXT NOT NULL              -- ISO-8601 UTC
);
CREATE INDEX idx_objectives_due_date ON objectives(due_date);