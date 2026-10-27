# CampusHub client — Lab 5, Parts 1–3

React, TypeScript, Vite, native fetch, and CSS Modules. The frontend has its own
package manifest and compiler settings; backend code remains in the root `src/`.
Node.js 22.18+ is required (Node 24 is recommended for the built-in TypeScript test runner).

## Run locally

Start the backend from the repository root using its existing environment setup:

```sh
npm install
cp .env.example .env
npm run dev
```

In a second terminal:

```sh
cd client
npm install
cp .env.example .env
npm run dev
```

Open the Local URL printed by Vite (normally http://localhost:5173). Requests to
`/api/v1` are proxied to `http://localhost:3000`; set `API_PROXY_TARGET` in the
client environment if the backend runs elsewhere. The resource browser provides
type filters, loading, empty and error states, and retry via Refresh. It displays
live API data; it does not seed or fabricate resources.

MongoDB must be running for resource requests. Reservation creation requires a
replica set or sharded cluster, plus existing resource and user IDs, as documented
in the backend contract. This API does not provide login or user creation.

## API contract

`../docs/openapi.yaml` is the source for the manually generated interfaces in
`src/api/types.ts` and the methods in `src/api/campushubApi.ts`:

| Method                                             | HTTP request                                 | Result          |
| -------------------------------------------------- | -------------------------------------------- | --------------- |
| `fetchResources(type?: string)`                    | `GET /resources?type=ROOM` (filter optional) | `Resource[]`    |
| `createReservation(payload: CreateReservationDTO)` | `POST /reservations`                         | `Reservation`   |
| `fetchUserReservations(userId: string)`            | `GET /reservations/user/{userId}`            | `Reservation[]` |
| `cancelReservation(reservationId: string)`         | `PATCH /reservations/{id}/cancel` (no body)  | `Reservation`   |

`CreateReservationDTO` maps to the contract's `CreateReservationRequest`. Resource
fields are `type` and `isAvailable`. Reservation statuses are `PENDING`,
`CONFIRMED`, and `CANCELLED`; timestamps are ISO strings with a timezone. Convert
local form input with `new Date(value).toISOString()` before submitting.

Each method rejects with `ApiError` for validation, network, HTTP, and malformed
response errors. It exposes `status`, `code`, and `message`; a conflict preserves
`status === 409` and `code === 'DOUBLE_BOOKING'` so the reservation form shows
an actionable banner. Aborted resource requests retain `AbortError` for effect
cleanup. `fetchResources` and `fetchUserReservations` accept an optional second
`AbortSignal` argument.

Requests have a 15-second deadline covering headers and JSON body reads. Expiry
returns `ApiError` with code `REQUEST_TIMEOUT`, allowing each hook to clear its
loading or mutation state. Timers and caller abort listeners are always removed.
A timeout or lost response does not prove whether a booking or cancellation
reached the backend; refresh bookings before retrying a mutation.

The client validates identifiers, timestamps, and time ordering for immediate
feedback; the backend remains authoritative for users, resources, and conflicts.
The availability flag does not indicate whether a particular time slot is free.
Request and response tests guard against contract drift; there is no automated
OpenAPI code generation dependency. Update the client alongside contract changes.

## Layout and checks

- `src/api/`: contract interfaces, HTTP methods, and structured errors.
- `src/hooks/`: asynchronous state and effect cleanup.
- `src/components/`: functional components with explicit prop interfaces.
- `src/utils/`: booking form validation and active reservation selection.
- `*.module.css`: component styles; `src/index.css`: global base styles.

```sh
npm run typecheck
npm run lint
npm test
npm run build
```

Tests use Node's built-in runner with mocked fetch and require no database. The
production bundle is written to `client/dist/`. Vite's proxy is development-only:
serve production `/api/v1` through the same origin's reverse proxy, or configure
`VITE_API_BASE_URL` at build time and arrange CORS on the API host. Only public
configuration belongs in `VITE_` variables. `npm run preview` serves the bundle
for inspection and does not provide the development API proxy.

## Interactive booking flow

1. Enter the MongoDB identifier of an existing student in **Current student** and
   select **Set student**. This lab selector does not authenticate users or create
   students; the existing backend API has no login endpoint. The selected student
   is held in React state and resets when the page reloads.
2. Use **Study rooms**, **Equipment**, or **Labs** to filter `ResourceList`.
   Select **Book this resource** on an available card. Unavailable resources stay
   visible with their booking action disabled.
3. In `BookingForm`, enter local start/end times and select **Request booking**.
   Validation requires valid dates and an end after the start, then converts the
   times to UTC ISO strings. There is no added future-only restriction. Duplicate
   submissions are blocked while a request is pending. Errors preserve your input;
   a 409 conflict asks you to choose another time. Success clears the times and
   refreshes the dashboard.
4. `UserReservations` shows the current student's `PENDING` and `CONFIRMED` bookings
   in start-time order. **Cancel Reservation** shows a pending state, uses the
   server response to remove the cancelled booking, then reloads the list.
   Failures keep the booking visible with an error. **Refresh bookings** retries
   failed loads. If a refresh fails, the last successfully loaded list is retained.

HTTP calls stay in the API module; hooks coordinate requests, loading, mutation
state, and cleanup. Switching student remounts student-specific components and
aborts previous reads so late responses cannot replace the new student's state.
Changing resource resets the booking form. A booking that already reached the
server can still finish after a selection change and will refresh the dashboard.

With a running backend and MongoDB replica set, manually verify: filter resources;
submit missing/equal/reversed times; create a booking; attempt an overlapping
booking; cancel and confirm removal; switch student and confirm the list changes;
stop the backend and check error/retry behavior. Automated tests cover API requests,
error contracts, local-time conversion, validation, and dashboard selection; they
do not exercise browser interactions or the live database. The separate
[Part 3 audit](../docs/lab5-state-audit.md) records a real browser double-booking
test, fault-injection checks, backend integration results, and a screenshot.
