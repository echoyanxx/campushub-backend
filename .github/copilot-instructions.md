# CampusHub Backend Agent Rules

This repository is the backend service for CampusHub, a multi-tenant campus resource management system. Keep all implementation work scoped to the backend and TypeScript/Node.js runtime.

## Core principles
- Use TypeScript strictly: no implicit any, prefer explicit types, and keep types narrow and readable.
- Keep code modular and backend-focused. Do not generate frontend, mobile, or unrelated scripts.
- Favor small, well-named modules over large monolithic files.
- Follow a layered architecture: routes/controllers -> services -> repositories/data access -> shared utilities.
- Do not put business logic directly inside Express route handlers.
- Validate all inbound data with Zod schemas before processing it.
- Use async/await consistently for I/O and database work.
- Handle errors centrally and return structured API responses.
- Keep environment configuration in a single source, typically `src/config/env.ts` using dotenv.

## Required project structure
- `src/app.ts` contains Express app setup and middleware configuration.
- `src/server.ts` starts the HTTP server.
- `src/config/` holds config, environment, and bootstrapping logic.
- `src/routes/` contains HTTP route definitions.
- `src/services/` contains business logic.
- `src/repositories/` contains persistence access abstractions.
- `src/utils/` contains shared helpers.
- `src/types/` contains shared TypeScript interfaces and types.

## Quality constraints
- Use CommonJS-compatible Node.js patterns unless the project explicitly changes.
- Prefer dependency injection over singleton globals for services and repositories.
- Keep database and external service access behind clear interfaces.
- Never commit secrets or local credentials. Use `.env` and `.env.example` only.
- Prefer descriptive names and maintain immutability for domain data where practical.
- When adding or updating code, preserve the existing architecture and avoid unrelated refactors.

## Tooling rules
- Run TypeScript checks before finalizing significant changes.
- Keep code formatted with Prettier and lint-friendly.
- If an existing pattern is present, follow it before introducing a new pattern.
- Do not add test-only production code just to satisfy a test.

## Verification before completion
Before claiming the task is complete, run the project checks relevant to the change:
- `npm run typecheck`
- `npm run build`
- `npm run lint` when linting is configured for the change

## Scope guardrails
- Do not generate SQL injection-prone code, unvalidated user input handling, or unsafe authentication logic.
- Do not introduce unnecessary packages or frameworks.
- Keep commits and diffs focused on the current task.
