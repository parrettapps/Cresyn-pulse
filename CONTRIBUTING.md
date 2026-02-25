# Contributing to Cresyn Pulse

## First-Time Setup

```bash
git clone <repo-url>
cd cresyn-pulse
./scripts/setup-dev.sh
```

## Monorepo Structure

```
cresyn-pulse/
├── apps/
│   ├── api/          — Fastify API server (TypeScript)
│   ├── web/          — Next.js frontend (TypeScript + React)
│   └── worker/       — BullMQ worker (TypeScript) [coming soon]
└── packages/
    ├── config/       — Shared constants: roles, permissions, modules
    ├── db/           — Drizzle schema + migrations (single source of truth)
    ├── types/        — Shared TypeScript interfaces
    └── validation/   — Shared Zod schemas (used by both API and web)
```

## Branch Strategy

- `main` — production. Protected. PR required. Never commit directly.
- `dev` — staging. Auto-deploys to Railway dev environment.
- Feature branches: `feat/company-crud`, `fix/timesheet-validation`, etc.

**Flow:** `feat/...` → `dev` (PR) → `main` (PR after testing in dev)

## Running the Apps

```bash
# All apps simultaneously
pnpm dev

# Individual apps
pnpm --filter @cresyn/api dev
pnpm --filter @cresyn/web dev

# Database
pnpm db:migrate      # Apply pending migrations
pnpm db:generate     # Generate new migration after schema change
pnpm db:studio       # Open Drizzle Studio (visual DB browser)
```

## Adding a New API Module

1. Create `apps/api/src/modules/{module-name}/`
2. Create `{module-name}.routes.ts` implementing Fastify plugin
3. Create `{module-name}.service.ts` with business logic
4. Create `{module-name}.repository.ts` extending `BaseRepository`
5. Add one entry to `apps/api/src/modules/registry.ts`
6. Add corresponding frontend module to `apps/web/src/modules/registry.ts`

**Never write database queries outside a repository class.**
**Never skip the `authenticate` preHandler on a protected route.**

## Adding a Database Table

1. Edit `packages/db/src/schema.ts`
2. Run `pnpm db:generate` to create migration file
3. Run `pnpm db:migrate` to apply it
4. Export new types at the bottom of `schema.ts`

All tenant-scoped tables MUST include:
- `tenantId uuid NOT NULL references tenants(id)`
- `createdAt`, `updatedAt` timestamps
- `deletedAt` for soft deletes
- Composite index on `(tenantId, [primary sort field]) WHERE deletedAt IS NULL`

## Security Rules

### Absolute Rules (No Exceptions)

1. **Every new repository method that queries data must use `BaseRepository.baseFilter()`** — never query without tenant scope
2. **Never interpolate user input into SQL strings** — always use Drizzle's parameterized API or `sql` tagged template
3. **Every new API route must have `authenticate` as its first preHandler** — no exceptions
4. **Notes content must be sanitized with `isomorphic-dompurify` on write** — never trust user content
5. **The tenant isolation security tests must stay green** — these are a CI gate, not optional

### Code Review Checklist

When reviewing PRs, verify:
- [ ] New repository methods apply `this.baseFilter()` (tenant + soft-delete scope)
- [ ] New routes have `authenticate` preHandler
- [ ] New write operations call `AuditService.log()`
- [ ] New string fields have max-length Zod constraints
- [ ] No raw SQL string concatenation with user input

## Running Tests

```bash
# All tests
pnpm test

# Security tests (tenant isolation — must always pass)
pnpm test:security

# Watch mode (during development)
pnpm --filter @cresyn/api test:watch
```

## Environment Variables

See `.env.example` for all required variables with descriptions.
Generate secrets:
```bash
openssl rand -base64 64   # For JWT_SECRET
openssl rand -base64 32   # For BETTER_AUTH_SECRET
```

## Commit Message Format

```
type(scope): short description

Longer explanation if needed.

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
```

Types: `feat`, `fix`, `chore`, `docs`, `test`, `refactor`, `perf`
Scopes: `api`, `web`, `db`, `auth`, `crm`, `pipeline`, `timesheets`, `projects`, `billing`

## Weekly Architecture Review

Every Monday, briefly review:
1. Are we on track with the 90-day roadmap?
2. Any new dependencies worth auditing?
3. Any performance issues in Sentry/logs?
4. Any scope creep to cut?
