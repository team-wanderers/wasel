# wasel

Lost and found reports, matching, claims, and recovery.

Stack: Next.js, PostgreSQL, Drizzle.

## Setup

Node >= 22.

```bash
cp .env.example .env
docker compose up -d
npm install
npm run db:push
npm run dev
```

`.env` needs `DATABASE_URL`.

## Scripts

| command | purpose |
| --- | --- |
| `npm run dev` | next dev server |
| `npm run build` | production build |
| `npm run lint` | eslint |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run db:push` | push schema to postgres |
| `npm run db:generate` | generate drizzle migrations |
| `npm run db:migrate` | run migrations |
| `npm run db:studio` | drizzle studio |

## Schema

`src/db/schema`

- `auth.ts` — users, sessions, otp
- `items.ts` — lost, found, media
- `matching.ts` — matches, claims, pickup points, recoveries
- `system.ts` — notifications, audit logs, settings

## Tracking

Issues and the project board: [team-wanderers/wasel](https://github.com/team-wanderers/wasel/issues)

See [CONTRIBUTING.md](./CONTRIBUTING.md).

Outsider contributions are not accepted.
