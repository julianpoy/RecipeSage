#!/bin/sh

pnpm exec prisma migrate deploy
pnpm exec nx seed prisma
pnpm exec ts-node --swc --project packages/cli/tsconfig.json packages/cli/src/main.ts indexRecipes
pnpm exec ts-node --swc --project packages/backend/tsconfig.json packages/backend/src/main.ts

