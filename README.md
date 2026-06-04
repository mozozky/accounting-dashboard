# Accounting Dashboard

Internal web app for accounting team to track monthly work status per client.

## Stack

Next.js 14 (App Router) · Supabase (Auth + DB + RLS) · Tailwind CSS · TypeScript · Vercel

## Features

- **Dashboard** — monthly overview per client × task type, stage timeline, completion popup, CSV export
- **Client Detail** — stage cards with status toggle, checklist, auto-save
- **Period Detail** — per-month work tracking per task type
- **Stage Templates** — drag-to-reorder stage editor per task type (`@dnd-kit`)
- **Task Types** — built-in (Accounting, Payroll, BPJS & Tax) + custom per client
- **Team Page** — member list, role management (Leader / Staff)
- **Settings** — profile editor, change password

## Getting Started

```bash
git clone https://github.com/mozozky/accounting-dashboard.git
cd accounting-dashboard
npm install
```

### Environment Variables

Copy `.env.local.example` to `.env.local` and fill in your Supabase keys:

```
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
SIGNUP_CODE=your-secret-invite-code
```

> `SIGNUP_CODE` gates the `/signup` page: a new account can only be created
> by entering this code. **If it is empty, all new signups are disabled
> (fail-closed).** Set it in your hosting environment (e.g. Vercel project
> env vars) and share it manually with new team members.

### Database Setup

Run these in Supabase SQL Editor (in order):

1. `supabase/migrations/001_initial_schema.sql`
2. `supabase/migrations/002_add_task_types.sql`
3. `supabase/migrations/003_seed_data.sql`
4. `supabase/migrations/004_add_stage_completion.sql`
5. `supabase/migrations/005_add_role_trigger.sql`
6. `supabase/migrations/006_fix_triggers.sql`
7. `supabase/migrations/007_drop_triggers.sql`
8. `supabase/migrations/008_add_password_flag.sql`
9. `supabase/migrations/009_add_default_deadline.sql`
10. `supabase/migrations/010_add_hard_deadline_day.sql`
11. `supabase/migrations/011_stage_task_templates.sql`
12. `supabase/migrations/012_activity_log.sql`
13. `supabase/migrations/013_fix_role_assignment.sql`

### Supabase Settings

| Setting | Value |
|---|---|
| Authentication → Confirm email | OFF |
| Authentication → URL Configuration → Site URL | `http://localhost:3000` |
| Authentication → URL Configuration → Redirect URLs | `http://localhost:3000/**` |

### Run

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) — sign up to get started.

## Deploy (Vercel)

1. Push to GitHub
2. Import repo at [vercel.com](https://vercel.com)
3. Add the 3 env vars above
4. Update Supabase URL Configuration to your Vercel domain

## Database Schema

| Table | Purpose |
|---|---|
| `profiles` | User profiles (synced from auth) |
| `user_roles` | Leader / Staff roles |
| `clients` | Client companies |
| `task_types` | Work categories (built-in + custom) |
| `stage_templates` | Stage definitions per client + task type |
| `client_periods` | Monthly work periods |
| `period_stages` | Stage progress snapshots |
| `stage_tasks` | Per-stage checklists |

## License

Internal tool — not for redistribution.
