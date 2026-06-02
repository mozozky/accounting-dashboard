"use client";

import { useState } from "react";
import { toast } from "sonner";
import { updateProfile, changePassword } from "./actions";

interface Props {
  email: string;
  fullName: string;
}

export default function SettingsClient({ email, fullName }: Props) {
  const [name, setName] = useState(fullName);
  const [saving, setSaving] = useState(false);

  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [pwSaving, setPwSaving] = useState(false);

  const handleSaveProfile = async () => {
    setSaving(true);
    const result = await updateProfile(name);
    setSaving(false);
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success("Profile updated");
    }
  };

  const handleChangePassword = async () => {
    if (newPw !== confirmPw) {
      toast.error("Passwords do not match");
      return;
    }
    if (newPw.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }
    setPwSaving(true);
    const result = await changePassword(currentPw, newPw);
    setPwSaving(false);
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success("Password changed");
      setCurrentPw("");
      setNewPw("");
      setConfirmPw("");
    }
  };

  return (
    <div className="space-y-8">
      <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-4">
        <h2 className="mb-4 text-sm font-medium text-zinc-300">My Profile</h2>

        <div className="mb-4">
          <label className="mb-1 block text-xs font-medium text-zinc-500">
            Email
          </label>
          <input
            type="email"
            value={email}
            disabled
            className="w-full rounded border border-zinc-700 bg-zinc-800/50 px-3 py-1.5 text-sm text-zinc-500"
          />
        </div>

        <div className="mb-4">
          <label className="mb-1 block text-xs font-medium text-zinc-500">
            Full Name
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-sm text-white focus:border-zinc-500 focus:outline-none"
          />
        </div>

        <button
          onClick={handleSaveProfile}
          disabled={saving}
          className="rounded bg-white px-3 py-1.5 text-xs font-medium text-black transition-colors hover:bg-zinc-200 disabled:opacity-40"
        >
          {saving ? "Saving..." : "Save"}
        </button>
      </div>

      <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-4">
        <h2 className="mb-4 text-sm font-medium text-zinc-300">
          Change Password
        </h2>

        <div className="mb-3">
          <label className="mb-1 block text-xs font-medium text-zinc-500">
            Current Password
          </label>
          <input
            type="password"
            value={currentPw}
            onChange={(e) => setCurrentPw(e.target.value)}
            className="w-full max-w-xs rounded border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-sm text-white focus:border-zinc-500 focus:outline-none"
          />
        </div>

        <div className="mb-3">
          <label className="mb-1 block text-xs font-medium text-zinc-500">
            New Password
          </label>
          <input
            type="password"
            value={newPw}
            onChange={(e) => setNewPw(e.target.value)}
            className="w-full max-w-xs rounded border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-sm text-white focus:border-zinc-500 focus:outline-none"
            placeholder="Min. 6 characters"
          />
        </div>

        <div className="mb-4">
          <label className="mb-1 block text-xs font-medium text-zinc-500">
            Confirm Password
          </label>
          <input
            type="password"
            value={confirmPw}
            onChange={(e) => setConfirmPw(e.target.value)}
            className="w-full max-w-xs rounded border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-sm text-white focus:border-zinc-500 focus:outline-none"
            placeholder="Re-enter new password"
          />
        </div>

        <button
          onClick={handleChangePassword}
          disabled={pwSaving || !currentPw || !newPw || !confirmPw}
          className="rounded bg-white px-3 py-1.5 text-xs font-medium text-black transition-colors hover:bg-zinc-200 disabled:opacity-40"
        >
          {pwSaving ? "Saving..." : "Change Password"}
        </button>
      </div>
    </div>
  );
}
