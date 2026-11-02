## About RecipeSage

- RecipeSage is an Nx monorepo. The stack is Angular with Ionic, tRPC, Express, Prisma on PostgreSQL, and BullMQ.
- `packages/frontend` is the app. It is built for the web (browser and PWA), for Electron, and for Capacitor (iOS and Android).
- `packages/trpc` has the tRPC procedures. Most new API code goes here.
- `packages/express` has typed Express handlers, for routes that cannot be tRPC procedures.
- `packages/backend` has the legacy REST API in plain JavaScript. The maintainer is moving code out of it.
- `packages/queue-worker` runs the BullMQ jobs.
- `packages/prisma` has the Prisma schema and the migrations.
- `packages/util/server` has code that more than one backend service uses.
- `packages/util/shared` has code that the frontend and the backend both use.
- `packages/www` is the Astro marketing site.
- `packages/desktop` is the Electron app. It loads the frontend.
- `packages/webextension-v3` is the browser extension that clips recipes from web pages.
- `packages/cli` has maintenance commands, for example the database seed.
- The backend has tests in `*.spec.ts` files next to the code in `packages/trpc`, `packages/express` and `packages/util/server`. The frontend has no tests.
- The translations are in `packages/frontend/src/assets/i18n`. `en-us.json` is the source language.
- More than half of the users do not speak English. Many users are 40 or older and are not technical.
