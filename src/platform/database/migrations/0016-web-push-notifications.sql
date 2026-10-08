CREATE TABLE push_subscriptions (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL REFERENCES users(id),
  endpoint TEXT NOT NULL UNIQUE,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  user_agent TEXT,
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX push_subscriptions_user_idx ON push_subscriptions(user_id, active);

CREATE TABLE notification_deliveries (
  id TEXT PRIMARY KEY NOT NULL,
  process_id TEXT REFERENCES processes(id),
  user_id TEXT NOT NULL REFERENCES users(id),
  channel TEXT NOT NULL,
  event_key TEXT NOT NULL,
  status TEXT NOT NULL,
  detail TEXT,
  created_at TEXT NOT NULL,
  delivered_at TEXT
);
CREATE UNIQUE INDEX notification_deliveries_unique ON notification_deliveries(user_id, channel, event_key);
CREATE INDEX notification_deliveries_process_idx ON notification_deliveries(process_id, created_at);