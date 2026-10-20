# Lab 4: Failure-Loop Log and Refactoring

These incidents occurred during Part 2 and were corrected before its completion.
Neither became a prolonged failure loop. Incident 1 is a concrete hallucination
of a nonexistent executable path. No incorrect overlap query, circular import,
or broken Express error middleware was observed.

The Part 2 corrections were autonomous; no separate user remediation prompt was
recorded. The prompt below was issued verbatim during Part 3 to review those
corrections. It is not presented as a historical user prompt.

### Incident 1: Hallucinated MongoDB Executable Path

- **Initial Agent Output:** To prepare the real-database tests, the agent
  downloaded and extracted a MongoDB archive, then attempted to start:
  `/tmp/campushub-lab4-mongo/mongodb-macos-aarch64-8.0.16/bin/mongod`.
  The shell returned `no such file or directory`, so the test database did not
  start. The extracted directory actually contained two hyphens before the
  version: `mongodb-macos-aarch64--8.0.16`.
- **Root Cause:** The agent inferred the archive's extracted directory name
  instead of inspecting the extraction output. The download succeeded, but the
  guessed executable path did not exist. Repeating that startup command would
  have repeated the same failure.
- **Remediation Prompt:** Applied verbatim during the Part 3 review:

  > Verify executable paths from file listings rather than inferred archive names. Confirm both Mongoose update calls use `returnDocument: 'after'`, preserve the transaction and validation options, and distinguish recorded test results from checks rerun now.

  The actual Part 2 recovery used this exact discovery command before retrying
  startup with the discovered path:

  ```sh
  rg --files /tmp/campushub-lab4-mongo -g mongod -g '*README*' && ls /tmp/campushub-lab4-mongo
  ```

- **Resolution:** File discovery returned the directory with the double hyphen.
  Starting that executable succeeded, and the temporary replica set was
  initialized. All 56 integration tests subsequently passed against real
  MongoDB, and 15 separate curl checks passed against the compiled server.
  This verified the recovery through database-backed HTTP behavior, rather
  than treating a successful download as proof of a working database. The
  temporary processes and downloaded database files were removed after testing;
  those startup commands were not rerun during Part 3. Reproduction instructions
  and the recorded results are in [lab4-testing.md](lab4-testing.md).

### Incident 2: Deprecated Mongoose Update Option Repeated in Test Output

- **Initial Agent Output:** The initial implementation used `{ session, new: true }`
  for the resource update in reservation creation, and
  `{ new: true, runValidators: true }` for cancellation. The first integration
  run repeatedly warned that Mongoose's `new` option was deprecated and that
  `returnDocument: 'after'` should be used. The tests passed; this incident was
  an outdated API assumption, not a failed cancellation or overlap check.
- **Root Cause:** The agent used a familiar older Mongoose option without
  checking its status in the installed version. Multiple requests and
  transaction retries repeated the warning. TypeScript and successful response
  assertions alone did not reveal the deprecation; runtime output did.
- **Remediation Prompt:** The same verbatim Part 3 review instruction applied:

  > Verify executable paths from file listings rather than inferred archive names. Confirm both Mongoose update calls use `returnDocument: 'after'`, preserve the transaction and validation options, and distinguish recorded test results from checks rerun now.

  During Part 2, the agent had already replaced both `new: true` options with
  `returnDocument: 'after'` in `src/services/reservation.service.ts`, retaining
  `session` for creation and `runValidators: true` for cancellation.

- **Resolution:** After that correction, all 56 integration tests were rerun
  successfully without the deprecation warnings. The suite verified that eight
  simultaneous creation requests produced one `201` and seven `409` responses,
  cancellation returned the updated `CANCELLED` document, repeated cancellation
  was safe, and the released slot could be rebooked. TypeScript, build, and lint
  also passed in Part 2. Part 3 rechecked the current options, reviewed the saved
  test output, and checked this document's formatting; it did not rerun the
  database suite because the temporary database had been removed.

The required refactoring was completed during Part 2. Part 3 adds this evidence
log without further runtime changes. Services retain booking rules and database
operations; controllers retain HTTP handling; routes retain endpoint mappings;
models retain persistence definitions. No packages or JavaScript files were
added for this documentation task.
