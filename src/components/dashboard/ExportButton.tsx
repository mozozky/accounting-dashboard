"use client";

import { useState } from "react";
import { exportDashboardCSV } from "@/lib/export-actions";

interface Props {
  month: number;
  year: number;
}

export default function ExportButton({ month, year }: Props) {
  const [loading, setLoading] = useState(false);

  const handleExport = async () => {
    setLoading(true);
    const result = await exportDashboardCSV(month, year);
    setLoading(false);

    if (result.csv) {
      const blob = new Blob([result.csv], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `dashboard-${year}-${String(month).padStart(2, "0")}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  return (
    <button
      onClick={handleExport}
      disabled={loading}
      className="rounded-md border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-xs text-zinc-300 transition-colors hover:bg-zinc-700 disabled:opacity-50"
    >
      {loading ? "Exporting..." : "Export CSV"}
    </button>
  );
}
