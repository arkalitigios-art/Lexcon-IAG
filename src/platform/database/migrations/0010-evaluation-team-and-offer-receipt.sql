CREATE TABLE process_evaluation_members (
  id TEXT PRIMARY KEY NOT NULL,
  process_id TEXT NOT NULL REFERENCES processes(id),
  member_type TEXT NOT NULL CHECK(member_type IN ('EVALUATOR', 'SUPERVISOR')),
  full_name TEXT NOT NULL,
  role_title TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX process_evaluation_members_process_idx ON process_evaluation_members(process_id, created_at);
CREATE UNIQUE INDEX process_evaluation_one_supervisor_idx ON process_evaluation_members(process_id) WHERE member_type = 'SUPERVISOR';
