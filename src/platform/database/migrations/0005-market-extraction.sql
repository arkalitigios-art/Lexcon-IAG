CREATE TABLE document_extractions (
  id TEXT PRIMARY KEY NOT NULL,
  document_version_id TEXT NOT NULL REFERENCES document_versions(id),
  process_id TEXT NOT NULL REFERENCES processes(id),
  parser TEXT NOT NULL,
  status TEXT NOT NULL,
  extracted_text TEXT NOT NULL,
  issues_json TEXT NOT NULL,
  created_at TEXT NOT NULL,
  UNIQUE(document_version_id)
);
CREATE INDEX document_extractions_process_idx ON document_extractions(process_id, created_at);

CREATE TABLE market_comparisons (
  id TEXT PRIMARY KEY NOT NULL,
  process_id TEXT NOT NULL REFERENCES processes(id),
  normalized_description TEXT NOT NULL,
  quantity TEXT NOT NULL,
  values_json TEXT NOT NULL,
  min_unit_value TEXT NOT NULL,
  max_unit_value TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE INDEX market_comparisons_process_idx ON market_comparisons(process_id, created_at);
