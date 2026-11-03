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
  `npm run build`, `npm run lint`; reservation integration tests: `npm test` with a
  replica set configured through `MONGODB_TEST_URI`.
- For frontend changes, run typecheck, build, lint, and `npm test` from `client/`.
- Keep commits/diffs focused. Summarize what changed, why, how these rules were
  respected, and validation results. Update this file when architecture evolves.
