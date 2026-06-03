"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

function computeDeadline(month: number, year: number, day: number | null): string | null {
  if (!day) return null;
  let nextMonth = month + 1;
  let nextYear = year;
  if (nextMonth > 12) {
    nextMonth = 1;
    nextYear += 1;
  }
  const lastDay = new Date(nextYear, nextMonth, 0).getDate();
  const clamped = Math.min(day, lastDay);
  const m = String(nextMonth).padStart(2, "0");
  const d = String(clamped).padStart(2, "0");
  return `${nextYear}-${m}-${d}`;
}

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (inQuotes) {
      if (char === '"') {
        if (i + 1 < line.length && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        current += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === ",") {
        result.push(current.trim());
        current = "";
      } else {
        current += char;
      }
    }
  }

  result.push(current.trim());
  return result;
}

function parseCSV(content: string): string[][] {
  const lines = content
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (lines.length < 2) return [];

  return lines.map(parseCSVLine);
}

export async function importClientsCSV(csvContent: string) {
  const sanitized = csvContent
    .replace(/^\uFEFF/, "")
    .replace(/\r\n?/g, "\n");
  const rows = parseCSV(sanitized);

  if (rows.length < 2) {
    return { error: "CSV is empty or has no data rows" };
  }

  const header = rows[0].map((h) => h.toLowerCase().replace(/\s+/g, "_"));
  const nameIdx = header.indexOf("name");
  const contactNameIdx = header.indexOf("contact_name");
  const contactEmailIdx = header.indexOf("contact_email");
  const contactPhoneIdx = header.indexOf("contact_phone");

  if (nameIdx === -1) {
    return {
      error:
        'CSV must have a "name" column. Format: name,contact_name,contact_email,contact_phone',
    };
  }

  const supabase = await createClient();

  // Fetch built-in task types once
  const { data: builtInTaskTypes } = await supabase
    .from("task_types")
    .select("id")
    .eq("is_builtin", true)
    .is("client_id", null);

  const now = new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();

  let created = 0;
  let skipped = 0;

  for (let r = 1; r < rows.length; r++) {
    const row = rows[r];
    const name = row[nameIdx];
    const contactName = contactNameIdx !== -1 ? row[contactNameIdx] || null : null;
    const contactEmail = contactEmailIdx !== -1 ? row[contactEmailIdx] || null : null;
    const contactPhone = contactPhoneIdx !== -1 ? row[contactPhoneIdx] || null : null;

    if (!name) {
      skipped++;
      continue;
    }

    const { data: existing } = await supabase
      .from("clients")
      .select("id")
      .eq("name", name)
      .maybeSingle();

    if (existing) {
      skipped++;
      continue;
    }

    const { data: client, error } = await supabase
      .from("clients")
      .insert({
        name,
        contact_name: contactName,
        contact_email: contactEmail,
        contact_phone: contactPhone,
      })
      .select()
      .single();

    if (error || !client) {
      skipped++;
      continue;
    }

    // Auto-assign all built-in task types
    for (const tt of builtInTaskTypes ?? []) {
      const { data: defaultStages } = await supabase
        .from("stage_templates")
        .select("stage_name, order_index, is_billable, hard_deadline_day, default_deadline_day")
        .eq("task_type_id", tt.id)
        .is("client_id", null)
        .eq("is_active", true)
        .order("order_index");

      if (!defaultStages || defaultStages.length === 0) continue;

      const hardDeadlineDay = defaultStages[0]?.hard_deadline_day ?? null;

      const stageInserts = defaultStages.map((s) => ({
        client_id: client.id,
        task_type_id: tt.id,
        stage_name: s.stage_name,
        order_index: s.order_index,
        is_billable: s.is_billable,
        is_active: true,
        hard_deadline_day: hardDeadlineDay,
        default_deadline_day: s.default_deadline_day ?? null,
      }));

      await supabase.from("stage_templates").upsert(stageInserts, {
        onConflict: "client_id, task_type_id, order_index",
      });

      // Create period for current month
      const hardDeadline = computeDeadline(month, year, hardDeadlineDay);

      const { data: period } = await supabase
        .from("client_periods")
        .insert({
          client_id: client.id,
          task_type_id: tt.id,
          period_month: month,
          period_year: year,
          hard_deadline: hardDeadline,
        })
        .select()
        .single();

      if (!period) continue;

      const stageSnapshots = defaultStages.map((s) => ({
        period_id: period.id,
        stage_name: s.stage_name,
        order_index: s.order_index,
        status: "not_started",
        internal_deadline: computeDeadline(month, year, s.default_deadline_day ?? null),
      }));

      await supabase.from("period_stages").insert(stageSnapshots);

      const { data: newStages } = await supabase
        .from("period_stages")
        .select("id, order_index")
        .eq("period_id", period.id)
        .order("order_index");

      const { data: clientTemplates } = await supabase
        .from("stage_templates")
        .select("id, order_index")
        .eq("client_id", client.id)
        .eq("task_type_id", tt.id)
        .order("order_index");

      if (newStages && clientTemplates) {
        for (const ct of clientTemplates) {
          const ns = newStages.find((s) => s.order_index === ct.order_index);
          if (!ns) continue;
          const { data: tmpls } = await supabase
            .from("stage_task_templates")
            .select("label, order_index")
            .eq("template_id", ct.id)
            .order("order_index");

          if (tmpls && tmpls.length > 0) {
            await supabase.from("stage_tasks").insert(
              tmpls.map((t) => ({
                stage_id: ns.id,
                label: t.label,
                order_index: t.order_index,
              }))
            );
          }
        }
      }
    }

    created++;
  }

  revalidatePath("/clients");
  revalidatePath("/dashboard");

  return {
    success: true,
    created,
    skipped,
    message: `${created} client${created !== 1 ? "s" : ""} created${skipped > 0 ? `, ${skipped} skipped` : ""}`,
  };
}
