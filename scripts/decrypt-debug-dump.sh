#!/bin/bash

docker compose exec backend npx ts-node --swc --project ./packages/backend/tsconfig.json ./packages/backend/src/decryptDebugStore.app.ts "$@"

