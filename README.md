# CampusHub — CS 5500

Campus resource browsing and reservations with an Express/Mongoose backend and a
separate React/TypeScript/Vite client.

## Lab 5 deliverables

| Deliverable                                       | Location                                                           |
| ------------------------------------------------- | ------------------------------------------------------------------ |
| React/TypeScript frontend scaffold and setup      | [client/](client/README.md)                                        |
| Typed API methods and structured errors           | [campushubApi.ts](client/src/api/campushubApi.ts)                  |
| Resource cards and type filters                   | [ResourceList.tsx](client/src/components/ResourceList.tsx)         |
| Reservation form, validation, and conflict alerts | [BookingForm.tsx](client/src/components/BookingForm.tsx)           |
| Active bookings, cancellation, and refresh        | [UserReservations.tsx](client/src/components/UserReservations.tsx) |
| OpenAPI contract                                  | [docs/openapi.yaml](docs/openapi.yaml)                             |
| Full-stack error audit and screenshot             | [Lab 5 audit](docs/lab5-state-audit.md)                            |

## Lab 6 context optimization

| Submission deliverable                    | Location                                                     |
| ----------------------------------------- | ------------------------------------------------------------ |
| Cursor context and ignore rules           | [.cursorrules](.cursorrules), [.cursorignore](.cursorignore) |
| Centralized Express error middleware      | [errorHandler.ts](src/middleware/errorHandler.ts)            |
| Reservation loading and cancellation hook | [useReservations.ts](client/src/hooks/useReservations.ts)    |
| Shared full-stack API declarations        | [api.d.ts](shared/api.d.ts)                                  |

React hooks live under `client/src/hooks/`, within the separate frontend application.

See the [Part 1 audit and verification](docs/lab6-context-optimization.md) for the
shared agent rules, ignore patterns, context-size comparison, and source-only query.

See the [Part 2 bloat and redundancy audit](docs/lab6-bloat-audit.md) for controller
duplication, component sizes, DTO drift, and prioritized refactoring candidates.

See the [Part 3 refactoring and validation](docs/lab6-refactoring.md) for centralized
error handling, reservation hooks, shared declarations, and regression results.

## Lab 7 testing deliverables

| Submission deliverable                 | Location                                                                          |
| -------------------------------------- | --------------------------------------------------------------------------------- |
| Jest configuration                     | [jest.config.ts](jest.config.ts)                                                  |
| Isolated in-memory MongoDB replica set | [src/test/setup.ts](src/test/setup.ts)                                            |
| Reservation service tests              | [reservation.service.test.ts](src/services/__tests__/reservation.service.test.ts) |
| Supertest HTTP integration tests       | [reservation.routes.test.ts](src/routes/__tests__/reservation.routes.test.ts)     |
| Environment configuration tests        | [env.test.ts](src/config/__tests__/env.test.ts)                                   |
| Coverage audit and reproduction steps  | [Lab 7 coverage report](docs/lab7-coverage.md)                                    |
| Machine-readable coverage snapshot     | [Lab 7 coverage summary](docs/lab7-coverage-summary.json)                         |

```sh
npm ci
npx jest --coverage
```

The test helper starts a one-member in-memory MongoDB replica set with transaction
support. Each suite gets a unique database; records are cleared between tests,
and the database and owned MongoDB process are removed at teardown. The first run
may download the MongoDB binary and requires network access. Set
`MONGODB_TEST_URI` only to use an existing replica set instead. No local `.env`
configuration is required for the tests.

## Run locally

Use Node.js 22.18+ and a MongoDB replica set or sharded cluster for reservation
creation. Configure the backend's `MONGODB_URI` for your local database.

```sh
# Backend, from the repository root:
npm ci
cp .env.example .env
npm run dev
```

In another terminal:

```sh
cd client
npm ci
cp .env.example .env
npm run dev
```

Open the Local URL printed by Vite. The development proxy connects `/api/v1` to
the backend on port 3000. Use an existing student ID and resource in your database;
this lab does not include authentication or a data-seeding endpoint. See the
[client setup guide](client/README.md) for configuration and the booking flow.

## Validation

Run `npm run typecheck`, `npm run build`, and `npm run lint` in both the repository
root and `client/`. Run `npm test` in `client/` for the API and state regression
tests. Backend `npm test` uses Jest and starts an isolated in-memory replica set
automatically. Run `npx jest --coverage` for the backend coverage audit; both global
statement and branch coverage must reach 80%.

The Lab 5 audit records 20 passing client tests, 57 passing backend integration
tests, and browser verification of a real `409 DOUBLE_BOOKING` response, form
recovery, cancellation, and error states. Frontend code and dependencies stay in
`client/`; backend routes, controllers, services, and models retain their layering.
