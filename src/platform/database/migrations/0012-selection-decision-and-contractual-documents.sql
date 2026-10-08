CREATE TABLE process_selection_decisions (
  id TEXT PRIMARY KEY NOT NULL,
  process_id TEXT NOT NULL UNIQUE REFERENCES processes(id),
  selected_supplier TEXT NOT NULL,
  rationale TEXT NOT NULL,
  status TEXT NOT NULL CHECK(status IN ('PENDING_SIGNATURE', 'SIGNED_UPLOADED')),
  created_by_user_id TEXT NOT NULL REFERENCES users(id),
  created_at TEXT NOT NULL,
  signed_at TEXT
);

CREATE INDEX process_selection_decisions_process_idx ON process_selection_decisions(process_id);
