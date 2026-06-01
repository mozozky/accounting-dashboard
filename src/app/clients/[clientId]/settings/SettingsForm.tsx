"use client";

import { useState } from "react";
import { updateClientInfo, archiveClient } from "@/lib/settings-actions";
import { useRouter } from "next/navigation";

interface Props {
  client: {
    id: string;
    name: string;
    pic_user_id: string | null;
    contact_name: string | null;
    contact_email: string | null;
    contact_phone: string | null;
    is_active: boolean;
  };
  profiles: { id: string; full_name: string | null }[];
}

export function SettingsForm({ client, profiles }: Props) {
  const router = useRouter();
  const [name, setName] = useState(client.name);
  const [picUserId, setPicUserId] = useState(client.pic_user_id ?? "");
  const [contactName, setContactName] = useState(client.contact_name ?? "");
  const [contactEmail, setContactEmail] = useState(client.contact_email ?? "");
  const [contactPhone, setContactPhone] = useState(client.contact_phone ?? "");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);
    const result = await updateClientInfo(client.id, {
      name,
      pic_user_id: picUserId || null,
      contact_name: contactName || null,
      contact_email: contactEmail || null,
      contact_phone: contactPhone || null,
    });
    setSaving(false);
    if (result.error) {
      setMessage({ type: "error", text: result.error });
    } else {
      setMessage({ type: "success", text: "Saved" });
      setTimeout(() => setMessage(null), 2000);
    }
  };

  const handleArchive = async () => {
    if (!confirm("Archive this client? It will be hidden from the dashboard.")) return;
    setSaving(true);
    const result = await archiveClient(client.id);
    setSaving(false);
    if (result.error) {
      setMessage({ type: "error", text: result.error });
    } else {
      router.push("/clients");
      router.refresh();
    }
  };

  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="mb-1 block text-xs font-medium text-zinc-500">
            Client Name
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-sm text-white focus:border-zinc-500 focus:outline-none"
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-zinc-500">
            PIC
          </label>
          <select
            value={picUserId}
            onChange={(e) => setPicUserId(e.target.value)}
            className="w-full rounded border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-sm text-white focus:border-zinc-500 focus:outline-none"
          >
            <option value="" className="bg-zinc-800">Unassigned</option>
            {profiles.map((p) => (
              <option key={p.id} value={p.id} className="bg-zinc-800">
                {p.full_name ?? p.id}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-zinc-500">
            Contact Name
          </label>
          <input
            type="text"
            value={contactName}
            onChange={(e) => setContactName(e.target.value)}
            className="w-full rounded border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-sm text-white focus:border-zinc-500 focus:outline-none"
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-zinc-500">
            Contact Email
          </label>
          <input
            type="email"
            value={contactEmail}
            onChange={(e) => setContactEmail(e.target.value)}
            className="w-full rounded border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-sm text-white focus:border-zinc-500 focus:outline-none"
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-zinc-500">
            Contact Phone
          </label>
          <input
            type="text"
            value={contactPhone}
            onChange={(e) => setContactPhone(e.target.value)}
            className="w-full rounded border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-sm text-white focus:border-zinc-500 focus:outline-none"
          />
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between border-t border-zinc-800 pt-4">
        <div className="flex items-center gap-3">
          <button
            onClick={handleSave}
            disabled={saving}
            className="rounded bg-white px-3 py-1.5 text-xs font-medium text-black transition-colors hover:bg-zinc-200 disabled:opacity-40"
          >
            {saving ? "Saving..." : "Save"}
          </button>
          {message && (
            <span
              className={`text-xs ${
                message.type === "success" ? "text-emerald-400" : "text-red-400"
              }`}
            >
              {message.text}
            </span>
          )}
        </div>

        <button
          onClick={handleArchive}
          disabled={saving}
          className="rounded border border-red-800 bg-red-950/30 px-3 py-1.5 text-xs text-red-400 transition-colors hover:bg-red-950/50 disabled:opacity-40"
        >
          Archive Client
        </button>
      </div>
    </div>
  );
}
