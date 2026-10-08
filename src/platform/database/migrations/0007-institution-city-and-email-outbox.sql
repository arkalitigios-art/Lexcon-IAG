ALTER TABLE institutions ADD COLUMN city TEXT NOT NULL DEFAULT '';

CREATE TABLE email_outbox (
  id TEXT PRIMARY KEY NOT NULL,
  process_id TEXT NOT NULL REFERENCES processes(id),
  recipient TEXT NOT NULL,
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  status TEXT NOT NULL,
  created_at TEXT NOT NULL,
  delivered_at TEXT
);

CREATE INDEX email_outbox_process_idx ON email_outbox(process_id, created_at);
