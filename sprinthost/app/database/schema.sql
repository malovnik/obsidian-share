PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS application_meta (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
);

INSERT OR IGNORE INTO application_meta (key, value)
VALUES ('schema_version', '1');
UPDATE application_meta SET value = '1' WHERE key = 'schema_version';

CREATE TABLE IF NOT EXISTS notes (
    id TEXT PRIMARY KEY,
    source_id TEXT UNIQUE,
    canonical_path TEXT NOT NULL UNIQUE,
    slug TEXT NOT NULL,
    title TEXT NOT NULL,
    markdown TEXT NOT NULL,
    html TEXT NOT NULL,
    content_hash TEXT NOT NULL,
    access_mode TEXT NOT NULL DEFAULT 'public'
        CHECK (access_mode IN ('public', 'unlisted', 'private')),
    password_hash TEXT,
    no_index INTEGER NOT NULL DEFAULT 0 CHECK (no_index IN (0, 1)),
    is_deleted INTEGER NOT NULL DEFAULT 0 CHECK (is_deleted IN (0, 1)),
    expires_at TEXT,
    tags_json TEXT NOT NULL DEFAULT '[]',
    reading_time INTEGER NOT NULL DEFAULT 0,
    cover_media_hash TEXT,
    revision INTEGER NOT NULL DEFAULT 1,
    view_count INTEGER NOT NULL DEFAULT 0,
    unique_view_count INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    published_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS notes_visibility_idx
    ON notes (is_deleted, access_mode, updated_at DESC);
CREATE INDEX IF NOT EXISTS notes_source_idx ON notes (source_id);

CREATE TABLE IF NOT EXISTS note_aliases (
    path TEXT PRIMARY KEY,
    note_id TEXT NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
    created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS note_aliases_note_idx ON note_aliases (note_id);

CREATE TABLE IF NOT EXISTS media (
    hash TEXT PRIMARY KEY,
    extension TEXT NOT NULL,
    mime_type TEXT NOT NULL,
    filename TEXT NOT NULL,
    size INTEGER NOT NULL,
    width INTEGER,
    height INTEGER,
    created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS media_aliases (
    legacy_id TEXT PRIMARY KEY,
    media_hash TEXT NOT NULL REFERENCES media(hash) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS media_aliases_hash_idx ON media_aliases (media_hash);

CREATE TABLE IF NOT EXISTS note_media (
    note_id TEXT NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
    media_hash TEXT NOT NULL REFERENCES media(hash) ON DELETE RESTRICT,
    role TEXT NOT NULL DEFAULT 'inline' CHECK (role IN ('inline', 'cover')),
    PRIMARY KEY (note_id, media_hash, role)
);

CREATE INDEX IF NOT EXISTS note_media_hash_idx ON note_media (media_hash);

CREATE TABLE IF NOT EXISTS publish_tokens (
    id TEXT PRIMARY KEY,
    label TEXT NOT NULL,
    token_hash TEXT NOT NULL UNIQUE,
    scopes_json TEXT NOT NULL DEFAULT '["publish","media","delete","meta"]',
    created_at TEXT NOT NULL,
    last_used_at TEXT,
    revoked_at TEXT
);

CREATE TABLE IF NOT EXISTS note_revisions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    note_id TEXT NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
    revision INTEGER NOT NULL,
    content_hash TEXT NOT NULL,
    title TEXT NOT NULL,
    markdown TEXT NOT NULL,
    access_mode TEXT NOT NULL,
    tags_json TEXT NOT NULL,
    created_at TEXT NOT NULL,
    UNIQUE (note_id, revision)
);

CREATE TABLE IF NOT EXISTS note_views (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    note_id TEXT NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
    viewer_hash TEXT NOT NULL,
    view_day TEXT NOT NULL,
    viewed_at TEXT NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS note_views_unique_day_idx
    ON note_views (note_id, viewer_hash, view_day);

CREATE TABLE IF NOT EXISTS auth_attempts (
    identity_hash TEXT NOT NULL,
    attempted_at TEXT NOT NULL,
    success INTEGER NOT NULL CHECK (success IN (0, 1))
);

CREATE INDEX IF NOT EXISTS auth_attempts_identity_idx
    ON auth_attempts (identity_hash, attempted_at DESC);

CREATE TABLE IF NOT EXISTS audit_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    actor TEXT NOT NULL,
    action TEXT NOT NULL,
    subject_type TEXT NOT NULL,
    subject_id TEXT,
    metadata_json TEXT NOT NULL DEFAULT '{}',
    created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS audit_log_created_idx ON audit_log (created_at DESC);
