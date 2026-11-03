# Lab 6, Part 1: Context optimization

This records the Part 1 snapshot. Later architecture changes are documented in
[Part 3](lab6-refactoring.md).

## Audit and changes

The root had no `.cursorrules` or `CLAUDE.md`. Its existing `AGENTS.md` repeated
layering, scope, workflow, and summary rules. The Copilot instructions duplicated
those rules and described repository/data-access directories that do not exist.

- Condensed `AGENTS.md` while preserving backend layering, TypeScript/safety rules,
  the Lab 5 frontend exception, and required validation.
- Added `.cursorrules` and reduced `.github/copilot-instructions.md` to entry points
  that direct agents to the shared rules instead of maintaining duplicate policies.
- Added `.cursorignore` for nested dependencies, builds, coverage, caches, lockfiles,
  historical/runtime logs, bundle maps, and generated API output. Authored OpenAPI
  contracts, source, tests, manifests, and environment examples remain available.
- Added source-first query guidance. Historical lab reports are read only when
  relevant; the historical steering log is excluded from routine context searches.

## Context size

Measured with `wc -w -c`; these are instruction-text measurements, not model tokens.

| Instruction file                  | Before bytes | After bytes |
| --------------------------------- | -----------: | ----------: |
| `AGENTS.md`                       |        7,530 |       3,737 |
| `.github/copilot-instructions.md` |        3,128 |         433 |
| `.cursorrules`                    |            0 |         264 |
| Total                             |       10,658 |       4,434 |

Instruction bytes decreased **58.4%**; words decreased from **1,576 to 597**.
This measures the combined rule text, including the new Cursor entry point.
Actual model token usage and Cursor's loaded context were not available in this
session, so no model-token reduction is claimed.

## Lightweight agent query

Prompt used for the source audit:

> Using only files under `src/`, trace reservation creation and explain where
> double booking is prevented and how its HTTP response is selected.

Explicitly scope discovery and search to source:

```sh
rg --files --hidden --ignore-file .cursorignore src
rg -n --ignore-file .cursorignore --glob '*.ts' \
  'router.post|createReservation =|createReservationService|connection.transaction|findOneAndUpdate|Reservation.exists|DOUBLE_BOOKING|res.status\(201\)|snapshot' src
```

Result: discovery returned **23 TypeScript files, all under `src/`**. The search
returned only source matches. The answer required these source files:

- `src/app.ts` mounts the router under `/api/v1`.
- `src/routes/reservation.routes.ts` maps `POST /reservations` to the controller.
- `src/controllers/reservation.controller.ts` validates the payload, calls the
  service, returns `201`, and forwards errors to centralized middleware.
- `src/services/reservation.service.ts` creates a transaction, writes the resource's
  reservation version to serialize competing creations, and checks for overlapping
  `PENDING`/`CONFIRMED` reservations. A conflict raises `DOUBLE_BOOKING`.
- `src/middleware/error.middleware.ts` maps `DOUBLE_BOOKING` to HTTP `409`.

The explicit `src` argument restricts this query. The ignore file independently
reduces broader context searches; it does not force all tasks to ignore the frontend,
tests, configuration, or the authored API contract.

## Verification

- A temporary fixture exercised the ignore file with ripgrep: all **32** generated,
  dependency, log, lockfile, and local-environment paths were excluded; all **13**
  authored source/configuration paths were retained. The fixture included root and
  nested build/dependency paths, both authored OpenAPI files, frontend/backend tests,
  and root/client `.env.example` files. No fixture files remain in the repository.
- Backend `npm run typecheck`, `npm run build`, and `npm run lint` passed.
- Prettier checks for agent-rule Markdown and this report, plus `git diff --check`, passed.
- Application source, dependencies, and runtime behavior were not changed. Database
  integration tests and frontend checks were not run for this context-only change.

`.cursorignore` is not assumed to be enforced by every agent or shell tool. The
verification above explicitly passed `--ignore-file .cursorignore` to ripgrep.
These checks validate file selection and smaller rule text; use the IDE's context
and token counters to measure an actual Cursor session.
