#!/bin/bash

docker compose exec backend npx tsx packages/backend/src/migrate.js

