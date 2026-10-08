CREATE TABLE regulation_files (
  id TEXT PRIMARY KEY NOT NULL,
  regulation_version_id TEXT NOT NULL REFERENCES regulation_versions(id),
  storage_key TEXT NOT NULL UNIQUE,
  original_name TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  size_bytes INTEGER NOT NULL,
  sha256 TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE TABLE process_stage_actions (
  id TEXT PRIMARY KEY NOT NULL,
  process_id TEXT NOT NULL REFERENCES processes(id),
  phase TEXT NOT NULL,
  action TEXT NOT NULL,
  actor_user_id TEXT NOT NULL REFERENCES users(id),
  note TEXT,
  created_at TEXT NOT NULL
);
CREATE INDEX process_stage_actions_process_idx ON process_stage_actions(process_id, created_at);
CREATE INDEX regulation_files_version_idx ON regulation_files(regulation_version_id);
