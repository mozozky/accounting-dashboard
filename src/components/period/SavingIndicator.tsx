interface Props {
  saving: boolean;
  error?: string | null;
}

export default function SavingIndicator({ saving, error }: Props) {
  if (saving) {
    return (
      <div className="flex items-center gap-1.5">
        <svg
          className="h-3.5 w-3.5 animate-spin text-zinc-500"
          viewBox="0 0 24 24"
          fill="none"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
          />
        </svg>
        <span className="text-xs text-zinc-500">Menyimpan...</span>
      </div>
    );
  }

  if (error) {
    return (
      <span
        className="max-w-[200px] truncate text-xs text-red-400"
        title={error}
      >
        ⚠ Gagal menyimpan
      </span>
    );
  }

  return null;
}
