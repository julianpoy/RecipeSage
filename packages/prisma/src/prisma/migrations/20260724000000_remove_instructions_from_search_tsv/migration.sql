BEGIN;

SET LOCAL lock_timeout = '5s';

CREATE OR REPLACE FUNCTION recipes_tsv_trigger() RETURNS trigger AS $$
BEGIN
  NEW.tsv :=
    setweight(to_tsvector('simple', immutable_unaccent(left(coalesce(NEW.title, ''), 255))), 'A') ||
    setweight(to_tsvector('simple', immutable_unaccent(left(coalesce(NEW.description, ''), 255))), 'B') ||
    setweight(to_tsvector('simple', immutable_unaccent(left(coalesce(NEW.ingredients, ''), 3000))), 'B') ||
    setweight(to_tsvector('simple', immutable_unaccent(left(coalesce(NEW.source, ''), 255))), 'C') ||
    setweight(to_tsvector('simple', immutable_unaccent(left(coalesce(NEW.notes, ''), 3000))), 'C');
  RETURN NEW;
END
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION discover_recipes_tsv_trigger() RETURNS trigger AS $$
BEGIN
  NEW.tsv :=
    setweight(to_tsvector('simple', immutable_unaccent(left(coalesce(NEW.title, ''), 255))), 'A') ||
    setweight(to_tsvector('simple', immutable_unaccent(left(coalesce(NEW.description, ''), 255))), 'B') ||
    setweight(to_tsvector('simple', immutable_unaccent(left(coalesce(NEW.ingredients, ''), 3000))), 'B') ||
    setweight(to_tsvector('simple', immutable_unaccent(left(coalesce(NEW.notes, ''), 3000))), 'C');
  RETURN NEW;
END
$$ LANGUAGE plpgsql;

COMMIT;
