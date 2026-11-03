# Lab 6, Part 3: Guided refactoring

## Structured refactoring instructions applied

### Backend error handling

> Remove the four forwarding-only controller try/catch blocks. Use Express 5's
> rejected-promise forwarding and put the existing centralized error middleware
> in `src/middleware/errorHandler.ts`. Mount it after the routers. Preserve typed
> request parsing, service calls, status codes, `{ code, message }` responses,
> validation, and sanitized unexpected errors. Verify the existing integration suite.

The middleware moved from `error.middleware.ts` and is exported as `errorHandler`.
All controllers now contain zero try/catch blocks. Service rules and Mongoose
queries retain their existing layers. Domain, Zod, malformed-JSON, and unexpected
errors still use the same status/body mapping; the headers-sent guard remains.

### Frontend reservation hooks

> Keep reservation API calls and asynchronous state in reusable hooks. Retain
> `useBooking` for form validation/submission, expose list loading and cancellation
> through `useReservations`, and centralize repeated error-message fallbacks.
> Preserve conflict feedback, effect cleanup, duplicate-action guards, keyed state
> resets, and refresh behavior. Keep HTTP implementation in `campushubApi.ts`.

The components already delegated their asynchronous work to hooks before Part 3.
This pass retains that extraction, renames `useUserReservations` to
`useReservations`, updates its component consumer, and reuses `getErrorMessage`
across booking, reservation, and resource hooks. Booking keeps its specific `409`
message. Components remain focused on rendering and UI events.

### Shared declarations

> Consolidate duplicate wire DTOs and enum unions into one declaration-only layer
> used by both applications. Follow `docs/openapi.yaml`, preserve independent builds
> and dependencies, and use type-only imports. Remove obsolete/conflicting DTO
> modules. Keep Mongoose document interfaces and runtime validation at their boundaries.

`shared/api.d.ts` now declares `Resource`, `CreateReservationRequest`, `Reservation`,
`ErrorResponse`, `ResourceQuery`, and the resource/status unions. Backend handlers,
services, models, frontend API/hooks/components, and tests import these types
directly. The frontend request type now uses the contract's
`CreateReservationRequest` name.

Removed `src/types/api.ts`, `src/types/reservation.ts`, and `client/src/api/types.ts`.
The model-local enum unions also use the shared definitions. Runtime Mongoose/Zod
and browser response validation remain in place. Backend `tsconfig.json` includes
the shared declarations; declarations emit no runtime module, so `dist/server.js`
remains the server entry point. No new dependencies were introduced.

## Validation results

| Check                                       | Result                             |
| ------------------------------------------- | ---------------------------------- |
| Backend typecheck, build, lint              | Passed                             |
| Backend test TypeScript compilation         | Passed                             |
| Existing backend integration suite          | **57 passed**, zero failures/skips |
| Frontend typecheck, build, lint             | Passed                             |
| Existing frontend API/state suite           | **20 passed**, zero failures/skips |
| Changed-file formatting and diff whitespace | Passed                             |

The backend suite ran against a temporary MongoDB 8.0.16 single-node replica set
on an isolated local port. It exercised real HTTP responses including `400`, `404`,
`409`, and sanitized `500`, plus concurrent creation and cancellation. Random test
databases were removed at completion.

Headless Chrome also exercised the production-built client against the real
Express app and a separate temporary database:

- Successful booking, cleared form, dashboard refresh, and duplicate-submit guard.
- A real `409` conflict with retained form input and recovered submission controls.
- Cancellation and successful rebooking of the released slot.
- Student changes resetting form/list state and ignoring a delayed reservation read.
- Booking completion after the original form unmounts, preserving student ownership
  and avoiding feedback or rows in the newly selected student's UI.

The lifecycle browser checks completed with no uncaught browser exceptions. One
initial smoke assertion matched explanatory text; correcting it to inspect actual
reservation rows resolved the harness failure without changing application code.
The temporary browser/server processes and test replica set were stopped afterward.

`AGENTS.md` now documents the shared declaration boundary and Express 5 forwarding.
The Part 1 measurements and Part 2 findings are snapshots from before this refactor.
The final layout preserves Route -> Controller -> Service -> Model, frontend-only
runtime code under `client/`, and explicit TypeScript types throughout.
