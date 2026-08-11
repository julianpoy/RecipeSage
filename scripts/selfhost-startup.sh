#!/bin/sh

echo "==== Running migrations, please wait... ===="
pnpm exec prisma migrate deploy

echo "==== Running database seeders, please wait... ===="
pnpm exec nx seed prisma

echo "==== Rebuilding search index, please wait... ===="
node dist/apps/cli/main.cjs indexRecipes

echo "==== Starting API ===="
node dist/apps/backend/main.cjs

