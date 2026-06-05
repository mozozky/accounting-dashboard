# Grand Plan — Accounting Dashboard

## Stack
Next.js 14 (App Router) · Supabase (Auth + DB + RLS) · Tailwind CSS · TypeScript  
Deploy: Vercel

---

## Status Keseluruhan

| Fase | Status |
|------|--------|
| 1 — Project Setup & Auth | ✅ Done |
| 2 — Database Schema | ✅ Done |
| 3 — Dashboard Utama | ✅ Done |
| 4 — Client & Period Detail | ✅ Done |
| 5 — Settings & Stage Template Editor | ✅ Done |
| 6 — Team Page & Role Management | ✅ Done |
| 7 — Security Hardening | ✅ Done |
| 8 — Bug Fixes & Polish | ✅ Done |

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
              │     snapshot saat           │
              │     period di-generate      │
              └──────────────────►  period_stages
                                       │
                              ┌────────┴────────┐
                              ▼                 ▼
                          stage_tasks      (completed_by,
                          (checklist)       assignee, etc.)
```

### Tabel

| # | Tabel | Deskripsi |
|---|-------|-----------|
| 1 | `profiles` | User profiles — synced dari `auth.users` |
| 2 | `user_roles` | Role: `leader` / `staff` |
| 3 | `clients` | Data klien + PIC |
| 4 | `task_types` | Katalog task type: built-in + custom per klien |
| 5 | `stage_templates` | Cetakan stage per (client + task_type) — diubah via Settings |
| 6 | `stage_task_templates` | Default checklist per stage template |
| 7 | `client_periods` | Periode bulanan per (client + task_type + month + year) |
| 8 | `period_stages` | Snapshot stage dari template saat period di-generate |
| 9 | `stage_tasks` | Checklist live per stage di suatu period |
| 10 | `activity_log` | Audit trail semua aksi user |

### Konsep Penting: Template vs Snapshot

- **`stage_templates`** = cetakan. Edit di Settings → ngaruh ke period yang di-generate **berikutnya** saja.
- **`period_stages`** = hasil cetak. Edit di halaman period detail → ngaruh ke period **itu saja**.
- Desain ini menjaga data historis tetap utuh.

### Built-in Task Types

| Task Type | Hard Deadline | Stages |
|-----------|--------------|--------|
| **Accounting** | Configurable | Data Request → GL WHT Process & Report → 1st Review → 2nd Review → Manager Review → Send to Client |
| **Payroll** | Configurable | Data Request → Payroll Processing → 1st Review → 2nd Review → Manager Review → Send to Client |
| **BPJS** | Day 10 | Data Request → Bill Processing → Review → Send to Client |
| **Tax** | Day 15 | Data Request → Import Bukti Potong → Konsep SPT + Review → Proses Kode Billing → Send to Client → Lapor SPT |

> "BPJS & Tax" lama telah di-split menjadi BPJS dan Tax terpisah (migration 015). Data lama disimpan sebagai "BPJS & Tax (legacy)".

---

## Migrations

| # | File | Isi |
|---|------|-----|
| 001 | `001_initial_schema.sql` | Core tables + RLS + trigger |
| 002 | `002_add_task_types.sql` | task_types table, restructure stage_templates + client_periods, seed built-in task types |
| 003 | `003_seed_data.sql` | Dev seed data (skip di production) |
| 004 | `004_add_stage_completion.sql` | completed_at + completed_by_user_id di period_stages |
| 005 | `005_add_role_trigger.sql` | Trigger role assignment (superseded oleh 007) |
| 006 | `006_fix_triggers.sql` | Fix trigger (superseded oleh 007) |
| 007 | `007_drop_triggers.sql` | Drop semua trigger — logika role pindah ke app layer |
| 008 | `008_add_password_flag.sql` | password_set flag di profiles |
| 009 | `009_add_default_deadline.sql` | default_deadline_day di stage_templates |
| 010 | `010_add_hard_deadline_day.sql` | hard_deadline_day di stage_templates |
| 011 | `011_stage_task_templates.sql` | stage_task_templates table |
| 012 | `012_activity_log.sql` | activity_log table |
| 013 | `013_fix_role_assignment.sql` | Atomic RPC assign_user_role() + write policy user_roles untuk leader |
| 014 | `014_fix_user_delete_fks.sql` | FK pic_user_id, assignee_user_id, completed_by_user_id → ON DELETE SET NULL |
| 015 | `015_split_bpjs_tax.sql` | Split "BPJS & Tax" jadi BPJS + Tax terpisah, auto-assign ke existing clients, generate May 2026 periods |

---

## Fase 1 — Project Setup & Auth ✅

### Auth Flow
1. User buka route apapun → middleware cek session
2. Belum login → redirect `/login`
3. Login → `signInWithPassword` → redirect `/dashboard`
4. Signup → wajib input **Invite Code** (`SIGNUP_CODE` env var) — fail-closed kalau tidak di-set
5. User pertama signup → otomatis jadi `leader`
6. User berikutnya → `staff`
7. Auth callback (`/auth/callback`) → `exchangeCodeForSession` → `ensureUserProfile` → assign role

### Security
- `/signup` dilindungi invite code (Opsi B)
- `next` param di auth callback divalidasi (cegah open redirect)
- Security headers di `next.config.mjs`: CSP, X-Frame-Options, HSTS, dll

### File Kunci
- `src/lib/supabase/client.ts` — Browser client
- `src/lib/supabase/server.ts` — Server client (cookie-based)
- `src/lib/supabase/admin.ts` — Admin client (service role, server-only)
- `src/middleware.ts` — Protect semua route kecuali `/login`, `/signup`, `/auth/*`
- `src/lib/auth-utils.ts` — `ensureUserProfile()`, `getUserRole()`, `requireLeader()`

---

## Fase 2 — Database Schema ✅

Lihat tabel migrations di atas. Schema inti di migration 001–002.

---

## Fase 3 — Dashboard ✅

### Halaman: `/dashboard?month=X&year=Y`

### Fitur
- **MonthSwitcher** — navigasi antar bulan; label amber + tombol "Kembali ke bulan ini" kalau lagi bukan bulan berjalan
- **Banner off-month** — peringatan amber di atas tabel kalau sedang lihat bukan bulan berjalan
- **Quick Stats Bar** — Total aktif, Overdue, Due minggu ini, Done bulan ini, Prior unfinished
- **Tabel klien** — per (client × task type) dengan filter search/PIC/status/task type
- **Stage timeline** — visual dot per stage, klik buka StageProgressPopup
- **StageProgressPopup** — update status (cycling dengan spinner), toggle checklist, tampil "Selesai oleh [nama] · [tanggal]" untuk stage done
- **Bulk action** — pilih multiple rows, set status sekaligus
- **"Generate Next Month"** — generate period bulan depan untuk semua client+task type aktif (leader only)
- **CSV export** — download data bulan berjalan
- **Prior Months table** — daftar period bulan lalu yang belum selesai

### Status Badge Logic (priority order)
1. **Blocked** — ada stage blocked
2. **Overdue** — hard_deadline < today (WIB) & belum semua done
3. **In Progress** — ada stage in_progress
4. **Not Started** — semua not_started
5. **Done** — semua done
6. **No Period** — belum ada period bulan ini

### Timezone
Semua kalkulasi tanggal (overdue, due this week) menggunakan **Asia/Jakarta (WIB)** via util di `src/lib/utils/date.ts`. Bukan UTC — ini penting karena Vercel server jalan di UTC.

---

## Fase 4 — Client & Period Detail ✅

### `/clients` — List Klien
- Row clickable langsung → navigasi ke detail klien (tanpa tombol View)
- Import via CSV

### `/clients/[clientId]` — Detail Klien
- Header: nama, PIC, kontak
- List periods per task type

### `/clients/[clientId]/[periodId]` — Detail Period
- **Header**: nama klien + **badge bulan** (amber + ring kalau bukan bulan berjalan) + task type
- **Banner peringatan** kalau membuka period bulan lain (bukan bulan berjalan)
- **Stage cards** (per stage):
  - Status dropdown (not_started / in_progress / done / blocked)
  - Internal deadline picker
  - Assignee dropdown
  - Notes textarea
  - Checklist (tambah / centang / hapus)
- **Per-field loading indicators** — spinner + disabled state selama saving
- **Auto-save + rollback** — debounce 800ms; kalau gagal → rollback ke nilai sebelumnya + toast error
- **Hard deadline** picker di header (debounce 800ms)

### `/clients/new` — Tambah Klien
- Form nama + kontak
- Auto-assign semua built-in task type
- Auto-generate period bulan berjalan

---

## Fase 5 — Settings & Stage Template Editor ✅

### `/clients/[clientId]/settings`

**Section 1: Info Klien**
- Edit nama, PIC, kontak
- "Archive Client" (leader only)

**Section 2: Stage Template Editor**
- Per task type: list stage dengan drag-to-reorder (`@dnd-kit`)
- Per stage: edit nama, toggle is_billable, toggle is_active, delete (leader only)
- Internal deadline day + hard deadline day per stage
- Checklist template per stage (akan dicopy saat generate period)
- Banner info: "Mengubah template di sini hanya berlaku untuk period yang di-generate berikutnya — edit period yang sudah ada langsung di halaman period task-nya."

**Section 3: Task Type Management**
- Assign built-in task type ke klien
- Buat custom task type
- Unassign task type (hapus semua period + stage historical — leader only, irreversible)

---

## Fase 6 — Team Page & Role Management ✅

### `/team`

- List semua member: nama, email, role, tanggal join
- **Leader**: dropdown role (Staff ↔ Leader) per member — optimistic update + rollback
- **Leader**: tombol "Remove" untuk hapus member (kecuali diri sendiri)
- Self-demotion diblokir (leader tidak bisa nurunin diri sendiri)
- Invite anggota baru: share link `/signup` + invite code

### Authorization
| Action | Leader | Staff |
|--------|--------|-------|
| Update progress harian (status, notes, assignee, checklist) | ✅ | ✅ |
| Edit client info, archive | ✅ | ❌ |
| Edit/delete stage template | ✅ | ❌ |
| Generate next month (bulk) | ✅ | ❌ |
| Import CSV | ✅ | ❌ |
| Promote/demote/remove member | ✅ | ❌ |

---

## Fase 7 — Security Hardening ✅

- **Signup gate** — invite code wajib (fail-closed)
- **Open redirect fix** — `next` param divalidasi di auth callback
- **Atomic role assignment** — PostgreSQL RPC `assign_user_role()` dengan advisory lock (cegah race condition "leader ganda")
- **RLS user_roles** — write policy hanya untuk leader
- **Leader-only guards** — `requireLeader()` helper di semua server action destruktif
- **FK fix** — `ON DELETE SET NULL` untuk pic_user_id, assignee_user_id, completed_by_user_id (fix "Database error deleting user")
- **Security headers** — CSP, X-Frame-Options, HSTS, X-Content-Type-Options, Referrer-Policy, Permissions-Policy

---

## Fase 8 — Bug Fixes & Polish ✅

### Bug Fixes
- **Archived client masih muncul** di Prior Months & My Tasks → filter clientMap (active-only)
- **"Database error deleting user"** → migration 014 ubah 3 FK ke ON DELETE SET NULL
- **Status overdue salah sehari** → kalkulasi pakai WIB bukan UTC
- **Auto-save silent failure** → rollback optimistic update + toast error
- **Status input tidak divalidasi** → cek VALID_STATUSES sebelum DB write

### UX Improvements
- **Loading indicators** per field di stage card (spinner + disabled)
- **Checklist loading** — spinner per checkbox, fade saat delete, "Adding..." di tombol Add
- **Page navigation loading** — `nextjs-toploader` bar hijau di atas browser
- **Sidebar optimistic** — highlight pindah langsung saat diklik + pending spinner
- **Full name di signup** — simpan nama asli, bukan email
- **Clickable rows** di client list
- **Period month visibility** — badge bulan di period detail header, banner amber kalau off-month
- **Dashboard off-month** — MonthSwitcher amber + banner peringatan di atas tabel
- **Popup "Selesai oleh"** — tampilkan siapa yang menyelesaikan stage + tanggal

### Performance
- Dashboard queries → 2x `Promise.all` batch (dari ~8 sequential queries)
- `searchParams` di-await (Next.js 15 compatible)

---

## File Structure Penting

```
src/
├── app/
│   ├── dashboard/page.tsx          # Dashboard utama
│   ├── clients/
│   │   ├── page.tsx                # List klien (clickable rows)
│   │   ├── new/                    # Tambah klien baru
│   │   └── [clientId]/
│   │       ├── page.tsx            # Detail klien
│   │       ├── [periodId]/page.tsx # Detail period
│   │       └── settings/           # Settings klien + template editor
│   ├── team/                       # Team management
│   ├── activity/                   # Activity log / audit trail
│   ├── my-tasks/                   # Tasks assigned to current user
│   ├── settings/                   # User settings
│   └── auth/                       # Auth callbacks
│
├── components/
│   ├── dashboard/
│   │   ├── ClientsTable.tsx        # Tabel utama dashboard
│   │   ├── StageProgressPopup.tsx  # Popup update status dari dashboard
│   │   ├── MonthSwitcher.tsx       # Navigasi bulan
│   │   ├── QuickStatsBar.tsx       # 4 stat cards
│   │   ├── PriorMonthsTable.tsx    # Tabel prior unfinished
│   │   ├── StatusBadge.tsx         # Badge warna status
│   │   ├── StageTimeline.tsx       # Dot timeline per stage
│   │   └── ExportButton.tsx        # Export CSV
│   ├── period/
│   │   ├── PeriodDetailClient.tsx  # Client component period detail
│   │   ├── StageCard.tsx           # Card per stage
│   │   ├── StageTaskList.tsx       # Checklist component
│   │   └── SavingIndicator.tsx     # Spinner saving indicator
│   └── clients/
│       ├── ClientRow.tsx           # Clickable row di client list
│       └── ImportClientsButton.tsx # CSV import
│
├── lib/
│   ├── actions.ts                  # Period generation actions
│   ├── period-actions.ts           # Stage/task CRUD
│   ├── settings-actions.ts         # Client/template management
│   ├── import-actions.ts           # CSV import
│   ├── export-actions.ts           # CSV export
│   ├── invite-actions.ts           # Team management (remove, set role)
│   ├── auth-utils.ts               # Auth helpers + requireLeader()
│   ├── types.ts                    # TypeScript types
│   └── utils/
│       └── date.ts                 # Date utils (WIB timezone)
│
└── supabase/
    └── migrations/                 # 15 migration files (001–015)
```

---

## Deployment Checklist

- [x] Auth + login jalan
- [x] `SIGNUP_CODE` di-set di Vercel env vars
- [x] Semua migration (001–015) dijalankan di Supabase
- [x] Supabase URL Configuration updated ke domain Vercel
- [x] `SUPABASE_SERVICE_ROLE_KEY` di-set (untuk remove user)
- [x] Dashboard tampil klien + status badges
- [x] Stage update, checklist, auto-save jalan
- [x] Stage template bisa di-edit per klien per task type
- [x] Team management (invite, promote, remove) jalan
- [x] CSV export + import jalan
- [x] Activity log terekam

---

## Known Limitations / Future Ideas

- **RLS masih broad** — semua tabel pakai `authenticated full access`. Guard saat ini di level server action (tidak di DB level). Untuk multi-tenant atau keamanan lebih ketat, perlu row-level ownership policy.
- **Invite flow** — saat ini pakai invite code manual (Opsi B). Bisa ditingkatkan ke proper invite email flow.
- **Template carry-forward** — checklist yang ditambah manual di period page tidak carry forward ke bulan baru. Harus tambah via Settings → Stage Templates untuk recurring. (Fitur "Save to Template" dari period page belum dibangun.)
- **Batch period generation** masih sequential per client → bisa timeout kalau klien sangat banyak. Kandidat optimasi ke depan.
- **No test coverage** — belum ada unit/integration tests. Kandidat: logika `determineStatus`, `computeDeadline`.
