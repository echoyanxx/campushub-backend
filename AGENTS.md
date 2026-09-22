# CampusHub Backend AI Agent Rules

This repository is the backend service for CampusHub. The AI assistant operating in this repo must follow these rules exactly and treat them as the governing contract for all code generation, edits, and refactors.

## 1) Tech Stack & Libraries

### Authorized stack
- Application stack: TypeScript, Express, Mongoose
- Development tooling: TypeScript compiler, ESLint, Prettier, ts-node, @types/node

### Strict restrictions
- Do not create or modify raw JavaScript files with the .js extension in this repo.
- Do not introduce unauthorized libraries or frameworks without explicit approval.
- Do not add frontend, mobile, or unrelated infrastructure code to this backend repository.
- Do not add hidden runtime shortcuts, dynamic code execution, or package usage that bypasses the stack above.
- Prefer existing project patterns over introducing new packages.

## 2) Architectural Boundaries

The system must follow a strict 3-tier separation of concerns.

### Routes
- Route files define HTTP endpoints and middleware mappings only.
- Routes must be placed in dedicated route files and must contain route definitions and middleware mapping only.
- Routes may call a controller function for each endpoint.
- Routes must not contain business logic, direct database queries, or domain calculations.
- Routes must not contain inline request/response handler logic.
- Routes should use typed request handlers and delegate work to the controller layer.

### Controllers
- Controllers must be placed in dedicated controller files.
- Controllers handle request parsing, response formatting, and HTTP status code management.
- Controllers may coordinate between request validation and service calls.
- Controllers must never directly query the database.
- Controllers must not contain core business logic or domain rules.
- Controllers must return clear, typed HTTP responses and handle async errors through centralized error handling.

### Services
- Services must be placed in dedicated service files.
- Services contain pure business logic.
- Services orchestrate domain behavior and business workflows.
- Services must be the primary place for business rules and workflows.
- Services must not depend on Express request/response objects directly.

### Models
- Model files contain Mongoose schemas and TypeScript interfaces only.
- Model files must not contain route logic, controller logic, or HTTP response behavior.
- Mongoose schema definitions must remain focused on persistence structure and validation.

### App configuration rule
- `src/app.ts` may configure the Express application, define middleware, and mount routers.
- `src/app.ts` must not define endpoint handler logic inline.
- `src/app.ts` must not contain request/response callbacks for route handlers.
- Every endpoint, including health-check endpoints, must follow the required layering: Route -> Controller -> Service -> Model.
- No exceptions are allowed for simple endpoints such as health checks.

### required layer discipline
- Route -> Controller -> Service -> Model flow is the required architecture.
- Routes contain route definitions and middleware mapping only.
- Controllers contain HTTP behavior and status codes only.
- Services contain business logic only.
- Models contain Mongoose schemas and TypeScript interfaces only.
- No direct database access from routes, controllers, or app configuration.
- No business logic embedded in route handlers or app.ts.

## 3) Coding Standards & Safety

### TypeScript strictness
- All function signatures must declare explicit TypeScript types or interfaces.
- All database schema definitions must have explicit TypeScript interfaces or types.
- Never use the any type.
- Prefer narrow, explicit, and readable types over broad generic abstractions.
- Use interfaces for DTOs, request bodies, responses, and service contracts when appropriate.

### Async correctness
- Use async/await consistently for all async operations.
- Do not create unhandled promises.
- Always catch and handle rejected async operations in the correct layer.
- Use structured error handling instead of silent failure.

### Validation and safety
- Use defensive checks for null, undefined, and invalid payloads.
- Do not write code that exposes secrets or local credentials in logs or source files.
- Use environment variables from dotenv for config; do not hardcode secrets.
- Keep database access behind service and model abstractions.

### Maintainability
- Keep functions focused and small.
- Favor descriptive naming over abbreviations.
- Preserve existing patterns in the repo before introducing new patterns.
- Do not add test-only production code only to satisfy a test.
- Do not make unrelated refactors during a feature task.

## 4) Git & Commit / Diff Communication

When creating or editing code, summarize the result in concise PR or diff language.

### Required summary format
Provide a brief description with:
- What was built or changed
- Why it was built
- How the project context rules were respected

### Example summary
- Added a typed Express health-check route and environment loader for the CampusHub backend.
- Kept request handling in the route/controller layer and business logic isolated in services to match the 3-tier architecture.
- Used explicit TypeScript types and validation to satisfy the repo’s safety and context rules.

### Commit expectations
- Keep commit scope focused to the task at hand.
- Do not bundle unrelated files into one change.
- Make diffs easy to review and explain.

## 5) Required Workflow for AI-Assisted Development

- Read the repo before making changes.
- Follow the existing architecture and naming conventions.
- If a pattern already exists, match it before inventing a new one.
- Prefer the smallest safe change that satisfies the task.
- Run project validation relevant to the change before claiming completion.
- Treat this file as a living governance document and update it when the project architecture evolves.

## 6) Final Output Expectations

When producing code or documentation, the assistant must ensure all work:
- remains backend-only,
- stays within the allowed application stack of TypeScript, Express, and Mongoose,
- follows strict layering,
- avoids unsafe typing or unhandled async behavior,
- and includes a concise summary of what changed and why the repository rules were applied.
