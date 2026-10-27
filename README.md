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
tests. Backend `npm test` requires a replica set configured through
`MONGODB_TEST_URI` and uses an isolated temporary database.

The Lab 5 audit records 20 passing client tests, 57 passing backend integration
tests, and browser verification of a real `409 DOUBLE_BOOKING` response, form
recovery, cancellation, and error states. Frontend code and dependencies stay in
`client/`; backend routes, controllers, services, and models retain their layering.
