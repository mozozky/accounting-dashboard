"use client";

import { useState } from "react";
import Link from "next/link";
import { addClient } from "./actions";

interface Props {
  profiles: { id: string; full_name: string | null }[];
}

export default function NewClientPage({ profiles }: Props) {
  const [name, setName] = useState("");
  const [picUserId, setPicUserId] = useState("");
  const [contactName, setContactName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Client name is required");
      return;
    }

    setLoading(true);
    setError("");

    const formData = new FormData();
    formData.append("name", name.trim());
    formData.append("pic_user_id", picUserId);
    formData.append("contact_name", contactName.trim());
    formData.append("contact_email", contactEmail.trim());
    formData.append("contact_phone", contactPhone.trim());

    const result = await addClient(formData);
    setLoading(false);

    if (result?.error) {
      setError(result.error);
    }
  };

  return (
    <div className="p-8">
      <Link
        href="/clients"
        className="mb-4 inline-block text-xs text-zinc-500 hover:text-zinc-300"
      >
        &larr; Back to Clients
      </Link>

      <h1 className="mb-8 text-lg font-semibold text-white">Add Client</h1>

      <div className="w-full max-w-lg rounded-lg border border-zinc-800 bg-zinc-900/50 p-4">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-zinc-500">
              Client Name <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-sm text-white focus:border-zinc-500 focus:outline-none"
              placeholder="PT Example"
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

          <div className="grid grid-cols-2 gap-4">
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

          {error && (
            <div className="rounded border border-red-800 bg-red-950/30 px-3 py-2 text-xs text-red-400">
              {error}
            </div>
          )}

          <div className="flex items-center gap-3 border-t border-zinc-800 pt-4">
            <button
              type="submit"
              disabled={loading}
              className="rounded bg-white px-3 py-1.5 text-xs font-medium text-black transition-colors hover:bg-zinc-200 disabled:opacity-40"
            >
              {loading ? "Saving..." : "Create Client"}
            </button>
            <Link
              href="/clients"
              className="text-xs text-zinc-500 hover:text-zinc-300"
            >
              Cancel
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
