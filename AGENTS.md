# CampusHub Agent Rules

## Scope and stack

- Backend: TypeScript, Express, Mongoose; existing Zod validation and dotenv configuration.
- Frontend: the Lab 5 React/TypeScript/Vite application is authorized only in `client/`.
  Keep its dependencies, scripts, configuration, and build output separate.
- Shared wire DTOs belong in `shared/api.d.ts`, a declaration-only layer imported
  with `import type` by both applications. Keep runtime code and dependencies out.
- Do not create or modify `.js` source/configuration files, introduce unapproved
  libraries/frameworks, or add mobile or unrelated infrastructure code.
- Use existing tooling (TypeScript, ESLint, Prettier, ts-node, Node types) and project
  patterns; never bypass the stack with hidden runtime shortcuts or dynamic execution.

## Backend architecture

Every endpoint, including health checks, follows Route -> Controller -> Service -> Model.
Keep each layer in its dedicated files:

- `src/routes/`: endpoint and middleware mappings to typed controller handlers only;
  no inline request/response handlers, business logic, or database access.
- `src/controllers/`: parse and validate requests, call services, format typed
  responses/status codes; Express 5 forwards rejected handlers to `src/middleware/errorHandler.ts`.
  No database queries or domain rules.
- `src/services/`: business rules and workflows, with database access through models;
  no Express request/response dependencies.
- `src/models/`: typed Mongoose schemas, persistence validation, and interfaces only;
  no HTTP behavior, controllers, or route logic.
- `src/app.ts`: configure Express, middleware, and router mounting only;
  no endpoint callbacks, business logic, or database access.

## TypeScript and safety

- Give all functions explicit parameter/return types and schemas explicit interfaces
  or types. Use narrow, readable DTOs and service contracts; never use `any`.
- Use async/await, handle rejected promises in the appropriate layer, and report
  structured errors without silent failures.
- Validate payloads and guard against null, undefined, and invalid values.
- Read backend configuration through dotenv/environment variables; never expose
  secrets or local credentials in source or logs.
- Keep functions small and names descriptive. Match existing patterns, avoid
  unrelated refactors, and never add test-only production code.

## Frontend (`client/` only)

- Use functional components with explicit prop interfaces and return types.
- Use hooks for state, loading, errors, and effect cleanup.
- Keep HTTP calls in `client/src/api/campushubApi.ts`, outside components/JSX.
- Follow `docs/openapi.yaml` for DTOs, enums, paths, methods, and error bodies.
- Keep booking state in `useBooking` and reservation loading/cancellation in `useReservations`.
- Use CSS Modules and a small global base stylesheet.
- Use Vite environment variables for public browser configuration; never expose secrets.

## Context and workflow

- Read relevant source before editing; make the smallest safe, focused change.
- Start backend queries in `src/`; expand to `shared/`, `client/src/`, tests, configuration, or
  `docs/openapi.yaml` only as the task requires. Keep these authored files available.
- Honor `.cursorignore` for context searches. With ripgrep, pass
  `--ignore-file .cursorignore`; do not assume other agents automatically enforce it.
- Skip dependency trees, lockfiles, builds, coverage, generated API output, historical
  logs, and bundle maps. Do not load past lab reports unless the task needs them.
- Run relevant validation before claiming completion. Backend: `npm run typecheck`,
  `npm run build`, `npm run lint`; reservation integration tests: `npm test` (Jest
  and Supertest). `src/test/setup.ts` starts an in-memory MongoDB replica set by
  default; set `MONGODB_TEST_URI` to use an existing replica set instead. Each suite
  uses a unique database, clears documents between tests, and drops only its own
  database on teardown. Keep test helpers out of the production build.
- Service tests live in `src/services/__tests__/` and call services directly using
  the same isolated database setup. HTTP integration tests live in
  `src/routes/__tests__/` and use Supertest. Jest discovers tests under `src/` and
  `tests/`; production TypeScript compilation excludes `__tests__` directories.
- Run `npx jest --coverage` for an audit of all production backend TypeScript,
  including startup/configuration and excluding tests/helpers. Global statement
  and branch coverage must each reach 80%.
- For frontend changes, run typecheck, build, lint, and `npm test` from `client/`.
- Keep commits/diffs focused. Summarize what changed, why, how these rules were
  respected, and validation results. Update this file when architecture evolves.

## CI auto-healing

- CI orchestration lives in `.github/workflows/ci.yml`; the typed AI patch runner
  lives in `scripts/auto-heal.ts` with its own `scripts/tsconfig.json`. Keep scripts
  outside the backend production build. Runner regression tests live in `tests/`.
- Start repairs only for a failed Jest step. Preserve the failed CI result and
  logs. Restrict generated edits to tracked production TypeScript under `src/`,
  excluding tests/helpers; never let the agent edit workflows or dependencies.
- Re-run lint, typecheck, build, and all Jest tests with coverage before opening
  a patch PR. Never auto-merge. Skip fork PRs and recursive auto-heal branches.
- Configure API credentials as Actions secrets, scoped to the model step. See
  `docs/auto-healing-ci.md` for setup and review instructions.
