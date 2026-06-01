# Grand Plan — Accounting Dashboard

## Stack
Next.js 14 (App Router) · Supabase (Auth + DB + RLS) · Tailwind CSS · TypeScript  
Deploy: Vercel

---

## Data Model

```
clients ──────┬─────────────────────────────┐
              │                             │
              ▼                             ▼
      stage_templates              client_periods
      (per client +               (per client + task_type
       task_type)                        + month + year)
              │                             │
              │        snapshot saat        │
              │        period digenerate    │
              │              ┌──────────────┘
              │              ▼
              └──────► period_stages
                           │
                           ▼
                       stage_tasks
                       (checklist)
```

### Tabel

| # | Tabel | Deskripsi |
|---|-------|-----------|
| 1 | `profiles` | Auto-sync dari `auth.users` via trigger |
| 2 | `user_roles` | Role: `leader` / `staff` |
| 3 | `clients` | Data klien + PIC |
| 4 | `task_types` | Katalog task type: 3 builtin + custom per klien |
| 5 | `stage_templates` | Template stage per (client + task_type) |
| 6 | `client_periods` | Periode bulanan per (client + task_type) |
| 7 | `period_stages` | Snapshot stage dari template saat period digenerate |
| 8 | `stage_tasks` | Checklist sub-task per stage |

### Built-in Task Types (seed data)

| Task Type | Stages |
|-----------|--------|
| **Accounting** | Data Request → GL WHT Process & Report → 1st Review → 2nd Review → Manager Review → Send to Client |
| **Payroll** | Data Request → Payroll Processing → 1st Review → 2nd Review → Manager Review → Send to Client |
| **BPJS & Tax** | Data Collection → Send to Client → Report Status |

### Custom Task Type
- Dibuat dari **Client Settings page** (Fase 5)
- Stages ditentukan user per klien
- 1 klien bisa punya multiple custom task type

### Rules
- Assign built-in task type ke klien → auto-copy default stages
- RLS: `authenticated full access` di semua tabel
- All team members have full access

---

## Fase Overview

| Fase | Status |
|------|--------|
| 1 — Project Setup & Auth | ✅ Done |
| 2 — Database Schema (7 tabel) | ✅ Done |
| 2.5 — Task Types Migration | ⬜ Todo |
| 3 — Dashboard Utama | 🟡 Done (perlu update ke task types) |
| 4 — Client & Period Detail | ⬜ |
| 5 — Settings & Stage Template Editor | ⬜ |
| 6 — Team Page & Invite | ⬜ |

---

## Fase 1 — Project Setup & Auth ✅

### Files
| File | Purpose |
|------|---------|
| `src/lib/supabase/client.ts` | Browser supabase client |
| `src/lib/supabase/server.ts` | Server supabase client (cookies) |
| `src/lib/supabase/middleware.ts` | Session refresh handler |
| `src/middleware.ts` | Protect all routes except `/login` |
| `src/app/login/actions.ts` | Server action: sign in |
| `src/app/login/page.tsx` | Login form (email + password) |
| `src/app/auth/callback/route.ts` | Auth callback handler |
| `src/app/dashboard/layout.tsx` | Sidebar layout |
| `src/app/page.tsx` | Redirect `/` → `/dashboard` |
| `.env.local.example` | Env template |

### Flow
1. User hits any route → middleware checks auth
2. Not logged in → redirect `/login`
3. Login → server action → Supabase `signInWithPassword`
4. Success → redirect `/dashboard`
5. Error → redirect `/login?error=...`

---

## Fase 2 — Database Schema ✅

### Migration: `supabase/migrations/001_initial_schema.sql`
7 tabel dengan RLS:
- `profiles` — auto-create via trigger `on_auth_user_created`
- `user_roles` — leader/staff + helper `has_role()`
- `clients` — data klien + PIC
- `stage_templates` — template stage per klien
- `client_periods` — periode bulanan
- `period_stages` — snapshot stage
- `stage_tasks` — checklist sub-task

### Files
| File | Purpose |
|------|---------|
| `src/lib/types.ts` | TypeScript types untuk semua tabel |
| `src/lib/supabase/queries.ts` | 10 query helpers |

---

## Fase 2.5 — Task Types Migration ⬜

### Tujuan
Menambah tabel `task_types` dan restruktur `stage_templates` + `client_periods` agar mendukung multi task type.

### Perubahan Skema
1. **NEW** `task_types` — (id, name, client_id nullable, is_builtin, created_at)
2. **ALTER** `stage_templates` — tambah `task_type_id`, unique per (client_id, task_type_id, order_index)
3. **ALTER** `client_periods` — tambah `task_type_id`, unique per (client_id, task_type_id, period_month, period_year)
4. **SEED** — 3 built-in task types + default stages

### Built-in Task Types Seed
- Accounting: 6 stages
- Payroll: 6 stages
- BPJS & Tax: 3 stages

### Files to Update
- `supabase/migrations/002_add_task_types.sql`
- `src/lib/types.ts` ← tambah `TaskType`
- `src/lib/supabase/queries.ts` ← query aware task_type_id
- `src/lib/actions.ts` ← generate period per task type

---

## Fase 3 — Dashboard 🟡

### Halaman: `/dashboard`

### Layout
- Sidebar kiri: Dashboard, Clients, Team, Settings
- Main content kanan

### Quick Stats Bar
4 kartu stat dari data bulan berjalan:
- Total (Client × Task Type) aktif
- Overdue (hard_deadline lewat & belum semua done)
- Due minggu ini (hard_deadline dalam 7 hari)
- Done bulan ini

### Tabel per (Client + Task Type)
Kolom: Client · Task Type · PIC · Active Stage · Progress (x/y) · Deadline · Status · Actions

### Status Badge Logic (priority order)
1. **Blocked** (merah) — 1+ stage blocked
2. **Overdue** (merah) — deadline < today & belum semua done
3. **In Progress** (kuning) — 1+ stage in_progress
4. **Not Started** (abu) — semua not_started
5. **Done** (hijau) — semua done
6. **No Period** (abu gelap) — belum ada period bulan ini

### Filter & Search
- Search bar (real-time by client name)
- Filter: Task Type, PIC, Status, Month (default: current month)

### Tombol
- "Generate Next Month" — generate period bulan depan untuk semua (client + task type) aktif
- "Generate" inline — untuk row yang belum punya period

### Design
- Clean, dense, professional — mirip Linear/Notion
- Sidebar abu gelap (`bg-zinc-950`), konten putih/off-white
- Status badge warna solid

---

## Fase 4 — Client & Period Detail ⬜

### A. `/clients/[clientId]`
- Header: nama klien, PIC, info kontak
- Timeline visual stage per task type untuk period bulan ini
- Tab "History": list period bulan lalu
- Tombol "Buka Period Bulan Ini"

### B. `/clients/[clientId]/[periodId]`
- Header: nama klien, task type, bulan/tahun, status badge, hard deadline (editable)
- Stage cards (urut by order_index):
  - Toggle status: not_started / in_progress / done / blocked
  - **Blocked rule**: auto-focus notes, warn "Catatan wajib diisi", save disabled sampai notes diisi
  - Internal deadline picker
  - PIC selector (dropdown tim)
  - Checklist sub-task: add / check / delete
  - Notes textarea
- **Auto-save** debounce 800ms
- "Menyimpan..." indicator

---

## Fase 5 — Settings & Stage Template Editor ⬜

### Halaman: `/clients/[clientId]/settings`

### Section 1: Info Klien
- Form edit: nama, PIC, kontak
- Tombol "Archive Client" (is_active = false)

### Section 2: Stage Template Editor (per Task Type)
- List task types yang di-assign ke klien
- Per task type: list stage, drag-to-reorder (@dnd-kit/core)
- Per stage: edit nama (inline), toggle is_billable, toggle is_active, delete
- Tombol "+ Tambah Stage"
- Info banner: "Perubahan hanya berlaku untuk period yang di-generate setelah ini."
- Auto-save

### Section 3: Assign Custom Task Type
- Untuk klien yang butuh task type flexible
- Buat custom task type + define stages
- Scope: per klien

---

## Fase 6 — Team Page & Invite ⬜

### Halaman: `/team`

### List Member
Kolom: Nama · Email · Role · Joined · Actions

### Leader
- "Invite Member" → modal input email → magic link
- "Remove" member (kecuali diri sendiri)
- Butuh `SUPABASE_SERVICE_ROLE_KEY` untuk `inviteUserByEmail`

### Staff
- Read-only, tidak bisa invite/remove

### Auto Role Logic
- First user signup → role `leader`
- Subsequent users → role `staff`

---

## Deployment

### Vercel
1. Push repo ke GitHub
2. Connect di Vercel
3. Set env vars:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`

### Checklist Before Live
- [ ] Auth + login jalan
- [ ] Schema Supabase terbuat semua
- [ ] Dashboard tampil klien + badges
- [ ] Bisa update stage, checklist, auto-save
- [ ] Stage template bisa di-edit per klien per task type
- [ ] Invite tim jalan
- [ ] User baru auto-jadi staff
- [ ] Blocked stage enforce notes
- [ ] Generate period auto saat task type diassign ke klien
