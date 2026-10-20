# Lab 4 reservation engine validation

## Behavior

- `GET /api/v1/resources` accepts optional `type=ROOM|EQUIPMENT|LAB` and
  `isAvailable=true|false` filters. Both filters must match when supplied together.
  `isAvailable` is the resource's stored flag, independent of reservation times.
- `POST /api/v1/reservations` creates a `PENDING` booking. Active bookings conflict
  when `existing.startTime < requested.endTime` and
  `existing.endTime > requested.startTime` on the same resource. Conflicts return
  `409` with code `DOUBLE_BOOKING`; touching endpoints are allowed.
- `GET /api/v1/reservations/user/{userId}` returns all of the student's bookings,
  including cancelled history, ordered by start time. An empty history returns `[]`.
- `PATCH /api/v1/reservations/{id}/cancel` returns the cancelled booking with `200`.
  Pending and confirmed bookings can be cancelled. Repeated cancellation also
  returns `200`, and a completed cancellation immediately permits rebooking.

Routes map endpoints to controllers. Controllers validate input and format HTTP
responses. Services apply booking rules through Mongoose models. Central error
middleware maps domain errors to HTTP statuses and `{ code, message }` responses.
The existing Zod dependency is reused; no packages were added.

## MongoDB requirement

Creation uses a transaction and increments an internal resource version before
checking for overlap. Competing creations for the same resource therefore cause
a write conflict and transaction retry, preventing simultaneous requests from
both booking the slot. A transaction with only an overlap read and an insert
would not provide that guarantee.

Use a MongoDB replica set or sharded cluster, such as Atlas. A standalone MongoDB
server does not support these transactions. The resource version is internal and
is omitted from API responses. Existing resource documents acquire the version
field on their first successful reservation; no data migration is required.

For a local single-node replica set, with MongoDB and mongosh installed:

```sh
mkdir -p /tmp/campushub-mongo-data
mongod --dbpath /tmp/campushub-mongo-data --bind_ip 127.0.0.1 --port 27017 --replSet rs0
```

In another terminal, initialize it once:

```sh
mongosh 'mongodb://127.0.0.1:27017/admin?directConnection=true' \
  --eval 'rs.initiate({_id:"rs0",members:[{_id:0,host:"127.0.0.1:27017"}]})'
```

Start the application with the replica set URI in `.env` or the environment:

```sh
MONGODB_URI='mongodb://127.0.0.1:27017/campushub?replicaSet=rs0' npm run dev
```

## Automated regression checks

```sh
npm run typecheck
npm run build
npm run lint
npx tsc --project tests/tsconfig.json
MONGODB_TEST_URI='mongodb://127.0.0.1:27017/?replicaSet=rs0' npm test
```

Tests use Node's built-in test runner, existing ts-node, and real HTTP requests
against Express and MongoDB. Each run creates a randomly named
`campushub_test_<uuid>` database, seeds its fixtures, and drops only that database
at completion. Application data is not used. If `MONGODB_TEST_URI` is omitted,
the test connection defaults to the local `rs0` URI above.

The 57 tests cover all resource filters, invalid query values, request and
identifier validation, missing records, both active statuses, five overlap
shapes, adjacent slots, timezone offsets, different resources, cancellation,
history isolation and ordering, and the existing health endpoint. Eight
simultaneous creation requests must produce exactly one `201` and seven `409`
responses, with one reservation stored. Concurrent cancellation is also checked.
A test-scoped database failure verifies that the real HTTP endpoint returns a
structured `500` without exposing internal error details. This completes coverage
of the submission's required `200`, `201`, `400`, `409`, and `500` statuses.

## Manual curl checks

Use a development database containing a resource and student. Set `RESOURCE_ID`
and `USER_ID` to their 24-character MongoDB identifiers. Use a fresh time window
when repeating the sequence.

```sh
BASE_URL='http://localhost:3000/api/v1'
RESOURCE_ID='<existing resource ID>'
USER_ID='<existing student ID>'

curl -i "$BASE_URL/health"
curl -i "$BASE_URL/resources?type=ROOM&isAvailable=true"
curl -i "$BASE_URL/resources?isAvailable=false"
curl -i "$BASE_URL/resources?isAvailable=yes"

curl -i -X POST "$BASE_URL/reservations" \
  -H 'Content-Type: application/json' \
  -d "{\"resourceId\":\"$RESOURCE_ID\",\"userId\":\"$USER_ID\",\"startTime\":\"2026-11-03T10:00:00Z\",\"endTime\":\"2026-11-03T11:00:00Z\"}"
```

Expect `200` for valid retrievals, `400` for `isAvailable=yes`, and `201` with
`status: PENDING` for creation. Repeat the identical POST and expect `409`.
Record the first response's `id` as `RESERVATION_ID`:

```sh
RESERVATION_ID='<created reservation ID>'
curl -i -X PATCH "$BASE_URL/reservations/$RESERVATION_ID/cancel"
curl -i -X PATCH "$BASE_URL/reservations/$RESERVATION_ID/cancel"
curl -i "$BASE_URL/reservations/user/$USER_ID"
```

Both cancellations must return `200` with `status: CANCELLED`. Repeat the
original POST after cancellation and expect `201`. User history must retain
the cancelled booking alongside the replacement.

Also verify adjacent `11:00–12:00` bookings return `201`, an equal or reversed
time range returns `400`, an invalid reservation identifier returns `400`, and
a valid but nonexistent reservation identifier returns `404` on cancellation.

## Recorded results — October 19, 2026

- Baseline TypeScript and lint checks passed. The original `npm test` was a
  placeholder that exited with `Error: no test specified`; no previous automated
  tests existed to rerun.
- Final TypeScript, production build, ESLint, and test TypeScript checks passed.
- All 56 integration tests passed against a temporary single-node MongoDB 8.0
  replica set, with zero skipped tests and zero failures.
- Fifteen separate curl checks passed against the compiled server and an
  isolated manual-test database: health, combined resource filters, false
  availability, empty filter results, invalid queries, creation, conflict,
  adjacency, cancellation, repeated cancellation, rebooking, complete user
  history, missing reservations, invalid identifiers, and invalid time ranges.
- The first test run revealed Mongoose's deprecation warning for `new: true`.
  Both update calls were changed to `returnDocument: 'after'`, then the full suite
  was rerun successfully without those warnings. This was one correction, not
  a repeated failure loop.
- The final Part 4 submission check added an HTTP `500` regression test using
  Node's test-scoped mocking, then reran the full suite against a fresh temporary
  MongoDB replica set: all 57 tests passed, with zero skipped tests or failures.
  TypeScript, build, ESLint, and test compilation also passed. The mock is
  confined to the test; no runtime failure hooks were added.

The two OpenAPI files describe the same request, response, filter, and
cancellation contracts. No confirmation endpoint was added because Part 2 asks
only for cancellation; confirmed-booking behavior is exercised with database
fixtures in the integration tests.
