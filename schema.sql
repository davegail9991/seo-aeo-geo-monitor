CREATE TABLE IF NOT EXISTS targets (
  id INTEGER PRIMARY KEY,
  url TEXT NOT NULL UNIQUE,
  keyword TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS admin_users (
  id INTEGER PRIMARY KEY,
  username TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'admin',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS auth_sessions (
  token_hash TEXT PRIMARY KEY,
  username TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  expires_at TEXT NOT NULL,
  FOREIGN KEY (username) REFERENCES admin_users(username) ON UPDATE CASCADE ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS connector_settings (
  id TEXT PRIMARY KEY,
  base_url TEXT NOT NULL DEFAULT '',
  enabled INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS login_attempts (
  key_hash TEXT PRIMARY KEY,
  failures INTEGER NOT NULL DEFAULT 0,
  window_started INTEGER NOT NULL,
  blocked_until INTEGER NOT NULL DEFAULT 0,
  updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS audit_locks (
  host TEXT PRIMARY KEY,
  lock_token TEXT NOT NULL,
  expires_at INTEGER NOT NULL,
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS monitor_logs (
  id INTEGER PRIMARY KEY,
  target_id INTEGER,
  platform TEXT NOT NULL,
  rank_or_mention TEXT NOT NULL,
  response_snippet TEXT,
  checked_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (target_id) REFERENCES targets(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS domain_audits (
  id INTEGER PRIMARY KEY,
  target_id INTEGER,
  url TEXT NOT NULL,
  host TEXT NOT NULL,
  normalized_host TEXT NOT NULL,
  status TEXT NOT NULL,
  score INTEGER NOT NULL DEFAULT 0,
  report_json TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (target_id) REFERENCES targets(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_targets_status ON targets(status);
CREATE INDEX IF NOT EXISTS idx_targets_updated_at ON targets(updated_at);
CREATE INDEX IF NOT EXISTS idx_monitor_logs_target_id ON monitor_logs(target_id);
CREATE INDEX IF NOT EXISTS idx_monitor_logs_checked_at ON monitor_logs(checked_at);
CREATE INDEX IF NOT EXISTS idx_auth_sessions_expires_at ON auth_sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_domain_audits_host ON domain_audits(host);
CREATE INDEX IF NOT EXISTS idx_domain_audits_created_at ON domain_audits(created_at);
CREATE INDEX IF NOT EXISTS idx_domain_audits_target_id ON domain_audits(target_id);
CREATE INDEX IF NOT EXISTS idx_login_attempts_updated_at ON login_attempts(updated_at);
CREATE INDEX IF NOT EXISTS idx_audit_locks_expires_at ON audit_locks(expires_at);
