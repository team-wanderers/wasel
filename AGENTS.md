# Wasel

Lost/found app. Next.js 16 + Drizzle + Postgres. Node >= 22. Code in `src/`.

Pick an issue, branch `feat/<n>-<slug>` or `fix/<n>-<slug>`, PR `Closes #n`. See `CONTRIBUTING.md`.

`npm run lint` and `npm run typecheck` must pass. No comments unless asked.

Schema in `src/db/schema`. Generate a drizzle migration; do not add DBs or services.

Login is email OTP only. Never use emoji as icons.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
