# Contributing

This repo is for the `team-wanderers` members with write access.

## Workflow

1. Pick an issue from the project board. Assign yourself.
2. Branch from `main`: `feat/<issue>-<slug>` or `fix/<issue>-<slug>`.
3. Keep the change scoped to that issue.
4. `npm run lint` and `npm run typecheck` must pass.
5. Open a PR against `main`. Fill in which issue it closes (`Closes #n`).
6. One approving review is required. Resolve conversations before merge.

`main` is protected. Do not force-push it. Do not commit `.env`.

## Code

- App code lives in `src/`.
- Schema changes go in `src/db/schema` and are applied with `npm run db:push` or a generated migration.
- Use existing tables and enums. Do not add services or datastores that are not already in this repo.
- No comments unless the PR asks for them.

## Outsider contributions

Outsider contributions are not accepted.

Do not open issues, comments, or pull requests unless you have write access on this repository. Unsolicited PRs and issue claims will be closed.
