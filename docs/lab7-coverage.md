# Lab 7: testing and coverage report

Verified on November 9, 2026 with `npx jest --coverage`:
**3 test suites passed; 114 tests passed.**

## Measured coverage

| Scope                        | Statements | Branches | Functions | Lines   |
| ---------------------------- | ---------- | -------- | --------- | ------- |
| All production backend files | 85.46%     | 93.10%   | 77.27%    | 85.89%  |
| src/services/                | 100.00%    | 100.00%  | 100.00%   | 100.00% |
| src/controllers/             | 100.00%    | 100.00%  | 100.00%   | 100.00% |

Statement and branch coverage both exceed 80% across services and controllers,
and across the complete backend. Jest enforces global minimums of 80% for both.
The [machine-readable snapshot](lab7-coverage-summary.json) contains per-file counts
and percentages from this run, with repository-relative paths.

Coverage includes all production `src/**/*.ts` files, including startup and
configuration. Test files and `src/test/` helpers are excluded. Remaining uncovered
code includes process startup (`src/server.ts`), production database connection
bootstrap (`src/config/database.ts`), compatibility model re-exports, and the
already-sent-response branch in the error middleware. These files remain counted
in the totals above.

The initial full-backend audit measured 82.55% statement coverage and 72.41% branch
coverage. Targeted tests for configured environment values and missing-variable
fallbacks raised the final totals to 85.46% statements and 93.10% branches.
Configuration tests mock dotenv to avoid reading local credentials.

## Test deliverables

- [Jest configuration](../jest.config.ts) discovers tests under `src/` and `tests/`.
- [Database setup](../src/test/setup.ts) starts a one-member in-memory replica set
  supporting real MongoDB transactions, creates a unique database per suite,
  clears records before each test, and cleans up the owned database and process.
  An optional `MONGODB_TEST_URI` selects an existing replica set.
- [42 service tests](../src/services/__tests__/reservation.service.test.ts) call
  reservation services directly. They cover resource creation through model
  fixtures, reservation persistence and DTOs, exact time matches, overlaps at
  either endpoint by one millisecond, adjacency, invalid time ranges, missing
  resources/users, cancelled bookings, concurrent requests, transaction rollback,
  cancellation, and filtered/sorted user history.
- [70 HTTP integration tests](../src/routes/__tests__/reservation.routes.test.ts)
  use Supertest against the real Express application and isolated database. They
  cover `POST /api/v1/reservations` returning 201, overlap conflicts returning 409,
  `GET /api/v1/resources` returning 200 with type/availability filters, malformed
  and missing fields, timezone offsets, concurrency, cancellation, and a complete
  create/list/conflict/cancel/rebook workflow.
- [2 configuration tests](../src/config/__tests__/env.test.ts) verify defaults and
  explicit environment overrides.

Service and route tests use the in-memory database rather than mocked database
query chains. Targeted failure tests mock a persistence failure or resource query
failure; Jest restores mocks between tests. Production application code retains
the Route → Controller → Service → Model layering. Tests and helpers are excluded
from the production build; frontend code and dependencies remain separate.

## Reproduce the results

From the repository root:

```sh
npm ci
npx jest --coverage
npm run typecheck
npm run build
npm run lint
```

All four validation commands passed. The first test run may download MongoDB and
requires network access. No running MongoDB instance or local `.env` file is
required for the default test setup.

The coverage command writes the full HTML report to
`coverage/lcov-report/index.html` and JSON data to `coverage/coverage-summary.json`.
Generated coverage output stays ignored; this report and the normalized JSON
snapshot are checked in for submission. Regenerate coverage after code changes
before updating the snapshot.
