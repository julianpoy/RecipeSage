BEGIN;

SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '60s';

ALTER TABLE "Recipes" SET (
  autovacuum_vacuum_scale_factor = 0.02,
  autovacuum_vacuum_cost_limit = 2000
);

ALTER TABLE "Recipes" ADD COLUMN IF NOT EXISTS "tsv" tsvector;

CREATE OR REPLACE FUNCTION recipes_tsv_trigger() RETURNS trigger AS $$
BEGIN
  NEW.tsv :=
    setweight(to_tsvector('simple', left(coalesce(NEW.title, ''), 255)), 'A') ||
    setweight(to_tsvector('simple', left(coalesce(NEW.description, ''), 255)), 'B') ||
    setweight(to_tsvector('simple', left(coalesce(NEW.ingredients, ''), 3000)), 'B') ||
    setweight(to_tsvector('simple', left(coalesce(NEW.source, ''), 255)), 'C') ||
    setweight(to_tsvector('simple', left(coalesce(NEW.notes, ''), 3000)), 'C') ||
    setweight(to_tsvector('simple', left(coalesce(NEW.instructions, ''), 3000)), 'C');
  RETURN NEW;
END
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS recipes_tsv_update ON "Recipes";
CREATE TRIGGER recipes_tsv_update
  BEFORE INSERT OR UPDATE OF title, description, ingredients, source, notes, instructions
  ON "Recipes"
  FOR EACH ROW
  EXECUTE FUNCTION recipes_tsv_trigger();

COMMIT;
