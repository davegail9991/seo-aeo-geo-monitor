CREATE TABLE IF NOT EXISTS targets (
  id INTEGER PRIMARY KEY,
  url TEXT NOT NULL UNIQUE,
  keyword TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS monitor_logs (
  id INTEGER PRIMARY KEY,
  target_id INTEGER NOT NULL,
  platform TEXT NOT NULL,
  rank_or_mention TEXT NOT NULL,
  response_snippet TEXT,
  checked_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (target_id) REFERENCES targets(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_targets_status ON targets(status);
CREATE INDEX IF NOT EXISTS idx_targets_updated_at ON targets(updated_at);
CREATE INDEX IF NOT EXISTS idx_monitor_logs_target_id ON monitor_logs(target_id);
CREATE INDEX IF NOT EXISTS idx_monitor_logs_checked_at ON monitor_logs(checked_at);

CREATE TABLE IF NOT EXISTS auth_sessions (
  token_hash TEXT PRIMARY KEY,
  username TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  expires_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_auth_sessions_expires_at
ON auth_sessions(expires_at);
