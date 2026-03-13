ALTER TABLE "notes" ADD COLUMN "unique_view_count" integer DEFAULT 0;

CREATE TABLE IF NOT EXISTS "note_views" (
  "id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  "note_id" text NOT NULL REFERENCES "notes"("id") ON DELETE CASCADE,
  "viewer_ip" text NOT NULL,
  "viewed_at" timestamp DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "idx_note_views_note_ip" ON "note_views" ("note_id", "viewer_ip");
