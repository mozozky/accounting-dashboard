"use client";

import { useRouter } from "next/navigation";

interface Props {
  id: string;
  name: string;
  picName: string | null;
  contactEmail: string | null;
}

export default function ClientRow({ id, name, picName, contactEmail }: Props) {
  const router = useRouter();
  const href = `/clients/${id}`;

  return (
    <tr
      onClick={() => router.push(href)}
      onKeyDown={(e) => {
        if (e.key === "Enter") router.push(href);
      }}
      tabIndex={0}
      role="link"
      className="cursor-pointer border-b border-zinc-800/50 text-sm transition-colors hover:bg-zinc-900/50 focus:bg-zinc-900/50 focus:outline-none"
    >
      <td className="px-4 py-3 font-medium text-white">{name}</td>
      <td className="px-4 py-3 text-zinc-400">{picName ?? "-"}</td>
      <td className="px-4 py-3 text-zinc-400">{contactEmail ?? "-"}</td>
      <td className="px-4 py-3 text-right">
        <span className="text-zinc-600" aria-hidden>
          →
        </span>
      </td>
    </tr>
  );
}
