"use client";

import { useState, useRef } from "react";
import { toast } from "sonner";
import { importClientsCSV } from "@/lib/import-actions";

export default function ImportClientsButton() {
  const [loading, setLoading] = useState(false);
  const [showFormat, setShowFormat] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    const text = await file.text();
    const result = await importClientsCSV(text);
    setLoading(false);

    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success(result.message);
    }

    // Reset file input
    if (fileRef.current) fileRef.current.value = "";
  };

  return (
    <div className="flex items-center gap-2">
      <input
        ref={fileRef}
        type="file"
        accept=".csv"
        onChange={handleFile}
        className="hidden"
        id="import-csv"
      />

      <label
        htmlFor="import-csv"
        className="flex cursor-pointer items-center gap-1 rounded-md border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-xs text-zinc-300 transition-colors hover:bg-zinc-700"
      >
        <svg
          width="12"
          height="12"
          viewBox="0 0 12 12"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
        >
          <path d="M6 1v7M3 5l3 3 3-3M1 9v1.5A0.5 0.5 0 0 0 1.5 11h9a0.5 0.5 0 0 0 .5-.5V9" />
        </svg>
        {loading ? "Importing..." : "Import CSV"}
      </label>

      <button
        onClick={() => setShowFormat(!showFormat)}
        className="rounded-md px-1.5 py-1 text-xs text-zinc-600 hover:text-zinc-400"
        title="CSV format"
      >
        ?
      </button>

      {showFormat && (
        <div className="absolute left-0 top-full z-50 mt-2 w-80 rounded-lg border border-zinc-700 bg-zinc-900 p-4 shadow-xl">
          <p className="mb-2 text-xs font-medium text-zinc-300">
            CSV Format
          </p>
          <p className="mb-1 text-xs text-zinc-500">
            Columns (header row required):
          </p>
          <code className="block rounded bg-zinc-800 px-2 py-1 text-xs text-zinc-300">
            name,contact_name,contact_email,contact_phone
          </code>
          <p className="mt-2 mb-1 text-xs text-zinc-500">Example:</p>
          <code className="block rounded bg-zinc-800 px-2 py-1 text-xs text-zinc-400 leading-relaxed">
            name,contact_name,contact_email,contact_phone
            <br />
            PT ABC Makmur,Budi,budi@abc.com,08123456789
            <br />
            PT XYZ,Dewi,dewi@xyz.co.id,
            <br />
            CV Maju,,,
          </code>
          <ul className="mt-2 space-y-0.5 text-xs text-zinc-500">
            <li>• <b>name</b> — required</li>
            <li>• Other columns — optional (leave empty)</li>
            <li>• Skipped if client name already exists</li>
            <li>• Auto-assigns all 3 built-in task types</li>
            <li>• Auto-generates current month periods</li>
          </ul>
          <button
            onClick={() => setShowFormat(false)}
            className="mt-3 text-xs text-zinc-500 hover:text-zinc-300"
          >
            Close
          </button>
        </div>
      )}
    </div>
  );
}
