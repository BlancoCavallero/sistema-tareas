-- 0001_init.sql — foundational schema for the personal organizer.
-- Applied with `wrangler d1 migrations apply sistema-tareas --local|--remote`.
-- Pages does NOT auto-run migrations on deploy; apply before first deploy.

CREATE TABLE tasks (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  title            TEXT NOT NULL,
  created_at       TEXT NOT NULL,             -- ISO-8601 UTC
  next_due         TEXT NOT NULL,             -- YYYY-MM-DD, recurrence cursor
  recurrence_type  TEXT,                      -- NULL | 'daily' | 'weekly' | 'monthly'
  recurrence_dow   INTEGER,                   -- 1-7 ISO (weekly only)
  recurrence_dom   INTEGER,                   -- 1-31, clamped to month end (monthly only)
  recurrence_mode  TEXT NOT NULL DEFAULT '++' CHECK (recurrence_mode IN ('++','.+')),
  recurrence_anchor TEXT                      -- start date seed
);
CREATE INDEX idx_tasks_next_due ON tasks(next_due);

CREATE TABLE task_completions (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  task_id         INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  occurrence_date TEXT NOT NULL,              -- YYYY-MM-DD
  completed_at    TEXT NOT NULL,              -- ISO-8601 UTC
  UNIQUE(task_id, occurrence_date)            -- idempotent completion + join index
);

CREATE TABLE login_attempts (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  ip           TEXT NOT NULL,
  attempted_at TEXT NOT NULL
);
CREATE INDEX idx_login_attempts_ip_time ON login_attempts(ip, attempted_at);