-- Update all nullable fields to empty strings if not present

UPDATE "Recipes" SET "title" = '' WHERE "title" IS NULL;
UPDATE "Recipes" SET "description" = '' WHERE "description" IS NULL;
UPDATE "Recipes" SET "yield" = '' WHERE "yield" IS NULL;
UPDATE "Recipes" SET "activeTime" = '' WHERE "activeTime" IS NULL;
UPDATE "Recipes" SET "totalTime" = '' WHERE "totalTime" IS NULL;
UPDATE "Recipes" SET "source" = '' WHERE "source" IS NULL;
UPDATE "Recipes" SET "url" = '' WHERE "url" IS NULL;
UPDATE "Recipes" SET "notes" = '' WHERE "notes" IS NULL;
UPDATE "Recipes" SET "ingredients" = '' WHERE "ingredients" IS NULL;
UPDATE "Recipes" SET "instructions" = '' WHERE "instructions" IS NULL;
UPDATE "Recipes" SET "folder" = 'inbox' WHERE "folder" IS NULL;

-- AlterTable
ALTER TABLE "Recipes" ALTER COLUMN "title" SET NOT NULL,
ALTER COLUMN "description" SET NOT NULL,
ALTER COLUMN "description" SET DEFAULT '',
ALTER COLUMN "yield" SET NOT NULL,
ALTER COLUMN "yield" SET DEFAULT '',
ALTER COLUMN "activeTime" SET NOT NULL,
ALTER COLUMN "activeTime" SET DEFAULT '',
ALTER COLUMN "totalTime" SET NOT NULL,
ALTER COLUMN "totalTime" SET DEFAULT '',
ALTER COLUMN "source" SET NOT NULL,
ALTER COLUMN "source" SET DEFAULT '',
ALTER COLUMN "url" SET NOT NULL,
ALTER COLUMN "url" SET DEFAULT '',
ALTER COLUMN "notes" SET NOT NULL,
ALTER COLUMN "notes" SET DEFAULT '',
ALTER COLUMN "ingredients" SET NOT NULL,
ALTER COLUMN "ingredients" SET DEFAULT '',
ALTER COLUMN "instructions" SET NOT NULL,
ALTER COLUMN "instructions" SET DEFAULT '',
ALTER COLUMN "folder" SET NOT NULL;
