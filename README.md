# Accounting Dashboard

Internal web app for an accounting firm to track monthly work status per client × task type.

## Stack

Next.js 14 (App Router) · Supabase (Auth + DB + RLS) · Tailwind CSS · TypeScript · Vercel

---

## Features

- **Dashboard** — monthly overview per client × task type, status badges, stage timeline, progress popup (shows who completed each stage + when), CSV export, off-month banner
- **Client Detail** — stage cards with status toggle, per-field saving indicators, checklist (with per-item loading state), assignee, deadline, notes, auto-save with rollback on failure
- **Period Detail** — per-month work tracking per task type; visible month badge in header, amber warning when viewing a non-current period
- **Stage Templates** — drag-to-reorder stage editor per task type (`@dnd-kit`), internal deadline days, task checklist templates
- **Task Types** — built-in (Accounting, Payroll, BPJS, Tax) + custom per client
- **Team Page** — member list, promote/demote Leader ↔ Staff, remove member
- **Activity Log** — audit trail of all user actions at `/activity`
- **Settings** — profile editor, change password
- **Navigation** — page transition progress bar (`nextjs-toploader`), optimistic sidebar highlight

---

## Getting Started

```bash
git clone https://github.com/mozozky/accounting-dashboard.git
cd accounting-dashboard
npm install
```

### Environment Variables

Copy `.env.local.example` to `.env.local`:

```
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
SIGNUP_CODE=your-secret-invite-code
```

**`SIGNUP_CODE`** gates `/signup` — a new account can only be created by entering this code. If empty, all signups are disabled (fail-closed). Set it in Vercel env vars and share manually with new team members.

### Supabase Settings

| Setting | Value |
|---|---|
| Authentication → Confirm email | **OFF** |
| Authentication → Site URL | `https://your-vercel-domain.vercel.app` |
| Authentication → Redirect URLs | `https://your-vercel-domain.vercel.app/**` |

### Database Setup

Run these in Supabase SQL Editor **in order**:

| # | File | What it does |
|---|------|-------------|
| 1 | `001_initial_schema.sql` | Core tables: profiles, user_roles, clients, stage_templates, client_periods, period_stages, stage_tasks |
| 2 | `002_add_task_types.sql` | Add task_types table; restructure stage_templates + client_periods; seed Accounting, Payroll, BPJS & Tax |
| 3 | `003_seed_data.sql` | Dev seed data (skip in production) |
| 4 | `004_add_stage_completion.sql` | Add completed_at + completed_by_user_id to period_stages |
| 5 | `005_add_role_trigger.sql` | DB trigger for auto role assignment (superseded by 007) |
| 6 | `006_fix_triggers.sql` | Fix trigger (superseded by 007) |
| 7 | `007_drop_triggers.sql` | Drop all triggers — role logic moved to app layer |
| 8 | `008_add_password_flag.sql` | Add password_set flag to profiles |
| 9 | `009_add_default_deadline.sql` | Add default_deadline_day to stage_templates |
| 10 | `010_add_hard_deadline_day.sql` | Add hard_deadline_day to stage_templates |
| 11 | `011_stage_task_templates.sql` | Add stage_task_templates table |
| 12 | `012_activity_log.sql` | Add activity_log table |
| 13 | `013_fix_role_assignment.sql` | Atomic role assignment RPC + user_roles write policy for leaders |
| 14 | `014_fix_user_delete_fks.sql` | Fix FK constraints to allow deleting users (ON DELETE SET NULL) |
| 15 | `015_split_bpjs_tax.sql` | Split "BPJS & Tax" into separate BPJS (deadline day 10) and Tax (deadline day 15) built-in task types |
| 16 | `016_planned_date_assignee.sql` | Add planned_date (review target) + default_assignee_type (auto-assign PIC) |
| 17 | `017_backfill_assignee_may.sql` | One-time backfill: fill May 2026 assignees from client PIC (only empty ones) |

> **Fresh setup:** Skip 003 (dev seed), 005, 006 (superseded), 017 (one-time backfill for existing May 2026 data). Run 001, 002, 004, 007–016 in order.

### Run Locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) — sign up with your `SIGNUP_CODE` to get started. First user becomes Leader automatically.

---

## Deploy (Vercel)

1. Push to GitHub
2. Import repo at [vercel.com](https://vercel.com)
3. Add env vars: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `SIGNUP_CODE`
4. Update Supabase URL Configuration → Site URL + Redirect URLs to your Vercel domain

---

## Database Schema

| Table | Purpose |
|---|---|
| `profiles` | User profiles (synced from auth) |
| `user_roles` | Leader / Staff roles |
| `clients` | Client companies + PIC |
| `task_types` | Work categories (built-in + custom per client) |
| `stage_templates` | Stage definitions (cetakan) per client × task type |
| `stage_task_templates` | Default checklist items per stage template |
| `client_periods` | Monthly work periods per client × task type |
| `period_stages` | Stage progress snapshots (copied from templates at generation) |
| `stage_tasks` | Per-stage live checklists |
| `activity_log` | Audit trail of all user actions |

### Key Design: Template vs Snapshot

`stage_templates` is the **mold** — editing it only affects future periods. `period_stages` is the **cast copy** — editing it changes only that specific period. This preserves historical data integrity.

To update a running period: edit directly on the period detail page. To change future periods: edit via Client Settings → Stage Templates.

### Built-in Task Types

| Task Type | Hard Deadline | Key Stages |
|-----------|--------------|-----------|
| **Accounting** | Configurable | Data Request → GL WHT → Review → Send to Client |
| **Payroll** | Configurable | Data Request → Payroll Processing → Review → Send to Client |
| **BPJS** | Day 10 | Data Request → Bill Processing → Review → Send to Client |
| **Tax** | Day 15 | Data Request → Import Bukti Potong → Konsep SPT + Review → Proses Kode Billing → Send to Client → Lapor SPT |

---

## Roles & Authorization

| Action | Leader | Staff |
|--------|--------|-------|
| Update stage status, notes, assignee, checklist | ✅ | ✅ |
| Edit client info | ✅ | ❌ |
| Archive client | ✅ | ❌ |
| Edit stage templates | ✅ | ❌ |
| Generate next month (bulk) | ✅ | ❌ |
| Import clients CSV | ✅ | ❌ |
| Promote / demote team members | ✅ | ❌ |
| Remove team members | ✅ | ❌ |

First user to sign up automatically becomes Leader. Subsequent users become Staff. Leaders can promote Staff to Leader from the Team page.

---

## License

Internal tool — not for redistribution.
