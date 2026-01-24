# RecipeSage

Collaborative recipe management application with meal planning, shopping lists, and social sharing. Self-hostable or hosted at https://recipesage.com.

## Quick Reference

| Command                                              | Purpose                                    |
| ---------------------------------------------------- | ------------------------------------------ |
| `docker compose up -d`                               | Start all dev services (11 containers)     |
| `docker compose exec backend npx prisma migrate dev` | Run database migrations                    |
| `nx start frontend`                                  | Angular dev server (http://localhost:8100) |
| `nx start backend`                                   | Express dev server (http://localhost:3000) |
| `nx test <package>`                                  | Run tests (Vitest)                         |
| `nx lint`                                            | ESLint check                               |

Access via http://localhost after docker compose (nginx proxy).

## Architecture

**Monorepo** (Nx 22.3) with 8 packages in `/packages`:

| Package           | Stack                | Purpose                                |
| ----------------- | -------------------- | -------------------------------------- |
| `frontend`        | Angular 21 + Ionic 8 | Web/mobile UI (PWA + Capacitor)        |
| `backend`         | Express 5            | REST API (legacy routes)               |
| `trpc`            | tRPC 11              | New API layer (use for new features)   |
| `prisma`          | Prisma 7             | Database schema & migrations           |
| `queue-worker`    | BullMQ               | Job processing (exports, imports)      |
| `util/server`     | Node                 | Server utilities (ML, email, database) |
| `util/shared`     | TS                   | Shared client/server utilities         |
| `webextension-v3` | Manifest V3          | Browser extension                      |

**External Services** (via docker-compose):

- PostgreSQL 16 - Database
- Typesense - Full-text search
- Valkey - Job queue (Redis-compatible)
- Browserless - Headless Chrome for recipe scraping
- Pushpin - WebSocket gateway

## Key Patterns

### New Features → tRPC

Use `packages/trpc/src/procedures/` for new API endpoints. Legacy REST routes in `packages/backend/src/routes/` are being phased out.

### Frontend Components

Angular 21 standalone components (no NgModules). Pages in `packages/frontend/src/app/pages/`, modals in `packages/frontend/src/app/modals/`.

### Database Changes

1. Edit `packages/prisma/src/prisma/schema.prisma`
2. Run `docker compose exec backend npx prisma migrate dev --name <migration_name>`

### Translations

Managed via Weblate (https://weblate.recipesage.com). Primary file: `packages/frontend/src/assets/i18n/en-us.json`. AI translations not accepted.

## Tech Stack

- **Frontend**: Angular 21, Ionic 8, Capacitor 8, SCSS, RxJS
- **Backend**: Express 5, tRPC 11, Prisma 7, BullMQ
- **AI**: Vercel AI SDK (supports OpenAI, Gemini, Claude, OpenRouter)
- **Build**: Nx, esbuild, Webpack, Vitest
- **Linting**: ESLint 9 (flat config), Prettier, Husky pre-commit hooks

## Environment Variables

Copy `example.env` to `.env`. Key variables:

```bash
# AI (for recipe extraction)
AI_PROVIDER=openai|google|anthropic|openrouter
AI_MODEL_HIGH=gpt-4o
OPENAI_API_KEY=...

# AWS (image/export storage)
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...

# Stripe (payments)
STRIPE_SK=...
STRIPE_WEBHOOK_SECRET=...
```

## Database Schema

Core entities in `packages/prisma/src/prisma/schema.prisma`:

- **User** - Auth, profiles, subscriptions
- **Recipe** - Title, ingredients, instructions, images, nutrition (future)
- **Label/LabelGroup** - Hierarchical categorization
- **MealPlan/MealPlanItem** - Meal scheduling with collaborators
- **ShoppingList/ShoppingListItem** - Shopping with auto-categorization

## Testing

```bash
# Run all tests
docker compose exec backend env NODE_ENV=test npx nx test backend

# Run specific package tests
nx test frontend
```

Vitest with V8 coverage. Test files colocated with source (`.spec.ts`).

## Current Work

**Branch: `feature/nutrition-display`**

Adding nutrition information display to recipe pages:

- New modal: `packages/frontend/src/app/modals/nutrition-modal/`
- Recipe page integration with mock data (TODO: backend schema)
- Per-ingredient nutrition breakdown with estimated/optional flags

## Code Style

- TypeScript strict mode
- Path aliases: `@recipesage/*/` and `~/` (frontend)
- Prettier auto-formats on commit
- ESLint enforces Nx module boundaries
- Unused vars must be prefixed with `_`

## Deployment

- Production: https://recipesage.com
- Self-host: https://github.com/julianpoy/recipesage-selfhost
- CI: GitHub Actions (CodeQL security scanning)

## License

AGPL-3.0 for non-commercial use; commercial licensing available.
