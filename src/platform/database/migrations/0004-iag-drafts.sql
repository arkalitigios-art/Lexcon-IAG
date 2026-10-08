CREATE TABLE generated_drafts (
  id TEXT PRIMARY KEY NOT NULL,
  process_id TEXT NOT NULL REFERENCES processes(id),
  kind TEXT NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  status TEXT NOT NULL,
  created_at TEXT NOT NULL,
  UNIQUE(process_id, kind)
);
CREATE INDEX generated_drafts_process_idx ON generated_drafts(process_id, created_at);
