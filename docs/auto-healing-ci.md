# Auto-healing CI (Lab 8)

The backend job in `.github/workflows/ci.yml` runs on pushes and pull requests to
`main`. Jest output is streamed to `test-results.log` with `pipefail`, so a failing
test still fails CI. A failed Jest step uploads its log for the `auto-fix` job.
Failures in installation, linting, type checking, or building do not start repairs.

## Repository setup

1. Add an **Actions repository secret** named `OPENAI_API_KEY` in
   **Settings → Secrets and variables → Actions**. Use an OpenAI project key with
   API access and available quota. Never commit a key or put it in a log.
2. In **Settings → Actions → General → Workflow permissions**, enable
   **Allow GitHub Actions to create and approve pull requests**. The workflow
   grants write permissions only to the repair job; it never approves or merges.
3. Optionally set the Actions variable `AUTO_HEAL_MODEL` to an OpenAI model that
   supports Chat Completions and structured JSON output. The default is `gpt-4.1`.

GitHub Models examples in older tutorials no longer work: GitHub retired that
service on July 30, 2026. This runner uses the OpenAI HTTPS API directly through
Node's built-in `fetch`, existing Zod validation, and `ts-node`. It adds no packages.

## Repair and review

`scripts/auto-heal.ts` sends the failure log, source diff, repository rules, and
tracked TypeScript context from `src/` and `shared/` to the model. Context respects
`.cursorignore` and excludes untracked files, symlinks, secrets, and dependencies.
Input is bounded to 20,000 characters each for the log and diff and 100,000 for
source context. Files named in failures or the diff take priority. Tests are
available as read-only context.

The model returns a summary and at most five exact text replacements. The runner
validates all replacements before writing. It permits edits only to existing,
tracked production `.ts` files under `src/`; tests, helpers, declarations, path
traversal, symlinks, workflows, dependencies, and new files are rejected. Model
output is never evaluated or passed to a shell. Empty, ambiguous, malformed,
refused, timed-out, and unsuccessful API responses stop the job without a PR.
There is one model request per eligible workflow run, with a two-minute timeout.

The workflow reruns lint, typecheck, build, and the complete Jest coverage suite
without the model key or persisted checkout credentials. Only a passing patch is
committed to `fix/auto-heal-<run-id>-<attempt>` and submitted as a PR. A push failure
targets `main`; a PR failure targets that PR's source branch so its author can
review and incorporate the repair. The original CI failure remains visible.
Fork PRs and PRs from auto-heal branches do not start repair jobs, preventing
secret exposure to forks and recursive repair attempts. Generated patches require
human review and are never merged automatically.

GitHub may suppress new workflow runs for PRs created with `GITHUB_TOKEN`.
The repair job itself verifies the patch before publication; do not assume a new
PR check run exists. Review the linked failed run and its repair job's validation,
then trigger normal CI with a human push if fresh PR checks are needed.

## Lab 8 verification

Use a temporary same-repository branch and PR against `main` for the intentional
regression in Part 3. Introduce a small source-only bug covered by an existing
Jest assertion. Confirm that CI fails, `test-results.log` is uploaded, and the
repair job opens a verified patch PR against the temporary branch. Inspect its
diff and validation logs before merging. Do not weaken tests to make CI pass.
Missing API credentials or PR permissions produce an explicit repair failure;
they do not hide the original test failure.

References: [GitHub Models retirement](https://docs.github.com/en/github-models),
[OpenAI structured outputs](https://developers.openai.com/api/docs/guides/structured-outputs),
[GitHub workflow triggers](https://docs.github.com/en/actions/how-tos/write-workflows/choose-when-workflows-run/trigger-a-workflow).
