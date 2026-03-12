ALTER TABLE notes ADD COLUMN IF NOT EXISTS search_vector tsvector;

CREATE INDEX IF NOT EXISTS idx_notes_search ON notes USING GIN(search_vector);
CREATE INDEX IF NOT EXISTS idx_notes_tags ON notes USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_notes_public_created ON notes(created_at DESC) WHERE no_index = false AND is_deleted = false;

CREATE OR REPLACE FUNCTION notes_search_vector_update() RETURNS trigger AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('russian', COALESCE(NEW.title, '')), 'A') ||
    setweight(to_tsvector('english', COALESCE(NEW.title, '')), 'A') ||
    setweight(to_tsvector('russian', COALESCE(regexp_replace(NEW.content, E'^---[\\s\\S]*?---\\s*', '', 'g'), '')), 'B') ||
    setweight(to_tsvector('english', COALESCE(regexp_replace(NEW.content, E'^---[\\s\\S]*?---\\s*', '', 'g'), '')), 'B');
  RETURN NEW;
END $$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS notes_search_vector_trigger ON notes;
CREATE TRIGGER notes_search_vector_trigger
  BEFORE INSERT OR UPDATE OF title, content ON notes
  FOR EACH ROW EXECUTE FUNCTION notes_search_vector_update();

UPDATE notes SET search_vector = setweight(to_tsvector('russian', COALESCE(title, '')), 'A') || setweight(to_tsvector('english', COALESCE(title, '')), 'A') || setweight(to_tsvector('russian', COALESCE(regexp_replace(content, E'^---[\\s\\S]*?---\\s*', '', 'g'), '')), 'B') || setweight(to_tsvector('english', COALESCE(regexp_replace(content, E'^---[\\s\\S]*?---\\s*', '', 'g'), '')), 'B');
