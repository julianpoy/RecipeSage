#!/bin/sh

npx prisma migrate deploy
npx nx seed prisma
npx ts-node --swc --project packages/backend/tsconfig.json packages/backend/src/bin/www.ts

