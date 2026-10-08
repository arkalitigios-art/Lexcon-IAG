ALTER TABLE institutions ADD COLUMN service_status TEXT NOT NULL DEFAULT 'ACTIVE';
ALTER TABLE institutions ADD COLUMN service_note TEXT;
ALTER TABLE institutions ADD COLUMN service_status_changed_at TEXT;
CREATE INDEX institutions_service_status_idx ON institutions(service_status);
