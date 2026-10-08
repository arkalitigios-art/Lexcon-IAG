CREATE TABLE market_study_profiles (
  process_id TEXT PRIMARY KEY NOT NULL REFERENCES processes(id),
  object_description TEXT NOT NULL DEFAULT '',
  unspsc_codes TEXT NOT NULL DEFAULT '',
  demand_analysis TEXT NOT NULL DEFAULT '',
  supply_analysis TEXT NOT NULL DEFAULT '',
  tax_basis TEXT NOT NULL DEFAULT '',
  updated_by_user_id TEXT NOT NULL REFERENCES users(id),
  updated_at TEXT NOT NULL
);

CREATE INDEX market_study_profiles_updated_idx ON market_study_profiles(updated_at);
